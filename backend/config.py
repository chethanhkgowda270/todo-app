import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()


def _bool_env(name, default):
    return os.environ.get(name, str(default)).strip().lower() in ("1", "true", "yes")


class Config:
    # Example: postgresql://ledger_user:ledger_pass@localhost:5432/ledger_db
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL", "postgresql://ledger_user:ledger_pass@localhost:5432/ledger_db"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "http://localhost:5173").split(",")

    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "dev-secret-change-me")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(
        seconds=int(os.environ.get("JWT_ACCESS_TOKEN_EXPIRES_SECONDS", 60 * 60))  # 1 hour
    )
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(
        seconds=int(os.environ.get("JWT_REFRESH_TOKEN_EXPIRES_SECONDS", 60 * 60 * 24 * 30))  # 30 days
    )

    # Used to build links inside verification/reset emails.
    FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:5173")

    # When true, verification/reset links are also returned directly in the
    # API response (in addition to being "sent" — see email_utils.py) so you
    # can test the flow with no email provider configured. Turn this OFF
    # once real email sending is wired up, so tokens aren't exposed over the API.
    EXPOSE_AUTH_LINKS_IN_RESPONSE = _bool_env("EXPOSE_AUTH_LINKS_IN_RESPONSE", True)
