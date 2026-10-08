// Read only authoritative UI coordinates; all control uses real keyboard events.
async function completeCourse(page,id){
 await page.locator('#arena').focus();await page.keyboard.down('ArrowRight');
 try{
  for(const edge of [280,580,880]){
   await page.waitForFunction(({id,edge})=>Number(document.querySelector(`[data-player="${id}"]`).dataset.x)>=edge,{id,edge},{timeout:7000,polling:10});
   await page.keyboard.down('Space');await page.waitForTimeout(700);await page.keyboard.up('Space');
  }
  await page.waitForFunction(id=>document.querySelector(`[data-player="${id}"]`).textContent.includes('通關'),id,{timeout:7000});
 }finally{await page.keyboard.up('Space');await page.keyboard.up('ArrowRight');}
}
module.exports={completeCourse};
