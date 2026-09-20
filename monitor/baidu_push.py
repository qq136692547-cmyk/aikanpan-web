#!/usr/bin/env python3
"""Submit new sitemap URLs to Baidu's regular indexing API."""

import argparse
import json
import os
import tempfile
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone


SITE = os.getenv("BAIDU_SITE", "https://aikanpan.top").rstrip("/")
TOKEN = os.getenv("BAIDU_PUSH_TOKEN", "")
SITEMAP_URL = os.getenv("BAIDU_SITEMAP_URL", SITE + "/sitemap.xml")
STATE_FILE = os.getenv(
    "BAIDU_PUSH_STATE", "/var/lib/aikanpan-baidu-push/state.json"
)
DAILY_LIMIT = int(os.getenv("BAIDU_PUSH_DAILY_LIMIT", "10"))
USER_AGENT = "aikanpan-baidu-push/1.0"


def now_iso():
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def load_state():
    if not os.path.exists(STATE_FILE):
        return {"submitted": {}, "invalid": {}, "last_run": None}
    with open(STATE_FILE, "r", encoding="utf-8") as handle:
        state = json.load(handle)
    state.setdefault("submitted", {})
    state.setdefault("invalid", {})
    state.setdefault("last_run", None)
    return state


def save_state(state):
    directory = os.path.dirname(STATE_FILE)
    if directory:
        os.makedirs(directory, mode=0o700, exist_ok=True)
    file_descriptor, temporary_path = tempfile.mkstemp(
        prefix=".state-", suffix=".json", dir=directory or "."
    )
    try:
        with os.fdopen(file_descriptor, "w", encoding="utf-8") as handle:
            json.dump(state, handle, ensure_ascii=True, indent=2, sort_keys=True)
            handle.write("\n")
        os.chmod(temporary_path, 0o600)
        os.replace(temporary_path, STATE_FILE)
    finally:
        if os.path.exists(temporary_path):
            os.unlink(temporary_path)


def fetch_sitemap_urls():
    request = urllib.request.Request(
        SITEMAP_URL, headers={"User-Agent": USER_AGENT}
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        root = ET.fromstring(response.read())

    urls = []
    seen = set()
    for node in root.iter():
        if node.tag != "loc" and not node.tag.endswith("}loc"):
            continue
        url = (node.text or "").strip()
        if url and url not in seen:
            seen.add(url)
            urls.append(url)
    return urls


def submit_url(url):
    query = "site={}&token={}".format(
        urllib.parse.quote(SITE, safe=":/"),
        urllib.parse.quote(TOKEN, safe=""),
    )
    request = urllib.request.Request(
        "http://data.zz.baidu.com/urls?" + query,
        data=url.encode("utf-8"),
        headers={"Content-Type": "text/plain", "User-Agent": USER_AGENT},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            raw = response.read().decode("utf-8", errors="replace")
            status = response.status
    except urllib.error.HTTPError as error:
        raw = error.read().decode("utf-8", errors="replace")
        status = error.code

    try:
        payload = json.loads(raw)
    except ValueError:
        payload = {"error": status, "message": raw.strip()}
    payload["_http_status"] = status
    return payload


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show pending URLs without submitting them.",
    )
    args = parser.parse_args()

    if not TOKEN:
        print("status=error message=BAIDU_PUSH_TOKEN is missing")
        return 1

    state = load_state()
    sitemap_urls = fetch_sitemap_urls()
    pending = [
        url
        for url in sitemap_urls
        if url not in state["submitted"] and url not in state["invalid"]
    ]

    if args.dry_run:
        print(
            json.dumps(
                {
                    "status": "dry_run",
                    "sitemap": len(sitemap_urls),
                    "submitted": len(state["submitted"]),
                    "pending": pending,
                },
                ensure_ascii=True,
            )
        )
        return 0

    submitted = []
    stopped_reason = "complete"
    last_response = None

    for url in pending[:DAILY_LIMIT]:
        response = submit_url(url)
        last_response = response
        if response.get("success", 0) >= 1:
            state["submitted"][url] = now_iso()
            submitted.append(url)
            save_state(state)
            continue
        if "error" in response:
            stopped_reason = "quota_or_api_error"
            break
        state["invalid"][url] = {
            "checked_at": now_iso(),
            "response": response,
        }
        save_state(state)

    state["last_run"] = now_iso()
    state["last_result"] = {
        "status": stopped_reason,
        "submitted_count": len(submitted),
        "submitted": submitted,
        "remaining_pending": len(
            [
                url
                for url in sitemap_urls
                if url not in state["submitted"] and url not in state["invalid"]
            ]
        ),
        "last_response": last_response,
    }
    save_state(state)
    print(json.dumps(state["last_result"], ensure_ascii=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
