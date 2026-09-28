"""Copy the static app to the GitHub Pages branch publishing root."""
from pathlib import Path
import shutil
root = Path(__file__).resolve().parents[1]
for source in (root / 'dist').iterdir():
    if source.is_file():
        shutil.copy2(source, root / source.name)
