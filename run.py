"""
ClipScorer Dev Server Launcher
Starts both backend (uvicorn) and frontend (next dev) as detached processes.
All output is logged to logs/ directory with timestamps.

Usage:
  python run.py          Start both services
  python run.py stop     Stop all services
  python run.py status   Check if services are running
"""

import subprocess
import sys
import os
import time
import signal
import json
from pathlib import Path
from datetime import datetime

ROOT = Path(__file__).parent
LOGS_DIR = ROOT / "logs"
LOGS_DIR.mkdir(exist_ok=True)

BACKEND_LOG = LOGS_DIR / "backend.log"
FRONTEND_LOG = LOGS_DIR / "frontend.log"
COMBINED_LOG = LOGS_DIR / "combined.log"
PID_FILE = LOGS_DIR / "pids.json"

# Windows-specific creation flags for detached processes
CREATE_NO_WINDOW = 0x08000000
CREATE_NEW_PROCESS_GROUP = 0x00000200
DETACHED_PROCESS = 0x00000008


def log(msg: str, source: str = "launcher"):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]
    line = f"[{ts}] [{source}] {msg}"
    try:
        print(line, flush=True)
    except UnicodeEncodeError:
        print(line.encode("ascii", "replace").decode(), flush=True)
    with open(COMBINED_LOG, "a", encoding="utf-8") as f:
        f.write(line + "\n")


def wait_for_port(port: int, timeout: float = 30.0) -> bool:
    import socket
    start = time.time()
    while time.time() - start < timeout:
        try:
            with socket.create_connection(("127.0.0.1", port), timeout=1):
                return True
        except (ConnectionRefusedError, OSError):
            time.sleep(0.5)
    return False


def save_pids(pids: dict):
    with open(PID_FILE, "w") as f:
        json.dump(pids, f)


def load_pids() -> dict:
    if PID_FILE.exists():
        with open(PID_FILE) as f:
            return json.load(f)
    return {}


def is_running(pid: int) -> bool:
    try:
        os.kill(pid, 0)
        return True
    except (OSError, ProcessLookupError):
        return False


def start_services():
    pids = load_pids()

    # Check if already running
    for name, pid in pids.items():
        if is_running(pid):
            log(f"{name} already running (PID {pid})", "launcher")

    # Clear old logs
    for f in [BACKEND_LOG, FRONTEND_LOG, COMBINED_LOG]:
        f.write_text("")

    log("========================================")
    log("ClipScorer Dev Launcher")
    log(f"Project root: {ROOT}")
    log("========================================")

    # --- Start Backend ---
    log("Starting backend (uvicorn engine.api:app on port 8000)...")
    backend = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "engine.api:app",
         "--reload", "--host", "127.0.0.1", "--port", "8000", "--log-level", "info"],
        cwd=str(ROOT),
        stdout=open(BACKEND_LOG, "w", encoding="utf-8"),
        stderr=subprocess.STDOUT,
        creationflags=CREATE_NEW_PROCESS_GROUP | DETACHED_PROCESS,
        close_fds=True,
    )
    log(f"Backend PID: {backend.pid}", "backend")

    # --- Start Frontend ---
    log("Starting frontend (npm run dev on port 3000)...")
    frontend = subprocess.Popen(
        ["npm.cmd", "run", "dev"],
        cwd=str(ROOT),
        stdout=open(FRONTEND_LOG, "w", encoding="utf-8"),
        stderr=subprocess.STDOUT,
        creationflags=CREATE_NEW_PROCESS_GROUP | DETACHED_PROCESS,
        close_fds=True,
    )
    log(f"Frontend PID: {frontend.pid}", "frontend")

    # Save PIDs and exit — processes run detached
    save_pids({"backend": backend.pid, "frontend": frontend.pid})

    # Wait for ports
    log("Waiting for backend on port 8000...")
    if wait_for_port(8000, timeout=30):
        log("Backend is UP on port 8000")
    else:
        log("WARNING: Backend not responding within 30s")

    log("Waiting for frontend on port 3000...")
    if wait_for_port(3000, timeout=60):
        log("Frontend is UP on port 3000")
    else:
        log("WARNING: Frontend not responding within 60s")

    log("========================================")
    log("Services started. Logs at:")
    log(f"  Combined: {COMBINED_LOG}")
    log(f"  Backend:  {BACKEND_LOG}")
    log(f"  Frontend: {FRONTEND_LOG}")
    log("Use 'python run.py stop' to stop, 'python run.py status' to check.")
    log("========================================")


def stop_services():
    pids = load_pids()
    if not pids:
        log("No PID file found. Nothing to stop.")
        return

    stopped = 0
    for name, pid in pids.items():
        if is_running(pid):
            log(f"Stopping {name} (PID {pid})...")
            try:
                subprocess.run(
                    ["taskkill", "/F", "/T", "/PID", str(pid)],
                    capture_output=True, timeout=10,
                )
                log(f"{name} stopped")
                stopped += 1
            except Exception as e:
                log(f"Failed to stop {name}: {e}")
        else:
            log(f"{name} (PID {pid}) not running")

    # Cleanup: also kill any stray node/uvicorn processes on ports
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
                            subprocess.run(
                                ["taskkill", "/F", "/PID", str(pid)],
                                capture_output=True, timeout=5,
                            )
                            log(f"Killed orphan process on port {port} (PID {pid})")
                            stopped += 1
        except Exception:
            pass

    PID_FILE.unlink(missing_ok=True)
    log(f"Stopped {stopped} service(s).")


def show_status():
    pids = load_pids()
    if not pids:
        print("No services tracked. Use 'python run.py start' to launch.")
        return

    for name, pid in pids.items():
        running = is_running(pid)
        status = "RUNNING" if running else "STOPPED"
        print(f"  {name}: PID {pid} - {status}")

    # Check ports
    import socket
    for port, name in [(8000, "Backend"), (3000, "Frontend")]:
        try:
            with socket.create_connection(("127.0.0.1", port), timeout=1):
                print(f"  {name} port {port}: OPEN")
        except (ConnectionRefusedError, OSError):
            print(f"  {name} port {port}: CLOSED")


if __name__ == "__main__":
    if len(sys.argv) > 1:
        cmd = sys.argv[1].lower()
        if cmd == "stop":
            stop_services()
        elif cmd == "status":
            show_status()
        else:
            print(f"Usage: python run.py [start|stop|status]")
    else:
        start_services()
