<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---

<!-- BEGIN:codex-stop-work -->
## 停工令（2026-10-26 起，最高优先级 —— 先读这一节再看下面）

站主在同一台机器、同一个仓库、同一个生产环境上并行作业，已发生真实冲突：`next build` 与 `mv .next` 互相打断、部署产物被另一次改名覆盖、一条提交的归属分不清是谁的。**在你收到「复工」指令前：**

**禁止**

1. **本仓库任何写操作** —— 禁止 `npm run build` / `next build`；禁止改、`mv`、`rm`、`rename` 任何 `.next` 或 `.next*`；禁止编辑/新建/删除任何文件（含 `handoff/`、`docs/`、本文件 `AGENTS.md`、`CLAUDE.md`）
2. **任何 git 写操作** —— 禁止 `commit` / `push` / `merge` / `rebase` / `reset` / `stash` / `checkout` / `branch` / `worktree`
3. **任何生产变更** —— 禁止 `scp` / `rsync` / `tar` 上传；禁止 `pm2 restart|reload|stop aikanpan-web`；禁止 `systemctl restart|stop dsa`；禁止改动 `/opt/dsa-mp` 下任何文件（含 `server.py`、`.env`、各数据 JSON、`alipay_keys/`）
4. **禁止绕过** —— 不许新建分支/worktree/临时目录/脚本/cron/timer 间接实现上述动作；不许「只改一点点」；不许先改后报

**允许**：读文件、读日志、只读排查（`cat` / `grep` / `df` / `systemctl is-active` / `pm2 list` / `curl`）、回答问题。

发现 P0（服务挂 / 数据损坏 / 资金链路异常）**不要动手** —— 在回复第一行写明「P0：现象 + 证据」，交站主处理。唯一例外：站主明确说「授权你修 <具体事项>」，模糊的「你看着办」不算授权。

**复工**：仅当站主明确说「复工」并给出具体授权范围时，本段对该范围失效。默认状态永远是停工。
**移除方式**：删除 `<!-- BEGIN:codex-stop-work -->` 至 `<!-- END:codex-stop-work -->` 之间的整段。
<!-- END:codex-stop-work -->

---

## 支付与会员系统 P0 待修（2026-09-23 独立安全审计）

完整审计报告：`docs/pay-audit-2026-09-23.md`（只读审计，未改动生产，含可复现命令与原始返回）

**后端源码不在本仓库**：生产代码在服务器 `root@47.108.163.124:/opt/dsa-mp`（**不是 git 仓库**，回滚靠 `server.py.bak-*`；当前生效文件 SHA256 见报告第 6 节）。

### 按顺序修复

1. **装缺失依赖（最高优先级，这是「付款不发货」的第一根因）**
   `/opt/dsa-mp/.venv/bin/pip install python-multipart==0.0.12`，并把 `python-multipart==0.0.12` 写入 `/opt/dsa-mp/requirements.txt`，然后重启后端。
   未装该包时 `alipay_routes.py:73` 的 `await request.form()` 必抛异常 → 支付宝回调 100% 失败（异常被 `except` 吞掉后仍返回 HTTP 200，access log 看不出问题）。2026-09-23 14:33–15:01 支付宝重试 8 次全部因此失败。

2. **修 `NameError`（1 行）**
   `alipay_routes.py:64` 使用了未绑定名 `alipay_service`（模块级第 46 行只做 `from alipay_service import ...`，真正的 `import alipay_service` 在第 103 行的另一个函数体内）。
   修法：第 46 行补 `get_order_recovery_code` 到导入列表，第 64 行改为直接调用。否则 `order-status` 一旦遇到已支付状态必返回 HTTP 500，前端永远点不亮 Pro。

3. **止血越权**：`/recover` 强制要求登录且只接受恢复码；`/order-status` 增加订单归属校验（`order['user_id'] == 当前 user_id`）。

4. **权益归并**：`server.py:4708` 的 `_merge_user_data`  dtype 白名单需加入 `membership`（到期时间取 max，不能直接覆盖）。

5. **防羊毛**：体验卡限购当前只按 `user_id`，而游客下单每次生成新的 `guest_<uuid12>` → 清 Cookie 即可无限 1.9 元续杯。需改为基于支付宝 `buyer_user_id` / 手机号 / 设备指纹的稳定键。

### 修复后的验收标准（必须同时满足）

- 订单 `status=TRADE_SUCCESS` **且** `userdata/<user_id>/membership.json` 出现 `pro_expires_at`
- 应用日志出现 `SUCCESS GRANTED <n> days to <uid>`
- 已支付状态下调用 `GET /api/v1/pay/alipay/order-status?out_trade_no=...` 返回 200 且 `status=PAID`

