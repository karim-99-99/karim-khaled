from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0016_user_role_content_admin"),
    ]

    operations = [
        migrations.AddField(
            model_name="video",
            name="bunny_library_id",
            field=models.CharField(blank=True, max_length=50, null=True),
        ),
    ]
