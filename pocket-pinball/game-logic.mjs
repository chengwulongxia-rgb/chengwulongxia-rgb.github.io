// Simulation is deterministic and DOM-free. Public transitions never mutate input.
export const W = 350,
  H = 500,
  R = 4,
  SPEED = 440,
  FLOOR = 472,
  STEP = 1 / 180,
  MAX_VOLLEY = 24;
export function aimVector(dx, dy) {
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return { x: 0, y: -1 };
  dy = -Math.max(Math.abs(dy), Math.abs(dx) * 0.26, 1);
  const n = Math.hypot(dx, dy);
  return { x: dx / n, y: dy / n };
}
export function circleRect(x, y, r, b) {
  const qx = Math.max(b.x, Math.min(x, b.x + b.w)),
    qy = Math.max(b.y, Math.min(y, b.y + b.h));
  const dx = x - qx,
    dy = y - qy,
    d = Math.hypot(dx, dy);
  if (d >= r) return null;
  if (d > 0) return { nx: dx / d, ny: dy / d, depth: r - d };
  const sides = [
    { d: x - b.x, nx: -1, ny: 0 },
    { d: b.x + b.w - x, nx: 1, ny: 0 },
    { d: y - b.y, nx: 0, ny: -1 },
    { d: b.y + b.h - y, nx: 0, ny: 1 },
  ].sort((a, b) => a.d - b.d);
  return { nx: sides[0].nx, ny: sides[0].ny, depth: r + sides[0].d };
}

