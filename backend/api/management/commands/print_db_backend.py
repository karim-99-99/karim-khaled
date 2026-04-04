"""
Safe diagnostic: which database the running process uses (no secrets printed).
Run on Render Shell: python manage.py print_db_backend
"""
from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import connection


class Command(BaseCommand):
    help = "Print DB engine and host (masked). Use to verify Render uses Neon, not SQLite."

    def handle(self, *args, **options):
        db = settings.DATABASES["default"]
        engine = db.get("ENGINE", "")
        self.stdout.write(f"ENGINE: {engine}")

        if "sqlite" in engine.lower():
            self.stdout.write(
                self.style.ERROR(
                    "SQLite — db lives on the container disk and is wiped on redeploy. "
                    "Set DATABASE_URL on this Render service to your Neon URL."
                )
            )
            self.stdout.write(f"NAME: {db.get('NAME')}")
            return

        host = db.get("HOST") or ""
        name = db.get("NAME") or ""
        self.stdout.write(self.style.SUCCESS("PostgreSQL — data persists across redeploys if this is Neon/cloud."))
        self.stdout.write(f"HOST: {host}")
        self.stdout.write(f"NAME: {name}")

        try:
            with connection.cursor() as c:
                c.execute("SELECT COUNT(*) FROM api_section")
                n = c.fetchone()[0]
            self.stdout.write(f"api_section rows: {n}")
        except Exception as e:
            self.stdout.write(self.style.WARNING(f"Could not count api_section: {e}"))
