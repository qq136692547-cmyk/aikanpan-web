#!/usr/bin/env python3
"""Record a small, reliable SEO health snapshot for aikanpan.top."""

import json
import os
import tempfile
import urllib.error
import urllib.request
from datetime import datetime, timezone


SITE_URL = os.getenv("SEO_SITE_URL", "https://aikanpan.top").rstrip("/")
BAIDU_STATE = os.getenv(
    "BAIDU_PUSH_STATE", "/var/lib/aikanpan-baidu-push/state.json"
)
STATUS_FILE = os.getenv(
    "SEO_STATUS_FILE", "/var/lib/aikanpan-seo/status.json"
)
USER_AGENT = "aikanpan-seo-status/1.0"


def now_iso():
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def request(url):
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(req, timeout=20) as response:
            return response.status, response.read()
    except urllib.error.HTTPError as error:
        return error.code, error.read()
    except Exception as error:
        return 0, str(error).encode("utf-8", errors="replace")


def load_json(path, default):
    if not os.path.exists(path):
        return default
    try:
        with open(path, "r", encoding="utf-8") as handle:
            return json.load(handle)
    except (OSError, ValueError):
        return default


def save_json(path, payload):
    directory = os.path.dirname(path)
    if directory:
        os.makedirs(directory, mode=0o700, exist_ok=True)
    descriptor, temporary_path = tempfile.mkstemp(
        prefix=".status-", suffix=".json", dir=directory or "."
    )
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8") as handle:
            json.dump(payload, handle, ensure_ascii=True, indent=2, sort_keys=True)
            handle.write("\n")
        os.chmod(temporary_path, 0o600)
        os.replace(temporary_path, path)
    finally:
        if os.path.exists(temporary_path):
            os.unlink(temporary_path)


def main():
    today = datetime.now().strftime("%Y-%m-%d")
    checks = {}
    urls = [
        SITE_URL + "/",
        SITE_URL + "/stocks/",
        SITE_URL + "/market/limit-up/",
        SITE_URL + "/market/fund-flow/",
        SITE_URL + "/market/temperature/",
        SITE_URL + "/review/" + today + "/",
        SITE_URL + "/sitemap.xml",
        SITE_URL + "/robots.txt",
    ]
    for url in urls:
        status, body = request(url)
        checks[url] = {
            "status": status,
            "bytes": len(body),
        }

    sitemap_status, sitemap_body = request(SITE_URL + "/sitemap.xml")
    sitemap_urls = sitemap_body.count(b"<loc>") if sitemap_status == 200 else 0
    baidu_state = load_json(BAIDU_STATE, {})
    submitted = baidu_state.get("submitted") or {}
    last_result = baidu_state.get("last_result") or {}
    pending = max(0, sitemap_urls - len(submitted)) if sitemap_urls else None

    payload = {
        "checked_at": now_iso(),
        "sitemap_urls": sitemap_urls,
        "baidu_submitted": len(submitted),
        "baidu_pending": pending,
        "baidu_last_result": last_result,
        "checks": checks,
        "healthy": all(item["status"] == 200 for item in checks.values()),
    }
    save_json(STATUS_FILE, payload)
    print(json.dumps(payload, ensure_ascii=True, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
