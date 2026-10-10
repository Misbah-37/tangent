"""Assemble reviewed private-testing artifacts; never installs or publishes."""
from pathlib import Path
import csv, hashlib, json, shutil, subprocess, zipfile

desktop = Path(__file__).resolve().parents[1]
version = json.loads((desktop/'src-tauri/tauri.testing.conf.json').read_text(encoding='utf-8'))['version']
installer = desktop/f'src-tauri/target/release/bundle/nsis/Tangent Testing_{version}_x64-setup.exe'
if not installer.is_file():
    raise SystemExit(f'Build the testing installer first: {installer}')
output = desktop/'testing/artifacts/releases'/f'Tangent-Testing-{version}'
if output.exists():
    raise SystemExit(f'Refusing to overwrite existing package: {output}')
output.mkdir(parents=True)
for source in (desktop/'testing/private-beta').glob('*.md'):
    shutil.copy2(source,output/source.name)
shutil.copy2(installer,output/installer.name)
fixtures=output/'fixtures';fixtures.mkdir()
for name in ['sample.csv','sample.tsv','finance-sample.csv']:
    shutil.copy2(desktop/'testing'/name,fixtures/name)
with (fixtures/'revenue-imputation.csv').open('w',encoding='utf-8',newline='') as file:
    writer=csv.writer(file);writer.writerow(['ID','Revenue'])
    writer.writerows([[1,'0.001m'],[2,'4.4k'],[3,'twenty'],[4,'one hundred'],[5,'zero'],[6,''],[7,'-'],[8,'null'],[9,'NaN'],[10,'N/A']])
with (fixtures/'correlation.csv').open('w',encoding='utf-8',newline='') as file:
    writer=csv.writer(file);writer.writerow(['x','positive','negative','group'])
    writer.writerows([[i,2*i,-i,i%2] for i in range(6)])
log='127.0.0.1 - - [09/Oct/2026:10:01:00 +0000] "GET /login HTTP/1.1" 401 12\n'*10
log+='127.0.0.2 - - [09/Oct/2026:11:00:00 +0000] "GET /.env HTTP/1.1" 404 12\n'
log+='{"ip":"127.0.0.3","timestamp":"2026-10-09T12:00:00+01:00","path":"/api","status":500}\nnoise\n{}\n'
(fixtures/'known.log').write_text(log,encoding='utf-8')
(fixtures/'tables.html').write_text('<!doctype html><meta charset="utf-8"><table><tr><th>Name</th><th>Value</th></tr><tr><td>caf&eacute; &amp; Ω</td><td>1</td></tr><tr><td>&quot;quoted, text&quot;</td><td></td></tr></table><table><tr><th>Name</th><th>Value</th></tr><tr><td>second table</td><td>3</td></tr></table>',encoding='utf-8')
digest=lambda path:hashlib.sha256(path.read_bytes()).hexdigest()
revision=subprocess.check_output(['git','rev-parse','HEAD'],cwd=desktop,text=True).strip()
metadata={'packageVersion':version,'sourceCheckpoint':revision,'testingConfigSha256':digest(desktop/'src-tauri/tauri.testing.conf.json'),'installerSha256':digest(installer),'signed':False,'secondMachineValidated':False,'packagedVisualRetest':'pending','scope':'private testing'}
(output/'BUILD.json').write_text(json.dumps(metadata,indent=2)+'\n',encoding='utf-8')
files=sorted(path for path in output.rglob('*') if path.is_file())
(output/'CHECKSUMS.sha256').write_text(''.join(f'{digest(path)}  {path.relative_to(output).as_posix()}\n' for path in files),encoding='utf-8')
archive=output.parent/(output.name+'.zip')
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as bundle:
    for path in sorted(output.rglob('*')):
        if path.is_file():bundle.write(path,path.relative_to(output.parent))
stress=output.parent/f'Tangent-Testing-{version}-stress.zip'
sources={'correlation-million.csv':desktop/'testing/artifacts/correlation/million.csv','million.log':desktop/'testing/artifacts/logs/million.log','large-table.html':desktop/'testing/artifacts/extractor/large-table.html'}
with zipfile.ZipFile(stress,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as bundle:
    for name,path in sources.items():bundle.write(path,name)
    bundle.writestr('CHECKSUMS.sha256',''.join(f'{digest(path)}  {name}\n' for name,path in sources.items()))
for path in [archive,stress]:
    path.with_name(path.name+'.sha256').write_text(f'{digest(path)}  {path.name}\n',encoding='utf-8')
    with zipfile.ZipFile(path) as bundle:
        assert bundle.testzip() is None
print(json.dumps({'package':str(archive),'stress':str(stress),'installerSha256':digest(installer)},indent=2))
