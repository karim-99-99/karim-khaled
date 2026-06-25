from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0017_video_bunny_library_id"),
    ]

    operations = [
        migrations.CreateModel(
            name="BunnyStreamLibrary",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("library_id", models.CharField(max_length=50, unique=True)),
                ("label", models.CharField(blank=True, default="", max_length=200)),
                ("security_key", models.CharField(help_text="Token Authentication key from Bunny Security tab", max_length=500)),
                ("stream_api_key", models.CharField(help_text="Library API key from Bunny API tab", max_length=500)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "created_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="bunny_libraries",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "verbose_name_plural": "Bunny stream libraries",
                "ordering": ["library_id"],
            },
        ),
    ]
