# Writes the FCD v3.3-aligned XML exports into docs/fds/
import pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
from src.fds.export import build_all
dest = pathlib.Path(__file__).resolve().parents[1] / "docs" / "fds"
dest.mkdir(parents=True, exist_ok=True)
for name, xml in build_all().items():
    (dest / name).write_text(xml)
    print("wrote", dest / name, len(xml), "bytes")
