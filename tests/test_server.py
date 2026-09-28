import unittest,sys,threading,json,urllib.request,urllib.error,tempfile
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import server
class ServerTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.temp=tempfile.TemporaryDirectory();cls.path=Path(cls.temp.name)/'cards.json';cls.path.write_text((server.ROOT/'cards.json').read_text())
  cls.server=server.make_server('test-only-placeholder',0,cls.path);cls.thread=threading.Thread(target=cls.server.serve_forever,daemon=True);cls.thread.start();cls.base='http://127.0.0.1:'+str(cls.server.server_port)
  cls.status=json.load(urllib.request.urlopen(cls.base+'/api/status'));cls.card=json.loads((server.ROOT/'cards.json').read_text())[0]['id']
 @classmethod
 def tearDownClass(cls):cls.server.shutdown();cls.server.server_close();cls.thread.join();cls.temp.cleanup()
 def post(self,body,token=True,origin=None,path="/api/check"):
  headers={'Content-Type':'application/json'}
  if token:headers['X-PA-Token']=self.status['token']
  if origin:headers['Origin']=origin
  req=urllib.request.Request(self.base+path,data=json.dumps(body).encode(),headers=headers)
  try:
   with urllib.request.urlopen(req) as r:return r.status,json.load(r)
  except urllib.error.HTTPError as e:return e.code,json.load(e)
 def test_no_key_in_status(self):self.assertNotIn('test-only-placeholder',json.dumps(self.status))
 def test_cross_origin_denied(self):self.assertEqual(self.post({},origin='https://example.com')[0],403)
 def test_missing_token_denied(self):self.assertEqual(self.post({},token=False)[0],403)
 def test_invalid_card_rejected(self):self.assertEqual(self.post({'cardId':'missing','answer':'a'})[0],400)
 def test_blank_answer_rejected(self):self.assertEqual(self.post({'cardId':self.card,'answer':' '})[0],400)
 def test_success(self):
  with patch.object(server,'review',return_value='判斷：可以') as review:
   status,data=self.post({'cardId':self.card,'answer':'test'});self.assertEqual(status,200);self.assertEqual(data['feedback'],'判斷：可以');self.assertEqual(review.call_args.args[1]['id'],self.card)
 def test_api_error_redacted(self):
  with patch.object(server,'review',side_effect=urllib.error.HTTPError('',401,'secret-detail',{},None)):
   status,data=self.post({'cardId':self.card,'answer':'test'});self.assertEqual(status,502);self.assertNotIn('secret-detail',str(data));self.assertIn('金鑰',data['error'])
 def test_custom_card_roundtrip(self):
  body={'question':'New <test> question','answer':'A reference <script>alert(1)</script>\nSecond line'}
  code,data=self.post(body,path='/api/cards');self.assertEqual(code,201);card=data['card']
  self.assertEqual(card['answer'],body['answer']);self.assertNotIn('<script>',card['answerHtml'])
  saved=json.loads(self.path.read_text());self.assertEqual(saved[-1]['id'],card['id']);self.assertGreater(len(saved),110)
  self.assertEqual(self.post(body,path='/api/cards')[0],409)
  with patch.object(server,'review',return_value='判斷：可以') as review:
   code,_=self.post({'cardId':card['id'],'answer':'A reference'});self.assertEqual(code,200);self.assertEqual(review.call_args.args[1]['answer'],body['answer'])
  restarted=server.make_server('',0,self.path);thread=threading.Thread(target=restarted.serve_forever,daemon=True);thread.start()
  try:
   result=json.load(urllib.request.urlopen('http://127.0.0.1:'+str(restarted.server_port)+'/api/cards'));self.assertIn(card['id'],[c['id'] for c in result['cards']])
  finally:restarted.shutdown();restarted.server_close();thread.join()
 def test_add_requires_token(self):self.assertEqual(self.post({},token=False,path='/api/cards')[0],403)
 def test_add_rejects_blank(self):self.assertEqual(self.post({'question':' ','answer':'text'},path='/api/cards')[0],400)
 def test_edit_original_and_preserve_id(self):
  original=json.loads((server.ROOT/'cards.json').read_text())[0]
  body={'cardId':original['id'],'question':'Edited Alpha','answer':'Edited reference.'}
  code,data=self.post(body,path='/api/cards/edit');self.assertEqual(code,200);self.assertEqual(data['card']['id'],original['id']);self.assertFalse(data['card'].get('custom',False))
  with patch.object(server,'review',return_value='判斷：可以') as review:
   code,_=self.post({'cardId':original['id'],'answer':'test'});self.assertEqual(code,200);self.assertEqual(review.call_args.args[1]['answer'],'Edited reference.')
  self.assertTrue(any(c['id']==original['id'] and c['answer']=='Edited reference.' for c in json.loads(self.path.read_text())))
 def test_edit_image_answer_preserves_image(self):
  original=next(c for c in json.loads((server.ROOT/'cards.json').read_text()) if '<img' in c['answerHtml'])
  code,data=self.post({'cardId':original['id'],'question':original['question'],'answer':'Updated chart explanation.'},path='/api/cards/edit');self.assertEqual(code,200);self.assertIn('<img',data['card']['answerHtml'])
 def test_edit_invalid_id(self):self.assertEqual(self.post({'cardId':'absent','question':'a','answer':'b'},path='/api/cards/edit')[0],404)
 def get_status(self,path):
  try:
   with urllib.request.urlopen(self.base+path) as r:return r.status
  except urllib.error.HTTPError as e:return e.code
 def test_static_files_served(self):
  for path in ('/','/index.html','/app.js','/cards.json','/media-9.png'):self.assertEqual(self.get_status(path),200,path)
 def test_private_files_hidden(self):
  for path in ('/server.py','/pages_key.py','/.env','/.gitignore','/data/custom-cards.json','/tests/test_server.py','/README.md','/dist/'):self.assertEqual(self.get_status(path),404,path)
if __name__=='__main__':unittest.main()
