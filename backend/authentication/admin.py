from django.contrib import admin

from .models import UserProfile


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "role", "designation", "department", "updated_at")
    list_filter = ("role", "department")
    search_fields = ("user__username", "designation", "department")
