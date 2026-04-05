# Generated manually for content_admin role

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0015_rename_api_videoaccesslog_user_video_idx_api_videoac_user_id_b909ee_idx_and_more"),
    ]

    operations = [
        migrations.AlterField(
            model_name="user",
            name="role",
            field=models.CharField(
                choices=[
                    ("admin", "Admin"),
                    ("content_admin", "Content admin"),
                    ("student", "Student"),
                ],
                default="student",
                max_length=20,
            ),
        ),
    ]
