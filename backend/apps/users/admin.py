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

    def save(self, commit=True):
        user = super().save(commit=False)
        user.set_unusable_password()
        user.is_active = False
        if commit:
            user.save()
        return user

    class Media:
        # Small inline script: hides/shows the hourly_rate row based on the
        # role dropdown value. Runs on page load and on every role change.
        js = ('admin/js/vendor/jquery/jquery.js',)  # jQuery is already bundled in Django admin

    # The JS is injected via the fieldset's description below; using a
    # separate static file would require STATICFILES setup. Instead we use
    # a ModelAdmin.change_view override — see UserAdmin below.


# ─── User admin ───────────────────────────────────────────────────────────────

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    add_form      = InviteUserForm
    list_display  = ('email', 'full_name', 'role', 'is_active', 'created_at')
    list_filter   = ('role', 'is_active')
    search_fields = ('email', 'full_name')
    ordering      = ('email',)

    fieldsets = (
        (None,          {'fields': ('email', 'password')}),
        ('Personal',    {'fields': ('full_name', 'role')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser')}),
    )

    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields':  ('email', 'full_name', 'role', 'hourly_rate'),
            # Small description used to inject the toggle script.
            # Django renders 'description' as raw HTML above the fieldset.
            'description': (
                '<script>'
                'document.addEventListener("DOMContentLoaded", function () {'
                '  function toggle() {'
                '    var role = document.getElementById("id_role").value;'
                '    var row  = document.querySelector(".field-hourly_rate");'
                '    if (row) row.style.display = (role === "Designer") ? "" : "none";'
                '  }'
                '  toggle();'  # hide on initial load if role is not Designer
                '  document.getElementById("id_role").addEventListener("change", toggle);'
                '});'
                '</script>'
            ),
        }),
    )

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

@admin.register(Designer)
class DesignerAdmin(admin.ModelAdmin):
    list_display = ('user', 'specialization', 'hourly_rate', 'available_hours_per_week')


@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    list_display = ('user', 'phone', 'industry')


@admin.register(InvitationToken)
class InvitationTokenAdmin(admin.ModelAdmin):
    list_display = ('user', 'is_used', 'expires_at')