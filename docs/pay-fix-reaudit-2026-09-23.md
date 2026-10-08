# 「爱看盘」支付与会员系统 P0 修复落地 — 最终只读复审报告

- **复审时间**：2026-09-23 16:25–16:35 CST
- **复审对象**：`root@47.108.163.124:/opt/dsa-mp`（非 git 仓库）
- **复审方式**：全程**只读**（Read-Only）。未修改任何生产文件、未重启服务、未触发任何会写盘的接口
- **依据**：`docs/pay-audit-2026-09-23.md`（初版审计）+ `AGENTS.md`「支付与会员系统 P0 待修」5 项修复 + 3 条验收标准
- **复审员**：独立安全与全栈代码审查（与实施方相互独立）

---

## 0. 一句话结论

> **最终判定：FAIL（未通过验收）**
>
> 依赖缺失、`NameError`、越权校验、登录强制四项**确已落地并实证有效**；但
> **验收标准 2 未满足**（应用日志 `SUCCESS GRANTED` 计数 = **0**，核心发货路径从未被成功走通），
> 并且本次修复**引入了一条可无限重放的权益膨胀路径（新 P0）**，
> 同时**宣称的防羊毛加固是死代码（调用点 = 0）**，原始商业漏洞仍然敞开。

---

## 1. 复审基线（可复现）

```bash
systemctl is-active dsa.service
systemctl show dsa.service -p ActiveEnterTimestamp -p ExecMainPID
sha256sum /opt/dsa-mp/server.py /opt/dsa-mp/alipay_service.py /opt/dsa-mp/alipay_routes.py /opt/dsa-mp/requirements.txt
/opt/dsa-mp/.venv/bin/pip list | grep -i multipart
```

| 项 | 实测值 |
|---|---|
| 服务状态 | `active` |
| MainPID | `1522621`（`uvicorn server:app --host 127.0.0.1 --port 8000`） |
| 服务启动时刻 | `Wed 2026-09-23 16:20:14 CST` |
| `server.py` | `fd6df859…54d7b`，mtime `16:11:22` |
| `alipay_service.py` | `d3c9dc2e…0b2f1`，mtime `16:19:28` |
| `alipay_routes.py` | `5e5b6b34…ba8d0`，mtime `16:17:50` |
| `requirements.txt` | `6d98f7c2…4dc02`，mtime `16:16:15` |
| `python-multipart` | **`0.0.12` 已安装，且已写入 requirements.txt** |
| 备份 | `alipay_routes.py.bak-recover-order-20260923161015`、`alipay_service.py.bak-recover-order-20260923161015`、`requirements.txt.bak-multipart-20260923161613` **均已存在** |
| 重启后异常 | `server_error.log` 中 `Traceback` 计数 = **0**（无新崩溃） |

**备份纪律：PASS。** 三份 `.bak-<用途>-<时间戳>` 与修复目标一一对应，时间戳（16:10/16:16）早于生效文件 mtime，符合"先备份"要求。

---

## 2. 五项修复逐项核验

### 修复 1 — 用户合并遗漏会员 → **PASS（代码正确，但引出新漏洞，见 N1）**

`server.py:4706-4741`：

```python
# 合并 membership 会员权益（游客付款后登录手机号继承 Pro）
src_mem = _read_membership(src_id)
dst_mem = _read_membership(dst_id)
src_exp = str(src_mem.get("pro_expires_at") or "")
dst_exp = str(dst_mem.get("pro_expires_at") or "")
now_str = _now()

if src_exp > now_str:
    if dst_exp <= now_str or src_exp > dst_exp:
        dst_mem = _membership_state(dst_id)
        dst_mem["plan"] = "pro"
        dst_mem["pro_expires_at"] = src_exp
        _write_membership(dst_id, dst_mem)
    # 清理源游客的 Pro 权益，防止资产重复扩散
    src_mem["plan"] = "free"
    src_mem["pro_expires_at"] = ""
    _write_membership(src_id, src_mem)
```

