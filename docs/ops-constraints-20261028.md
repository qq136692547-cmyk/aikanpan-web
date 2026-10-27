# 运维隐性约束（G11）

> 两条约束**不写下来就会有人踩**：它们不会报错、不会白屏、测试也不红，只是功能静默失效。
> 每一条都附了可复核的证据命令。写于 2026-10-28，核实时的线上状态：`dsa` active，前端 `BUILD_ID = 7AyS-6WuqVX0FAAhm-2UO`。

---

## 约束①：`dsa` 必须是单 worker 进程

### 现状（已核实）

```
# /etc/systemd/system/dsa.service
ExecStart=/opt/dsa-mp/.venv/bin/python -m uvicorn server:app \
          --host 127.0.0.1 --port 8000 --log-level info
```

**没有 `--workers` 参数**，uvicorn 默认就是 1 个进程。这是**刻意**的，不是忘了配。

`apikey_auth.py:96` 的类注释也自己声明了这一点：

```python
class ApiKeyGuard(BaseHTTPMiddleware):
    """鉴权 + 配额中间件。所有计数在进程内存里，重启清零（够用且无外部依赖）。"""
```

### 为什么不能加 worker

`server.py` 里有一批**只存在于进程内存**的全局状态（用 AST 判定，非 grep 猜测）：

| 行号 | 变量 | 用途 | 加多 worker 的后果 |
|---|---|---|---|
| 109 | `_SMS_CODES` | 短信验证码（300s 过期） | **A 进程发码、B 进程验码 → 验证码几乎必然失败** |
| 110 | `_EMAIL_CODES` | 邮箱验证码 | 同上 |
| `apikey_auth.py` `self._hits` | — | **真限流**：匿名 600/min、带 Key 1200/min（滑动窗口） | **限额被放大 N 倍**，4 worker = 实际 2400/min，限流形同虚设 |
| 135 | `_ANALYTICS_IP_HITS` | 埋点按 IP 频控 | 频控失效 |
| 130 | `_ANALYTICS_RATE_TS` | 埋点去重窗口 | 去重失效 |
| 118 | `_ERROR_REPORT_TS` | 错误上报 6s 去重 | 去重失效 |
| 117 | `_CLIENT_ERRORS` | 错误环形缓冲（200 条） | 缓冲分裂成 N 份，`/monitor/errors` 只能看到 1/N |
| 108 | `_INFLIGHT` | 并发请求合并 | **缓存击穿**，数据源压力 ×N |
| 106/107 | `_CACHE` / `_STALE_CACHE` | 行情 TTL 缓存 | 命中率降到 1/N（每个进程各自缓存） |

**其中验证码与限流是「用户可见」级别的故障**，不会报错，只是偶发失败 + 限流被绕过。

### 反过来说，这些是多进程安全的

有落盘路径，不会因为多 worker 丢数据：`_ANALYTICS`（追加 JSONL 月分片 + `fsync`）、`_SUBS`、`_USERS`、`_POSITIONS`、`_TRANSACTIONS`、`_ALERTS`。

> 注意：`_ANALYTICS` 虽然也有内存列表，但事件写入走 `_append_analytics_event()` 追加到月度分片（`open(path, "a")`），启动时再从分片回读。**所以它不怕多进程。**

### 如果将来真的需要扩容

不要加 `--workers`。要做的是**先把内存态外移**（Redis / SQLite），至少要动上面那 9 项。或者退一步：**把验证码与限流单独拆成一个单进程服务**，其余部分再谈多 worker。

### 复核命令

```bash
ssh root@47.108.163.124 "systemctl show dsa -p ExecStart --no-pager"   # 确认无 --workers
ssh root@47.108.163.124 "systemctl cat dsa | grep ExecStart"
```

---

## 约束②：时区双轨 —— 应用是 CST，Caddy 日志是 UTC

### 现状（已核实）

