# Generated manually for IncorrectAnswer model
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0008_add_quiz_attempt_video_watch'),
    ]

    operations = [
        migrations.CreateModel(
            name='IncorrectAnswer',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('question_id', models.CharField(max_length=100)),
                ('lesson_name', models.CharField(blank=True, max_length=200)),
                ('category_name', models.CharField(blank=True, max_length=200)),
                ('subject_name', models.CharField(blank=True, max_length=200)),
                ('question_snapshot', models.JSONField(default=dict)),
                ('user_answer_id', models.CharField(blank=True, max_length=10)),
                ('correct_answer_id', models.CharField(blank=True, max_length=10)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('lesson', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='incorrect_answers', to='api.lesson')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='incorrect_answers', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-created_at'],
                'unique_together': {('user', 'question_id')},
            },
        ),
    ]
