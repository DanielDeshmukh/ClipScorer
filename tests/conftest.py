import sys
import sqlite3
import pytest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).parent.parent))

_in_memory_conns = []


def _make_in_memory_conn():
    conn = sqlite3.connect(":memory:", timeout=30)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    _in_memory_conns.append(conn)
    return conn


@pytest.fixture(autouse=True)
def setup_test_db():
    _in_memory_conns.clear()
    import engine.db as db_mod
    db_mod._local.conn = None

    with patch("engine.db.get_connection", side_effect=_make_in_memory_conn):
        from engine.db import init_db
        init_db()
        yield

    for conn in _in_memory_conns:
        try:
            conn.close()
        except Exception:
            pass
    _in_memory_conns.clear()
    db_mod._local.conn = None
