"""Troca os caminhos dos logos (./brand/*.png) por imagens embutidas, para o HTML único abrir sem a pasta public/."""
import base64
import sys
from pathlib import Path

html = Path(sys.argv[1])
raiz = Path(__file__).resolve().parent.parent / 'public'
texto = html.read_text(encoding='utf-8')
for logo in sorted((raiz / 'brand').glob('*.png')):
    uri = 'data:image/png;base64,' + base64.b64encode(logo.read_bytes()).decode()
    texto = texto.replace(f'./brand/{logo.name}', uri)
texto = texto.replace('<link rel="icon" type="image/svg+xml" href="./favicon.svg" />', '')
html.write_text(texto, encoding='utf-8')
print(f'{html}: {len(texto.encode()) / 1024:.0f} KB')
