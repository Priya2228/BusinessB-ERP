from django.contrib.auth.hashers import make_password
from django.db import migrations


def create_special_users(apps, schema_editor):
    User = apps.get_model("auth", "User")
    UserProfile = apps.get_model("authentication", "UserProfile")

    defaults = [
        {
            "username": "documentcontroller",
            "password": "DocCtrl@123",
            "role": "documentcontroller",
            "designation": "Document Controller",
        },
        {
            "username": "operationhead",
            "password": "OpHead@123",
            "role": "operationhead",
            "designation": "Operations Head",
        },
    ]

    for entry in defaults:
        user, created = User.objects.get_or_create(
            username=entry["username"],
            defaults={"is_staff": False, "is_superuser": False, "email": f"{entry['username']}@adhoc.com"},
        )
        password_hash = make_password(entry["password"])
        if created or user.password != password_hash:
            user.password = password_hash
            user.save()

        profile, _ = UserProfile.objects.get_or_create(user_id=user.id)
        profile.role = entry["role"]
        profile.designation = entry["designation"]
        profile.save()


class Migration(migrations.Migration):

    dependencies = [
        ("authentication", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(create_special_users, migrations.RunPython.noop),
    ]
