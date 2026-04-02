from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0013_video_access_log'),
    ]

    operations = [
        migrations.AlterField(
            model_name='video',
            name='video_url',
            field=models.CharField(blank=True, max_length=800, null=True),
        ),
    ]

