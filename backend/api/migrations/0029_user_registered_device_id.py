from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0028_default_allow_multi_device'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='registered_device_id',
            field=models.CharField(
                blank=True,
                help_text='Browser device id bound on first login when allow_multi_device is False',
                max_length=64,
                null=True,
            ),
        ),
        migrations.AlterField(
            model_name='user',
            name='allow_multi_device',
            field=models.BooleanField(
                default=True,
                help_text='If False, student can use only registered_device_id (any network on that device)',
            ),
        ),
        migrations.AlterField(
            model_name='user',
            name='registered_ip',
            field=models.CharField(
                blank=True,
                help_text='Legacy audit: IP at registration (not used for access control)',
                max_length=45,
                null=True,
            ),
        ),
    ]