核验：
- `membership` **未**塞进 line 4708 的 dtype 元组，而是单独成段处理 —— 功能等价，且避开了 `_merge_item_lists` 对 dict 列表的假设，**写法正确**。
- 取最大值继承：`src_exp > dst_exp` 时才覆盖 `dst`，否则保留 `dst` 的更长权益 —— **符合"取 max"，未直接覆盖**。
- `src` 复位为 `free` 并清空 `pro_expires_at` —— **已实现，防止双份资产**。
- 幂等性：第二次合并时 `src_exp = ""`，`"" > now_str` 为 `False`，直接跳过 —— **幂等**。
- 调用点真实可达：`server.py:5578`（手机号验证登录）、`server.py:5647`（邮箱验证登录），均在 `if req.guest_token:` 分支内。

> **但这段"复位 src 为 free"与修复 2 的兜底分支组合，产生了一条无限续期路径 —— 见缺陷 N1。**

---

### 修复 2 — 跨设备/跨账号找回 → **部分 PASS，核心语义 FAIL**

`alipay_service.py:273-333` + `alipay_routes.py:116-126`

| 声明项 | 实测 | 判定 |
|---|---|---|
| 支持订单号或 `AKP-XXXX-XXXX` 恢复码 | `alipay_service.py:279`（订单号直查）+ `283-287`（恢复码遍历）| **PASS** |
| 路由已挂载 | 实际路径 `/api/v1/pay/alipay/recover`（前缀来自 `alipay_router`，**非**声明中的 `/api/v1/alipay/recover`）| **PASS（路径描述有误）** |
| 强制登录 | `alipay_routes.py:121` 调 `_auth_user`，实测 **HTTP 401** | **PASS** |
| 补齐 `python-multipart` | 已装 `0.0.12`，实测 `/notify` 不再抛异常 | **PASS** |
| "资产**安全迁移**绑定到当前账号" | `orig` 账户权益**从未被清除**，仅做 `best_exp = max(...)` **共享** | **FAIL** |
| 单次可用的幂等防重 | **无任何一次性标记** | **FAIL** |

**判定依据（`alipay_service.py:298-325`）：**

```python
orig_mem = server._read_membership(orig_uid) if orig_uid else None
curr_mem = server._read_membership(current_user_id)
now_str = server._now()

if orig_exp and orig_exp > now_str:
    best_exp = max(orig_exp, curr_exp, now_str)
    curr_mem['plan'] = 'pro'
    curr_mem['pro_expires_at'] = best_exp
    server._write_membership(current_user_id, curr_mem)   # ← 只写当前账号
else:                                                      # ← 无幂等保护
    ...
    server._add_membership_days(current_user_id, days)
```

- `if` 分支只写 `current_user_id`，**完全没有触碰 `orig_uid`** → 同一笔订单可被**无限多个账号**同时持有 Pro（共享同一个到期时间）。"迁移"名不副实。
- `else` 分支没有任何"该订单已找回"的标记，而订单表中 `recovered` 出现次数 = **0**（`grep -c recovered alipay_keys/alipay_orders.json` → 0）→ **每次调用都会重新发天数**。

---

### 修复 3 — 查单兜底与游客鉴权 → **兜底 PASS，鉴权声明 FAIL**

`alipay_routes.py:34-83`

| 声明项 | 实测 | 判定 |
|---|---|---|
| 本地未完成时主动 `sync_query_alipay_order` | line 51（订单不存在）、line 66（状态非成功）| **PASS** |
| 已付款自动 `record_order_paid_and_grant` 补偿发货 | 经 `sync_query_alipay_order:263` 间接触发 | **PASS** |
| 订单归属校验 | line 59-62；实测他人订单 **HTTP 403** | **PASS** |
| "放开未登录/游客态查单鉴权限制" | line 40-43 仍硬调 `_auth_user`，实测无 token → **HTTP 401** | **FAIL（未实现）** |

**实证：**

```
[T1] 无 Authorization → HTTP 401
     {"detail":"未授权访问: 401: missing authorization"}
[T2] 有效 token + 已支付订单 → HTTP 200 (0.0025s)
     {"ok":true,"data":{"out_trade_no":"aikp_1790145363_phone_108ab87774",
      "status":"PAID","raw_status":"TRADE_SUCCESS","recovery_code":"AKP-3E85-5EAD"}}
[T3] 有效 token + 他人订单 → HTTP 403
```

