from authentication.models import UserProfile

ROLE_ADMIN = "admin"

def get_or_create_profile(user):
    profile = getattr(user, "profile", None)
    if profile is not None:
        return profile

    profile, _ = UserProfile.objects.get_or_create(user=user)
    return profile


def get_user_role(user):
    if not getattr(user, "is_authenticated", False):
        return None
    if getattr(user, "is_superuser", False):
        return ROLE_ADMIN
    return get_or_create_profile(user).role


def get_user_designation(user):
    if not getattr(user, "is_authenticated", False):
        return ""
    return get_or_create_profile(user).designation


def has_any_role(user, allowed_roles):
    if not getattr(user, "is_authenticated", False):
        return False
    if getattr(user, "is_superuser", False):
        return True
    return get_user_role(user) in set(allowed_roles or [])


def has_role(user, role):
    if not getattr(user, "is_authenticated", False):
        return False
    return get_user_role(user) == role


def build_auth_payload(user):
    profile = get_or_create_profile(user)
    role = get_user_role(user) or profile.role
    return {
        "username": user.username,
        "role": role,
        "designation": profile.designation or ("Administrator" if role == ROLE_ADMIN else ""),
        "department": profile.department or "",
    }
