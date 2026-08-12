# Generated manually for Tiger Test pool warnings

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0025_tiger_test'),
    ]

    operations = [
        migrations.AddField(
            model_name='tigertestsession',
            name='pool_warnings',
            field=models.JSONField(default=list),
        ),
    ]
