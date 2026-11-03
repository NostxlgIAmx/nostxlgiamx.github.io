/* Whole-site smoke, accessibility and content-integrity regression.
   Run from repository root: node scripts/tests/site-wide.cjs
*/
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawn}=require('node:child_process');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');

const root=path.resolve(__dirname,'../..');
const out=path.resolve(process.env.QA_ARTIFACTS||path.join(root,'qa-artifacts'));
const base='http://127.0.0.1:8021';
const routes=[
  {url:'/',name:'inicio'},
  {url:'/servicios/',name:'servicios'},
  {url:'/proyectos/',name:'proyectos'},
  {url:'/datos/',name:'datos'},
  {url:'/analisis/',name:'analisis'},
  {url:'/analisis/poblacion-durango/',name:'poblacion'},
  {url:'/contacto/',name:'contacto'},
  {url:'/privacidad/',name:'privacidad'}
];
async function ready(){
  for(let i=0;i<100;i++){
    try{const r=await fetch(base+'/');if(r.ok)return;}catch{}
    if(i===99)throw Error('No se inició el servidor local');
    await new Promise(resolve=>setTimeout(resolve,150));
  }
}
async function verifyUniqueLandmark(page,name){
  assert.equal(await page.locator('main#contenido').count(),1,'Falta main#contenido: '+name);
  const skip=page.locator('.skip-link[href="#contenido"]');
  assert.equal(await skip.count(),1,'Falta salto al contenido: '+name);
  await page.keyboard.press('Tab');
  const focused=await skip.evaluate(el=>document.activeElement===el);
  assert.equal(focused,true,'El enlace de salto no recibe el primer foco: '+name);
  const bounds=await skip.boundingBox();
  assert.ok(bounds && bounds.y>=0 && bounds.y<85,'El salto queda fuera de pantalla al recibir foco: '+name);
}
(async()=>{
  const server=spawn('python3',['-u','-m','http.server','8021','--bind','127.0.0.1','--directory',root]);
  let browser;
  try{
    fs.mkdirSync(out,{recursive:true});
    await ready();
    browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
    const sitemap=fs.readFileSync(path.join(root,'sitemap.xml'),'utf8');
    assert.match(sitemap,/<urlset\b/);
    assert.ok(routes.every(r=>sitemap.includes('https://nostxlgia.com'+r.url)),'El sitemap no incluye las ocho páginas');
    assert.match(fs.readFileSync(path.join(root,'robots.txt'),'utf8'),/Sitemap: https:\/\/nostxlgia\.com\/sitemap\.xml/);
    for(const width of [320,390,768,1024,1440]){
      const context=await browser.newContext({viewport:{width,height:900},deviceScaleFactor:1,reducedMotion:'reduce'});
      for(const route of routes){
        const page=await context.newPage();
        const errors=[];
        page.on('pageerror',e=>errors.push(e.message));
        const response=await page.goto(base+route.url,{waitUntil:'domcontentloaded'});
        assert.equal(response.status(),200,'HTTP en '+route.url);
        await verifyUniqueLandmark(page,route.name);
        assert.equal(await page.locator('link[rel="canonical"]').count(),1,'Canonical ausente: '+route.name);
        assert.equal(await page.locator('meta[property="og:title"]').count(),1,'Open Graph título ausente: '+route.name);
        assert.equal(await page.locator('meta[property="og:url"]').count(),1,'Open Graph URL ausente: '+route.name);
        const horizontal=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
        assert.ok(horizontal<=2,route.name+' tiene desbordamiento horizontal a '+width+'px: '+horizontal+'px');
        if([390,1440].includes(width)){
          await page.screenshot({path:path.join(out,'audit-'+route.name+'-'+width+'.png'),animations:'disabled'});
        }
        if(route.name==='inicio'){
          const reset=page.locator('[data-hero-replay]');
          const box=await reset.boundingBox();
          assert.ok(box.width>=43&&box.height>=43,'Control de reinicio demasiado pequeño: '+width+'px');
          for(const id of ['territorio','comercial','evaluacion','electoral'])
            assert.equal(await page.locator('.home-project-grid a[href="proyectos/#'+id+'"]').count(),1,'Enlace de proyecto ausente');
        }
        if(route.name==='servicios'){
          assert.equal(await page.locator('.services-index-link').count(),6);
          const arrows=await page.locator('.services-index-arrow').allTextContents();
          assert.ok(arrows.every(s=>s==='↓'),'Las anclas de Servicios usan una dirección incorrecta');
        }
        if(route.name==='proyectos'){
          for(const id of ['territorio','comercial','evaluacion','electoral'])
            assert.equal(await page.locator('article.project-feature#'+id).count(),1,'Ancla inexistente '+id);
        }
        if(route.name==='datos'){
          assert.equal(await page.locator('a[download]').count(),9,'Número inesperado de descargas');
          const labels=await page.locator('a[download]').allTextContents();
          assert.ok(labels.every(s=>s.includes('CSV')),'Descargas sin formato declarado');
          await page.locator('[data-viz="denue-context"] select[data-mun]').waitFor({state:'attached',timeout:12000});
          await page.waitForFunction(()=>document.querySelector('[data-viz="enoe-sector"] .dv-chart-note')?.textContent.includes('4,515'),null,{timeout:12000});
          const options=await page.locator('[data-viz="denue-context"] select[data-mun] option').allTextContents();
          assert.equal(options.length,40,'Faltan opciones municipales');
          const names=options.slice(1);
          assert.deepEqual(names,[...names].sort((a,b)=>a.localeCompare(b,'es-MX',{sensitivity:'base'})),'Selector DENUE no alfabético');
          const keyboard=page.locator('[data-viz="denue-context"] .denue-v5-mun[tabindex="0"]');
          assert.equal(await keyboard.count(),1,'El mapa debe tener una única parada de tabulación');
          await keyboard.focus();
          await page.keyboard.press('ArrowDown');
          const focused=page.locator('[data-viz="denue-context"] .denue-v5-mun:focus');
          assert.equal(await focused.count(),1,'Flechas del mapa no mueven el foco');
          await page.keyboard.press('Enter');
          assert.equal(await focused.getAttribute('aria-pressed'),'true','Enter no selecciona municipio DENUE');
          await page.keyboard.press('Space');
          assert.equal(await focused.getAttribute('aria-pressed'),'false','Espacio no deselecciona exactamente una vez');
          await page.keyboard.press('Space');
          assert.equal(await focused.getAttribute('aria-pressed'),'true','Espacio no selecciona exactamente una vez');
          assert.equal(errors.length,0,'Error JS en Datos: '+errors.join('; '));
        }
        if(route.name==='contacto'){
          assert.equal(await page.locator('.privacy-disclosure a[href="../privacidad/"]').count(),1,'Falta enlace de privacidad en formulario');
          assert.equal(await page.locator('input[name="correo"][type="email"][required]').count(),1);
          assert.equal(await page.locator('textarea[name="mensaje"][required]').count(),1);
        }
        if(route.name==='privacidad'){
          assert.match(await page.locator('main').innerText(),/FormSubmit/);
          assert.match(await page.locator('main').innerText(),/NostxlgIA@proton\.me/);
        }
        if(width<=768){
          const toggle=page.locator('.nav-toggle');
          assert.equal(await toggle.isVisible(),true,'Menú móvil ausente '+route.name);
          await toggle.click();
          assert.equal(await toggle.getAttribute('aria-expanded'),'true','Menú no abre '+route.name);
          await page.keyboard.press('Escape');
          assert.equal(await toggle.getAttribute('aria-expanded'),'false','Menú no cierra con Escape '+route.name);
        }
        await page.close();
      }
      await context.close();
      process.stdout.write('Site-wide QA '+width+'px: PASS\n');
    }
  }finally{
    await browser?.close();server.kill('SIGTERM');
  }
  process.stdout.write('Site-wide audit PASS. Capturas: '+out+'\n');
})().catch(err=>{console.error(err);process.exitCode=1;});