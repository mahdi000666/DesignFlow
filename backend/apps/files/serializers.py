import os
from rest_framework import serializers
from django.conf import settings
from django.utils.text import get_valid_filename
from .models import FileUpload


class FileUploadReadSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(source='uploaded_by.full_name', read_only=True)
    file_url         = serializers.SerializerMethodField()

    class Meta:
        model  = FileUpload
        fields = [
            'id', 'project', 'uploaded_by', 'uploaded_by_name',
            'file_type', 'file_name', 'file_url', 'file_size', 'uploaded_at',
        ]

    def get_file_url(self, obj):
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(f'{settings.MEDIA_URL}{obj.file_path}')
        return obj.file_path


class FileUploadWriteSerializer(serializers.ModelSerializer):
    file = serializers.FileField(write_only=True)

    class Meta:
        model  = FileUpload
        fields = ['project', 'file_type', 'file']

    def validate(self, attrs):
        role      = self.context['request'].user.role
        file_type = attrs.get('file_type')

        if role == 'Designer' and file_type != 'deliverable':
            raise serializers.ValidationError(
                {'file_type': 'Designers may only upload deliverables.'}
            )
        if role == 'Client' and file_type not in ('reference', 'brand_guideline'):
            raise serializers.ValidationError(
                {'file_type': 'Clients may only upload reference or brand_guideline files.'}
            )
        return attrs

    def create(self, validated_data):
        file    = validated_data.pop('file')
        project = validated_data['project']

        # Resolve storage directory: MEDIA_ROOT/projects/{project_id}/
        # MEDIA_ROOT is already a pathlib.Path (set in settings.py).
        relative_dir = f'projects/{project.id}'
        absolute_dir = settings.MEDIA_ROOT / relative_dir
        absolute_dir.mkdir(parents=True, exist_ok=True)

        # Avoid silent overwrite — append a counter suffix on collision.
        base_name = get_valid_filename(os.path.basename(file.name)) or 'upload'
        dest_path = absolute_dir / base_name
        stem, ext = os.path.splitext(base_name)
        counter   = 1
        while dest_path.exists():
            base_name = f'{stem}_{counter}{ext}'
            dest_path  = absolute_dir / base_name
            counter   += 1

        with open(dest_path, 'wb+') as fh:
            for chunk in file.chunks():
                fh.write(chunk)

        return FileUpload.objects.create(
            **validated_data,
            uploaded_by=self.context['request'].user,
            file_name=base_name,
            file_path=f'{relative_dir}/{base_name}',
            file_size=file.size,
        )
