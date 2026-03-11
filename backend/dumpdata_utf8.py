"""
One-off script: export Django data to JSON with UTF-8 encoding (avoids Windows cp1252 error).
Run from backend folder:  python dumpdata_utf8.py
Requires DATABASE_URL set to your Render (or other) DB.
Output: ../backup.json
"""
import os
import sys

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
import django
django.setup()

from django.core.management import call_command

out_path = os.path.join(os.path.dirname(__file__), "..", "backup.json")
with open(out_path, "w", encoding="utf-8") as f:
    call_command(
        "dumpdata",
        "--natural-foreign",
        "--exclude", "contenttypes",
        "--exclude", "auth.Permission",
        stdout=f,
    )
print("Done. Written to:", out_path)
