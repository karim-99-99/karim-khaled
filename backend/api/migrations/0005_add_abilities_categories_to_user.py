# Generated manually
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0004_add_avatar_choice_to_user'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='abilities_categories_foundation',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='user',
            name='abilities_categories_collections',
            field=models.BooleanField(default=False),
        ),
    ]
