#!/usr/bin/env python3
#
# ML Backend Service Launcher
#
# This script is called by Tauri to start the ML backend service
# It handles:
# - Virtual environment activation
# - Dependency checks
# - Service startup with proper logging
# - Graceful shutdown on SIGTERM
#

import os
import sys
import subprocess
import signal
import argparse
from pathlib import Path

# Configuration
SERVICE_DIR = Path(__file__).parent.absolute()
VENV_DIR = SERVICE_DIR / "venv"
SRC_DIR = SERVICE_DIR / "src"
REQUIREMENTS_FILE = SERVICE_DIR / "requirements.txt"


def check_venv():
    """Check if virtual environment exists, create if not"""
    if not VENV_DIR.exists():
        print("Creating Python virtual environment...")
        subprocess.run([sys.executable, "-m", "venv", str(VENV_DIR)], check=True)
        print("✓ Virtual environment created")

    # Determine python executable in venv
    if sys.platform == "win32":
        python_exe = VENV_DIR / "Scripts" / "python.exe"
        pip_exe = VENV_DIR / "Scripts" / "pip.exe"
    else:
        python_exe = VENV_DIR / "bin" / "python"
        pip_exe = VENV_DIR / "bin" / "pip"

    return python_exe, pip_exe


def install_dependencies(pip_exe):
    """Install required packages"""
    print("Checking dependencies...")
    subprocess.run(
        [str(pip_exe), "install", "-r", str(REQUIREMENTS_FILE), "--quiet"], check=True
    )
    print("✓ Dependencies installed")


def start_service(python_exe, host, port):
    """Start the FastAPI service"""
    print(f"Starting ML Backend Service on {host}:{port}...")
    print("=" * 60)

    env = os.environ.copy()
    env["ML_BACKEND_HOST"] = host
    env["ML_BACKEND_PORT"] = str(port)
    env["PYTHONUNBUFFERED"] = "1"

    # Start the service
    process = subprocess.Popen(
        [
            str(python_exe),
            "-m",
            "uvicorn",
            "main:app",
            "--host",
            host,
            "--port",
            str(port),
            "--log-level",
            "info",
        ],
        cwd=SRC_DIR,
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
        universal_newlines=True,
    )

    # Setup signal handlers for graceful shutdown
    def signal_handler(sig, frame):
        print("\nShutting down ML Backend Service...")
        process.terminate()
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()
        sys.exit(0)

    signal.signal(signal.SIGTERM, signal_handler)
    signal.signal(signal.SIGINT, signal_handler)

    # Stream output
    try:
        for line in process.stdout:
            print(line, end="")
    except KeyboardInterrupt:
        signal_handler(None, None)

    return process.returncode


def main():
    parser = argparse.ArgumentParser(description="AI Assistant ML Backend Launcher")
    parser.add_argument("--host", default="127.0.0.1", help="Host to bind to")
    parser.add_argument("--port", type=int, default=8001, help="Port to bind to")
    parser.add_argument(
        "--setup-only",
        action="store_true",
        help="Only setup venv and deps, don't start",
    )
    args = parser.parse_args()

    print("=" * 60)
    print("AI Assistant ML Backend Service Launcher")
    print("=" * 60)

    # Check Python version
    if sys.version_info < (3, 8):
        print("Error: Python 3.8+ required")
        sys.exit(1)

    print(f"Python: {sys.version}")
    print(f"Service directory: {SERVICE_DIR}")

    # Setup virtual environment
    python_exe, pip_exe = check_venv()

    # Install dependencies
    try:
        install_dependencies(pip_exe)
    except subprocess.CalledProcessError as e:
        print(f"Error installing dependencies: {e}")
        sys.exit(1)

    if args.setup_only:
        print("✓ Setup complete")
        sys.exit(0)

    # Start service
    try:
        return_code = start_service(python_exe, args.host, args.port)
        sys.exit(return_code)
    except Exception as e:
        print(f"Error starting service: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
