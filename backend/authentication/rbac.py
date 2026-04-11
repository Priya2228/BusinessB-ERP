from authentication.models import UserProfile

# Define unique role constants to avoid string typos
ROLE_ADMIN = "admin"
ROLE_MD = "md"
ROLE_USER = "user"

def get_or_create_profile(user):
    """
    Retrieves the UserProfile or creates it if missing.
    Uses getattr to check for prefetched/related profile objects.
    """
    if not user or user.is_anonymous:
        return None
        
    profile = getattr(user, "profile", None)
    if profile is not None:
        return profile

    profile, _ = UserProfile.objects.get_or_create(user=user)
    return profile


def get_user_role(user):
    """
    Determines the unique role with a strict hierarchy:
    1. Superusers are always ADMIN.
    2. Profile 'role' field is used if set.
    3. Defaults to USER.
    """
    if not getattr(user, "is_authenticated", False):
        return None
    
    # Priority 1: Superuser override
    if getattr(user, "is_superuser", False):
        return ROLE_ADMIN

    # Priority 2: Profile specific role
    profile = get_or_create_profile(user)
    if profile and profile.role:
        return profile.role

    # Priority 3: Fallback
    return ROLE_USER


def get_user_designation(user):
    """Returns the designation from the profile or an empty string."""
    if not getattr(user, "is_authenticated", False):
        return ""
    profile = get_or_create_profile(user)
    return profile.designation if profile else ""


def has_any_role(user, allowed_roles):
    """Checks if the user has one of the roles in the provided list."""
    if not getattr(user, "is_authenticated", False):
        return False
    
    # Superusers bypass role checks
    if getattr(user, "is_superuser", False):
        return True
        
    current_role = get_user_role(user)
    return current_role in set(allowed_roles or [])


def has_role(user, role):
    """Checks for a single specific role match."""
    if not getattr(user, "is_authenticated", False):
        return False
    return get_user_role(user) == role


def build_auth_payload(user):
    """
    Constructs a consistent payload for frontend/tokens.
    Ensures role and designation logic is unified.
    """
    if not user or user.is_anonymous:
        return None

    profile = get_or_create_profile(user)
    role = get_user_role(user)
    
    # Logic for automatic designation if the field is empty
    default_designation = ""
    if role == ROLE_ADMIN:
        default_designation = "Administrator"
    elif role == ROLE_MD:
        default_designation = "Managing Director"

    return {
        "user_id": user.id,
        "username": user.username,
        "role": role,
        "designation": profile.designation or default_designation,
        "department": profile.department or "General",
    }
