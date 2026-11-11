#!/usr/bin/env python3
import json
import shutil
import ssl
import subprocess
import sys
import time
import urllib.request
from pathlib import Path
from typing import Tuple

STATE_FILE = Path("/var/lib/aikanpan-monitor/state.json")
ERROR_LOG = Path("/opt/dsa-mp/server_error.log")
ISSUE_LABELS = {
    "frontend": "网站首页不可访问",
    "backend": "后端健康检查异常",
    "ai-config": "AI 服务未配置",
    "dsa-service": "后端服务未运行",
    "ai-all-failed": "AI 密钥池全部尝试失败",
    "disk": "服务器磁盘空间不足",
    "ai-review": "今日日报未生成",
}


def load_state() -> dict:
    try:
        return json.loads(STATE_FILE.read_text(encoding="utf-8"))
    except (OSError, ValueError, TypeError):
        return {}


def save_state(state: dict) -> None:
    STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
    STATE_FILE.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")


def get_url(url: str, timeout: int = 15) -> Tuple[int, str]:
    request = urllib.request.Request(url, headers={"User-Agent": "aikanpan-monitor/1.0"})
    context = ssl.create_default_context()
    with urllib.request.urlopen(request, timeout=timeout, context=context) as response:
        body = response.read(500_000).decode("utf-8", "ignore")
        return response.status, body


def service_active(name: str) -> bool:
    result = subprocess.run(
        ["systemctl", "is-active", name],
        check=False,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        universal_newlines=True,
    )
    return result.stdout.strip() == "active"


def new_ai_failures(offset: int) -> Tuple[int, int]:
    if not ERROR_LOG.exists():
        return 0, 0
    size = ERROR_LOG.stat().st_size
    if offset < 0 or offset > size:
        offset = 0
    with ERROR_LOG.open("rb") as handle:
        handle.seek(offset)
        data = handle.read()
    return data.count(b"all chat attempts failed"), size


def main() -> int:
    state = load_state()
    issues = []
    details = []

    try:
        status, homepage = get_url("https://aikanpan.top/")
        if status != 200 or "爱看盘" not in homepage:
            issues.append("frontend")
            details.append(f"frontend status={status}")
    except Exception as error:
        issues.append("frontend")
        details.append(f"frontend error={error}")

    try:
        status, health_body = get_url("http://127.0.0.1:8000/api/v1/health")
        health = json.loads(health_body)
        if status != 200 or health.get("status") != "ok":
            issues.append("backend")
            details.append(f"backend status={status}")
        # 2026-11-12 修正：旧写法 `if not health.get("ai_configured")` 把「接口没有该字段」
        # 当成「AI 未配置」，本单元每 5 分钟必红（7 天失败 2014 次 / 100%），且脚本只 print
        # 不外发，等于监控长期失效。改为：字段显式为 False 才判故障，缺失不算。
        if health.get("ai_configured") is False:
            issues.append("ai-config")
            details.append("AI provider is not configured")
    except Exception as error:
        issues.append("backend")
        details.append(f"backend error={error}")

    if not service_active("dsa.service"):
        issues.append("dsa-service")
        details.append("dsa.service is not active")

    # 功能性探针（2026-11-12 新增）：当天日报快照是否真的生成、AI 正文是否有内容。
    # 比读配置字段可信 —— 配置在、生成链路坏了，只有这里能抓到。
    # 8 点前不判：当天快照要到凌晨才落盘，早于 8 点判会误报。
    if time.localtime().tm_hour >= 8:
        try:
            snapshot = Path("/opt/dsa-mp/data/daily_reviews") / f"{time.strftime('%Y-%m-%d')}.json"
            if not snapshot.exists():
                issues.append("ai-review")
                details.append("today snapshot missing")
            else:
                payload = json.loads(snapshot.read_text(encoding="utf-8"))
                content = (payload.get("ai") or {}).get("content") or ""
                if len(content) < 50:
                    issues.append("ai-review")
                    details.append(f"today AI content too short={len(content)}")
        except Exception as error:
            issues.append("ai-review")
            details.append(f"snapshot check error={error}")

    if "error_offset" in state:
        failure_count, error_offset = new_ai_failures(int(state["error_offset"]))
    else:
        failure_count = 0
        error_offset = ERROR_LOG.stat().st_size if ERROR_LOG.exists() else 0
    if failure_count:
        issues.append("ai-all-failed")
        details.append(f"new AI all-failed events={failure_count}")

    disk_percent = shutil.disk_usage("/").used / shutil.disk_usage("/").total * 100
    if disk_percent >= 90:
        issues.append("disk")
        details.append(f"disk usage={disk_percent:.1f}%")

    now = int(time.time())
    state.update(
        {
            "checked_at": now,
            "issues": issues,
            "details": details,
            "error_offset": error_offset,
        }
    )

    if "--dry-run" not in sys.argv:
        save_state(state)
    if issues:
        print(
            "issues="
            + ",".join(issues)
            + " | "
            + " | ".join(f"{ISSUE_LABELS.get(item, item)}: {detail}" for item, detail in zip(issues, details))
        )
        return 1
    print("health=ok")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
