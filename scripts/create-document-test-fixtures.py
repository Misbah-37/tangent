"""Create only synthetic fixtures for the document-tool browser regression."""
import io
from pathlib import Path
from reportlab.pdfgen import canvas
from pypdf import PdfReader, PdfWriter
from PIL import Image
folder=Path(__file__).resolve().parents[1]/'scratch/pdf-fixed'
folder.mkdir(parents=True,exist_ok=True)
stream=io.BytesIO();c=canvas.Canvas(stream,pagesize=(400,300))
for i,size in enumerate([(400,300),(600,400),(400,300)],1):
 c.setPageSize(size);c.setFont('Helvetica',18);c.drawString(40,250,'PAGE '+str(i));c.drawString(40,210,'SECRET_ACCOUNT_12345');c.drawString(40,170,'PUBLIC_VALUE');c.showPage()
c.save();writer=PdfWriter();writer.append(PdfReader(stream));writer.pages[2].rotate(90);writer.add_metadata({'/Title':'PRIVATE_TITLE','/Author':'PRIVATE_AUTHOR'})
with (folder/'fixture.pdf').open('wb') as output:writer.write(output)
Image.new('RGB',(100,40),(255,0,0)).save(folder/'signature.png')
print('Created synthetic fixture.pdf and signature.png')
