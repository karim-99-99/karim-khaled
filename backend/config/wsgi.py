"""
WSGI config for educational platform backend.
"""

import os
import threading
import time

from django.core.wsgi import get_wsgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

application = get_wsgi_application()


def _neon_keepalive_loop():
    """Ping Neon all day so Free compute does not suspend after 11pm Riyadh.

    Free still suspends for the rest of the month after 100 CU-hours. Launch
    with scale-to-zero turned off is what actually keeps the database up.
    """
    time.sleep(20)
    while True:
        try:
            from django.db import connection

            connection.close_if_unusable_or_obsolete()
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                cursor.fetchone()
        except Exception:
            pass
        time.sleep(180)


if os.environ.get("RENDER", "").lower() == "true":
    threading.Thread(
        target=_neon_keepalive_loop,
        name="neon-keepalive",
        daemon=True,
    ).start()
