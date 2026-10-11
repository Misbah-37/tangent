"""Verify downloaded ZIP contents and the advertised standalone EXE identity."""
from pathlib import Path
import hashlib
import zipfile

root = Path(__file__).resolve().parents[1]
with zipfile.ZipFile(root / 'scratch/final-tools/organized.zip') as archive:
    expected = {'Documents/duplicate.txt': b'ONE', 'Documents/duplicate (1).txt': b'TWO', 'Images/photo.png': b'IMAGE'}
    for name, data in expected.items():
        assert archive.read(name) == data, name
with zipfile.ZipFile(root / 'File_Organizer.zip') as archive:
    digest = hashlib.sha256(archive.read('File_Organizer/File_Organizer.exe')).hexdigest()
for name in ['src/tools/file-organizer.html', 'file-organizer.html']:
    assert digest in (root / name).read_text(encoding='utf-8'), name
print('PASS ZIP duplicate byte preservation and advertised standalone executable SHA-256')
