"""Drift check: run from the repo root, with the backend's requirements installed.

The connector deploys standalone, so it keeps its own narrow copy of the tables
it reads. This compares that copy against backend/models.py and reports any
table or column that has been renamed or removed out from under it.

    python mcp/check_schema.py
"""
import importlib.util
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / 'backend'))
import models as main_models  # noqa: E402  (backend/models.py, SQLModel)

del sys.modules['models']
spec = importlib.util.spec_from_file_location('mirror_models', HERE / 'models.py')
mirror = importlib.util.module_from_spec(spec); spec.loader.exec_module(mirror)

main_tables = {t.name: t for t in main_models.SQLModel.metadata.sorted_tables}
ok = True
for table in mirror.db.metadata.sorted_tables:
    if table.name not in main_tables:
        print('MISSING TABLE:', table.name); ok = False; continue
    src = main_tables[table.name]
    for col in table.columns:
        if col.name not in src.columns:
            print(f'MISSING COLUMN: {table.name}.{col.name}'); ok = False
    extra = set(src.columns.keys()) - set(table.columns.keys())
    print(f'{table.name}: {len(table.columns)} mirrored, not mirrored: {sorted(extra) or "none"}')
print('\nSCHEMA CONSISTENT' if ok else '\nSCHEMA DRIFT')
sys.exit(0 if ok else 1)