> 该声明虽未实现，但**实际影响有限**：`server.py:5289` 存在 `/api/v1/auth/guest-login`，会为游客签发 token（`user_id = "guest_" + uuid4().hex[:12]`，`token` 落 `_USERS`）。前端只要先调 guest-login 再下单，`_auth_user` 即可通过、归属校验也对得上。
> **残余风险**：若用户在"支付完成"与"轮询"之间清除 Cookie/LocalStorage（或换浏览器/无痕），guest token 丢失 → 轮询返回 401，**页面依旧点不亮** —— 这正是原始故障的症状类别之一，未被本轮修复覆盖。

---

### 修复 4 — 加固 1.9 元体验卡防刷 → **FAIL（死代码，业务漏洞未封）**

**决定性证据：**

```bash
grep -rn "has_buyer_id_bought_trial" /opt/dsa-mp --include=*.py
# → 仅 1 行命中：/opt/dsa-mp/alipay_service.py:61:def has_buyer_id_bought_trial(buyer_id: str) -> bool:
# 定义处之外的调用点计数 = 0
```

- `has_buyer_id_bought_trial()`（`alipay_service.py:61-69`）**从未被任何代码调用**，是纯死代码。
- 下单限购处（`alipay_service.py:88-90`）仍只用 `has_user_bought_trial(user_id)`：

```python
if plan_type == 'trial':
    if has_user_bought_trial(user_id):
        raise ValueError('7天体验卡为新客专享特惠，每个账号或设备限购一次')
```

- 游客身份由 `guest_login`（`server.py:5292`）**每次新生成** → 换一个 `guest_id` 即绕过 → **清 Cookie / 无痕模式无限 1.9 元续杯，漏洞原样存在**。
- 更根本的是：**`buyer_id` 在下单时刻根本拿不到**（要等支付宝回调才回传，`record_order_paid_and_grant:244`）。所以这个校验在 `create-order` 阶段架构上不可能生效；正确位置应在**核销/发货阶段**做拒绝或退款。当前连核销阶段也没有接。

> 结论：防羊毛加固**停留在"写了一个函数"**，未接线、位置也不对。声明与实现不符。

---

### 修复 5 — 补发受影响用户权益 → **PASS（已落盘），但验收关联项 FAIL**

```bash
cat /opt/dsa-mp/userdata/phone_108ab8777456/membership.json
```

```json
{"data":{"ai_used_date":"2026-09-23","ai_used_today":1,"plan":"pro","ai_daily_limit":10,
 "last_ai_call_at":"2026-09-23T14:37:26","updated_at":"2026-09-23T16:19:59",
 "pro_expires_at":"2026-10-07T16:19:59"},"updated_at":"2026-09-23T16:19:59"}
```

- `plan=pro`、`pro_expires_at=2026-10-07T16:19:59`（= 基准 09-23 16:19:59 + 14 天），**14 天补发属实**。
- **两处必须指出**：
  1. `ai_daily_limit` 仍为 **10**（免费版阈值）却 `plan=pro` → 说明写入路径**不是**标准 `_membership_payload` 语义，暴露了 `_add_membership_days` 的一个缺陷（见 N6）。
  2. 该权益是**人工一次性调用**发放的，**不是**由 `record_order_paid_and_grant` 走通的 —— 这直接导致验收标准 2 失败（下方 §3）。

---

## 3. 三条验收标准判定

| # | 标准 | 实测 | 判定 |
|---|---|---|---|
| 1 | 订单 `status=TRADE_SUCCESS` **且** `userdata/<user_id>/membership.json` 出现 `pro_expires_at` | 两笔订单均 `TRADE_SUCCESS`；`phone_108ab8777456` 的 `pro_expires_at=2026-10-07T16:19:59` | **PASS（带保留）** |
| 2 | 应用日志出现 `SUCCESS GRANTED <n> days to <uid>` | `grep -c "SUCCESS GRANTED" server_error.log` → **0** | **FAIL** |
| 3 | 已支付状态下 `GET /api/v1/pay/alipay/order-status?out_trade_no=...` 返回 200 且 `status=PAID` | HTTP **200**，`"status":"PAID"`，`raw_status: TRADE_SUCCESS` | **PASS** |

