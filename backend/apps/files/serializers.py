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

    # Since the model stores only a relative path such as projects/42/logo.png.
    # Can't hardcode a domain in the database since it changes between dev and prod.
    # get_file_url() builds the full path.
    def get_file_url(self, obj):
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(f'{settings.MEDIA_URL}{obj.file_path}')
        # Return relative path in case its called in a management command.
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
        file    = validated_data.pop('file') # Extract the InMemoryUploadedFile; pop so it's not passed to ORM.
        project = validated_data['project']

        # Resolve storage directory: MEDIA_ROOT/projects/{project_id}/
        # MEDIA_ROOT is already a pathlib.Path (set in settings.py).
        # / is overloaded for paths, it means joining 2 paths together.
        relative_dir = f'projects/{project.id}'
        absolute_dir = settings.MEDIA_ROOT / relative_dir # Refers to the folder.
        absolute_dir.mkdir(parents=True, exist_ok=True)  # Create if it doesn't exist; no error if it does.

        # Avoid silent overwrite — append a counter suffix on collision.
        base_name = get_valid_filename(os.path.basename(file.name)) or 'upload' # Sanitize e.g. "my file!.png" → "my_file.png". "upload" is a fallback file name.
        dest_path = absolute_dir / base_name # Refers to the file inside the folder.
        stem, ext = os.path.splitext(base_name)
        counter   = 1
        while dest_path.exists():
            # If 'logo.png' already exists → try 'logo_1.png', 'logo_2.png', ...
            base_name = f'{stem}_{counter}{ext}'
            dest_path  = absolute_dir / base_name
            counter   += 1

        with open(dest_path, 'wb+') as fh: # Write, binary mode and open for reading/writing (+). b is crucial so windows doesnt corrupt the file.
            for chunk in file.chunks(): # streams in chunks — safe for large files, avoids loading all into RAM.
                fh.write(chunk)

        return FileUpload.objects.create(
            **validated_data, # Expands to project=..., file_type=...
            uploaded_by=self.context['request'].user,
            file_name=base_name,
            file_path=f'{relative_dir}/{base_name}',
            file_size=file.size,
        )
