"""Read the user-supplied Pages secret without exporting or logging it."""
import re,zipfile

def varint(b,i):
 n=0;s=0
 while True:
  v=b[i];i+=1;n|=(v&127)<<s
  if v<128:return n,i
  s+=7

def snappy(b):
 size,i=varint(b,0);out=bytearray()
 while i<len(b):
  tag=b[i];i+=1;t=tag&3
  if t==0:
   n=tag>>2
   if n<60:n+=1
   else:k=n-59;n=int.from_bytes(b[i:i+k],'little')+1;i+=k
   out.extend(b[i:i+n]);i+=n
  else:
   if t==1:n=4+((tag>>2)&7);offset=((tag&224)<<3)|b[i];i+=1
   else:k=2 if t==2 else 4;n=1+(tag>>2);offset=int.from_bytes(b[i:i+k],'little');i+=k
   if not 0<offset<=len(out):raise ValueError('Invalid Pages compression')
   for _ in range(n):out.append(out[-offset])
 assert len(out)==size
 return bytes(out)

def load_key(path):
 keys=set()
 with zipfile.ZipFile(path) as z:
  for name in z.namelist():
   if not name.endswith('.iwa'):continue
   data=z.read(name);i=0;decoded=bytearray()
   while i<len(data):
    kind=data[i];n=int.from_bytes(data[i+1:i+4],'little');i+=4
    if kind!=0:raise ValueError('Unsupported Pages compression')
    decoded.extend(snappy(data[i:i+n]));i+=n
   keys.update(m.decode() for m in re.findall(rb'sk-(?:proj-)?[A-Za-z0-9_-]{30,}',decoded))
 if len(keys)!=1:raise ValueError('Pages file must contain exactly one API key')
 return keys.pop()
if __name__=='__main__':
 import sys
 try:load_key(sys.argv[1]);print('One API key read successfully; value not displayed.')
 except Exception:print('Unable to read one API key.');sys.exit(1)
