from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0026_tigertestsession_pool_warnings'),
    ]

    operations = [
        migrations.AlterField(
            model_name='tigertestsession',
            name='section_time_remaining',
            field=models.PositiveIntegerField(default=1440),
        ),
    ]
