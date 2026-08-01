from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0022_chapter_dashboard_indexes'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='telegram_id',
            field=models.CharField(
                blank=True,
                db_index=True,
                help_text='Telegram user id from Login / OIDC',
                max_length=64,
                null=True,
                unique=True,
            ),
        ),
        migrations.AddField(
            model_name='user',
            name='telegram_username',
            field=models.CharField(blank=True, max_length=150, null=True),
        ),
    ]
