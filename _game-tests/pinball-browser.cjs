const { chromium } = require(
  process.env.PLAYWRIGHT_PATH || "/tmp/ttt-browser/node_modules/playwright",
);
const assert = require("node:assert/strict");
const url = process.env.GAME_URL || "http://127.0.0.1:8765/pocket-pinball/";
(async () => {
  const browser = await chromium.launch({ headless: true });
  const errors = [];
  try {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    await page.goto(url);
    await page.locator("#arena").waitFor();
    const cdp = await context.newCDPSession(page);
    async function touch(type, x, y) {
      await cdp.send("Input.dispatchTouchEvent", {
        type,
        touchPoints:
          type === "touchEnd" || type === "touchCancel"
            ? []
            : [{ x, y, id: 0, radiusX: 3, radiusY: 3, force: 1 }],
      });
    }
    async function drag(cancel = false) {
      const box = await page.locator("#arena").boundingBox();
      const origin = Number(
        await page.locator("#arena").getAttribute("data-origin"),
      );
      const x = box.x + (box.width * origin) / 350;
      await touch("touchStart", x, box.y + (box.height * 472) / 500);
      await touch("touchMove", x, box.y + box.height * 0.38);
      await page.waitForTimeout(100);
      await touch(
        cancel ? "touchCancel" : "touchEnd",
        x,
        box.y + box.height * 0.38,
      );
    }
    async function fit() {
      const result = await page.evaluate(() => ({
        w: innerWidth,
        h: innerHeight,
        sw: document.documentElement.scrollWidth,
        sh: document.documentElement.scrollHeight,
        rect: document.querySelector("main").getBoundingClientRect().toJSON(),
        dpr: devicePixelRatio,
        cw: document.querySelector("canvas").width,
        css: document.querySelector("canvas").getBoundingClientRect().width,
      }));
      assert.ok(result.sw <= result.w);
      assert.ok(result.sh <= result.h + 1);
      assert.ok(result.rect.bottom <= result.h + 1);
      assert.ok(result.cw >= result.css * result.dpr - 2);
      return result;
    }
    console.log("mobile fit", await fit());
    await drag(true);
    assert.equal(
      await page.locator("#arena").getAttribute("data-phase"),
      "ready",
    );
    await drag();
    await page.waitForFunction(
      () => document.querySelector("#arena").dataset.phase === "volley",
    );
    await page.waitForFunction(
      () => Number(document.querySelector("#arena").dataset.hits) > 0,
      {},
      { timeout: 8000 },
    );
    await page.waitForFunction(
      () =>
        document.querySelector("#arena").dataset.phase === "ready" &&
        Number(document.querySelector("#round").textContent) >= 2,
      {},
      { timeout: 30000 },
    );
    const score = Number(await page.locator("#score").textContent());
    assert.ok(score > 0);
    assert.equal(Number(await page.locator("#best").textContent()), score);
    console.log("native touch gameplay", {
      score,
      round: await page.locator("#round").textContent(),
      hits: await page.locator("#arena").getAttribute("data-hits"),
    });
    await page.screenshot({ path: "/tmp/pinball-mobile.png" });
    await drag();
    await page.waitForFunction(
      () => document.querySelector("#arena").dataset.phase === "volley",
    );
    await page.locator("#pause").click();
    const before = await page.locator("#arena").getAttribute("data-elapsed");
    await page.waitForTimeout(300);
    assert.equal(
      await page.locator("#arena").getAttribute("data-elapsed"),
      before,
    );
    await page.locator("#pause").click();
    await page.locator("#recall").click();
    await page.waitForFunction(
      () => document.querySelector("#round").textContent === "3",
    );
    assert.equal(await page.locator("#round").textContent(), "3");
    await page.locator("#restart").click();
    await page.waitForFunction(
      () => document.querySelector("#round").textContent === "1",
    );
    assert.equal(await page.locator("#score").textContent(), "0");
    assert.equal(await page.locator("#round").textContent(), "1");
    const best = await page.locator("#best").textContent();
    await page.reload();
    assert.equal(await page.locator("#best").textContent(), best);
    await page.setViewportSize({ width: 360, height: 640 });
    await page.waitForTimeout(150);
    console.log("small fit", await fit());
    await page.screenshot({ path: "/tmp/pinball-small.png" });
    await page.locator("#help").click();
    assert.ok(await page.locator("dialog").isVisible());
    await page.locator("#close-help").click();
    await drag();
    await page.waitForFunction(
      () => document.querySelector("#arena").dataset.phase === "volley",
    );
    await page.locator("#recall").click();
    await page.waitForFunction(
      () => document.querySelector("#round").textContent === "2",
    );
    assert.equal(await page.locator("#round").textContent(), "2");
    for (
      let i = 0;
      i < 12 &&
      (await page.locator("#arena").getAttribute("data-phase")) !== "over";
      i++
    ) {
      await drag();
      await page.waitForFunction(
        () => document.querySelector("#arena").dataset.phase === "volley",
      );
      const previous = await page.locator("#round").textContent();
      await page.locator("#recall").click();
      await page.waitForFunction(
        (r) => document.querySelector("#round").textContent !== r,
        previous,
      );
    }
    assert.equal(
      await page.locator("#arena").getAttribute("data-phase"),
      "over",
    );
    assert.ok(await page.locator("#overlay").isVisible());
    await page.locator("#overlay-action").click();
    await page.waitForFunction(
      () => document.querySelector("#arena").dataset.phase === "ready",
    );
    assert.equal(await page.locator("#score").textContent(), "0");
    assert.deepEqual(errors, []);
    console.log(
      "PASS cancellation, gameplay hits/score/next round, pause, recall, restart, reload record, both viewports, help, clean console",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
