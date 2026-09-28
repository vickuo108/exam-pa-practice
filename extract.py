import ctypes,zipfile,tempfile,sqlite3,os,re,json,html
from pathlib import Path
from html.parser import HTMLParser
ROOT=Path(__file__).resolve().parent
DEFINITIONS=[1,2,3,5,6,8,9,10,11,12,13,15,17,20,21,24,25,26,28,29,30,31,32,36,37,39,42,43,44,45,46,47,51,52,54,58,61,62,63,64,66,67,68,69,70,71,73,74,75,76,77,78,79,80,81,85,86,94,95,99,101,102,107,108,109,112,117,118,119,122,125,126,129,131,132,142,147,149,156,160]
EXTRAS=[19,34,35,48,49,50,55,56,59,60,72,82,89,92,96,97,103,110,111,114,116,120,124,133,136,140,141,145,154,158]
class Plain(HTMLParser):
 def __init__(self): super().__init__();self.parts=[]
 def handle_starttag(self,t,a):
  if t in ['br','div','p','li','tr']: self.parts.append('\n')
 def handle_endtag(self,t):
  if t in ['div','p','li','tr']: self.parts.append('\n')
 def handle_data(self,d):self.parts.append(d)
def plain(s):
 p=Plain();p.feed(s);return re.sub(r'\n\s*\n+','\n\n',''.join(p.parts)).strip()
lib=ctypes.CDLL('/Applications/Anki.app/Contents/Resources/app_packages/anki_audio/libs/libzstd.1.5.7.dylib')
lib.ZSTD_decompress.argtypes=[ctypes.c_void_p,ctypes.c_size_t,ctypes.c_void_p,ctypes.c_size_t];lib.ZSTD_decompress.restype=ctypes.c_size_t
def decompress(b):
 out=ctypes.create_string_buffer(100000000);n=lib.ZSTD_decompress(out,len(out),b,len(b));assert n<len(out);return out.raw[:n]
with zipfile.ZipFile(ROOT.parent/'Exam PA.apkg') as z:
 with tempfile.TemporaryDirectory() as d:
  p=Path(d)/'c.db';p.write_bytes(decompress(z.read('collection.anki21b')));c=sqlite3.connect(p)
  cards=[]
  for i,(nid,flds) in enumerate(c.execute('select id,flds from notes order by id'),1):
   if i not in DEFINITIONS+EXTRAS:continue
   f=flds.split('\x1f'); assert len(f)>=2 and plain(f[1]);
   images=re.findall(r'<img[^>]*src=[\"\x27]([^\"\x27]+)',f[1]);
   if images: print('IMAGE',i,images)
   cards.append(dict(id=str(nid),sourceIndex=i,category='定義' if i in DEFINITIONS else '比較與優缺點',question=plain(f[0]),answer=plain(f[1]),answerHtml=f[1]))
  assert len(cards)==110
  (ROOT/'dist/cards.json').write_text(json.dumps(cards,ensure_ascii=False,indent=2))
  print('Extracted',len(cards),'cards')
# Anki's current media index is a protobuf list. Preserve referenced images.
def varint(b,i):
 n=0;s=0
 while True:
  v=b[i];i+=1;n|=(v&127)<<s
  if not v&128:return n,i
  s+=7
def fields(b):
 i=0
 while i<len(b):
  tag,i=varint(b,i);wire=tag&7
  if wire==2:
   n,i=varint(b,i);v=b[i:i+n];i+=n
  elif wire==0:v,i=varint(b,i)
  else:raise ValueError(wire)
  yield tag>>3,v
with zipfile.ZipFile(ROOT.parent/'Exam PA.apkg') as z:
 entries=[v for k,v in fields(decompress(z.read('media'))) if k==1]
 mapping={}
 for index,entry in enumerate(entries):
  name=next(v.decode() for k,v in fields(entry) if k==1)
  mapping[name]=str(index)
 for card in cards:
  for name in re.findall(r'<img[^>]*src=[\"\x27]([^\"\x27]+)',card['answerHtml']):
   raw=z.read(mapping[html.unescape(name)])
   if raw[:4]==b'\x28\xb5\x2f\xfd':raw=decompress(raw)
   filename='media-'+mapping[html.unescape(name)]+Path(name).suffix
   (ROOT/'dist'/filename).write_bytes(raw)
   card['answerHtml']=card['answerHtml'].replace(name,filename)
 (ROOT/'dist/cards.json').write_text(json.dumps(cards,ensure_ascii=False,indent=2))
