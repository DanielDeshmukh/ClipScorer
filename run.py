"""
ClipScorer Launcher
Usage:
  python run.py          Start both services
  python run.py stop     Stop all services
  python run.py status   Check if services are running
"""

import subprocess
import sys
import time
import socket
from pathlib import Path
from datetime import datetime

ROOT = Path(__file__).parent
LOGS_DIR = ROOT / "logs"
LOGS_DIR.mkdir(exist_ok=True)


def log(msg: str, source: str = "launcher"):
    ts = datetime.now().strftime("%H:%M:%S")
    line = f"[{ts}] [{source}] {msg}"
    try:
        print(line, flush=True)
    except UnicodeEncodeError:
        print(line.encode("ascii", "replace").decode(), flush=True)


def wait_for_port(port: int, timeout: float = 30.0) -> bool:
    start = time.time()
    while time.time() - start < timeout:
        try:
            with socket.create_connection(("127.0.0.1", port), timeout=1):
                return True
        except (ConnectionRefusedError, OSError):
            time.sleep(0.5)
    return False


def is_port_open(port: int) -> bool:
    try:
        with socket.create_connection(("127.0.0.1", port), timeout=1):
            return True
    except (ConnectionRefusedError, OSError):
        return False


def start_services():
    if is_port_open(8000) and is_port_open(3000):
        log("Both services already running.")
        return

    if is_port_open(8000):
        log("Backend already running on port 8000.")
    else:
        log("Starting backend...")
        subprocess.Popen(
            [sys.executable, "-m", "uvicorn", "engine.api:app",
             "--reload", "--host", "127.0.0.1", "--port", "8000", "--log-level", "info"],
            cwd=str(ROOT),
            creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0,
        )
        log("Waiting for backend...")
        if wait_for_port(8000, 30):
            log("Backend UP on port 8000")
        else:
            log("WARNING: Backend not responding")

    if is_port_open(3000):
        log("Frontend already running on port 3000.")
    else:
        log("Starting frontend...")
        subprocess.Popen(
            ["cmd", "/c", "npm run dev"],
            cwd=str(ROOT),
            creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0,
        )
        log("Waiting for frontend...")
        if wait_for_port(3000, 60):
            log("Frontend UP on port 3000")
        else:
            log("WARNING: Frontend not responding")

    log(f"Frontend: http://localhost:3000")
    log(f"Backend:  http://localhost:8000")


def stop_services():
    killed = 0
    for port in [8000, 3000]:
        try:
            result = subprocess.run(
                ["netstat", "-ano"], capture_output=True, text=True, timeout=5,
            )
            for line in result.stdout.splitlines():
                if f":{port}" in line and "LISTENING" in line:
                    parts = line.split()
                    if parts:
                        pid = int(parts[-1])
                        if pid > 0:
                            subprocess.run(["taskkill", "/F", "/PID", str(pid)], capture_output=True, timeout=5)
                            killed += 1
        except Exception:
            pass
    log(f"Killed {killed} process(es).")


def show_status():
    for port, name in [(8000, "Backend"), (3000, "Frontend")]:
        status = "UP" if is_port_open(port) else "DOWN"
        print(f"  {name}: port {port} - {status}")


if __name__ == "__main__":
    if len(sys.argv) > 1:
        cmd = sys.argv[1].lower()
        if cmd == "stop":
            stop_services()
        elif cmd == "status":
            show_status()
    else:
        start_services()
