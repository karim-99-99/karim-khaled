# Generated manually

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0002_add_video_url_field'),
    ]

    operations = [
        migrations.AddField(
            model_name='video',
            name='is_public',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='file',
            name='is_public',
            field=models.BooleanField(default=False),
        ),
    ]

