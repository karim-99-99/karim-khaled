from rest_framework import serializers
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from .models import (
    User, Section, Subject, Category, Chapter, Lesson,
    Question, Answer, Video, File, StudentProgress, LessonProgress
)


class UserSerializer(serializers.ModelSerializer):
    """User serializer for listing/retrieving"""
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role',
                  'phone', 'is_active_account', 'has_abilities_access',
                  'has_collection_access', 'abilities_subjects_verbal',
                  'abilities_subjects_quantitative', 'abilities_categories_foundation',
                  'abilities_categories_collections', 'avatar_choice',
                  'allow_multi_device', 'date_joined']
        read_only_fields = ['id', 'date_joined']


class UserCreateSerializer(serializers.ModelSerializer):
    """Serializer for user registration"""
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=True)
    avatar_choice = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password2', 'first_name',
                  'last_name', 'phone', 'role', 'avatar_choice']
        extra_kwargs = {
            'password': {'write_only': True},
        }

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "Password fields didn't match."})
        ac = attrs.get('avatar_choice') or ''
        if ac and ac.strip() and ac.strip() not in ('male_gulf', 'female_gulf'):
            raise serializers.ValidationError({"avatar_choice": "Invalid avatar_choice."})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password2')
        password = validated_data.pop('password')
        avatar_choice = (validated_data.pop('avatar_choice', None) or '').strip() or None
        user = User.objects.create_user(**validated_data, password=password)
        if avatar_choice:
            user.avatar_choice = avatar_choice
            user.save(update_fields=['avatar_choice'])
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating user (admin can update permissions)"""
    
    class Meta:
        model = User
        fields = ['username', 'email', 'first_name', 'last_name', 'phone',
                  'is_active_account', 'has_abilities_access',
                  'has_collection_access', 'abilities_subjects_verbal',
                  'abilities_subjects_quantitative', 'abilities_categories_foundation',
                  'abilities_categories_collections', 'avatar_choice', 'allow_multi_device']


class LoginSerializer(serializers.Serializer):
    """Serializer for user login"""
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)


class AnswerSerializer(serializers.ModelSerializer):
    """Answer serializer"""
    
    class Meta:
        model = Answer
        fields = ['id', 'answer_id', 'text', 'is_correct']


class QuestionSerializer(serializers.ModelSerializer):
    """Question serializer with answers"""
    answers = AnswerSerializer(many=True, read_only=True)
    question_image_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Question
        fields = ['id', 'lesson', 'chapter', 'category', 'subject', 'section',
                  'question', 'question_en', 'question_image', 'question_image_url',
                  'explanation', 'answers', 'created_at', 'updated_at', 'created_by']
        read_only_fields = ['created_at', 'updated_at', 'created_by']
    
    def get_question_image_url(self, obj):
        if obj.question_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.question_image.url)
        return None


class QuestionCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating questions with answers"""
    answers = AnswerSerializer(many=True)
    
    class Meta:
        model = Question
        fields = ['id', 'lesson', 'question', 'question_en', 'question_image',
                  'explanation', 'answers']
        read_only_fields = ['id']
    
    def create(self, validated_data):
        answers_data = validated_data.pop('answers')
        question = Question.objects.create(**validated_data, created_by=self.context['request'].user)
        for answer_data in answers_data:
            Answer.objects.create(question=question, **answer_data)
        return question
    
    def update(self, instance, validated_data):
        answers_data = validated_data.pop('answers', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        if answers_data:
            # Update answers
            instance.answers.all().delete()
            for answer_data in answers_data:
                Answer.objects.create(question=instance, **answer_data)
        
        return instance


class LessonSerializer(serializers.ModelSerializer):
    """Lesson serializer"""
    
    class Meta:
        model = Lesson
        fields = ['id', 'chapter', 'name', 'name_en', 'has_test', 'order']
        read_only_fields = ['id']


class ChapterSerializer(serializers.ModelSerializer):
    """Chapter serializer with lessons"""
    items = LessonSerializer(many=True, read_only=True)
    
    class Meta:
        model = Chapter
        fields = ['id', 'category', 'name', 'name_en', 'order', 'items']
        read_only_fields = ['id']


class CategorySerializer(serializers.ModelSerializer):
    """Category serializer with chapters"""
    chapters = ChapterSerializer(many=True, read_only=True)
    
    class Meta:
        model = Category
        fields = ['id', 'subject', 'name', 'name_en', 'has_tests', 'chapters']


class SubjectSerializer(serializers.ModelSerializer):
    """Subject serializer with categories"""
    categories = CategorySerializer(many=True, read_only=True)
    
    class Meta:
        model = Subject
        fields = ['id', 'section', 'name', 'name_en', 'categories']


class SectionSerializer(serializers.ModelSerializer):
    """Section serializer with subjects"""
    subjects = SubjectSerializer(many=True, read_only=True)
    
    class Meta:
        model = Section
        fields = ['id', 'name', 'name_en', 'subjects']


class VideoSerializer(serializers.ModelSerializer):
    """Video serializer"""
    video_file_url = serializers.SerializerMethodField()
    thumbnail_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Video
        fields = ['id', 'lesson', 'chapter', 'category', 'subject', 'section',
                  'title', 'description', 'video_file', 'video_file_url',
                  'video_url', 'thumbnail', 'thumbnail_url', 'duration', 'order',
                  'is_public',
                  'created_at', 'updated_at', 'created_by']
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by']
    
    def get_video_file_url(self, obj):
        # Return video_url if it exists (external link), otherwise return file URL
        if obj.video_url:
            return obj.video_url
        if obj.video_file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.video_file.url)
        return None
    
    def get_thumbnail_url(self, obj):
        if obj.thumbnail:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.thumbnail.url)
        return None


class FileSerializer(serializers.ModelSerializer):
    """File serializer"""
    file_url = serializers.SerializerMethodField()
    
    class Meta:
        model = File
        fields = ['id', 'lesson', 'chapter', 'category', 'subject', 'section',
                  'title', 'description', 'file', 'file_url', 'file_type', 'order',
                  'is_public',
                  'created_at', 'updated_at', 'created_by']
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by']
    
    def get_file_url(self, obj):
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
        return None


class StudentProgressSerializer(serializers.ModelSerializer):
    """Student progress serializer"""
    question = QuestionSerializer(read_only=True)
    
    class Meta:
        model = StudentProgress
        fields = ['id', 'user', 'question', 'lesson', 'selected_answer', 
                  'is_correct', 'time_spent', 'started_at', 'answered_at', 'updated_at']
        read_only_fields = ['user', 'started_at', 'updated_at']


class LessonProgressSerializer(serializers.ModelSerializer):
    """Lesson progress serializer"""
    lesson = LessonSerializer(read_only=True)
    last_question = QuestionSerializer(read_only=True)
    
    class Meta:
        model = LessonProgress
        fields = ['id', 'user', 'lesson', 'total_questions', 'answered_questions',
                  'correct_answers', 'completion_percentage', 'accuracy_percentage',
                  'last_question', 'started_at', 'last_activity', 'completed_at']
        read_only_fields = ['user', 'started_at', 'last_activity', 'completed_at']
