import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    PORT = int(os.getenv("PORT", 5000))
    DEBUG = os.getenv("FLASK_ENV", "development") == "development"
    SECRET_KEY = os.getenv("SECRET_KEY", "college_resource_super_secret_jwt_key_2026")
    JWT_EXPIRATION_HOURS = int(os.getenv("JWT_EXPIRATION_HOURS", 24))
    MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/college_resources")
    DB_NAME = os.getenv("DB_NAME", "college_resources")
    USE_MOCK_IF_NO_MONGO = os.getenv("USE_MOCK_IF_NO_MONGO", "true").lower() in ("true", "1", "yes")
    ADMIN_SETUP_SECRET = os.getenv("ADMIN_SETUP_SECRET", "COLLEGE_ADMIN_KEY_2026")
