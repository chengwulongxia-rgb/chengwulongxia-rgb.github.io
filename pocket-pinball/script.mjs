import { W, H, FLOOR, createPreviewCache, MAX_VOLLEY, brickVertices, BOMB_RADIUS } from "./game-logic.mjs";
import { createController } from "./game-controller.mjs";
const $ = (id) => document.getElementById(id),
  canvas = $("arena"),
  ctx = canvas.getContext("2d");
let storage;
try {
  storage = window.localStorage;
} catch {}
const game = createController(storage);
let aim = null,
  pointer = null,
  start = null,
  manualPause = false,
  lastTime = 0,
  keyboardAngle = 0;
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const cachedPreview = createPreviewCache();
function syncPause() {
  game.pause(
    manualPause || document.hidden || $("help-title").closest("dialog").open,
  );
  lastTime = 0;
  cancelAim();
}
function cancelAim() {
  if (pointer !== null && canvas.hasPointerCapture(pointer))
    canvas.releasePointerCapture(pointer);
  pointer = null;
  aim = null;
  start = null;
}
function resize() {
  const box = canvas.parentElement.getBoundingClientRect(),
    width = Math.min(box.width, (box.height * W) / H),
    height = (width * H) / W,
    dpr = Math.max(1, window.devicePixelRatio || 1);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  cancelAim();
}
new ResizeObserver(resize).observe(canvas.parentElement);
function position(event) {
  const box = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - box.x) * W) / box.width,
    y: ((event.clientY - box.y) * H) / box.height,
  };
}
canvas.addEventListener("pointerdown", (event) => {
  if (
    game.state.phase !== "ready" ||
    game.paused ||
    pointer !== null ||
    !event.isPrimary ||
    (event.pointerType === "mouse" && event.button !== 0)
  )
    return;
  event.preventDefault();
  pointer = event.pointerId;
  start = position(event);
  aim = { ...start, moved: false };
  canvas.setPointerCapture(pointer);
  canvas.focus({ preventScroll: true });
});
canvas.addEventListener("pointermove", (event) => {
  if (event.pointerId !== pointer) return;
  event.preventDefault();
  const p = position(event);
  aim = {
    ...p,
    moved: aim.moved || Math.hypot(p.x - start.x, p.y - start.y) > 12,
  };
});
canvas.addEventListener("pointerup", (event) => {
  if (event.pointerId !== pointer) return;
  event.preventDefault();
  const target = aim;
  cancelAim();
  if (target?.moved && target.y < FLOOR - 14)
    game.launch(target.x - game.state.origin, target.y - FLOOR);
});
canvas.addEventListener("pointercancel", cancelAim);
canvas.addEventListener("lostpointercapture", () => {
  pointer = null;
  aim = null;
  start = null;
});
canvas.addEventListener("contextmenu", (e) => e.preventDefault());
canvas.addEventListener("keydown", (e) => {
  if (game.state.phase !== "ready" || game.paused) return;
  if (["ArrowLeft", "ArrowRight", " "].includes(e.key)) {
    e.preventDefault();
    if (e.key === " ") {
      game.launch(Math.sin(keyboardAngle), -Math.cos(keyboardAngle));
      aim = null;
    } else {
      keyboardAngle = Math.max(
        -1.3,
        Math.min(1.3, keyboardAngle + (e.key === "ArrowLeft" ? -0.08 : 0.08)),
      );
      aim = {
        x: game.state.origin + Math.sin(keyboardAngle) * 300,
        y: FLOOR - Math.cos(keyboardAngle) * 300,
        moved: true,
      };
    }
  }
});
const itemNames = {blast:"爆破彈",double:"雙倍傷害",precision:"精準瞄準"};
const itemIcons = {blast:"◆",double:"×2",precision:"◎"};
for (const type of Object.keys(itemNames)) $("item-" + type).addEventListener("click", () => game.selectItem(type));
for (const mode of ["square", "honeycomb"]) $("mode-" + mode).addEventListener("click", () => {
  const s = game.state;
  if (s.mode === mode) return;
  cancelAim();
  game.pause(true);
  const progress = s.phase !== "ready" || s.round > 1 || s.score > 0;
  if (progress && !window.confirm("切換模式會結束本局並開新局，確定切換？")) { syncPause(); return; }
  manualPause = false; keyboardAngle = 0;
  game.setMode(mode); syncPause();
});
$("restart").addEventListener("click", () => {
  cancelAim();
  manualPause = false;
  keyboardAngle = 0;
  game.restart();
  syncPause();
});
$("recall").addEventListener("click", () => {
  cancelAim();
  game.recall();
});
$("pause").addEventListener("click", () => {
  manualPause = !manualPause;
  syncPause();
});
$("overlay-action").addEventListener("click", () => {
  if (game.state.phase === "over") game.restart();
  manualPause = false;
  syncPause();
});
$("help").addEventListener("click", () => {
  $("help-title").closest("dialog").showModal();
  syncPause();
});
$("close-help").addEventListener("click", () => {
  $("help-title").closest("dialog").close();
  syncPause();
});
$("help-title").closest("dialog").addEventListener("close", syncPause);
document.addEventListener("visibilitychange", syncPause);
window.addEventListener("pagehide", () => {
  game.pause(true);
  cancelAim();
  lastTime = 0;
});
window.addEventListener("pageshow", syncPause);
function text(value, x, y, color, size = 14, weight = 700) {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(value, x, y);
}
function rounded(x, y, w, h, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}
function circle(x, y, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}
function preview(s, target) {
  const path = cachedPreview(s, target.x - s.origin, target.y - FLOOR);
  canvas.dataset.previewDistance = path.distance.toFixed(2);
  canvas.dataset.previewBounces = path.bounces;
  canvas.dataset.previewStop = path.stop;
  canvas.dataset.previewBrick = path.brickId ?? "";
  canvas.dataset.previewEnd = JSON.stringify(path.points.at(-1));
  canvas.dataset.previewNormal = JSON.stringify(path.normal ?? null);
  canvas.dataset.previewReflection = JSON.stringify(path.reflection ?? null);
  canvas.dataset.previewFirstStop = path.firstStop ?? path.stop;
  canvas.dataset.previewFirstImpact = JSON.stringify(path.firstImpact ?? null);
  canvas.dataset.previewFirstPoint = JSON.stringify(path.firstImpact?.point ?? (path.stop === "brick" ? path.points.at(-1) : null));
  canvas.dataset.previewImpacts = JSON.stringify(path.impacts ?? []);
  canvas.dataset.previewMarkers = JSON.stringify((path.impacts ?? []).map(h=>({number:h.number,...h.point})));
  canvas.dataset.previewPoints = JSON.stringify(path.points);
  canvas.dataset.previewIterations = path.iterations ?? 74;
  if(s.selected === "precision") {
    ctx.lineWidth=2.4; ctx.lineCap="round";
    for(let i=1;i<path.points.length;i++) {
      ctx.globalAlpha=1-.65*(i/path.points.length);
      ctx.beginPath();ctx.moveTo(path.points[i-1].x,path.points[i-1].y);
      ctx.lineTo(path.points[i].x,path.points[i].y);
      ctx.strokeStyle="#fff1a0";ctx.stroke();
    }
    ctx.globalAlpha=1;
    for(const hit of path.impacts) {
      // Offset repeated contact labels while retaining an exact contact dot.
      const x=Math.max(12,Math.min(W-12,hit.point.x+((hit.number%3)-1)*12));
      const y=Math.max(12,Math.min(FLOOR-12,hit.point.y+(hit.number%2? -12:12)));
      circle(hit.point.x,hit.point.y,3,"#fff6c8");
      ctx.beginPath();ctx.moveTo(hit.point.x,hit.point.y);ctx.lineTo(x,y);
      ctx.strokeStyle="#fff1a0";ctx.lineWidth=1;ctx.stroke();
      circle(x,y,8,"#102d32");ctx.beginPath();ctx.arc(x,y,8,0,Math.PI*2);
      ctx.strokeStyle="#fff1a0";ctx.stroke();text(String(hit.number),x,y,"#fff6c8",10,900);
    }
    text("首球預測 · 最多 12 次碰磚 · 不含後續球／分裂",W/2,FLOOR+17,"#ffe9a1",9,600);
  } else {
  ctx.beginPath();
  ctx.moveTo(path.points[0].x, path.points[0].y);
  for (const point of path.points.slice(1)) ctx.lineTo(point.x,point.y);
  ctx.strokeStyle = s.selected === "precision" ? "#f6cd73" : "#a9efd4aa";
  ctx.lineWidth = 1.8;
  ctx.setLineDash([3, 8]); ctx.stroke(); ctx.setLineDash([]);
  const end = path.points.at(-1);
  if (path.stop === "brick") circle(end.x,end.y,5,"#f6cd73");
  }
  circle(s.origin,FLOOR,7,"#a9efd4");
}
function draw(s, time) {
  ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#0b2429";
  ctx.fillRect(0, 0, W, H);
  const explosion=s.effects.find(e=>e.kind === "bomb" && e.life > .34);
  if (!reduced && explosion) {
    const t=(.5-explosion.life)/.16, strength=1.4*(1-t);
    ctx.translate(Math.sin(t*24)*strength,Math.cos(t*21)*strength*.6);
  }
  // A quiet dot-grid and a brass rail give the table its own cabinet identity.
  ctx.fillStyle = "#214044";
  for (let x = 17; x < W; x += 22)
    for (let y = 21; y < 454; y += 22) ctx.fillRect(x, y, 1.2, 1.2);
  rounded(4, 4, 342, 3, 1.5, "#8b9d76");
  rounded(4, 4, 3, 450, 1.5, "#45635a");
  rounded(W - 7, 4, 3, 450, 1.5, "#45635a");
  text("口 袋 俱 樂 部", W / 2, 29, "#617e73", 10, 600);
  ctx.strokeStyle = "#ff866e80";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(10, FLOOR - 15);
  ctx.lineTo(W - 10, FLOOR - 15);
  ctx.stroke();
  ctx.setLineDash([]);
  text("底 線", W - 30, FLOOR - 25, "#c77a69", 9, 500);
  for (const b of s.bricks) {
    const color =
      b.kind === "bomb"
        ? "#ff866e"
        : b.hp >= 6
          ? "#a8c6d8"
          : b.hp >= 3
            ? "#f6cd73"
            : "#a9efd4";
    if (b.shape === "hex") {
      const vs=brickVertices(b); ctx.beginPath();
      ctx.moveTo(vs[0].x,vs[0].y);
      for(const v of vs.slice(1)) ctx.lineTo(v.x,v.y);
      ctx.closePath(); ctx.fillStyle=color; ctx.fill();
      ctx.strokeStyle="#ffffff44"; ctx.lineWidth=1; ctx.stroke();
    } else {
      rounded(b.x, b.y + 3, b.w, b.h, 6, "#030f1666");
      rounded(b.x, b.y, b.w, b.h, 6, color);
      rounded(b.x + 3, b.y + 3, b.w - 6, 2, 1, "#ffffff44");
    }
    text(
      String(b.hp),
      b.x + b.w / 2,
      b.y + b.h / 2 + (b.kind === "bomb" ? 3 : 0),
      "#173638",
      b.hp > 99 ? 15 : 19,
      850,
    );
    if (b.reward) text(itemIcons[b.reward], b.x + 11, b.y + 12, "#173638", 11, 900);
    if (b.kind === "bomb")
      text("✳", b.x + b.w - 10, b.y + 12, "#633d35", 10, 800);
  }
  for (const p of s.pickups) {
    const color = p.kind === "extra" ? "#a9efd4" : "#f6cd73";
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 11, 0, Math.PI * 2);
    ctx.stroke();
    text(p.kind === "extra" ? "+" : "⋔", p.x, p.y, color, 18);
  }
  for (const b of s.balls) {
    if (!reduced) {
      ctx.strokeStyle = "#f8eed335";
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(b.x - b.vx * 0.025, b.y - b.vy * 0.025);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    circle(b.x, b.y, 4, "#f8eed3");
    circle(b.x - 1, b.y - 1, 1.2, "#fff");
  }
  for (const e of s.effects) {
    const t = 1 - e.life / 0.5;
    ctx.globalAlpha = e.life / 0.5;
    const color =
      (e.kind === "bomb" || e.kind === "blast")
        ? "#ff866e"
        : e.kind === "extra"
          ? "#a9efd4"
          : "#f6cd73";
    if (e.kind === "hit") {
      ctx.strokeStyle="#f6cd7370"; ctx.lineWidth=1;
      ctx.beginPath(); ctx.arc(e.x,e.y,9+8*t,0,Math.PI*2);ctx.stroke();
    } else {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(e.x, e.y, (e.kind === "blast" ? 75 : e.kind === "bomb" ? BOMB_RADIUS : 22) * (reduced ? 1 : t) + 4, 0, Math.PI * 2);
      ctx.stroke();
      if (!reduced)
        for (let j = 0; j < 8; j++) {
          const a = (j * Math.PI) / 4;
          circle(
            e.x + Math.cos(a) * t * (e.kind === "bomb" ? 64 : 27),
            e.y + Math.sin(a) * t * (e.kind === "bomb" ? 64 : 27),
            2,
            color,
          );
        }
    }
    ctx.globalAlpha = 1;
  }
  if (s.phase === "ready") {
    circle(s.origin, FLOOR, 12, "#a9efd418");
    circle(s.origin, FLOOR, 5, "#f8eed3");
    text(
      `×${s.ballCount}`,
      Math.max(25, Math.min(W - 25, s.origin)),
      FLOOR + 17,
      "#a9efd4",
      11,
    );
    if (aim) preview(s, aim);
    else {
      ctx.strokeStyle = "#a9efd45c";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(s.origin, FLOOR - 18);
      ctx.lineTo(s.origin, FLOOR - 42);
      ctx.moveTo(s.origin - 5, FLOOR - 36);
      ctx.lineTo(s.origin, FLOOR - 42);
      ctx.lineTo(s.origin + 5, FLOOR - 36);
      ctx.stroke();
      if (s.round === 1) {
        text("往 上 拖 · 放 開 射", W / 2, 327, "#b0c7b9", 15, 600);
        text("找角度，讓每一顆球多彈幾次", W / 2, 350, "#6f928c", 11, 500);
      }
    }
  } else if (s.phase === "volley") {
    text(
      `場上 ${s.balls.length} · 待發 ${s.pending}`,
      W / 2,
      FLOOR + 16,
      "#a3bcb6",
      10,
      500,
    );
  }
}
function put(id, value) {
  if ($(id).textContent !== String(value)) $(id).textContent = String(value);
}
function updateHUD() {
  const s = game.state;
  put("score", s.score);
  put("best", game.best);
  put("round", s.round);
  put("balls", s.ballCount);
  put(
    "status",
    game.paused
      ? "暫停中 · 繼續後再出發"
      : s.phase === "volley"
        ? `${s.message} · ${Math.max(0, Math.ceil(MAX_VOLLEY - s.elapsed))} 秒後自動收回`
        : s.message,
  );
  for (const type of Object.keys(itemNames)) {
    put("item-" + type + "-count",s.inventory[type]);
    $("item-" + type).disabled = s.phase !== "ready" || game.paused || s.inventory[type] === 0;
    $("item-" + type).setAttribute("aria-pressed",String(s.selected === type));
    $("item-" + type).setAttribute("aria-label",`${itemNames[type]}，庫存 ${s.inventory[type]}，上限 3${s.selected === type ? "，已選取，再點取消" : ""}`);
  }
  put("item-status",s.active ? `${itemNames[s.active]}生效${s.active === "blast" && s.blastSpent ? " · 已引爆" : ""}` : s.selected ? `${itemNames[s.selected]}已裝備 · 發射才扣 1` : "點選裝備 · 再點取消 · 上限 3");
  for(const mode of ["square","honeycomb"]) $("mode-"+mode).setAttribute("aria-pressed", String(s.mode === mode));
  canvas.dataset.mode = s.mode;
  canvas.dataset.firstImpact = JSON.stringify(s.firstImpact);
  canvas.dataset.impactHistory = JSON.stringify(s.impactHistory);
  canvas.dataset.bombCount = s.bombCount;
  canvas.dataset.lastBomb = JSON.stringify(s.lastBomb);
  canvas.dataset.reducedMotion = String(reduced);
  canvas.dataset.selected = s.selected ?? "";
  canvas.dataset.active = s.active ?? "";
  canvas.dataset.lastDamage = s.lastDamage;
  canvas.dataset.firstImpactBrick = s.firstImpactBrick ?? "";
  canvas.dataset.blastCount = s.blastCount;
  canvas.dataset.blastTargets = s.blastTargets;
  canvas.dataset.bricks = JSON.stringify(s.bricks.map(({id,x,y,w,h,hp,reward,shape,kind})=>({id,x,y,w,h,hp,reward,shape,kind})));
  if (!aim) {
    canvas.dataset.previewDistance = "0";
    canvas.dataset.previewBounces = "0";
    canvas.dataset.previewStop = "";
    canvas.dataset.previewBrick = "";
    canvas.dataset.previewEnd = "null";
    canvas.dataset.previewNormal = "null";
    canvas.dataset.previewReflection = "null";
    canvas.dataset.previewFirstStop = "";
    canvas.dataset.previewFirstImpact = "null";
    canvas.dataset.previewFirstPoint = "null";
    canvas.dataset.previewImpacts = "[]";
    canvas.dataset.previewMarkers = "[]";
    canvas.dataset.previewPoints = "[]";
    canvas.dataset.previewIterations = "0";
  }
  canvas.dataset.phase = s.phase;
  canvas.dataset.hits = s.hits;
  canvas.dataset.origin = s.origin;
  canvas.dataset.elapsed = s.elapsed.toFixed(3);
  $("recall").disabled = s.phase !== "volley" || game.paused;
  put("pause", manualPause ? "繼續" : "暫停");
  $("pause").disabled = s.phase === "over";
  const over = s.phase === "over";
  $("overlay").hidden = !(over || manualPause);
  if (over || manualPause) {
    put("overlay-label", over ? "本局結束" : "暫停中");
    put("overlay-title", over ? "下一次，彈得更遠" : "喘口氣，再出發");
    put(
      "overlay-detail",
      over
        ? `得分 ${s.score} · 最高 ${game.best} · 第 ${s.round} 回合`
        : "彈珠與倒數已暫停",
    );
    put("overlay-action", over ? "再玩一局" : "繼續遊戲");
  }
}
function frame(time) {
  const dt = lastTime ? (time - lastTime) / 1000 : 0;
  lastTime = time;
  game.tick(dt);
  updateHUD();
  draw(game.state, time);
  requestAnimationFrame(frame);
}
resize();
updateHUD();
requestAnimationFrame(frame);
