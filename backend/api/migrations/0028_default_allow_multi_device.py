from django.db import migrations, models


def enable_multi_device_for_students(apps, schema_editor):
    User = apps.get_model('api', 'User')
    User.objects.filter(role='student', allow_multi_device=False).update(
        allow_multi_device=True
    )


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0027_tigertestsession_section_seconds_24'),
    ]

    operations = [
        migrations.AlterField(
            model_name='user',
            name='allow_multi_device',
            field=models.BooleanField(
                default=True,
                help_text='If False, student can access only from registered_ip',
            ),
        ),
        migrations.RunPython(enable_multi_device_for_students, migrations.RunPython.noop),
    ]
