import sys
import sqlite3
import pytest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).parent.parent))


@pytest.fixture(autouse=True)
def setup_test_db():
    import engine.db as db_mod
    db_mod._local.conn = None

    shared_conn = sqlite3.connect(":memory:", timeout=30, check_same_thread=False)
    shared_conn.row_factory = sqlite3.Row
    shared_conn.execute("PRAGMA journal_mode=WAL")
    shared_conn.execute("PRAGMA foreign_keys=ON")

    with patch.object(db_mod, "get_connection", return_value=shared_conn):
        from engine.db import init_db
        init_db()
        yield

    shared_conn.close()
    db_mod._local.conn = None