| 侧 | 时区 | 证据 |
|---|---|---|
| 系统 | `Asia/Shanghai (CST, +0800)` | `timedatectl` |
| 应用（dsa） | **CST** | 进程环境**无 `TZ` 变量** → 继承系统；实测 `datetime.now()` = 06:34 而 `utcnow()` = 22:34 |
| Caddy access.log | **UTC** | 见下方铁证 |

`server.py` 里 10+ 处「今天/明天」的业务判断全部基于 `datetime.now()`，即 **CST**：

```
server.py:692 / 789   (datetime.now() - timedelta(days=days-1))    # 埋点窗口
server.py:1786        today = datetime.now()                       # 日报
server.py:1979        now = datetime.now()                         # 「是否收盘」判断
server.py:3877/4007/5060  tomorrow = datetime.now() + timedelta(days=1)
```

### 铁证：Caddy 日志轮转文件名与自身 mtime 恒差 8 小时

```
文件名内时间: /var/log/caddy/access-2026-10-12T04-33-06.437.log.gz   mtime: 2026-10-12 12:33:07
文件名内时间: /var/log/caddy/access-2026-10-16T13-34-28.094.log.gz   mtime: 2026-10-16 21:34:29
文件名内时间: /var/log/caddy/access-2026-10-21T07-37-09.391.log.gz   mtime: 2026-10-21 15:37:10
文件名内时间: /var/log/caddy/access-2026-10-24T18-12-46.617.log.gz   mtime: 2026-10-25 02:12:47
文件名内时间: /var/log/caddy/access-2026-10-27T11-51-44.994.log.gz   mtime: 2026-10-27 19:51:46
```

`04:33 + 8h = 12:33`，5 个样本 100% 吻合。日志正文的 `ts` 字段是 Unix epoch 秒（本身无时区），换算成 UTC 才与文件名一致。

### 踩坑后果

**拿 Caddy 日志和应用日志对账时，必须把日志时间 −8 小时**，否则会把「昨晚 22:00 的请求」当成「今早 06:00 的」，导致：
- 排查「某次故障」时定位到错误的时间窗口
- 统计「今日访问量」时把跨越 UTC 零点的请求算错天

### 复核命令

```bash
# 应用侧
ssh root@47.108.163.124 "systemctl show dsa -p Environment --no-pager"   # 确认无 TZ=
ssh root@47.108.163.124 "cd /opt/dsa-mp && ./.venv/bin/python -c 'import datetime;print(datetime.datetime.now(), datetime.datetime.utcnow())'"

# Caddy 侧（文件名 vs mtime 差 8 小时）
ssh root@47.108.163.124 "ls -l --time-style=full-iso /var/log/caddy/*.gz"

# 换算 ts 字段（不要心算）
ssh root@47.108.163.124 "date -u -d @<ts整数> '+%F %T %Z'; TZ=Asia/Shanghai date -d @<ts整数> '+%F %T %Z'"
```

---

## 顺带记录的第三个陷阱：后端数据文件用的是相对路径

`server.py:120`：

```python
_ANALYTICS_FILE = os.getenv("ANALYTICS_FILE", "analytics.json")
```

传入的是**相对路径**，实际落点由 systemd 的 `WorkingDirectory=/opt/dsa-mp` 决定。

**所以谁改了 `WorkingDirectory`，数据文件就会静默写到别的地方去**——不报错，只是新建一份空数据。同理受影响的还有 `_SUBS_FILE` / `_USERS_FILE` / `_ALERTS_FILE` 等一系列 `DATA_DIR` 相对路径。

需要挪目录时，**必须同时挪数据文件**，或显式设 `Environment=DATA_DIR=/opt/dsa-mp/data`（该变量当前已配置）。

---

## 一页速查

| 约束 | 一句话 | 违反了会怎样 |
|---|---|---|
| 单 worker | 不要给 uvicorn 加 `--workers` | 验证码偶发失败、限流被放大 N 倍、缓存击穿 |
| 时区双轨 | 应用 CST / Caddy 日志 UTC | 日志对账错 8 小时，故障定位到错误窗口 |
| 相对路径 | 别动 `WorkingDirectory`，动就一起挪数据 | 静默新建空数据文件 |
