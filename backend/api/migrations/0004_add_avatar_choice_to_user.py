# Generated manually

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0003_add_public_fields_to_video_file'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='avatar_choice',
            field=models.CharField(blank=True, choices=[('male_gulf', 'Male (Gulf)'), ('female_gulf', 'Female (Gulf)')], max_length=20, null=True),
        ),
    ]

