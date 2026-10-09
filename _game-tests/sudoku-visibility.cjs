const {chromium}=require('/tmp/ttt-browser/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch();try{const page=await browser.newPage();await page.goto(process.env.GAME_URL||'http://127.0.0.1:8765/sudoku/');await page.waitForFunction(()=>document.querySelectorAll('.cell[data-given]').length===81);await page.waitForTimeout(1200);
// Simulate the browser visibility API only, never puzzle state.
await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
await page.waitForTimeout(1100);const before=await page.locator('#time').innerText();await page.waitForTimeout(2200);assert.equal(await page.locator('#time').innerText(),before);
await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});document.dispatchEvent(new Event('visibilitychange'));});await page.waitForTimeout(2200);assert.notEqual(await page.locator('#time').innerText(),before);console.log('PASS visibility API integration: timer freezes and resumes');}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
