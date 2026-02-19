from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import (
    User, Section, Subject, Category, Chapter, Lesson,
    Question, Answer, Video, File, StudentProgress, LessonProgress,
    StudentGroup, StudentGroupMembership
)


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['username', 'email', 'role', 'is_active_account', 'allow_multi_device', 'is_active', 'date_joined']
    list_filter = ['role', 'is_active_account', 'allow_multi_device', 'is_active']
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Role & Permissions', {
            'fields': ('role', 'phone', 'is_active_account',
                       'has_abilities_access', 'has_collection_access',
                       'abilities_subjects_verbal', 'abilities_subjects_quantitative',
                       'abilities_categories_foundation', 'abilities_categories_collections')
        }),
        ('Device / IP access', {
            'fields': ('registered_ip', 'allow_multi_device'),
            'description': 'Students can log in only from registered IP unless allow_multi_device is enabled.',
        }),
    )
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ('Role & Permissions', {
            'fields': ('role', 'phone', 'is_active_account',
                      'has_abilities_access', 'has_collection_access',
                      'abilities_subjects_verbal', 'abilities_subjects_quantitative',
                      'abilities_categories_foundation', 'abilities_categories_collections')
        }),
    )
    readonly_fields = ['registered_ip']


@admin.register(Section)
class SectionAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'created_at']
    search_fields = ['name', 'id']


@admin.register(Subject)
class SubjectAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'section', 'created_at']
    list_filter = ['section']
    search_fields = ['name', 'id']


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'subject', 'has_tests', 'created_at']
    list_filter = ['subject', 'has_tests']
    search_fields = ['name', 'id']


@admin.register(Chapter)
class ChapterAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'category', 'order', 'created_at']
    list_filter = ['category']
    search_fields = ['name', 'id']
    ordering = ['category', 'order']


@admin.register(Lesson)
class LessonAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'chapter', 'has_test', 'order', 'created_at']
    list_filter = ['chapter', 'has_test']
    search_fields = ['name', 'id']
    ordering = ['chapter', 'order']


class AnswerInline(admin.TabularInline):
    model = Answer
    extra = 0
    min_num = 4
    max_num = 4


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ['id', 'lesson', 'created_by', 'created_at']
    list_filter = ['section', 'subject', 'category', 'chapter', 'lesson', 'created_at']
    search_fields = ['id', 'question']
    inlines = [AnswerInline]
    readonly_fields = ['created_at', 'updated_at']


@admin.register(Video)
class VideoAdmin(admin.ModelAdmin):
    list_display = ['id', 'title', 'lesson', 'created_by', 'duration', 'created_at']
    list_filter = ['section', 'subject', 'category', 'chapter', 'lesson', 'created_at']
    search_fields = ['title', 'id']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(File)
class FileAdmin(admin.ModelAdmin):
    list_display = ['id', 'title', 'lesson', 'file_type', 'created_by', 'created_at']
    list_filter = ['section', 'subject', 'category', 'chapter', 'lesson', 'file_type', 'created_at']
    search_fields = ['title', 'id']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(StudentProgress)
class StudentProgressAdmin(admin.ModelAdmin):
    list_display = ['user', 'question', 'selected_answer', 'is_correct', 'answered_at']
    list_filter = ['is_correct', 'answered_at']
    search_fields = ['user__username', 'question__id']
    readonly_fields = ['started_at', 'updated_at']


@admin.register(LessonProgress)
class LessonProgressAdmin(admin.ModelAdmin):
    list_display = ['user', 'lesson', 'completion_percentage', 'accuracy_percentage', 'last_activity']
    list_filter = ['lesson', 'last_activity']
    search_fields = ['user__username', 'lesson__name']
    readonly_fields = ['started_at', 'last_activity', 'completed_at']


class StudentGroupMembershipInline(admin.TabularInline):
    model = StudentGroupMembership
    extra = 0
    raw_id_fields = ['user']


@admin.register(StudentGroup)
class StudentGroupAdmin(admin.ModelAdmin):
    list_display = ['name', 'parent', 'order', 'created_at']
    list_filter = ['parent']
    search_fields = ['name']
    inlines = [StudentGroupMembershipInline]
    raw_id_fields = ['parent']


@admin.register(StudentGroupMembership)
class StudentGroupMembershipAdmin(admin.ModelAdmin):
    list_display = ['group', 'user', 'added_at']
    list_filter = ['group']
    search_fields = ['user__username', 'group__name']
    raw_id_fields = ['group', 'user']