> 注意：服务器上 `server_error.log` 是应用日志（logger 输出，走 stderr），`server.log` 是 uvicorn access log，两者内容不一致，排查必须都看。`server.pid` 失准，用 `pgrep -f "uvicorn server:app"` 定位进程。

---

## 复核结论（最新：2026-09-23 20:05 第 2 轮独立只读复核 → 判定 FAIL）

- 第 2 轮报告：`docs/pay-fix-round2-reaudit-2026-09-23.md` ← **以这份为准**
- 第 1 轮报告：`docs/pay-fix-reaudit-2026-09-23.md`（其第 1 项的"可无限重放"**已被本轮修复**，勿再按它改）

### 已实证有效，勿重做
`python-multipart==0.0.12` 已装且入 `requirements.txt` · `alipay_routes.py` 的 `NameError` 已修 · `/order-status` 归属校验实测 403 · `/recover` 未登录实测 401 · `_merge_user_data` 的 membership 归并正确 · `phone_108ab8777456` 已补发 14 天 · **`recovered_at` 一次性核销标记已落盘** · **`/recover` 已真实转移（`orig` 复位 `free`）** · **发货期按 `buyer_id` 拦截体验卡已生效**（实测 `REFUSED_TRIAL_LIMIT`）· `_ORDER_LOCK` 已覆盖两个核销入口

### 待修（按优先级）
1. **🔴 P0 新死锁**：`_ORDER_LOCK` 是 `threading.Lock()`（非重入），而 `recover_membership_by_order` 在 `:290` 持锁后经 `:306 → sync_query_alipay_order → :277 → record_order_paid_and_grant` 在 `:158` **再次获取同一把锁** → 同线程永久阻塞。`/recover`、`/notify` 都是 `async def`，事件循环线程被锁死 ⇒ **一次请求可让全站停摆**。修法：改 `threading.RLock()`，或把 `sync_query_alipay_order` 移出临界区。
2. **验收标准 2 仍未满足**：`grep -c "SUCCESS GRANTED" /opt/dsa-mp/server_error.log` = **0**（journald 也是 0）。本轮新增的 8 条订单全是注入的**合成 `buyer_id`**（`2088_test_real` 之类），由独立脚本直调函数产生，日志不进服务文件 ⇒ **没有一笔真实支付走通过 `/notify`**。必须用真实 1.9 元单跑通留证。
3. **声明 3 半真**：`os.replace` / `NamedTemporaryFile` / `tempfile.` 在 `alipay_service.py` **命中 0**（`import tempfile` 是死 import），`_save_orders` **原样未改**仍是裸覆写。且 `create_alipay_order` 的读写（`:117`/`:126`）在锁外 → 丢更新 → 二次发放。锁也不是跨进程锁（遗留 `server_test:app` 写同一文件即失效），建议 `fcntl.flock`。
4. **被拒体验卡无退款出口（潜在缺口，非当前负债）**：`REFUSED_TRIAL_LIMIT` 只写日志、无退款通道。**已核实命中该分支的 `test_trial_2_00d86d` 是用户自测单，当前不存在扣款未退的资金敞口**（用户 2026-09-23 20:00 确认），勿按"已有欠款需退款"处理。仍建议：下单入口用 `/membership/status` 的 `has_used_trial` 前置拦截 + 被拒单进退款队列，避免真实用户命中时变成客诉。
5. **持锁做网络 I/O**：`get_alipay_client()` 每次读两个 PEM，`sync` 每次 0.4s 真实外呼，都在锁内 ⇒ 阻塞事件循环。`/order-status` 轮询外呼问题（上轮 N5）本轮**未修**（`alipay_routes.py` 未改动）。
6. **`server.py` 本轮未改动** ⇒ `_add_membership_days` 不重算 `ai_daily_limit`（落盘 `plan=pro` + `limit=10`）仍存在；`recover` 的 `rem_days` 用 `int()` 截断会少给天数；`recovered` 后覆盖 `user_id` 导致审计链丢失。
7. 生产订单表已膨胀到 **28 条**，含 `test_replay_*` / `test_trial_*` / `test_q1-q3` / `sim_*` 等测试单（部分 `paid_at=None` 却 `TRADE_SUCCESS`）。遗留：`http.server 18924/18925`（`0.0.0.0`）、`uvicorn server_test:app :8001`、`server.pid` 失准。
