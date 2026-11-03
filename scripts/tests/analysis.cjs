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
 for(let attempt=0;attempt<100;attempt++){
   try{const r=await fetch('http://127.0.0.1:8018/');if(r.ok)break;}catch{}
   if(attempt===99)throw new Error('Local server did not start');
   await new Promise(resolve=>setTimeout(resolve,150));
 }
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage']});
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
 const errors=[], failed=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('response',r=>{if(r.url().startsWith('http://127.0.0.1:8018')&&r.status()>=400)failed.push(r.url());});
 const base='http://127.0.0.1:8018';
 await page.goto(base+'/analisis/?utm_source=external-test&fbclid=testing',{waitUntil:'networkidle'});
 assert.equal(new URL(page.url()).search,'','Tracking parameters must be removed from visible URL');
 await page.getByRole('link',{name:'Leer investigación →'}).click();
 await page.waitForLoadState('networkidle');
 assert.equal(await page.locator('.municipality').count(),39);
 assert.equal(await page.locator('#map-emphasis').count(),1,'Existe una capa exclusiva para seleccionar municipios');
 assert.equal(await page.locator('#population-map').getAttribute('hidden'),null,'SVG no debe conservar atributo hidden');
 assert.equal(await page.locator('#population-map').isVisible(),true,'El mapa SVG debe ser visible, no solo existir');
 assert.equal(await page.locator('.municipality').first().isVisible(),true,'Los polígonos deben estar dibujados');
 assert.equal(await page.locator('.map-fallback').isVisible(),false,'El respaldo no debe duplicar el mapa ya renderizado');
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
 // Regression: la selección no puede sobreponer polígonos al panel lateral.
 await search.fill('guanacevi');await search.press('Enter');
 assert.equal(await page.locator('#municipality-detail h3').textContent(),'Guanaceví');
 const camera=page.locator('#map-camera');
 const panel=page.locator('.municipality-panel');
 // A diagnostic fill makes even a non-interactive polygon detectable in the painted pixels.
 const markPaths='.municipality { fill:#00ff00 !important; filter:none !important }';
 for(const width of [320,390,768,1024,1440]){
   await page.setViewportSize({width,height:900});
   assert.equal(await camera.getAttribute('viewBox'),'0 0 670 680','Selection preserves the statewide view');
   for(let step=0;step<4;step++)await page.locator('#zoom-in').click();
   assert.equal(await camera.evaluate(el=>el.viewBox.baseVal.width),134,'Manual zoom reaches 5×');
   for(const region of [panel,page.locator('#zoom-in'),page.locator('#zoom-reset')]){
     await region.scrollIntoViewIfNeeded();
     const box=await region.boundingBox();
     // Exclude fractional border pixels shared with the adjacent map.
     const x=Math.ceil(Math.max(0,box.x))+2, y=Math.ceil(Math.max(0,box.y))+2;
     const clip={x,y,width:Math.floor(Math.min(width,box.x+box.width))-x-2,
       height:Math.floor(Math.min(900,box.y+box.height))-y-2};
     const shot=await page.screenshot({clip,style:markPaths,animations:'disabled'});
     const leaked=await page.evaluate(async encoded=>{
       const img=new Image();
       img.src='data:image/png;base64,'+encoded;
       await img.decode();
       const canvas=document.createElement('canvas');
       canvas.width=img.width;canvas.height=img.height;
       const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);
       const pixels=ctx.getImageData(0,0,img.width,img.height).data;
       for(let i=0;i<pixels.length;i+=4){
         if(pixels[i]<20 && pixels[i+1]>235 && pixels[i+2]<20)return true;
       }
       return false;
     },shot.toString('base64'));
     assert.equal(leaked,false,'Map paints over '+await region.getAttribute('class')+' at '+width+' px');
   }
   await page.locator('#zoom-out').click();
   await page.locator('#zoom-reset').click();
   assert.equal(await page.locator('#municipality-detail h3').textContent(),'Guanaceví');
 }
 await page.getByRole('button',{name:'Vista estatal'}).click();
 await search.fill('noexiste');assert.equal(await page.locator('#search-results').innerText(),'No se encontraron municipios.');
 await search.press('Escape');assert.equal(await search.getAttribute('aria-expanded'),'false');
 await search.fill('gomez');await search.press('ArrowDown');await search.press('Enter');
 assert.equal(await page.locator('#municipality-detail h3').textContent(),'Gómez Palacio');
 await page.locator('#compare-municipality').selectOption('10005');
 assert.match(await page.locator('#comparison-detail').innerText(),/78,451/);
 assert.match(await page.locator('#comparison-detail').innerText(),/2\.81 puntos porcentuales inferior/);
 assert.equal(await page.locator('#comparison-detail .comparison-card').count(),2,'Cada municipio dispone de tarjeta propia');
 assert.equal(await page.locator('#map-emphasis .map-letter-marker').count(),2,'Ambos municipios se marcan con A y B');
 const layoutBox=await page.locator('.map-layout').boundingBox();
 const comparisonBox=await page.locator('#comparison-detail').boundingBox();
 assert.ok(comparisonBox.y>=layoutBox.y+layoutBox.height-2,'El comparador debe mostrarse debajo del mapa');
 assert.ok(layoutBox.height<900,'El comparador no debe aumentar artificialmente la columna del mapa');
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
 // Click geographic polygons with real pointer input, resetting the viewport for each polygon.
 for(const r of rows){
   const reset=page.getByRole('button',{name:'Vista estatal'});
   if(await reset.isEnabled())await reset.click();
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
 await page.getByRole('button',{name:'Seleccionar Topia',exact:true}).click();
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
 await page.locator('#swap-municipalities').click();
 assert.equal(await page.locator('#municipality-detail h3').textContent(),'San Pedro del Gallo');
 assert.match(await page.locator('#comparison-detail').innerText(),/General Simón Bolívar/);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 // Verify local targets, metadata and useful no-JavaScript output.
 const links=await page.locator('a[href],link[href],script[src],img[src]').evaluateAll(es=>es.map(e=>e.href||e.src).filter(Boolean));
 for(const url of new Set(links.filter(u=>u.startsWith(base)))){ const res=await page.request.get(url);assert.equal(res.status(),200,url); }
 assert.equal(await page.locator('link[rel=canonical]').getAttribute('href'),'https://nostxlgia.com/analisis/poblacion-durango/');
 assert.equal(JSON.parse(await page.locator('script[type="application/ld+json"]').textContent())['@type'],'Article');
 const nojs=await browser.newPage({javaScriptEnabled:false});
 await nojs.goto(base+'/analisis/poblacion-durango/');
 assert.equal(await nojs.locator('tbody tr').count(),39);assert.equal(await nojs.locator('.map-fallback').count(),1);assert.equal(await nojs.locator('.map-fallback').isVisible(),true);
 await page.goto(base+'/analisis/poblacion-durango/?municipio=10005&utm_source=external-test#precision',{waitUntil:'networkidle'});
 assert.equal(new URL(page.url()).searchParams.has('utm_source'),false);
 assert.equal(new URL(page.url()).searchParams.get('municipio'),'10005');
 assert.equal(new URL(page.url()).hash,'#precision');
 assert.equal(await page.locator('#municipality-detail h3').textContent(),'Durango');
 const selectedMap=page.locator('.municipality[data-id="10005"]');
 await page.locator('#map-stage').scrollIntoViewIfNeeded();
 const hit=await selectedMap.evaluate(el=>{
   const box=el.getBBox(), matrix=el.getScreenCTM();
   for(let ix=1;ix<30;ix++)for(let iy=1;iy<30;iy++){
     const point=new DOMPoint(box.x+box.width*ix/30,box.y+box.height*iy/30);
     if(el.isPointInFill(point)){const out=point.matrixTransform(matrix);
       if(document.elementFromPoint(out.x,out.y)===el)return {x:out.x,y:out.y};}
   }
   throw new Error('Selected polygon has no visible hit target');
 });
 await page.mouse.click(hit.x,hit.y);
 assert.equal(await page.locator('#municipality-detail h3').textContent(),'El balance estatal');
 const phone=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
 await phone.goto(base+'/analisis/poblacion-durango/');
 const phoneStage=phone.locator('#map-stage');
 await phone.locator('.municipality').first().waitFor();
 await phoneStage.scrollIntoViewIfNeeded();
 const area=await phoneStage.boundingBox();
 const client=await phone.context().newCDPSession(phone);
 const pinch=(type,spread)=>client.send('Input.dispatchTouchEvent',{type,touchPoints:
   spread.map((offset,index)=>({x:area.x+area.width/2+offset,y:area.y+area.height/2,id:index+1}))});
 await pinch('touchStart',[-20,20]);await pinch('touchMove',[-40,40]);await pinch('touchEnd',[]);
 await phone.waitForFunction(()=>document.querySelector('#map-camera').viewBox.baseVal.width<670);
 await phone.locator('#zoom-reset').tap();
 await phone.waitForFunction(()=>document.querySelector('#map-camera').viewBox.baseVal.width===670);
 for(const id of ['10009','10030','10002']){
   await phoneStage.evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));
   const spot=await phone.waitForFunction(id=>{
     const path=document.querySelector('.municipality[data-id="'+id+'"]'), box=path.getBBox();
     // Prefer an interior point near the centre of each small polygon.
     for(const x of [.5,.4,.6,.3,.7,.2,.8])for(const y of [.5,.4,.6,.3,.7,.2,.8]){
       const pt=new DOMPoint(box.x+x*box.width,box.y+y*box.height);
       if(!path.isPointInFill(pt))continue;
       const pos=pt.matrixTransform(path.getScreenCTM());
       if(document.elementFromPoint(pos.x,pos.y)===path)return [pos.x,pos.y];
     }
   },id);
   await phone.touchscreen.tap(...await spot.jsonValue());
   await phone.waitForFunction(id=>new URL(location).searchParams.get('municipio')===id,id);
 }
 await phone.close();
 assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
 console.log(JSON.stringify({status:'PASS',municipalities:39,searches:39,polygonClicks:39,widths:[320,390,768,1024,1440],checks:['Guanaceví and 5× pixel checks','swap','data','search accents','empty search','keyboard','comparison','URL state reload','reset','ranking links','precision link','table','mobile navigation','mobile comparison','local targets','metadata','no-JavaScript','tracking cleanup','map click after deep link'],jsErrors:errors,localHttpErrors:failed},null,2));
 }finally{if(browser)await browser.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
