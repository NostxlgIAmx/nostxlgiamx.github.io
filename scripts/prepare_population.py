"""Validate the supplied data and compile a lightweight projected SVG map.

Build dependencies only: pyshp, shapely. No browser/runtime dependencies.
The original EPSG:6372 projection is retained; no approximate reprojection.
"""
from pathlib import Path
import csv, hashlib, html, json, unicodedata
import shapefile
from shapely.geometry import shape
from shapely import coverage_simplify, coverage_is_valid

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / 'content/analisis/poblacion-durango/source'
OUT = ROOT / 'assets/data/analisis'
rows = list(csv.DictReader((SRC/'10mun_DGO_Poblacion_2020_2025.csv').open(encoding='utf-8-sig')))
assert len(rows) == 39 and len({r['CVEGEO'] for r in rows}) == 39
reader = shapefile.Reader(str(SRC/'10mun'), encoding='iso8859-1')
records = list(reader.iterShapeRecords())
assert {r.record['CVEGEO'] for r in records} == {r['CVEGEO'] for r in rows}
data = []
def alphabetic(name):
    return ''.join(c for c in unicodedata.normalize('NFD',name.casefold()) if not unicodedata.combining(c))
for r in sorted(rows, key=lambda r: alphabetic(r['NOM_MUN25'])):
    p20, p25 = int(r['OCUPVIV20']), int(r['POBVPH25'])
    d = p25-p20
    assert p20 > 0 and p25 >= 0 and d == int(r['VABS_VPH'])
    assert abs(d/p20-float(r['VPCT_VPH'])) < 1e-8
    assert next(x.record['NOMGEO'] for x in records if x.record['CVEGEO']==r['CVEGEO']) == r['NOM_MUN25']
    data.append(dict(id=r['CVEGEO'], name=r['NOM_MUN25'], p20=p20, p25=p25, delta=d, pct=d/p20*100))
totals = dict(p20=sum(r['p20'] for r in data), p25=sum(r['p25'] for r in data))
totals['delta'] = totals['p25']-totals['p20']
totals['pct'] = totals['delta']/totals['p20']*100
totals['growth'] = sum(r['delta']>0 for r in data)
totals['decline'] = sum(r['delta']<0 for r in data)
assert totals['delta']==109953 and round(totals['pct'],2)==6.04
assert totals['growth']==18 and totals['decline']==21
geoms = [shape(x.shape.__geo_interface__) for x in records]
assert all(g.is_valid for g in geoms)
valid_coverage = bool(coverage_is_valid(geoms))
# Shared-border simplification only if the geometry is a valid polygon coverage.
# Otherwise keep original boundaries so independent simplification cannot open gaps.
simple = coverage_simplify(geoms, 160) if valid_coverage else geoms
xmin,ymin,xmax,ymax = reader.bbox
scale = 620/max(xmax-xmin,ymax-ymin)
def point(x,y): return ((x-xmin)*scale+40, (ymax-y)*scale+30)
def path(g):
    polygons = [g] if g.geom_type=='Polygon' else list(g.geoms)
    chunks=[]
    for p in polygons:
        for ring in [p.exterior, *p.interiors]:
            pts=[point(x,y) for x,y,*_ in ring.coords]
            chunks.append('M'+'L'.join(f'{x:.2f},{y:.2f}' for x,y in pts)+'Z')
    return ''.join(chunks)
def color(p):
    return '#ad5369' if p<=-10 else '#d98b98' if p<0 else '#426c80' if p==0 else '#70b5c6' if p<5 else '#36c5d6'
paths=[]
for rec,g in zip(records,simple):
    d=next(r for r in data if r['id']==rec.record['CVEGEO'])
    d['path']=path(g)
    d['center']=list(point(*g.representative_point().coords[0]))
    d['color']=color(d['pct'])
    paths.append(f'<path class="municipality" data-id="{d["id"]}" d="{d["path"]}" fill="{d["color"]}" role="button" tabindex="{0 if d["id"]=="10005" else -1}" aria-pressed="false" aria-label="{html.escape(d["name"])}: {d["pct"]:+.2f} %"><title>{html.escape(d["name"])} · {d["pct"]:+.2f} %</title></path>')
svg='<svg id="population-map" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 670 680" aria-labelledby="map-title map-desc"><title id="map-title">Cambio poblacional en los 39 municipios de Durango</title><desc id="map-desc">Residentes en viviendas particulares habitadas, 2020–2025. Azul: aumento. Rosa: disminución. Municipios seleccionables; flechas para recorrerlos y Enter para seleccionar.</desc><g>'+''.join(paths)+'</g></svg>'
(OUT/'durango-map.svg').write_text(svg)
(OUT/'poblacion-durango.json').write_text(json.dumps(dict(totals=totals,municipalities=[{k:v for k,v in r.items() if k not in ['path','color','center']} for r in data]),ensure_ascii=False,indent=2))
with (OUT/'poblacion-durango.csv').open('w',encoding='utf-8-sig',newline='') as f:
    w=csv.writer(f,lineterminator='\n');w.writerow(['CVEGEO','Municipio','Residentes_VPH_2020','Residentes_VPH_2025','Variacion_absoluta','Variacion_porcentual'])
    for r in data:w.writerow([r['id'],r['name'],r['p20'],r['p25'],r['delta'],round(r['pct'],8)])
audit=dict(totals=totals,municipalities=39,joined=39,missing=0,duplicate_keys=0,geometry_valid=True,coverage_valid=valid_coverage,projection='EPSG:6372',simplification_metres=160 if valid_coverage else 0,precision_measures='Not supplied; no significance inference',source_sha256={f.name:hashlib.sha256(f.read_bytes()).hexdigest() for f in SRC.iterdir()})
(ROOT/'content/analisis/poblacion-durango/audit.json').write_text(json.dumps(audit,indent=2))
# A true cartographic thumbnail; no illustrative/generated geography.
thumb='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 670 680"><rect width="670" height="680" fill="#0d1521"/><g stroke="#0d1521" stroke-width="1.2">'+''.join(f'<path d="{r["path"]}" fill="{r["color"]}"/>' for r in data)+'</g></svg>'
(ROOT/'assets/images/analisis/durango-map.svg').write_text(thumb)
print(json.dumps(audit,ensure_ascii=False,indent=2))
