# Generated migration for account activation period

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0011_alter_question_options_question_order_index'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='account_active_from',
            field=models.DateField(blank=True, help_text='Student account active from this date (inclusive)', null=True),
        ),
        migrations.AddField(
            model_name='user',
            name='account_active_until',
            field=models.DateField(blank=True, help_text='Student account active until this date (inclusive)', null=True),
        ),
    ]
