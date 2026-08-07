#!/usr/bin/env python3
"""Scan recent backend/Caddy logs for errors and write a compact JSON summary."""

import argparse
import json
import os
import re
import sys
from datetime import datetime, timedelta, timezone

SERVER_ERROR_LOG = os.getenv("SERVER_ERROR_LOG", "/opt/dsa-mp/server_error.log")
CADDY_ACCESS_LOG = os.getenv("CADDY_ACCESS_LOG", "/var/log/caddy/access.log")
OUT_FILE = os.getenv("MONITOR_OUT_FILE", "/opt/dsa-mp/monitor/errors-last-hour.json")

NOISE_PATTERNS = [
    "Client error '456",
    "Server disconnected without sending a response",
    "[sina] quote",
    "[sina] limit list failed",
    "[emu] industry source failed",
    "[emu] moneyflow",
    "sectors endpoint failed",
    "[names] refresh failed",
    "[emu] market news failed",
]


def parse_time(text):
    try:
        return datetime.strptime(text, "%Y-%m-%d %H:%M:%S.%f")
    except ValueError:
        return None


def is_noise(line):
    return any(p in line for p in NOISE_PATTERNS)


def scan_server_errors(window_minutes):
    errors = []
    tracebacks = 0
    task_exceptions = 0
    error_count = 0
    noise_skipped = 0
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=window_minutes)
    try:
        with open(SERVER_ERROR_LOG, encoding="utf-8", errors="replace") as f:
            for line in f:
                if len(line) < 24:
                    continue
                ts = parse_time(line[:23])
                if ts is None:
                    continue
                if ts.tzinfo is None:
                    ts = ts.replace(tzinfo=timezone.utc)
                if ts < cutoff:
                    continue
                if is_noise(line):
                    noise_skipped += 1
                    continue
                if "Traceback" in line:
                    tracebacks += 1
                    errors.append(line.strip()[:300])
                if "Task exception was never retrieved" in line:
                    task_exceptions += 1
                    errors.append(line.strip()[:300])
                if "[ERROR]" in line:
                    error_count += 1
                    errors.append(line.strip()[:300])
    except FileNotFoundError:
        pass
    return {
        "error_count": error_count,
        "traceback_count": tracebacks,
        "task_exception_count": task_exceptions,
        "noise_skipped": noise_skipped,
        "sample": errors[-8:],
    }


def scan_caddy_5xx(window_minutes):
    count = 0
    cutoff = (datetime.now(timezone.utc) - timedelta(minutes=window_minutes)).timestamp()
    try:
        with open(CADDY_ACCESS_LOG, encoding="utf-8", errors="replace") as f:
            for line in f:
                try:
                    obj = json.loads(line)
                except json.JSONDecodeError:
                    continue
                ts = obj.get("ts")
                status = obj.get("status")
                if isinstance(ts, (int, float)) and ts >= cutoff and isinstance(status, int) and status >= 500:
                    count += 1
    except FileNotFoundError:
        pass
    return count


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--minutes", type=int, default=60)
    args = parser.parse_args()

    errors = scan_server_errors(args.minutes)
    caddy_5xx = scan_caddy_5xx(args.minutes)
    payload = {
        "scanned_at": datetime.now(timezone.utc).isoformat(),
        "window_minutes": args.minutes,
        "caddy_5xx": caddy_5xx,
        **errors,
    }
    os.makedirs(os.path.dirname(OUT_FILE), exist_ok=True)
    with open(OUT_FILE, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
    print(json.dumps(payload, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
