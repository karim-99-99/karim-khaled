from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0029_user_registered_device_id"),
    ]

    operations = [
        migrations.CreateModel(
            name="TigerTestSettings",
            fields=[
                (
                    "id",
                    models.PositiveSmallIntegerField(
                        default=1, primary_key=True, serialize=False
                    ),
                ),
                ("verbal_bank_ids", models.JSONField(blank=True, default=list)),
                ("quant_bank_ids", models.JSONField(blank=True, default=list)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
        ),
    ]
