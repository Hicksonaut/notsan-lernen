#!/usr/bin/env python3
"""Erzeugt sw.js aus sw.template.js: Dateiliste, Groessen und Versionshash.
Aufruf im Repo-Ordner:  python3 tools/build-sw.py
Nach jeder Aenderung an HTML oder Bildern erneut ausfuehren."""
import hashlib, json, os

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(root)

shell = ['./', 'index.html', 'anleitung.html', 'algorithmen.html', 'p-algorithmen.html', 'medikamente.html', 'manifest.webmanifest']
shell += sorted('icons/' + f for f in os.listdir('icons') if f.endswith('.png'))

images, total = [], 0
for d, _, files in sorted(os.walk('img')):
    for f in sorted(files):
        p = os.path.join(d, f)
        h = hashlib.sha1(open(p, 'rb').read()).hexdigest()[:8]
        images.append(f'{p}?v={h}')
        total += os.path.getsize(p)

h = hashlib.sha1()
for p in shell[1:]:
    h.update(open(p, 'rb').read())
for u in images:
    h.update(u.encode())
version = h.hexdigest()[:10]

tpl = open('tools/sw.template.js', encoding='utf-8').read()
out = (tpl.replace('__VERSION__', version)
          .replace('__SHELL__', json.dumps(shell))
          .replace('__IMAGES__', json.dumps(images))
          .replace('__BYTES__', str(total)))
open('sw.js', 'w', encoding='utf-8').write(out)
print(f'sw.js: Version {version}, {len(shell)} Shell-Dateien, {len(images)} Bilder, {total/1e6:.1f} MB')