export const HEX_RADIUS = 23, HEX_WIDTH = Math.sqrt(3) * HEX_RADIUS, HEX_PITCH = 38;
export const MODES = ["square", "honeycomb"];
export function brickVertices(b) {
  if (b.shape !== "hex") return [{x:b.x,y:b.y},{x:b.x+b.w,y:b.y},{x:b.x+b.w,y:b.y+b.h},{x:b.x,y:b.y+b.h}];
  return Array.from({length:6}, (_,i) => {
    const a = -Math.PI/2 + i*Math.PI/3;
    return {x:b.x+b.w/2+Math.cos(a)*HEX_RADIUS,y:b.y+b.h/2+Math.sin(a)*HEX_RADIUS};
  });
}
// Closest boundary point gives true radial vertex normals; signed half-plane
// tests distinguish interior from empty corners of the hex's bounding box.
export function brickCollision(x,y,r,b) {
  if (b.shape !== "hex") return circleRect(x,y,r,b);
  const vs = brickVertices(b); let inside = true, nearest = null;
  for(let i=0;i<vs.length;i++) {
    const a=vs[i],c=vs[(i+1)%vs.length],ex=c.x-a.x,ey=c.y-a.y,len=Math.hypot(ex,ey);
    const nx=ey/len,ny=-ex/len;
    if((x-a.x)*nx+(y-a.y)*ny>1e-9) inside=false;
    const t=Math.max(0,Math.min(1,((x-a.x)*ex+(y-a.y)*ey)/(len*len)));
    const dx=x-a.x-t*ex,dy=y-a.y-t*ey,d=Math.hypot(dx,dy);
    if(!nearest||d<nearest.d) nearest={d,dx,dy,nx,ny};
  }
  const q=nearest;
  if(inside) return {nx:q.nx,ny:q.ny,depth:r+q.d};
  if(q.d>=r) return null;
  return {nx:q.d ? q.dx/q.d:q.nx,ny:q.d ? q.dy/q.d:q.ny,depth:r-q.d};
}
export function hexBrick(cx,y,props={}) {
  return {x:cx-HEX_WIDTH/2,y,w:HEX_WIDTH,h:HEX_RADIUS*2,shape:"hex",...props};
}
// Reflection is shared by real collisions and the forecast.
export function reflect(vx,vy,hit) {
  const dot=vx*hit.nx+vy*hit.ny;
  return dot < 0 ? {x:vx-2*dot*hit.nx,y:vy-2*dot*hit.ny} : {x:vx,y:vy};
}
export const PREVIEW_IMPACT_CAP = 12;
// One-entry cache, not a growing collection of pointermove paths. Ready ticks
// clone state, so key the stable board values rather than object identity.
export function createPreviewCache() {
  let key, path;
  return (s,dx,dy) => {
    const v=aimVector(dx,dy), next=JSON.stringify([v,s.origin,s.selected,s.mode,s.round,s.bricks,s.inventory,s.nextId,s.bombCount]);
    if(next!==key) {path=aimPreview(s,dx,dy);key=next;}
    return path;
  };
}
// Only the first ball: damage and bomb queues use the production tick on a
// private clone. No later launch, split pickup, round advancement or live write.
function precisionPreview(s, dx, dy) {
  const v=aimVector(dx,dy);
  const n = launch({...s, phase:"ready", ballCount:1, selected:null}, v.x, v.y);
  n.direction = v; // Do not re-clamp a normalized vector (aimVector's minimum dy is 1).
  n.pickups = []; n.balls = []; n.effects = []; n.impactHistory = [];
  const points = [{x:s.origin,y:FLOOR}], impacts = [];
  let bounces = 0, distance = 0, iterations = 0, stop = "limit";
  const push = p => { const last=points.at(-1); if(last.x!==p.x || last.y!==p.y) points.push({...p}); };
  const observer = {
    forecast:true,
    wall: b => { bounces++; push({x:b.x,y:b.y}); },
    impact: hit => { if(impacts.length<PREVIEW_IMPACT_CAP) {impacts.push({...hit,number:impacts.length+1}); push(hit.point);} },
  };
  for(; iterations < Math.ceil(MAX_VOLLEY / STEP);) {
    tick(n, observer); iterations++; distance += SPEED * STEP;
    const ball = n.balls[0];
    // Sample every six ticks, retaining all corners/contacts and the endpoint.
    if(ball && (iterations%6===0 || impacts.length>=PREVIEW_IMPACT_CAP)) push({x:ball.x,y:ball.y});
    if(impacts.length>=PREVIEW_IMPACT_CAP) {stop="impacts";break;}
    if(!ball) {stop="floor";push({x:n.nextOrigin,y:FLOOR});break;}
    if(iterations===Math.ceil(MAX_VOLLEY/STEP)) push({x:ball.x,y:ball.y});
    n.effects = []; // Forecast does not animate effects.
  }
  const firstImpact=impacts[0]??null;
  return {points,impacts,firstImpact,distance,bounces,iterations,stop,
    brickId:firstImpact?.brickId??null,normal:firstImpact?.normal??null,
    reflection:firstImpact?.reflection??null,firstStop:firstImpact?"brick":stop,
    elapsed:iterations*STEP,bombCount:n.bombCount-s.bombCount,
    remainingBricks:n.bricks.map(b=>({...b})),firstBallOnly:true,ignoresSplits:true};
}
export function aimPreview(s, dx, dy, precision = s.selected === "precision") {
  if(precision) return precisionPreview(s, dx, dy);
  const v = aimVector(dx, dy), stride = SPEED * STEP;
  let x = s.origin, y = FLOOR, vx = v.x * SPEED, vy = v.y * SPEED, bounces = 0, distance = 0;
  const points = [{x,y}], limit = precision ? Math.ceil(MAX_VOLLEY / STEP) : 74;
  for (let i = 0; i < limit; i++) {
    x += vx * STEP; y += vy * STEP; distance += stride;
    if (x < R) { x = R; vx = Math.abs(vx); bounces++; }
    if (x > W - R) { x = W - R; vx = -Math.abs(vx); bounces++; }
    if (y < R) { y = R; vy = Math.abs(vy); bounces++; }
    points.push({x,y});
    const brick = s.bricks.find(b => brickCollision(x,y,R,b));
    if (brick) {
      const hit=brickCollision(x,y,R,brick);
      return {points,distance,bounces,stop:"brick",brickId:brick.id,normal:{nx:hit.nx,ny:hit.ny},reflection:reflect(vx,vy,hit)};
    }
    if (y >= FLOOR && vy > 0) return {points,distance,bounces,stop:"floor",brickId:null};
  }
  return {points,distance,bounces,stop:precision ? "limit" : "short",brickId:null};
}
function clone(s) {
  return {
    ...s,
    impactHistory: [...(s.impactHistory ?? [])],
    inventory: { ...s.inventory },
    bricks: s.bricks.map((b) => ({ ...b })),
    pickups: s.pickups.map((p) => ({ ...p })),
    balls: s.balls.map((b) => ({ ...b, contacts: [...b.contacts] })),
    effects: s.effects.map((e) => ({ ...e })),
  };
}
function random(s) {
  s.seed = (Math.imul(s.seed, 1664525) + 1013904223) >>> 0;
  return s.seed / 4294967296;
}
function row(s, y, parity = (s.round + 1) % 2) {
  const hex = s.mode === "honeycomb";
  const first = s.bricks.length;
  const gap = Math.floor(random(s) * 7);
  for (let c = 0; c < 7; c++) {
    if (c === gap) continue;
    if (random(s) < 0.15) continue;
    s.bricks.push({
      id: s.nextId++,
      x: 19 + c * 45,
      y,
      w: 42,
      h: 39,
      ...(hex ? hexBrick(38 + c * 42 + (parity % 2) * 21, y) : {}),
      hp: Math.max(1, Math.ceil(s.round * (0.65 + random(s) * 0.8))),
      kind: random(s) < 0.15 ? "bomb" : "brick",
    });
  }
  if (s.bricks.length > first) s.bricks[first].reward = ["blast", "double", "precision"][(s.round + Math.floor(y / 45)) % 3];
  s.pickups.push({
    id: s.nextId++,
    x: hex ? 38 + gap * 42 + (parity % 2) * 21 : 40 + gap * 45,
    y: y + (hex ? HEX_RADIUS : 20),
    kind: s.round % 3 === 0 ? "split" : "extra",
  });
}
export function createGame(mode = "honeycomb") {
  const s = {
    mode: MODES.includes(mode) ? mode : "honeycomb",
    phase: "ready",
    inventory: { blast: 1, double: 1, precision: 1 },
    selected: null,
    active: null,
    firstBall: null,
    blastSpent: false,
    blastCount: 0,
    blastTargets: 0,
    lastDamage: 0,
    firstImpactBrick: null,
    firstImpact: null,
    impactHistory: [],
    bombCount: 0,
    lastBomb: null,
    round: 1,
    score: 0,
    hits: 0,
    ballCount: 6,
    origin: 175,
    nextOrigin: null,
    balls: [],
    bricks: [],
    pickups: [],
    effects: [],
    pending: 0,
    nextId: 1,
    seed: 9173,
    elapsed: 0,
    accumulator: 0,
    launchClock: 0,
    message: "往上拖曳瞄準，放開發射",
  };
  row(s, 65, 0);
  row(s, s.mode === "honeycomb" ? 65 + HEX_PITCH : 110, 1);
  s.bricks.push({
    id: s.nextId++,
    x: 154,
    y: 155,
    w: 42,
    h: 39,
    ...(s.mode === "honeycomb" ? hexBrick(164,65 + 2 * HEX_PITCH) : {}),
    hp: 1,
    // A reachable opening chain teaches the new board; square keeps its layout.
    kind: s.mode === "honeycomb" ? "bomb" : "brick",
  });
  return s;
}
export const ITEM_TYPES = ["blast", "double", "precision"];
export const ITEM_CAP = 3;
export const BOMB_RADIUS = 90, BOMB_DAMAGE = 4, BOMB_CHAIN_CAP = 32, DESTRUCTION_CAP = 128;
export function selectItem(s, type) {
  if (s.phase !== "ready" || !ITEM_TYPES.includes(type) || !s.inventory[type]) return s;
  return { ...s, selected: s.selected === type ? null : type };
}
export function launch(s, dx, dy) {
  if (s.phase !== "ready" || !Number.isFinite(dx) || !Number.isFinite(dy) || dy > 0 || (dx === 0 && dy === 0)) return s;
  const n = clone(s);
  n.phase = "volley";
  n.active = n.selected;
  if (n.active) n.inventory[n.active]--;
  n.selected = null;
  n.firstBall = null;
  n.blastSpent = false;
  n.blastCount = 0;
  n.blastTargets = 0;
  n.lastDamage = 0;
  n.firstImpactBrick = null;
  n.firstImpact = null;
  n.impactHistory = [];
  n.direction = aimVector(dx, dy);
  n.pending = n.ballCount;
  n.launchClock = 0;
  n.elapsed = 0;
  n.accumulator = 0;
  n.nextOrigin = null;
  n.message = "彈珠出發！";
  return n;
}
function effect(s, x, y, kind) {
  s.effects.push({ x, y, kind, life: 0.5 });
  if (s.effects.length > 80) s.effects.shift();
}
function hurt(s, id, amount = 1) {
  const b = s.bricks.find((b) => b.id === id);
  if (!b) return;
  b.hp -= amount;
  s.hits++;
  s.score += 1;
  effect(s, b.x + b.w / 2, b.y + b.h / 2, "hit");
  if (b.hp > 0) return;
  const queue = [b], scheduled = new Set([b.id]);
  const event = {initial:id,radius:BOMB_RADIUS,damage:BOMB_DAMAGE,detonations:0,destroyed:0,rewards:[],targets:[]};
  while (queue.length) {
    const dead = queue.shift(), cx=dead.x+dead.w/2, cy=dead.y+dead.h/2;
    s.bricks = s.bricks.filter((v) => v.id !== dead.id);
    event.destroyed++;
    if (ITEM_TYPES.includes(dead.reward)) {
      s.inventory[dead.reward] = Math.min(ITEM_CAP, s.inventory[dead.reward] + 1);
      event.rewards.push({id:dead.id,type:dead.reward});
      effect(s, cx, cy, "reward");
    }
    s.score += dead.id === id ? 9 : 10;
    effect(s,cx,cy,dead.kind === "bomb" ? "bomb" : "break");
    if (dead.kind === "bomb" && event.detonations < BOMB_CHAIN_CAP) {
      event.detonations++; s.bombCount++;
      const targets=s.bricks.filter(near => !scheduled.has(near.id) && Math.hypot(near.x+near.w/2-cx,near.y+near.h/2-cy)<=BOMB_RADIUS).slice(0,DESTRUCTION_CAP);
      for (const near of targets) {
        // Never leave unprocessed zero-HP bricks when the finite death budget fills.
        if(near.hp<=BOMB_DAMAGE && scheduled.size>=DESTRUCTION_CAP) continue;
        const before=near.hp;
        near.hp -= BOMB_DAMAGE;
        event.targets.push({source:dead.id,id:near.id,before,after:Math.max(0,near.hp)});
        if (near.hp <= 0) { scheduled.add(near.id); queue.push(near); }
        else effect(s,near.x+near.w/2,near.y+near.h/2,"hit");
      }
    }
  }
  if(event.detonations) {
    s.lastBomb=event;
    s.message=`✳ 連鎖 ${event.detonations} 爆 · 擊碎 ${event.destroyed} 磚 · 半徑 ${BOMB_RADIUS}／傷害 ${BOMB_DAMAGE}`;
  }
}
export function damage(s, id) {
  const n = clone(s);
  hurt(n, id);
  return n;
}
function pickup(s, id, ball) {
  const p = s.pickups.find((v) => v.id === id);
  if (!p) return;
  s.pickups = s.pickups.filter((v) => v.id !== id);
  effect(s, p.x, p.y, p.kind);
  if (p.kind === "extra") {
    s.ballCount = Math.min(60, s.ballCount + 1);
    s.message = "+1 彈珠 · 下一輪加入";
  } else {
    for (const angle of [-0.32, 0.32]) {
      if (s.balls.length >= 120) break;
      const ca = Math.cos(angle),
        sa = Math.sin(angle);
      s.balls.push({
        id: s.nextId++,
        x: ball.x,
        y: ball.y,
        vx: ball.vx * ca - ball.vy * sa,
        vy: ball.vx * sa + ball.vy * ca,
        contacts: [...ball.contacts],
      });
    }
    s.message = "分裂！本輪多兩顆彈珠";
  }
}
export function collect(s, id, ball) {
  const n = clone(s);
  pickup(n, id, ball);
  return n;
}
function nextRound(s) {
  s.active = null;
  s.selected = null;
  s.balls = [];
  s.pending = 0;
  s.origin = Math.max(12, Math.min(W - 12, s.nextOrigin ?? s.origin));
  s.round++;
  s.elapsed = 0;
  s.accumulator = 0;
  const pitch = s.mode === "honeycomb" ? HEX_PITCH : 45;
  s.bricks.forEach((b) => (b.y += pitch));
  s.pickups.forEach((p) => (p.y += pitch));
  s.pickups = s.pickups.filter((p) => p.y < FLOOR - 25);
  s.phase = s.bricks.some((b) => b.y + b.h >= FLOOR - 15) ? "over" : "ready";
  s.message =
    s.phase === "over"
      ? "磚塊碰到底線了！再挑戰一次？"
      : "新的一輪 · 往上拖曳發射";
  if (s.phase === "ready") row(s, 65);
}
export function advance(s) {
  const n = clone(s);
  nextRound(n);
  return n;
}
export function recall(s) {
  if (s.phase !== "volley") return s;
  const n = clone(s);
  nextRound(n);
  n.message = n.phase === "over" ? "磚塊碰到底線了！" : "已收回彈珠 · 新的一輪";
  return n;
}
function tick(s, observer = null) {
  s.elapsed += STEP;
  s.launchClock -= STEP;
  if (s.pending > 0 && s.launchClock <= 0) {
    if (s.firstBall === null) s.firstBall = s.nextId;
    s.balls.push({
      id: s.nextId++,
      x: s.origin,
      y: FLOOR,
      vx: s.direction.x * SPEED,
      vy: s.direction.y * SPEED,
      contacts: [],
    });
    s.pending--;
    s.launchClock += 0.075;
  }
  for (const b of [...s.balls]) {
    b.x += b.vx * STEP;
    b.y += b.vy * STEP;
    if (b.x < R) {
      b.x = R;
      b.vx = Math.abs(b.vx);
      observer?.wall(b);
    }
    if (b.x > W - R) {
      b.x = W - R;
      b.vx = -Math.abs(b.vx);
      observer?.wall(b);
    }
    if (b.y < R) {
      b.y = R;
      b.vy = Math.abs(b.vy);
      observer?.wall(b);
    }
    const contacts = [];
    for (const brick of [...s.bricks]) {
      const hit = brickCollision(b.x, b.y, R, brick);
      if (!hit) continue;
      const point={x:b.x,y:b.y};
      contacts.push(brick.id);
      b.x += hit.nx * (hit.depth + 0.02);
      b.y += hit.ny * (hit.depth + 0.02);
      const dot = b.vx * hit.nx + b.vy * hit.ny;
      if (dot < 0) {
        const reflection=reflect(b.vx,b.vy,hit);
        b.vx=reflection.x; b.vy=reflection.y;
        if (!b.contacts.includes(brick.id)) {
          const impact={brickId:brick.id,ballId:b.id,point,normal:{nx:hit.nx,ny:hit.ny},reflection,time:s.elapsed};
          if(b.id===s.firstBall && s.impactHistory.length<PREVIEW_IMPACT_CAP) s.impactHistory.push(impact);
          observer?.impact(impact);
          if (s.firstImpactBrick === null) {
            s.firstImpactBrick = brick.id;
            s.firstImpact={brickId:brick.id,point,normal:{nx:hit.nx,ny:hit.ny},reflection};
          }
          s.lastDamage = s.active === "double" ? 2 : 1;
          hurt(s, brick.id, s.lastDamage);
          if (s.active === "blast" && b.id === s.firstBall && !s.blastSpent) {
            s.blastSpent = true;
            s.blastCount++;
            const x = brick.x + brick.w / 2, y = brick.y + brick.h / 2;
            const targets = s.bricks.filter(v => Math.hypot(v.x + v.w / 2 - x, v.y + v.h / 2 - y) <= 75).slice(0,128);
            s.blastTargets = targets.length;
            effect(s, x, y, "blast");
            for (const target of targets) hurt(s, target.id, 3);
            s.message = "爆破彈！半徑 75 內傷害 3 · 本輪已引爆";
          }
        }
      }
    }
    b.contacts = contacts;
    if (Math.abs(b.vy) < 28) {
      b.vy = b.vy < 0 ? -28 : 28;
      const scale = SPEED / Math.hypot(b.vx, b.vy);
      b.vx *= scale;
      b.vy *= scale;
    }
    for (const p of [...s.pickups])
      if (Math.hypot(b.x - p.x, b.y - p.y) < R + 12) pickup(s, p.id, b);
    if (b.y >= FLOOR && b.vy > 0) {
      if (s.nextOrigin === null) s.nextOrigin = b.x;
      s.balls = s.balls.filter((v) => v.id !== b.id);
    }
  }
  if (!observer?.forecast && ((s.pending === 0 && s.balls.length === 0) || s.elapsed >= MAX_VOLLEY)) {
    const auto = s.elapsed >= MAX_VOLLEY;
    nextRound(s);
    if (auto && s.phase === "ready") s.message = "時間到，彈珠已自動收回";
  }
}
export function step(s, dt) {
  if (!Number.isFinite(dt) || dt <= 0) return s;
  const n = clone(s);
  dt = Math.min(dt, 0.05);
  n.effects = n.effects
    .map((e) => ({ ...e, life: e.life - dt }))
    .filter((e) => e.life > 0);
  if (n.phase !== "volley") return n;
  n.accumulator += dt;
  let count = 0;
  while (n.accumulator + 1e-10 >= STEP && n.phase === "volley" && count < 10) {
    n.accumulator -= STEP;
    tick(n);
    count++;
  }
  return n;
}
