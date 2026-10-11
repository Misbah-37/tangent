"""Inspect actual downloads from test-media-tools.cjs independently of page code."""
from pathlib import Path
from io import BytesIO
from zipfile import ZipFile
from PIL import Image
root=Path(__file__).resolve().parents[1]/'scratch/media-fixed'
for name in ['clean.jpg','clean.png','resized.png','resized.webp']:
    image=Image.open(root/name)
    assert not image.getexif() and 'PrivateNote' not in image.info
    if name=='clean.jpg': assert image.size==(120,240)
    else: assert image.convert('RGBA').getpixel((0,0))[3]==0
    if name.startswith('resized'): assert image.size==(100,80)
for name in ['scrub-duplicates.zip','watermark-duplicates.zip','watermark-svg.zip']:
    with ZipFile(root/name) as archive:
        names=archive.namelist()
        assert len(names)==(1 if 'svg' in name else 2)
        assert len(set(names))==len(names)
        for entry in names:
            image=Image.open(BytesIO(archive.read(entry)))
            assert entry.endswith('.png') and image.format=='PNG'
        if 'scrub' in name: assert archive.read(names[0])!=archive.read(names[1])
print('PASS independent metadata, orientation, alpha, dimensions, ZIP entries and format checks')