**标准 1 的保留意见**：`aikp_1790145141_guest_1ccce9b91f` 的 `user_id` 字段已是 `phone_108ab8777456`，但**订单号本身仍内嵌 `guest_1ccce9b91f`**。原始下单方显然是游客账户 `guest_1ccce9b91f8a`（其 `membership.json` 至今 `plan=free`、`updated_at=14:33:33`，从未变更）。即该订单的归属是**手工改写** `user_id` 得到的，而非代码路径产出 —— 数据不自洽（见 N7）。

**标准 2 失败的后果**：整个修复链中**唯一**能证明"回调/兜底 → 真实发货"闭环的观测点，全库计数为 0。也就是说 **`record_order_paid_and_grant` 在生产环境从未成功执行过一次**。下一笔真实付款是否发货，**目前没有任何证据支持**。

> `AGENTS.md` 明确写"必须同时满足"。**2/3 达成 ⟹ 验收不通过。**

---

## 4. 新发现缺陷（按严重度）

### N1 —【P0，本次修复引入】`/recover` 兜底分支可无限重放，白送会员

**位置**：`alipay_service.py:314-325`（else 分支），配合 `_add_membership_days:4911` 的叠加语义。

**成立条件**：`target_order.user_id` 对应的账户**没有生效中的 `pro_expires_at`**。
此时每次调用 `/recover`，都无条件执行 `_add_membership_days(current_user_id, days)`，而该函数按 `base = 当前到期时间 if 当前到期时间 > now else now` **累加** → 调用 N 次 = N × days。

**这不是攻击者专属，普通用户自己就能中招**（最现实的路径）：

1. 游客扫码付 1.9 元 → 回调正常 → 游客账户获得 7 天（`orig_exp = now+7`）
2. 游客登录手机号 → `_merge_user_data` → 手机号获得 7 天，**同时把游客账户复位为 `free`、`pro_expires_at` 清空**（`server.py:4739-4741`）
3. 用户点一次"会员找回" → `orig_uid` = 那个已被复位的游客账户 → `orig_exp = ""` → **走 else 分支** → `_add_membership_days(手机号, 7)`
4. 再点一次 → **再 +7 天**。可无限重复。

**当前生产数据中的现成靶子**（只读查询，`orig_exp` 为空 ⟹ else 分支必然命中）：

| out_trade_no | 归属 user_id | 金额/套餐 | 持有者权益 |
|---|---|---|---|
| `aikp_1790101620_guest_15457ea087` | `guest_15457ea0872f` | 49.00 / 季卡 | **无 membership.json** → `orig_exp=""` |
| `test_q1/q2/q3_guest_auto_audit_848efa25` | `guest_auto_audit_848efa25` | 49.0 / 月卡 | **无 membership.json** |
| `aikp_1789503437_sim_alipay_user_` | `sim_alipay_user_001` | 19.00 / 月卡 | **无 membership.json** |

即：**任意已登录账号**只要拿到上表任一订单号（`/recover` 直接接受明文订单号，`alipay_service.py:279`），即可每次调用领取 90/30 天，**无上限**。

**建议修法**：核销与找回都必须在订单上落一个一次性标记（如 `recovered_at` / `recovered_by`），并在发放前校验该标记为空；`orig` 账户权益需真正**转移**（清空 `orig`）而非共享。回归方式：同一订单连续调用 `/recover` 两次，第二次必须返回"已找回"且天数不变。

---

### N2 —【P0】防羊毛未接线，1.9 元无限续杯仍成立
详见修复 4。`has_buyer_id_bought_trial` 调用点 = 0。

### N3 —【P1】`/recover` 不校验订单归属，一单多开仍成立
`alipay_service.py:273-296` 对传入凭证**不做任何归属校验**，任何登录用户都可把他人订单的 Pro "绑"到自己账号（`if` 分支 `best_exp` 共享、`else` 分支全量发放），且**原账户权益不清除**。凭据强度依赖：订单号可枚举性 + 32 bit 恢复码 + **无频率限制**（见 N9）。

