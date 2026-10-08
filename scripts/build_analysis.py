"""Build the editorial collection with Python's standard library.

Each article owns its HTML body and optional JS/CSS. Shared shell and metadata
provide consistency, without imposing a chart or dashboard schema.
Run from any directory: python scripts/build_analysis.py
"""
from pathlib import Path
from html import escape
import json

ROOT=Path(__file__).resolve().parents[1]
CONTENT=ROOT/'content/analisis'
articles=json.loads((CONTENT/'articles.json').read_text())
header=(ROOT/'scripts/templates/editorial-header.html').read_text()
footer=(ROOT/'scripts/templates/editorial-footer.html').read_text()
DOMAIN='https://nostxlgia.com'

def page(title,description,path,body,image,schema,scripts=(),image_alt=""):
    is_article = schema.get("@type") == "Article"
    return f'''<!doctype html>
<html lang="es"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{escape(title)} | NostxlgIA</title>
<meta name="description" content="{escape(description,quote=True)}"><meta name="theme-color" content="#090f18">
<link rel="canonical" href="{DOMAIN}{path}">
<meta property="og:type" content="{'article' if is_article else 'website'}"><meta property="og:locale" content="es_MX"><meta property="og:site_name" content="NostxlgIA">
<meta property="og:title" content="{escape(title,quote=True)}"><meta property="og:description" content="{escape(description,quote=True)}"><meta property="og:url" content="{DOMAIN}{path}">
<meta property="og:image" content="{DOMAIN}/assets/images/analisis/{image}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="{escape(image_alt,quote=True)}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="{escape(title,quote=True)}"><meta name="twitter:description" content="{escape(description,quote=True)}"><meta name="twitter:image" content="{DOMAIN}/assets/images/analisis/{image}">
<link rel="icon" type="image/svg+xml" href="/assets/images/favicon.svg">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&amp;family=Inter:wght@400;500;600;700;800&amp;display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/css/styles.css"><link rel="stylesheet" href="/assets/css/site-polish.css" data-site-polish><link rel="stylesheet" href="/assets/css/editorial.css?v=20261008">
<script type="application/ld+json">{json.dumps(schema,ensure_ascii=False).replace('</','<\\/')}</script>
</head><body class="editorial-page"><a class="skip-link" href="#contenido">Saltar al contenido</a>{header}<main id="contenido">{body}</main>{footer}<script src="/assets/js/main.js?v=20261008"></script>{''.join(f'<script src="/assets/js/{s}?v=20261008"></script>' for s in scripts)}</body></html>'''

def n(x):return f'{x:,}'
def signed(x):return ('−' if x<0 else '+')+n(abs(x))
def pct(x):return ('−' if x<0 else '+')+f'{abs(x):.2f} %'

for a in articles:
    path=f'/analisis/{a["slug"]}/'
    body=(CONTENT/a['slug']/'body.html').read_text()
    if a['slug']=='poblacion-durango':
        data=json.loads((ROOT/'assets/data/analisis/poblacion-durango.json').read_text())
        rows=data['municipalities']
        body=body.replace('{{MAP}}',(ROOT/'assets/data/analisis/durango-map.svg').read_text())
        body=body.replace('{{OPTIONS}}',''.join(f'<option value="{r["id"]}">{escape(r["name"])}</option>' for r in rows))
        body=body.replace('{{TABLE}}',''.join(f'<tr><th scope="row">{escape(r["name"])}</th><td>{n(r["p20"])}</td><td>{n(r["p25"])}</td><td class="{"positive" if r["delta"]>0 else "negative"}">{signed(r["delta"])}</td><td class="{"positive" if r["delta"]>0 else "negative"}">{pct(r["pct"])}</td></tr>' for r in rows))
        for tag,reverse in [('GROWTH_RANK',True),('DECLINE_RANK',False)]:
            rank=sorted(rows,key=lambda r:r['pct'],reverse=reverse)[:5]
            body=body.replace('{{'+tag+'}}',''.join(f'<button class="rank-row" data-select-municipality="{r["id"]}" aria-label="Ver {escape(r["name"])} en el mapa"><span class="rank-no">{i+1:02}</span><span class="rank-name">{escape(r["name"])}<small>{signed(r["delta"])} residentes</small></span><span class="rank-value {"positive" if r["delta"]>0 else "negative"}">{pct(r["pct"])}</span></button>' for i,r in enumerate(rank)))
        body+='<script type="application/json" id="population-data">'+json.dumps(data,ensure_ascii=False).replace('</','<\\/')+'</script>'
    assert '{{' not in body, 'Unresolved content placeholder'
    schema={'@context':'https://schema.org','@type':'Article','headline':a['title'],'description':a['description'],'datePublished':a['date'],'dateModified':a['date'],'author':{'@type':'Organization','name':'NostxlgIA','url':DOMAIN},'publisher':{'@type':'Organization','name':'NostxlgIA'},'mainEntityOfPage':DOMAIN+path,'image':DOMAIN+'/assets/images/analisis/'+a['image'],'inLanguage':'es-MX','articleSection':a['category']}
    target=ROOT/path.strip('/');target.mkdir(parents=True,exist_ok=True)
    (target/'index.html').write_text(page(a['title'],a['description'],path,body,a['image'],schema,a.get('scripts',[]),a.get('imageAlt','')))

cards=[]
for a in articles:
    cards.append(f'''<article class="catalog-article"><a class="catalog-map" href="{a['slug']}/" tabindex="-1" aria-hidden="true"><img src="/assets/images/analisis/{a['thumbnail']}" width="670" height="680" alt="" fetchpriority="high"><span>{escape(a.get("thumbnailCaption",a["category"]))}</span></a><div class="catalog-copy"><span class="eyebrow">{escape(a['category'])}</span><h2 class="display"><a href="{a['slug']}/">{escape(a['title'])}</a></h2><p>{escape(a['description'])}</p><div class="catalog-meta"><time datetime="{a['date']}">{a['dateLabel']}</time> · {a['readingTime']}</div><a class="catalog-link" href="{a['slug']}/">Leer investigación →</a></div></article>''')
body='<div class="container"><header class="catalog-heading"><span class="eyebrow">Investigaciones</span><h1 class="display">Análisis.</h1><p>Una pregunta, datos y territorio. Investigaciones para entender qué cambia y dónde ocurre.</p></header><section class="catalog-list" aria-label="Investigaciones publicadas">'+''.join(cards)+'</section></div>'
schema={'@context':'https://schema.org','@type':'CollectionPage','name':'Análisis | NostxlgIA','url':DOMAIN+'/analisis/','hasPart':[{'@type':'Article','headline':a['title'],'url':DOMAIN+'/analisis/'+a['slug']+'/'} for a in articles]}
(ROOT/'analisis/index.html').write_text(page('Análisis','Investigaciones de NostxlgIA sobre población, economía, sociedad y territorio. Explora los datos y las diferencias detrás de cada pregunta.','/analisis/',body,articles[0]['image'],schema,image_alt=articles[0].get('imageAlt','')))
print(f'Built catalog and {len(articles)} article(s).')
