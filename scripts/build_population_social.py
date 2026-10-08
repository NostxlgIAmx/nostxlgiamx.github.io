"""Create a 1200 × 630 sharing image from the actual municipal polygons."""
from pathlib import Path
import json
import shapefile
from PIL import Image, ImageDraw, ImageFont

ROOT=Path(__file__).resolve().parents[1]
data=json.loads((ROOT/'assets/data/analisis/poblacion-durango.json').read_text())
rows={r['id']:r for r in data['municipalities']}
reader=shapefile.Reader(str(ROOT/'content/analisis/poblacion-durango/source/10mun'),encoding='iso8859-1')
image=Image.new('RGB',(1200,630),'#090f18');d=ImageDraw.Draw(image)
fonts=Path('/usr/share/fonts/truetype/dejavu')
def font(size,serif=False,bold=False):
    return ImageFont.truetype(str(fonts/('DejaVuSerif.ttf' if serif else 'DejaVuSans-Bold.ttf' if bold else 'DejaVuSans.ttf')),size)
d.text((52,38),'NostxlgIA',font=font(27,bold=True),fill='#f7f8fb')
d.text((52,101),'ANÁLISIS / DURANGO 2020–2025',font=font(15),fill='#d8b466')
for i,t in enumerate(['¿En qué municipios','creció y disminuyó','la población?']):d.text((49,155+i*63),t,font=font(45,True),fill='#f7f8fb')
d.line((52,385,640,385),fill='#28384b',width=1)
d.text((52,412),'+109,953',font=font(42,bold=True),fill='#62d5df')
d.text((53,467),'residentes en el estado · +6.04 %',font=font(17),fill='#c5d2e3')
d.text((52,549),'18 municipios al alza / 21 a la baja',font=font(18),fill='#cbd4df')
d.text((52,588),'Residentes en viviendas particulares habitadas · INEGI',font=font(12),fill='#9aa8bc')
xmin,ymin,xmax,ymax=reader.bbox
scale=min(466/(xmax-xmin),510/(ymax-ymin))
for r in reader.iterShapeRecords():
    p=rows[r.record['CVEGEO']]['pct']
    color='#ad5369' if p<=-10 else '#d98b98' if p<0 else '#70b5c6' if p<5 else '#36c5d6'
    parts=list(r.shape.parts)+[len(r.shape.points)]
    for start,end in zip(parts,parts[1:]):
        points=[(680+(x-xmin)*scale,67+(ymax-y)*scale) for x,y in r.shape.points[start:end]]
        d.polygon(points,fill=color,outline='#142236',width=1)
d.text((735,581),'Mapa municipal interactivo',font=font(15),fill='#b9c7d9')
target=ROOT/'assets/images/analisis/poblacion-durango-social.png'
image.save(target,optimize=True)
print(target)
