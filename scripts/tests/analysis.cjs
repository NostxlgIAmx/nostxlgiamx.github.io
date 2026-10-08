/* Run with PLAYWRIGHT_MODULE pointing to playwright-core and CHROMIUM_PATH to a Chromium binary. */
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
const {spawn}=require('node:child_process');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'../..');
const rows=JSON.parse(fs.readFileSync(path.join(root,'assets/data/analisis/poblacion-durango.json'))).municipalities;
(async()=>{
 const server=spawn('python',['-u','-m','http.server','8018','--directory',root]);
 let browser;
 try {
 await new Promise(resolve=>server.stdout.once('data',resolve));
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage']});
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
 const errors=[], failed=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('response',r=>{if(r.url().startsWith('http://127.0.0.1:8018')&&r.status()>=400)failed.push(r.url());});
 const base='http://127.0.0.1:8018';
 await page.goto(base+'/analisis/',{waitUntil:'networkidle'});
 await page.getByRole('link',{name:'Leer investigación →'}).click();
 await page.waitForLoadState('networkidle');
 assert.equal(await page.locator('.municipality').count(),39);
 const search=page.locator('#municipality-search');
 for(const r of rows){
   await search.fill(r.name.normalize('NFD').replace(/[\u0300-\u036f]/g,''));
   await search.press('Enter');
   assert.equal(await page.locator('#municipality-detail h3').textContent(),r.name);
   const values=await page.locator('#municipality-detail dd').allTextContents();
   assert.deepEqual(values,[r.p20.toLocaleString('es-MX'),r.p25.toLocaleString('es-MX')]);
   assert.equal(await page.locator(`.municipality[data-id="${r.id}"]`).getAttribute('aria-pressed'),'true');
   assert.equal(new URL(page.url()).searchParams.get('municipio'),r.id);
 }
 await search.fill('noexiste');assert.equal(await page.locator('#search-results').innerText(),'No se encontraron municipios.');
 await search.press('Escape');assert.equal(await search.getAttribute('aria-expanded'),'false');
 await search.fill('gomez');await search.press('ArrowDown');await search.press('Enter');
 assert.equal(await page.locator('#municipality-detail h3').textContent(),'Gómez Palacio');
 await page.locator('#compare-municipality').selectOption('10005');
 assert.match(await page.locator('#comparison-detail').innerText(),/78,451/);
 assert.match(await page.locator('#comparison-detail').innerText(),/2\.81 puntos porcentuales por debajo/);
 assert.equal(await page.locator('.is-comparison').getAttribute('data-id'),'10005');
 await page.reload({waitUntil:'networkidle'});assert.equal(await page.locator('#compare-municipality').inputValue(),'10005');
 assert.equal(await page.locator('#municipality-detail h3').textContent(),'Gómez Palacio');
 await page.getByRole('button',{name:'Vista estatal'}).click();
 assert.equal(await page.locator('.municipality[aria-pressed=true]').count(),0);
 assert.equal(await page.locator('#compare-municipality').isDisabled(),true);
 const durango=page.locator('.municipality[data-id="10005"]');
 await durango.focus();await durango.press('Enter');assert.equal(await page.locator('#municipality-detail h3').textContent(),'Durango');
 await durango.press('ArrowRight');await page.keyboard.press('Enter');
 assert.notEqual(await page.locator('#municipality-detail h3').textContent(),'Durango');
 await page.getByRole('button',{name:'Vista estatal'}).click();
 // Click all geographic polygons at an interior SVG point, using true mouse input.
 for(const r of rows){
   const p=page.locator(`.municipality[data-id="${r.id}"]`);
   await p.scrollIntoViewIfNeeded();
   const spot=await p.evaluate(el=>{
     const box=el.getBBox(),matrix=el.getScreenCTM();
     for(let ix=1;ix<30;ix++)for(let iy=1;iy<30;iy++){
       const point=new DOMPoint(box.x+box.width*ix/30,box.y+box.height*iy/30);
       if(el.isPointInFill(point) && [[-3,0],[3,0],[0,-3],[0,3],[-2,-2],[2,2]].every(([dx,dy])=>el.isPointInFill(new DOMPoint(point.x+dx,point.y+dy)))){
         const out=point.matrixTransform(matrix);
         if(document.elementFromPoint(out.x,out.y)===el)return {x:out.x,y:out.y};
       }
     }throw new Error('No clickable interior for '+el.dataset.id);
   });
   await page.mouse.click(spot.x,spot.y);
   assert.equal(await page.locator('#municipality-detail h3').textContent(),r.name);
 }
 await page.getByRole('button',{name:'Ver Topia en el mapa',exact:true}).click();
 assert.equal(await page.locator('#municipality-detail h3').textContent(),'Topia');
 await page.getByText('Sobre la precisión de 2025',{exact:true}).click();
 assert.equal(await page.locator('#precision').getAttribute('open'),'');
 await page.getByText('Las cifras de los 39 municipios',{exact:true}).click();
 assert.equal(await page.locator('tbody tr').count(),39);
 for(const width of [320,390,768,1024,1440]){
   await page.setViewportSize({width,height:900});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Overflow at '+width);
 }
 await page.setViewportSize({width:390,height:844});
 await page.evaluate(()=>scrollTo(0,0));
 await page.getByRole('button',{name:'Abrir navegación'}).click();
 assert.equal(await page.locator('.nav-toggle').getAttribute('aria-expanded'),'true');
 await page.getByRole('navigation',{name:'Navegación principal'}).getByRole('link',{name:'Análisis',exact:true}).click();
 assert.equal(new URL(page.url()).pathname,'/analisis/');
 await page.getByRole('link',{name:'Leer investigación →'}).click();
 await search.fill('simon');await search.press('Enter');
 assert.equal(await page.locator('#municipality-detail h3').textContent(),'General Simón Bolívar');
 await page.locator('#compare-municipality').selectOption('10030');
 assert.match(await page.locator('#comparison-detail').innerText(),/San Pedro del Gallo/);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 // Verify local targets, metadata and useful no-JavaScript output.
 const links=await page.locator('a[href],link[href],script[src],img[src]').evaluateAll(es=>es.map(e=>e.href||e.src).filter(Boolean));
 for(const url of new Set(links.filter(u=>u.startsWith(base)))){ const res=await page.request.get(url);assert.equal(res.status(),200,url); }
 assert.equal(await page.locator('link[rel=canonical]').getAttribute('href'),'https://nostxlgia.com/analisis/poblacion-durango/');
 assert.equal(JSON.parse(await page.locator('script[type="application/ld+json"]').textContent())['@type'],'Article');
 const nojs=await browser.newPage({javaScriptEnabled:false});
 await nojs.goto(base+'/analisis/poblacion-durango/');
 assert.equal(await nojs.locator('tbody tr').count(),39);assert.equal(await nojs.locator('.municipality').count(),39);
 assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
 console.log(JSON.stringify({status:'PASS',municipalities:39,searches:39,polygonClicks:39,widths:[320,390,768,1024,1440],checks:['data','search accents','empty search','keyboard','comparison','URL state reload','reset','ranking links','precision link','table','mobile navigation','mobile comparison','local targets','metadata','no-JavaScript'],jsErrors:errors,localHttpErrors:failed},null,2));
 }finally{if(browser)await browser.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
