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
    """
    Keep Neon awake only during the morning study window (Asia/Riyadh).

    Default: 09:00–13:00 Riyadh. Outside that window Neon can autosuspend so
    Free-tier compute hours are not burned overnight / afternoon.

    Override with NEON_KEEPALIVE_START_HOUR / NEON_KEEPALIVE_END_HOUR (local hour,
    end exclusive). Set NEON_KEEPALIVE_DISABLED=1 to turn the loop off entirely.
    """
    time.sleep(20)
    while True:
        try:
            if os.environ.get("NEON_KEEPALIVE_DISABLED", "").strip() in (
                "1",
                "true",
                "yes",
            ):
                time.sleep(300)
                continue

            from django.utils import timezone
            from django.db import connection

            start = int(os.environ.get("NEON_KEEPALIVE_START_HOUR", "9"))
            end = int(os.environ.get("NEON_KEEPALIVE_END_HOUR", "13"))
            hour = timezone.localtime().hour
            if start <= hour < end:
                connection.close_if_unusable_or_obsolete()
                with connection.cursor() as cursor:
                    cursor.execute("SELECT 1")
                    cursor.fetchone()
        except Exception:
            pass
        # Neon Free typically suspends after ~5 min idle; ping under that.
        time.sleep(240)


if os.environ.get("RENDER", "").lower() == "true":
    threading.Thread(
        target=_neon_keepalive_loop,
        name="neon-keepalive",
        daemon=True,
    ).start()
