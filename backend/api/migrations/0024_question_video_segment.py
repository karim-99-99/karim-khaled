from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0023_user_telegram_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='question',
            name='video_start_seconds',
            field=models.PositiveIntegerField(
                blank=True,
                help_text='Start of video explanation for this question (seconds)',
                null=True,
            ),
        ),
        migrations.AddField(
            model_name='question',
            name='video_end_seconds',
            field=models.PositiveIntegerField(
                blank=True,
                help_text='Optional pause time for video explanation (seconds)',
                null=True,
            ),
        ),
    ]
