# Generated manually for tracker system

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0007_add_passage_fields_to_question'),
    ]

    operations = [
        migrations.CreateModel(
            name='QuizAttempt',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('score', models.FloatField(default=0)),
                ('correct_count', models.IntegerField(default=0)),
                ('total_questions', models.IntegerField(default=0)),
                ('started_at', models.DateTimeField()),
                ('completed_at', models.DateTimeField()),
                ('duration_seconds', models.IntegerField(default=0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('lesson', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='quiz_attempts', to='api.lesson')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='quiz_attempts', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-completed_at'],
            },
        ),
        migrations.CreateModel(
            name='VideoWatch',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('watch_count', models.IntegerField(default=1)),
                ('last_watched_at', models.DateTimeField(auto_now=True)),
                ('lesson', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='video_watches', to='api.lesson')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='video_watches', to=settings.AUTH_USER_MODEL)),
                ('video', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='watches', to='api.video')),
            ],
            options={
                'ordering': ['-last_watched_at'],
                'unique_together': {('user', 'lesson', 'video')},
            },
        ),
    ]