### N4 —【P1】全线无锁、非原子写：并发双发 / 丢更新
```bash
grep -rn "fcntl|flock|threading.Lock|asyncio.Lock|portalocker|os.replace|tempfile" \
  /opt/dsa-mp/server.py /opt/dsa-mp/alipay_service.py /opt/dsa-mp/alipay_routes.py
# → lock_hits_done（0 命中）
```
- `record_order_paid_and_grant` 是典型 read-modify-write：line 160 读 orders → line 213 发权益 → line 246 整文件覆写。**幂等判据（line 164）在无锁下失效**：`/notify`（异步）与 `/order-status` 主动 `sync`（本修复 3 新增）并发时，两次调用都可能看到 `WAIT_BUYER_PAY` → **同一笔 7 天订单发 14 天**。
- `_save_orders`（line 43-48）是**整文件 `json.dump` 覆写**、无 `os.replace` 原子重命名 → 并发下会**丢更新**：一笔订单被另一笔的写入覆盖回 `WAIT_BUYER_PAY`，之后重试再发一次 → 二次发放。
- `create_alipay_order` 的限购是 check-then-act（line 89 检查、line 123 落盘）→ TOCTOU。
- **本修复 3 主动把 `sync_query_alipay_order` 挂进轮询，客观上显著放大了上述窗口。**

### N5 —【P1】轮询放大：每次查单都打真实网关
```
[T4] order-status 不存在订单 → HTTP 404  time=0.399817s
```
0.4s 即一次真实外呼。`alipay_routes.py:51`（订单不存在）与 `:66`（状态非成功）都会外呼 → 未支付订单在轮询期间**每轮一次支付宝 API 调用**。且 `get_alipay_client()`（line 50-58）**每次调用都重新读取两个 PEM 文件**，无缓存。可被登录用户低成本刷成放大器 / 消耗支付宝接口配额。

### N6 —【P2】`_add_membership_days` 不重算 `ai_daily_limit`
`server.py:4906-4917`：先 `_membership_state()`（依据**旧** plan 算出 `ai_daily_limit`），随后把 `plan` 改成 `pro` 却**不重算额度** → 落盘出现 `plan=pro` + `ai_daily_limit=10`（本次 `phone_108ab8777456` 的实测文件正是这个状态）。读取侧 `_membership_state` 会重算，故用户侧暂不可见；但任何直接读原始文件的路径（如 `recover` 的 `_read_membership:302`）会拿到错误额度。

### N7 —【P2】订单归属靠手工改数据，不自洽
`aikp_1790145141_guest_1ccce9b91f` 的 `out_trade_no` 内嵌 `guest_1ccce9b91f`，`user_id` 却是 `phone_108ab8777456`；`guest_1ccce9b91f8a` 目录至今 `plan=free`（`updated_at=14:33:33`，从未被 `_merge_user_data` 触碰）。若该订单记录将来丢失，`record_order_paid_and_grant` 的反推兜底（line 167-181，`user_id = '_'.join(parts[2:])`）会算出 `guest_1ccce9b91f`，与实际归属不一致。

### N8 —【P2】生产订单表混入测试/仿真单
`alipay_keys/alipay_orders.json` 共 20 条，其中 `test_q1/q2/q3_guest_auto_audit_848efa25`（3 笔 49.0）、`aikp_1789503437_sim_alipay_user_`、`aikp_1789526846_verify_check_002` 等属测试残留，前几笔还带着 `TRADE_SUCCESS`。另有 11 笔 `WAIT_BUYER_PAY` 垃圾单（下单即落盘、未支付不清理）。

### N9 —【P2】`/recover` 无频率限制，恢复码熵偏低
`grep -rn "rate_limit|attempts" alipay_service.py alipay_routes.py` → 0 命中。恢复码 = `sha256(out_trade_no)` 前 8 位十六进制 = **32 bit**（`alipay_service.py:269-271`）。配合 N1 的可重放性，任意可重复调用的接口 + 无锁定，是需要收敛的组合。

### N10 —【P2】死变量
`alipay_service.py:300` `now_iso = server.datetime.now().isoformat()` 赋值后从未使用（实际用 `server._now()`）。

---

## 5. 遗留风险（非本次修复范围，但仍在生产）

