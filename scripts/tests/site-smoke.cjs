/* Site-wide smoke tests for concrete findings from the November audit.
   Run: node scripts/tests/site-smoke.cjs */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawn}=require('node:child_process');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'../..');
const site='http://127.0.0.1:8020';
const pages=['/','/servicios/','/proyectos/','/datos/','/analisis/','/analisis/poblacion-durango/','/contacto/'];
const substantive=fs.readFileSync(path.join(root,'datos/index.html'),'utf8');
assert.ok(substantive.includes('no dispone de zoom'));
assert.ok(substantive.includes('mismo levantamiento'));
assert.ok(!substantive.includes('acercarte moderadamente'));
assert.equal((substantive.match(/>Descargar CSV ↓<\/a>/g)||[]).length,9);
const csv=fs.readFileSync(path.join(root,'assets/data/recursos/enoe_sector_actividad_sexo_durango_2026t1.csv'),'utf8');
assert.ok(csv.includes('No especificado,4515,'));
const denue=fs.readFileSync(path.join(root,'assets/js/denue-context-map-v4.js'),'utf8');
assert.ok(denue.includes('sortedMuns'));
assert.ok(denue.includes("event.key==='Enter'"));
const style=fs.readFileSync(path.join(root,'assets/css/styles.css'),'utf8');
assert.ok(style.includes('.skip-link:focus-visible'));
assert.ok(style.includes('min-width:44px;min-height:44px'));
const xml=fs.readFileSync(path.join(root,'sitemap.xml'),'utf8');
for(const url of pages)assert.ok(xml.includes('https://nostxlgia.com'+url));
const projects=fs.readFileSync(path.join(root,'proyectos/index.html'),'utf8');
const home=fs.readFileSync(path.join(root,'index.html'),'utf8');
for(const target of ['territorio','comercial','evaluacion','electoral']){
 assert.ok(projects.includes('id="'+target+'"'),'Missing project target '+target);
 assert.ok(home.includes('href="proyectos/#'+target+'"'),'Missing direct home link '+target);
}
const homeStyle=fs.readFileSync(path.join(root,'assets/css/home.css'),'utf8');
assert.ok(homeStyle.includes('.home-project-link:focus-visible'),'Home project links require visible focus');
const projectsStyle=fs.readFileSync(path.join(root,'assets/css/projects-final.css'),'utf8');
assert.ok(projectsStyle.includes('.project-feature[id]{scroll-margin-top:110px}'),'Project anchors must clear fixed header');
const results=[];
const server=spawn('python',['-u','-m','http.server','8020','--bind','127.0.0.1','--directory',root],{stdio:'ignore'});
(async()=>{
 let browser;
 try{
  for(let i=0;i<100;i++){
    try{if((await fetch(site+'/')).ok)break;}catch{}
    if(i===99)throw Error('Static server did not start');
    await new Promise(resolve=>setTimeout(resolve,120));
  }
  browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  for(const width of [320,390,768,1024,1440]){
    const page=await browser.newPage({viewport:{width,height:850},reducedMotion:'reduce'});
    for(const route of pages){
      const response=await page.goto(site+route,{waitUntil:'domcontentloaded'});
      assert.equal(response.status(),200,route+' at '+width);
      assert.ok((await page.title()).includes('NostxlgIA'),route+' title');
      assert.equal(await page.locator('main#contenido').count(),1,route+' main landmark');
      await page.keyboard.press('Tab');
      const skip=page.locator('.skip-link');
      assert.equal(await skip.count(),1,'Skip link missing on '+route);
      assert.ok(await skip.evaluate(el=>getComputedStyle(el).position==='fixed'),'Skip link not positioned');
      assert.ok((await page.locator('link[rel="canonical"]').getAttribute('href')).startsWith('https://nostxlgia.com/'));
      results.push({route,width});
    }
    await page.goto(site+'/datos/',{waitUntil:'domcontentloaded'});
    const stage=page.locator('[data-viz="denue-context"]');
    await stage.locator('path.denue-v5-mun').first().waitFor({state:'attached',timeout:15000});
    assert.equal(await stage.locator('path.denue-v5-mun').count(),39);
    const select=stage.locator('select[data-mun]');
    const names=await select.locator('option').allTextContents();
    assert.deepEqual(names.slice(1),names.slice(1).sort((a,b)=>a.localeCompare(b,'es-MX')),'DENUE names not alphabetical');
    const first=stage.locator('path.denue-v5-mun').first();
    assert.equal(await first.getAttribute('tabindex'),'0');
    // Llegar mediante Tab, no .focus(): :focus-visible depende de la modalidad de teclado.
    await select.focus();
    await page.keyboard.press('Tab'); // selector Sector
    await page.keyboard.press('Tab'); // primer municipio SVG
    assert.equal(await first.evaluate(el=>document.activeElement===el),true,'Keyboard should reach first map municipality');
    assert.equal(await first.evaluate(el=>el.matches(':focus-visible')),true,'Keyboard focus must be visible');
    await page.waitForFunction(()=>getComputedStyle(document.querySelector('[data-viz="denue-context"] .denue-v5-mun')).stroke==='rgb(247, 220, 162)',null,{timeout:2500});
    const focusStyle=await first.evaluate(el=>({stroke:getComputedStyle(el).stroke,width:getComputedStyle(el).strokeWidth}));
    assert.equal(focusStyle.stroke,'rgb(247, 220, 162)','DENUE polygon must show keyboard focus');
    assert.ok(parseFloat(focusStyle.width)>=3,'DENUE keyboard focus should be visually substantial');
    await page.keyboard.press('Enter');
    assert.equal(await first.getAttribute('aria-pressed'),'true');
    await page.keyboard.press('Space');
    assert.equal(await first.getAttribute('aria-pressed'),'false');
    await page.close();
  }
  process.stdout.write('Site-wide smoke QA PASS ('+results.length+' route/viewport combinations; DENUE keyboard and sorting)\n');
 }finally{await browser?.close();server.kill('SIGTERM');}
})().catch(e=>{console.error(e);process.exitCode=1;});
