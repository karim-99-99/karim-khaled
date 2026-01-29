# Generated migration for device/IP restriction

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0005_add_abilities_categories_to_user'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='registered_ip',
            field=models.CharField(blank=True, help_text='IP at registration; access restricted to this IP unless allow_multi_device', max_length=45, null=True),
        ),
        migrations.AddField(
            model_name='user',
            name='allow_multi_device',
            field=models.BooleanField(default=False, help_text='If True, student can access from any device; admin-controlled'),
        ),
    ]
