# Übernimmt die ausgewählten Fotos aus kandidaten/ (von bilder_holen.py) in die App:
# verkleinert auf 480 px nach src/assets/bilder/ und schreibt src/daten/bilder.json mit Nachweis.
# Auswahl ändern: Nummer in W anpassen (Nummer = Kandidat 1–4 auf dem Kontaktbogen), dann neu ausführen.
import json,re,html,os,sys
from PIL import Image, ImageOps
HIER=os.path.dirname(os.path.abspath(__file__))
K=os.path.join(HIER,'kandidaten')
Z=os.path.join(HIER,'..','src')
W={
# krankheiten
'duerrflecken':1,'krautfaeule':1,'tuta':1,'weisse_fliege':1,'tylcv':2,'leveillula':3,'echter_mehltau':1,'blattlaeuse':3,'spinnmilben':2,'thripse':1,'bluetenendfaeule':1,'fusarium':1,'grauschimmel':2,'nematoden':2,'helicoverpa':1,'erdraupen':1,'kartoffelmotte':1,'schorf':3,'zw_falscher_mehltau':1,'purpurflecken':2,'phytophthora_capsici':1,'kuerbis_falscher_mehltau':3,'mosaikvirus':3,'rost':3,'septoria':2,'getreide_mehltau':4,'hessenfliege':1,'stengelbohrer':2,'ascochyta':1,'minierfliege':3,'schokoflecken':1,'sommerwurz':4,'luzerneruessler':3,'seide':3,'eisenmangel':1,'stickstoffmangel':2,'wassermangel':3,
# kulturen
'tomate':2,'kartoffel':2,'zwiebel':1,'paprika':2,'zucchini':1,'melone':3,'erdbeere':3,'karotte':4,'hartweizen':2,'gerste':1,'mais':1,'kichererbse':2,'ackerbohne':1,'luzerne':3,
# symptome
'sym_b-ringe':1,'sym_b-nass':1,'sym_b-weiss-oben':2,'sym_b-gelb-flecken':1,'sym_b-eckig':4,'sym_b-gelb-jung':2,'sym_b-gelb-roll':2,'sym_b-mosaik':4,'sym_b-kraus':1,'sym_b-platzminen':1,'sym_b-gaenge':4,'sym_b-gespinst':3,'sym_b-rost':2,'sym_b-schoko':2,'sym_b-spitzen':2,
'sym_f-loecher':1,'sym_f-ende':1,'sym_f-grau':2,'sym_f-braun':4,'sym_f-schorf':3,
'sym_s-gefaesse':3,'sym_s-gallen':2,'sym_s-faul':4,'sym_s-abgefressen':1,'sym_s-parasit':1,'sym_s-faeden':2,
'sym_t-weisse-fliegen':4,'sym_t-thripse':1,'sym_t-raupen':1,'sym_t-larven':3,
# probleme, massnahmen
'problem_ph-hoch':2,'problem_ph-niedrig':1,'problem_wasser-knapp':2,'problem_regen-fehlt':1,'problem_boden-ton':1,'problem_nematoden':1,'problem_welke':1,
'mass_folientunnel':1,'mass_gewaechshaus':1,'mass_kompost':2,'mass_mist':3,'mass_kalk':1,'mass_schwefel':1,'mass_beete':1,'mass_daemme':1,'mass_mulch':3,'mass_tropf':1,'mass_bewaesserung':3,'mass_auswaschen':1,'mass_drainage':4,'mass_wasserbecken':4,'mass_solarpumpe':2,'mass_brunnen':1,'mass_solarisation':2,'mass_veredelt':2,'mass_bodenlockerung':2,
# zonen, duenger
'zone_gharb':1,'zone_atlas':4,'zone_souss':1,'zone_oase':4,
'duenger_harnstoff':1,'duenger_tsp':2,'duenger_map':1,'duenger_kaliumsulfat':1,'duenger_mist':4,
}
EXTRA={'sym_t-laeuse':('blattlaeuse',3)}
kand=json.load(open(f'{K}/kandidaten.json'))
kulturen={k['id'] for k in json.load(open(f'{Z}/daten/kulturen.json'))['kulturen']}
def schluessel(i):
  for pre,typ in (('sym_','symptom'),('problem_','problem'),('mass_','massnahme'),('zone_','zone'),('duenger_','duenger')):
    if i.startswith(pre): return f'{typ}:{i[len(pre):]}'
  return ('kultur:' if i in kulturen else 'krankheit:')+i
def sauber(s):
  s=re.sub(r'<[^>]+>','',s or ''); s=html.unescape(s); s=re.sub(r'\s+',' ',s).strip()
  return (s[:80]+'…') if len(s)>80 else (s or 'Wikimedia Commons')
os.makedirs(f'{Z}/assets/bilder',exist_ok=True)
aus={}
paare=[(i,i,n) for i,n in W.items()]+[(i,q,n) for i,(q,n) in EXTRA.items()]
for ziel,quelle,n in paare:
  c=kand[quelle][n-1]
  name=re.sub(r'[^a-z0-9_-]','-',schluessel(ziel).replace(':','_').lower())+'.jpg'
  im=Image.open(f'{K}/{c["datei"]}'); im=ImageOps.exif_transpose(im).convert('RGB')
  im.thumbnail((480,480)); im.save(f'{Z}/assets/bilder/{name}','JPEG',quality=70,optimize=True,progressive=True)
  aus[schluessel(ziel)]={'datei':f'assets/bilder/{name}','autor':sauber(c['autor']),'lizenz':c['lizenz'] or 'siehe Seite','seite':c['seite'],'breite':im.width,'hoehe':im.height}
json.dump(dict(sorted(aus.items())),open(f'{Z}/daten/bilder.json','w'),ensure_ascii=False,indent=1)
print(len(aus))