| 项 | 实测 |
|---|---|
| 明文源码/密钥暴露服务 | `python3.11 -m http.server 18924\|18925 --directory /opt/dsa-mp`，PID **40250 / 40276**，`ss` 显示监听 **`0.0.0.0`**（全接口），自 **2026-07-02** 起存活 **83 天**。公网侧被外层拦为 502（未爆炸），回环 200 |
| 遗留测试服务 | `uvicorn server_test:app --port 8001`，PID **1343288**，PPID=1，自 **2026-08-31** 存活 **23 天**，仍在 `127.0.0.1:8001` LISTEN |
| `server.pid` 失准 | 文件内容 `1443938`，实际 MainPID **1522621**（任何依赖 pid 文件的脚本/监控都会误判） |
| 生产库卫生 | 见 N8 |

---

## 6. 最终结论

### 判定：**FAIL**

**通过项（4/10）**：依赖补装 ✅ · `NameError` 修复 ✅（`alipay_routes.py:118` 函数内 `import alipay_service` 已使 line 125 绑定成立，AST 层面无残留未绑定名）· `/order-status` 归属校验 ✅（实测 403）· `/recover` 强制登录 ✅（实测 401）· 备份纪律 ✅ · 合并逻辑本身正确 ✅ · 补发落盘属实 ✅ · 重启后零 Traceback ✅

**不通过项**：
1. **验收标准 2 未满足** —— `SUCCESS GRANTED` 全库计数 **0**，核心发货路径在生产**从未跑通**
2. **修复 4 是死代码** —— 原始商业漏洞（清 Cookie 无限 1.9 续杯）**未封**
3. **修复 2 引入新 P0（N1）** —— `/recover` 可无限重放，普通用户自查即可无限续期
4. **修复 2 的"安全迁移"未实现（N3）** —— 一单多开仍成立
5. **修复 3 的"放开游客鉴权"未实现** —— 仍 401，与声明不符
6. **N4 并发无锁/非原子写** —— 本轮修复反而放大了并发窗口

### 建议修复优先级

| 序 | 动作 | 理由 |
|---|---|---|
| 1 | `/recover` 增加一次性核销标记 + 真正转移（清空 `orig`）而非共享 `max()` | N1/N3，当前**每次点击都在白送会员** |
| 2 | 用一笔真实 1.9 元测试单走通全链路，直到 `SUCCESS GRANTED` 出现在应用日志 | 验收标准 2；这是唯一能证明修复有效的观测点 |
| 3 | 把 `buyer_id` 限购移到**核销/发货阶段**（拒绝或退款），并用真实 `buyer_user_id` 做键 | N2，`create-order` 阶段拿不到 `buyer_id` |
| 4 | `_save_orders` 改 `os.replace` 原子写 + 模块级 `threading.Lock` 包住核销临界区 | N4 |
| 5 | `/order-status` 对未支付/不存在订单加短 TTL 缓存与限流；缓存 `get_alipay_client()` | N5 |
| 6 | `/recover` 加频率限制；`_add_membership_days` 重算 `ai_daily_limit`；清理死变量 | N6/N9/N10 |
| 7 | 关闭 18924/18925 与 8001 遗留服务；修 `server.pid` 写入 | §5，未爆炸的炸弹 |

---

## 7. 本次复审的边界与限制

- **只读**：未执行任何会写盘的接口。N1 的重放**未在真实账号上复现**（那会产生真实数据变更），其判定基于：`else` 分支无幂等守卫（代码）+ 订单表 `recovered` 计数 = 0（数据）+ `_add_membership_days` 累加语义（代码）+ 已证实存在 `orig_exp` 为空的已支付订单（数据）。四者构成闭合证据链。若要现场复现，请在测试环境用表内 `test_q*` 单据执行（**会写数据，勿在生产直接跑**）。
- **前端未审**：`/opt/aikanpan-web-new` 仅含 Next.js 编译产物，无源码。bundle 中确认存在 `order-status?out_trade_no=`、`guest_token`、`anonymous` 等调用点，但"支付成功后轮询的具体鉴权头、体验卡入口如何控制"未能逐行核验。**体验卡入口是否仅靠前端隐藏，直接决定 N2 的完整形态**，建议补审 `D:\Codex\projects\aikanpan-web\src\`。
- **未验证真实资金侧**：本报告只核订单表与权益落盘，未比对支付宝商户账单。用户两笔 1.9 元是否需退一笔，仍需以支付宝账单为准。
