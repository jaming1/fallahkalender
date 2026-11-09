import json,re,html,os
from PIL import Image,ImageOps
K='/tmp/claude-0/ms6/k';Z='/mnt/project-files/fallahkalender/code/src'
kand=json.load(open(f'{K}/kand.json'));w=json.load(open('/tmp/claude-0/ms6/wahl.json'))
b=json.load(open(f'{Z}/daten/bilder.json'))
def sauber(s):
  s=re.sub(r'<[^>]+>','',s or '');s=html.unescape(s);s=re.sub(r'\s+',' ',s).strip()
  return (s[:80]+'…') if len(s)>80 else (s or 'Wikimedia Commons')
for k,n in w.items():
  c=kand[k][n-1];name=k.replace(':','_')+'.jpg'
  im=ImageOps.exif_transpose(Image.open(f"{K}/{c['datei']}")).convert('RGB');im.thumbnail((480,480))
  im.save(f'{Z}/assets/bilder/{name}','JPEG',quality=70,optimize=True,progressive=True)
  b[k]={'datei':f'assets/bilder/{name}','autor':sauber(c['autor']),'lizenz':c['lizenz'],'seite':c['seite'],'breite':im.width,'hoehe':im.height}
b['ding:tiere']=b['krankheit:blattlaeuse']; b['jahr:zitrus_schnitt']=b['maschine:baumschere']
json.dump(dict(sorted(b.items())),open(f'{Z}/daten/bilder.json','w'),ensure_ascii=False,indent=1)
print(len(b))
