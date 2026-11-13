import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0030_tigertestsettings"),
    ]

    operations = [
        migrations.CreateModel(
            name="DailyTask",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("task_date", models.DateField(db_index=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "created_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="daily_tasks_created",
                        to="api.user",
                    ),
                ),
                (
                    "group",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="daily_tasks",
                        to="api.studentgroup",
                    ),
                ),
                (
                    "lesson",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="daily_tasks",
                        to="api.lesson",
                    ),
                ),
            ],
            options={
                "ordering": ["task_date", "id"],
                "unique_together": {("group", "lesson", "task_date")},
                "indexes": [
                    models.Index(fields=["group", "task_date"], name="api_dailytask_group_date_idx")
                ],
            },
        ),
    ]
