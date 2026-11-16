"""Produce a portable source package without caches, archives or QA screenshots."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import subprocess
import sys

root = Path(__file__).resolve().parents[1]
subprocess.run([sys.executable, str(root / 'scripts/check.py')], check=True)
destination = root / 'dist/velunori-dusk-website.zip'
destination.parent.mkdir(exist_ok=True)
with ZipFile(destination, 'w', compression=ZIP_DEFLATED) as archive:
    for path in sorted(root.rglob('*')):
        relative = path.relative_to(root)
        if not path.is_file() or any(part in {'.git', '__pycache__', 'dist'} for part in relative.parts):
            continue
        if path.suffix == '.pyc' or (relative.parts[0] == 'docs' and path.suffix == '.png'):
            continue
        archive.write(path, Path('velunori-dusk-website') / relative)
print(f'Website package: {destination} ({destination.stat().st_size:,} bytes)')
