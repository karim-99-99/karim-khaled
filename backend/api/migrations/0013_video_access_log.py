from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0012_user_account_active_dates'),
    ]

    operations = [
        migrations.CreateModel(
            name='VideoAccessLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('video_id', models.CharField(max_length=200)),
                ('ip_address', models.GenericIPAddressField(blank=True, null=True)),
                ('user_agent', models.TextField(blank=True)),
                ('session_key', models.CharField(blank=True, max_length=64)),
                ('token_expires', models.BigIntegerField()),
                ('requested_at', models.DateTimeField(auto_now_add=True)),
                ('risk_level', models.CharField(
                    choices=[('ok', 'OK'), ('warn', 'Warning'), ('flag', 'Flagged')],
                    default='ok',
                    max_length=10,
                )),
                ('user', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='video_access_logs',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'ordering': ['-requested_at'],
            },
        ),
        migrations.AddIndex(
            model_name='videoaccesslog',
            index=models.Index(fields=['user', 'video_id', 'requested_at'], name='api_videoaccesslog_user_video_idx'),
        ),
        migrations.AddIndex(
            model_name='videoaccesslog',
            index=models.Index(fields=['ip_address', 'requested_at'], name='api_videoaccesslog_ip_idx'),
        ),
    ]
