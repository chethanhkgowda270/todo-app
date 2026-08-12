import os
import pytest
from app import create_app
from models import db as _db


@pytest.fixture(scope="session")
def app():
    """
    Creates a Flask app configured for testing, once per test session.
    Reads the test DB URL from an environment variable so this works
    both locally (via Docker Compose, hostname "db") and in CI
    (via GitHub Actions, hostname "localhost").
    """
    test_app = create_app()
    test_app.config["TESTING"] = True
    test_app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get(
        "DATABASE_URL",
        "postgresql://ledger_user:ledger_pass@db:5432/ledger_test_db"  # local Docker fallback
    )
    return test_app


@pytest.fixture(autouse=True)
def clean_db(app, db):
    """
    Runs automatically BEFORE every individual test (not after).
    Cleaning before, rather than after, means each test doesn't
    depend on the previous test's cleanup having worked correctly —
    it's self-sufficient and can't inherit leftover state.
    """
    with app.app_context():
        for table in reversed(db.metadata.sorted_tables):
            db.session.execute(table.delete())
        db.session.commit()
    yield