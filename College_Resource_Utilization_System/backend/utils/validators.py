import re

EMAIL_REGEX = r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$'
PHONE_REGEX = r'^\+?[0-9]{10,14}$'

def validate_email(email: str) -> bool:
    if not email or not isinstance(email, str):
        return False
    return bool(re.match(EMAIL_REGEX, email.strip()))

def validate_mobile(mobile: str) -> bool:
    if not mobile or not isinstance(mobile, str):
        return False
    cleaned = re.sub(r'[\s-]', '', mobile.strip())
    return bool(re.match(PHONE_REGEX, cleaned))

def validate_password_strength(password: str) -> tuple[bool, str]:
    if not password or len(password) < 6:
        return False, "Password must be at least 6 characters long."
    if not any(char.isdigit() for char in password) and not any(not char.isalnum() for char in password):
        return False, "Password must contain at least one digit or special symbol."
    return True, ""
