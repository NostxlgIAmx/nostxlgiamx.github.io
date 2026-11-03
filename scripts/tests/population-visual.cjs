/* Visual and geometric regression checks for the municipal analysis.
   Run: node scripts/tests/population-visual.cjs
*/
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
const {spawn}=require('node:child_process');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');

const root=path.resolve(__dirname,'../..');
const out=path.resolve(process.env.QA_ARTIFACTS||path.join(root,'qa-artifacts'));
const base='http://127.0.0.1:8019';
fs.mkdirSync(out,{recursive:true});

async function ready(){
  for(let attempt=0;attempt<100;attempt++){
    try{const r=await fetch(base+'/analisis/');if(r.ok)return;}catch{}
    await new Promise(resolve=>setTimeout(resolve,150));
  }
  throw new Error('HTTP test server did not start');
}
async function pixelDifference(page,first,second){
  return page.evaluate(async function(files){
    async function pixels(str){
      const img=new Image();img.src='data:image/png;base64,'+str;
      await img.decode();
      const canvas=document.createElement('canvas');
      canvas.width=img.width;canvas.height=img.height;
      const ctx=canvas.getContext('2d',{willReadFrequently:true});
      ctx.drawImage(img,0,0);
      return {width:img.width,height:img.height,data:ctx.getImageData(0,0,img.width,img.height).data};
    }
    const a=await pixels(files.a),b=await pixels(files.b);
    if(a.width!==b.width||a.height!==b.height)return -1;
    let different=0;
    for(let i=0;i<a.data.length;i+=4){
      if(Math.abs(a.data[i]-b.data[i])+Math.abs(a.data[i+1]-b.data[i+1])+Math.abs(a.data[i+2]-b.data[i+2])>45)different++;
    }
    return different/(a.width*a.height);
  },{a:first.toString('base64'),b:second.toString('base64')});
}
function approx(a,b,eps=2){return Math.abs(a-b)<=eps;}
(async()=>{
  const server=spawn('python',['-u','-m','http.server','8019','--bind','127.0.0.1','--directory',root]);
  let browser;
  try{
    await ready();
    browser=await chromium.launch({
      executablePath:process.env.CHROMIUM_PATH||undefined,
      headless:true,
      args:['--no-sandbox','--disable-dev-shm-usage']
    });
    const errors=[];
    for(const width of [320,390,768,1024,1440]){
      const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce',deviceScaleFactor:1});
      page.on('pageerror',err=>errors.push(width+': '+err.message));
      await page.goto(base+'/analisis/poblacion-durango/',{waitUntil:'networkidle'});
      await page.locator('.municipality').first().waitFor({state:'visible'});
      assert.equal(await page.locator('.municipality').count(),39);
      assert.equal(await page.locator('#comparison-detail').isVisible(),false);
      const layout=page.locator('.map-layout');
      const stage=page.locator('#map-stage');
      const baseline=await stage.screenshot({animations:'disabled'});
      await layout.screenshot({path:path.join(out,'map-initial-'+width+'.png'),animations:'disabled'});

      const search=page.locator('#municipality-search');
      await search.fill('Guanacevi');await search.press('Enter');
      assert.equal(await page.locator('#municipality-detail h3').textContent(),'Guanaceví');
      assert.equal(await page.locator('#map-emphasis .map-letter-marker').count(),1);
      assert.equal(await page.locator('#map-emphasis .map-emphasis-outline').count(),1);
      assert.equal(await page.locator('#map-emphasis .map-letter-primary text').textContent(),'A');
      const primary=await stage.screenshot({animations:'disabled'});
      const delta=await pixelDifference(page,baseline,primary);
      assert.ok(delta>.008,'Selected municipality must visibly change the map: '+width+' px; delta='+delta);
      const preCompare=await layout.boundingBox();
      await layout.screenshot({path:path.join(out,'map-selected-'+width+'.png'),animations:'disabled'});

      await page.locator('#compare-municipality').selectOption('10039');
      assert.equal(await page.locator('#map-emphasis .map-letter-marker').count(),2);
      assert.equal(await page.locator('#map-emphasis .map-emphasis-outline').count(),2);
      assert.deepEqual(await page.locator('#map-emphasis .map-letter-marker text').allTextContents(),['A','B']);
      assert.equal(await page.locator('#comparison-detail').isVisible(),true);
      assert.equal(await page.locator('.comparison-card').count(),2);
      assert.match(await page.locator('#comparison-detail').innerText(),/Nuevo Ideal/);
      assert.match(await page.locator('#comparison-detail').innerText(),/0\.24 puntos porcentuales superior/);
      const layoutBox=await layout.boundingBox(), compareBox=await page.locator('#comparison-detail').boundingBox();
      assert.ok(approx(layoutBox.height,preCompare.height,2),'Comparison changed map height at '+width+'px: '+preCompare.height+' -> '+layoutBox.height);
      assert.ok(compareBox.y>=layoutBox.y+layoutBox.height-2,'Comparison is not below map at '+width+'px');
      const markerBoxes=await page.locator('#map-emphasis .map-letter-marker').evaluateAll(nodes=>nodes.map(el=>{
        const b=el.getBoundingClientRect();
        return {width:b.width,height:b.height};
      }));
      assert.ok(markerBoxes.every(b=>b.width>=14&&b.height>=14),'Marker not visually large enough at '+width+'px');
      const selected=await stage.screenshot({animations:'disabled'});
      const compareDelta=await pixelDifference(page,primary,selected);
      assert.ok(compareDelta>.001,'B marker should modify map visibly at '+width+'px');
      await page.locator('#mapa').screenshot({path:path.join(out,'map-comparison-'+width+'.png'),animations:'disabled'});

      // The browser viewport must never acquire horizontal overflow.
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Horizontal overflow at '+width+'px');
      await page.locator('#swap-municipalities').click();
      assert.equal(await page.locator('#municipality-detail h3').textContent(),'Nuevo Ideal');
      assert.deepEqual(await page.locator('#map-emphasis .map-letter-marker text').allTextContents(),['A','B']);
      const afterSwap=await layout.boundingBox();
      assert.ok(approx(afterSwap.height,preCompare.height,2),'Swap stretched map at '+width+'px');

      // Reset selection must remove the comparison without changing the map layout.
      await page.getByRole('button',{name:'Vista estatal'}).click();
      assert.equal(await page.locator('#map-emphasis .map-letter-marker').count(),0);
      assert.equal(await page.locator('#comparison-detail').isVisible(),false);
      await page.close();
      process.stdout.write('Visual QA '+width+'px: PASS\n');
    }
    assert.deepEqual(errors,[],'Browser console errors');
    process.stdout.write('Population visual QA passed; screenshots: '+out+'\n');
  }finally{
    await browser?.close();
    server.kill('SIGTERM');
  }
})().catch(err=>{console.error(err);process.exitCode=1;});
