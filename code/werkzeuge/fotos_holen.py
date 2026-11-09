import urllib.error,json,urllib.request,urllib.parse,time,os,sys,re
UA='Fallahkalender/1.0 (https://github.com/jaming1/fallahkalender; jaming1@users.noreply.github.com)'
Q=json.load(open(sys.argv[1] if len(sys.argv)>1 and sys.argv[1].endswith('.json') else '/tmp/claude-0/ms6/suche.json'))
K='/tmp/claude-0/ms6/k'
erg=json.load(open(f'{K}/kand.json')) if os.path.exists(f'{K}/kand.json') else {}
OK=re.compile(r'^(cc0|public domain|pd|cc by(-sa)? ?[1-4]\.0|cc by(-sa)?$)',re.I)
def get(u):
  for v in range(6):
    try:
      r=urllib.request.Request(u,headers={'User-Agent':UA});return urllib.request.urlopen(r,timeout=40).read()
    except urllib.error.HTTPError as e:
      if e.code!=429: raise
      print('429 warte',u[:60],flush=True); time.sleep(10*(v+1))
  raise Exception('429')
only=[a for a in sys.argv[1:] if not a.endswith('.json')]
for key,qs in Q.items():
  if only and key not in only: continue
  if erg.get(key) and not only: continue
  liste=[]
  for q in qs:
    p={'action':'query','format':'json','generator':'search','gsrsearch':q+' filetype:bitmap','gsrnamespace':6,'gsrlimit':8,'prop':'imageinfo','iiprop':'url|extmetadata|size','iiurlwidth':500}
    try: d=json.loads(get('https://commons.wikimedia.org/w/api.php?'+urllib.parse.urlencode(p)))
    except Exception as e: print('ERR',key,e);continue
    for pg in sorted(d.get('query',{}).get('pages',{}).values(),key=lambda x:x.get('index',99)):
      ii=pg['imageinfo'][0];m=ii.get('extmetadata',{})
      lz=m.get('LicenseShortName',{}).get('value','')
      if not OK.match(lz.strip()): continue
      if ii['width']<400: continue
      if any(c['seite']==ii['descriptionurl'] for c in liste): continue
      liste.append({'titel':pg['title'],'thumb':ii['thumburl'].split('?')[0].replace('https://upload.wikimedia.org/','https://thumb.wikimedia.org/'),'seite':ii['descriptionurl'],'lizenz':lz,'autor':re.sub(r'<[^>]+>','',m.get('Artist',{}).get('value',''))})
      if len(liste)>=6: break
    time.sleep(1.5)
    if len(liste)>=6: break
  for i,c in enumerate(liste):
    f=f'{key.replace(":","_")}_{i+1}.jpg'
    try: open(f'{K}/{f}','wb').write(get(c['thumb']));c['datei']=f
    except Exception as e: print('DL',key,e)
    time.sleep(1)
  erg[key]=[c for c in liste if 'datei' in c]
  print(key,len(erg[key]),flush=True)
  json.dump(erg,open(f'{K}/kand.json','w'),ensure_ascii=False,indent=1)
