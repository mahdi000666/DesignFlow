from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django import forms
from .models import User, Designer, Client, InvitationToken


# ─── Creation form ────────────────────────────────────────────────────────────

class InviteUserForm(forms.ModelForm):
    # Extra field — not on the User model; handled manually in save_model.
    hourly_rate = forms.DecimalField(
        max_digits=10,
        decimal_places=2,
        required=False,
    )

    class Meta:
        model  = User
        fields = ('email', 'full_name', 'role', 'hourly_rate')

    # clean_field functions are called by django in the declared order, then clean() for cross-field validation.
    def clean_full_name(self):
        name = self.cleaned_data.get('full_name', '').strip()
        if len(name) < 2:
            raise forms.ValidationError('Full name must be at least 2 characters.')
        # Allows "Henry VIII" but rejects "12345".
        if not any(c.isalpha() for c in name):
            raise forms.ValidationError('Full name must contain at least one letter.')
        return name

    def clean_hourly_rate(self):
        # DecimalField already rejects non-numeric input before this method runs.
        rate = self.cleaned_data.get('hourly_rate')
        if rate is not None and rate <= 0:
            raise forms.ValidationError('Hourly rate must be greater than 0.')
        return rate

    def clean(self):
        cleaned = super().clean()
        role        = cleaned.get('role')
        hourly_rate = cleaned.get('hourly_rate')
        # Required for Designer — drives the profit margin metric.
        if role == 'Designer' and hourly_rate is None:
            self.add_error('hourly_rate', 'Hourly rate is required for Designer accounts.')
        return cleaned

    def save(self, commit=True):
        # Commit = false when you wanna save in memory but don't wanna store in database yet.
        # Before saving to the DB, we have to set password and is_active.
        user = super().save(commit=False)
        # User cannot log in yet, needs to set a password during activation.
        user.set_unusable_password()
        user.is_active = False
        if commit:
            user.save()
        return user

    class Media:
        js = ('admin/js/vendor/jquery/jquery.js',)


# ─── User admin ───────────────────────────────────────────────────────────────

# Register the class as the admin interface.
@admin.register(User)
class UserAdmin(BaseUserAdmin):
    add_form      = InviteUserForm
    # Displayed at the admin panel.
    list_display  = ('email', 'full_name', 'role', 'is_active', 'created_at')
    list_filter   = ('role', 'is_active')
    search_fields = ('email', 'full_name')
    ordering      = ('email',)

    # When editing an existing user.
    fieldsets = (
        (None,          {'fields': ('email', 'password')}),
        ('Personal',    {'fields': ('full_name', 'role')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser')}),
    )

    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields':  ('email', 'full_name', 'role', 'hourly_rate'),
            'description': (
                '<script>'
                'document.addEventListener("DOMContentLoaded", function () {' # Wait for content to be loaded.
                '  function toggle() {'
                '    var role = document.getElementById("id_role").value;'
                '    var row  = document.querySelector(".field-hourly_rate");'
                '    if (row) row.style.display = (role === "Designer") ? "" : "none";' # If row exists, set display to "" for show, none to hide.
                '  }'
                '  toggle();'
                '  document.getElementById("id_role").addEventListener("change", toggle);' # Call toggle on each role change.
                '});'
                '</script>'
            ),
        }),
    )

    # change = true when editing an existing user (not profile), false if creating a new one.
    def save_model(self, request, obj, form, change):
        """
        Called after the User row is saved.
        By this point the post_save signal has already created the Designer
        profile row, so we can safely update hourly_rate on it.
        """
        super().save_model(request, obj, form, change)

        if not change and obj.role == 'Designer':
            rate = form.cleaned_data.get('hourly_rate')
            if rate is not None:
                Designer.objects.filter(user=obj).update(hourly_rate=rate)


# ─── Standalone profile admins (unchanged) ───────────────────────────────────
# Display profile specific tables.

@admin.register(Designer)
class DesignerAdmin(admin.ModelAdmin):
    list_display = ('user', 'specialization', 'hourly_rate', 'available_hours_per_week')


@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    list_display = ('user', 'phone', 'industry')


@admin.register(InvitationToken)
class InvitationTokenAdmin(admin.ModelAdmin):
    list_display = ('user', 'is_used', 'expires_at')