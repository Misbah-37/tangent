"""Verify the actual downloads produced by test-document-tools-browser.cjs."""
from pathlib import Path
from PIL import Image
from pypdf import PdfReader
folder=Path(__file__).resolve().parents[1]/'scratch/pdf-fixed'
def red_box(name):
 im=Image.open(folder/name).convert('RGB');coords=[]
 for y in range(im.height):
  for x in range(im.width):
   r,g,b=im.getpixel((x,y))
   if r>200 and g<50 and b<50:coords.append((x,y))
 assert coords,'No stamp in '+name
 return (min(x for x,y in coords),min(y for x,y in coords),max(x for x,y in coords)+1,max(y for x,y in coords)+1)
a=red_box('signed-page1-active.pdf-1.png');b=red_box('signed-page2-active.pdf-1.png')
assert a==b,(a,b)
assert a==(40,53,107,80),a
for name in ['signed-rotated.pdf-3.png','signed-fallback.pdf-1.png','signed-fallback.pdf-3.png']:
 box=red_box(name);assert all(abs(x-y)<=1 for x,y in zip(a,box)),(name,box)
r=PdfReader(folder/'split.pdf');assert len(r.pages)==2
assert 'PAGE 1' in r.pages[0].extract_text() and 'PAGE 2' in r.pages[1].extract_text()
r=PdfReader(folder/'merged.pdf');assert len(r.pages)==6
for index,p in enumerate(r.pages):assert 'PAGE '+str(index%3+1) in p.extract_text()
for name in ['signed-page1-active.pdf','signed-page2-active.pdf','signed-rotated.pdf','signed-angled.pdf']:
 r=PdfReader(folder/name);assert len(r.pages)==3;assert [p.rotation for p in r.pages]==[0,0,90]
 for i,p in enumerate(r.pages,1):assert 'PAGE '+str(i) in p.extract_text()
r=PdfReader(folder/'redacted.pdf');assert len(r.pages)==3;assert not r.metadata;assert all(not p.extract_text() for p in r.pages)
im=Image.open(folder/'redacted.pdf-1.png').convert('RGB');assert im.getpixel((70,85))==(0,0,0)
# An angled rectangular stamp should have a larger vertical bounding extent.
box=red_box('signed-angled.pdf-1.png');assert box[3]-box[1]>40
print('PASS: saved signatures, active-page independence, rotation/fallback, split/merge order, preserved text, and redaction burn-in/metadata')
