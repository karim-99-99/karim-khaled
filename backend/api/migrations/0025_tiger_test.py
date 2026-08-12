# Generated manually for Tiger Test feature

import uuid
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0024_question_video_segment'),
    ]

    operations = [
        migrations.CreateModel(
            name='TigerTestSession',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('status', models.CharField(choices=[('in_section', 'In section'), ('between_sections', 'Between sections'), ('completed', 'Completed')], default='in_section', max_length=20)),
                ('current_section', models.PositiveSmallIntegerField(default=1)),
                ('current_question_index', models.PositiveSmallIntegerField(default=0)),
                ('section_time_remaining', models.PositiveIntegerField(default=1500)),
                ('section_started_at', models.DateTimeField(blank=True, null=True)),
                ('section_slots', models.JSONField(default=list)),
                ('answers', models.JSONField(default=dict)),
                ('bookmarked', models.JSONField(default=list)),
                ('deferred', models.JSONField(default=list)),
                ('seen', models.JSONField(default=list)),
                ('results', models.JSONField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('completed_at', models.DateTimeField(blank=True, null=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='tiger_test_sessions', to='api.user')),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='TigerTestUsedQuestion',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('question_key', models.CharField(max_length=150)),
                ('used_at', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='tiger_used_questions', to='api.user')),
            ],
        ),
        migrations.AddIndex(
            model_name='tigertestsession',
            index=models.Index(fields=['user', 'status'], name='api_tiger_user_status_idx'),
        ),
        migrations.AddIndex(
            model_name='tigertestusedquestion',
            index=models.Index(fields=['user'], name='api_tiger_used_user_idx'),
        ),
        migrations.AlterUniqueTogether(
            name='tigertestusedquestion',
            unique_together={('user', 'question_key')},
        ),
    ]
