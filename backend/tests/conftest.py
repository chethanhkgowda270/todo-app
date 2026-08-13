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
        "postgresql://ledger_user:ledger_pass@db:5432/ledger_test_db"
    )
    return test_app


@pytest.fixture(scope="session")
def db(app):
    """
    Creates all tables once before any tests run, and drops them
    after the entire test session finishes.
    """
    with app.app_context():
        _db.create_all()
        yield _db
        _db.drop_all()


@pytest.fixture(autouse=True)
def clean_db(app, db):
    """
    Runs automatically BEFORE every individual test. Cleaning before,
    rather than after, means each test doesn't depend on the previous
    test's cleanup having worked correctly.
    """
    with app.app_context():
        for table in reversed(db.metadata.sorted_tables):
            db.session.execute(table.delete())
        db.session.commit()
    yield


@pytest.fixture
def client(app):
    """
    Gives each test a test client to simulate HTTP requests without
    running a real server.
    """
    return app.test_client()