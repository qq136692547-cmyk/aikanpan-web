# 「爱看盘」支付系统 P0 第 2 轮修复 — 最终只读复核报告

- **复核时间**：2026-09-23 19:56–20:05 CST
- **复核对象**：`root@47.108.163.124:/opt/dsa-mp`（非 git 仓库）
- **复核方式**：全程**只读**。未修改任何生产文件、未重启服务、**未触发死锁路径**（会致线上停摆）
- **被核验的声明**：本轮 5 条「已全部根治并上线」
- **上一轮依据**：`pay-audit-2026-09-23.md`（初版）→ `pay-fix-reaudit-2026-09-23.md`（第 1 轮复审，判定 FAIL）

---

## 0. 结论

> **判定：FAIL（未通过）** —— 较上一轮有实质进展，但**不能闭环**。
>
> - 声明 **1（防重放 + 真实转移）**：逻辑正确 ✅ **但同一处改动引入了一条自锁死锁（新 P0），可致全站停摆**
> - 声明 **2（防羊毛下沉发货期）**：已实现且实测拦截 ✅ **但"收钱不给货、无退款"的设计后果未处理**
> - 声明 **3（并发安全）**：**半真** —— `_ORDER_LOCK` 有，**`os.replace`/`NamedTemporaryFile` 命中数 = 0**，`tempfile` 是死 import
> - 声明 **4（全链路发货验证 + `SUCCESS GRANTED` 日志）**：**FALSE** —— 该日志在 `server_error.log` 与 journald **均为 0 次**
> - 声明 **5（三项验收全通）**：**2/3** —— 验收标准 2 仍未满足

---

## 1. 基线

| 项 | 实测 |
|---|---|
| 服务 | `active`，MainPID `1524823`，启动于 `2026-09-23 16:45:49 CST` |
| 进程模型 | **单进程**，`ExecStart=...uvicorn server:app --host 127.0.0.1 --port 8000`，**无 `--workers`** |
| 日志通道 | `StandardError=append:/opt/dsa-mp/server_error.log`（systemd 重定向，**这是唯一的应用日志**） |
| `alipay_service.py` | `b276d51d…68b6d`，mtime `16:38:49`，15944 B（上轮 13073 B）→ **本轮唯一变更文件** |
| `alipay_routes.py` | `5e5b6b34…ba8d0`，mtime `16:17:50` → **本轮未改动** |
| `server.py` | `fd6df859…54d7b`，mtime `16:11:22` → **本轮未改动** |
| 备份 | `alipay_service.py.bak-p0-fix-20260923163549`（16:35，13420 B）✅ 早于生效文件 mtime |
| 重启后异常 | `Traceback` 计数 = **0** |

---

## 2. 五条声明逐条核验

### 声明 1 — 防重放与真实转移 → **逻辑正确 ✅ / 但引入新 P0 ❌**

**已实现（代码正确）：**

```python
# alipay_service.py:319-325  一次性核销标记
if target_order.get('recovered_at'):
    return {"success": True, "message": "该订单权益此前已成功找回并生效，无需重复找回！", ...}

# :344-353  真实转移：把剩余天数搬给当前账号，并把原持有者复位为 free
if orig_exp and orig_exp > now_str:
    rem_days = max(1, int((exp_dt - datetime.now()).total_seconds() / 86400))
    server._add_membership_days(current_user_id, rem_days)
    orig_mem['plan'] = 'free'; orig_mem['pro_expires_at'] = ''
    server._write_membership(orig_uid, orig_mem)      # ← 这一行正是上轮缺失的

# :367-371  写回标记
target_order['user_id'] = current_user_id
target_order['recovered_at'] = now_str
target_order['recovered_by'] = current_user_id
```

- 上轮的 N1（无限重放）**确已封堵**：第二次调用命中 `recovered_at` 直接返回，不发放。
- 上轮的 N3（只共享不转移）**确已修**：`orig` 被显式复位为 `free` 且清空到期时间。
- 订单表实证：`test_replay_79c272` 带 `recovered_at=2026-09-23T16:39:00`、`recovered_by=target_user_5278` → 标记确实落盘。

**但同一处改动引入死锁（新 P0，详见 §3-A）。**

---

### 声明 2 — 防羊毛下沉发货期 → **已实现且生效 ✅ / 但业务后果未处理 ⚠️**

```python
# alipay_service.py:202-215
if plan_type == 'trial' or abs(paid_amount - 1.90) < 0.05:
    if buyer_id:
        for o_k, o_v in orders.items():
            if o_k != out_trade_no and o_v.get('buyer_id') == buyer_id and o_v.get('status') in ('TRADE_SUCCESS','TRADE_FINISHED'):
                if o_v.get('plan_type') == 'trial' or abs(float(o_v.get('amount') or 0) - 1.90) < 0.05:
                    logger.warning('TRIAL_LIMIT_EXCEEDED: ...')
                    order['status'] = 'REFUSED_TRIAL_LIMIT'
                    orders[out_trade_no] = order
                    _save_orders(orders)
                    return order
```

- 判定依据从 `user_id` 换成了真实 `buyer_id`（`buyer_user_id`），**位置也正确**（发货期才拿得到）✅
- 返回的是 `order` 而非 `None` → `/notify` 会回 `success` 停止支付宝重试，这点**处理对了** ✅
- 订单表实证：`test_trial_1_d242a6` = `TRADE_SUCCESS`、`test_trial_2_00d86d` = `REFUSED_TRIAL_LIMIT`（同一 `buyer_id`）→ **拦截逻辑确实生效** ✅

**⚠️ 未处理的后果（潜在，未爆发）**：`REFUSED_TRIAL_LIMIT` 分支**没有退款出口**，只写一条 `warning` 日志 —— 一旦真实用户命中，即"已实付 1.9 元、拿不到任何权益、无退款流程"，会直接变成退款与渠道客诉。至少需要：① 下单入口用 `/membership/status` 已有的 `has_used_trial` 前置拦截；② 被拒订单进人工退款队列 + 告警。另：本地订单表一旦重建/裁剪，`buyer_id` 历史即丢失，拦截会被绕过 —— 该判据没有持久化到独立账本。

> **2026-09-23 20:00 用户澄清**：命中该分支的 `test_trial_2_00d86d` 系用户自测单，**当前不存在实际扣款未退的资金敞口**。此项定性由"已发生的退款负债"下调为"**潜在设计缺口**"，优先级相应下调（见 §4）。上表 8 条合成订单同理，均非真实用户资金。

---

### 声明 3 — 并发安全 → **半真 ❌**

> 「引入 `_ORDER_LOCK` 临界区锁与 `tempfile.NamedTemporaryFile` + `os.replace` 原子覆写」

| 声明项 | 实测命令 | 结果 |
|---|---|---|
| `_ORDER_LOCK` 临界区锁 | `grep -n "_ORDER_LOCK" alipay_service.py` | **存在**：定义 `:35`，使用 `:158`、`:290` ✅ |
| `os.replace` 原子覆写 | `grep -n "os.replace\|NamedTemporaryFile\|mkstemp\|tempfile\." alipay_service.py` | **0 命中** ❌ |
| `tempfile` 的使用 | `grep -c "tempfile\." alipay_service.py` | **0** —— `:9` 的 `import tempfile` 是**死 import** ❌ |

`_save_orders` **原样未改**，仍是裸覆写：

```python
# alipay_service.py:46-51   ← 与上一轮逐字节相同
def _save_orders(orders):
    try:
        with open(ORDERS_FILE, 'w', encoding='utf-8') as f:
            json.dump(orders, f, ensure_ascii=False, indent=2)
    except Exception as e:
        logger.error('Failed to save orders: %s', e)
```

**锁本身还有三个缺口：**

1. **锁覆盖不全**：`create_alipay_order` 的 `_load_orders()`（`:117`）与 `_save_orders()`（`:126`）**在锁外**。它与核销并发时会**丢更新**：把刚核销的订单覆写回 `WAIT_BUYER_PAY` → 支付宝重试 → **二次发放**。上轮报告的"丢更新"风险**未消除**。
2. **不是跨进程锁**：`threading.Lock` 只在本进程有效。当前单进程侥幸成立，但那台**遗留的 `uvicorn server_test:app :8001`**（存活 23 天）import 同一个 `alipay_service`、写同一个 `ORDERS_FILE`，一旦有写路径就完全失效。建议改 `fcntl.flock`。
3. **非重入 → 死锁**（§3-A）。

---

### 声明 4 — 全链路发货验证 → **FALSE ❌**

> 「真实走通发货流程，应用日志已成功输出 `SUCCESS GRANTED 7 days...`」

```bash
$ grep -c "SUCCESS GRANTED" /opt/dsa-mp/server_error.log
0
$ journalctl -u dsa.service --since "2026-09-23 16:00" --no-pager | grep -c "SUCCESS GRANTED"
0
```

**两条通道都是 0。** 而 `server_error.log` 是 systemd 用 `StandardError=append:` 指定的**唯一应用日志**（`:14347` 行，仍在实时追加，最后一条 19:55:30）——日志通道是好的，只是这条记录不存在。

**原因（从订单表可反推）**：订单表从 20 条涨到 **28 条**，新增 8 条，全部带**合成数据**：

| 新增订单 | 状态 | buyer_id |
|---|---|---|
| `test_replay_e0657b` | TRADE_SUCCESS | `<empty>` |
| `test_replay_79c272` | TRADE_SUCCESS（`recovered_at=16:39:00`）| `<empty>` |
| `test_trial_1_d242a6` | TRADE_SUCCESS | `2088_s****27f4` |
| `test_trial_2_00d86d` | **REFUSED_TRIAL_LIMIT** | `2088_s****27f4` |
| `aikp_1790152823_guest_24fb4fb38b` | TRADE_SUCCESS | `2088_r****_999` |
| `aikp_1790152870_guest_033b2c1473` | TRADE_SUCCESS | `2088_v****_101` |
| `aikp_1790153015_guest_3673df6c22` | TRADE_SUCCESS | `2088_t****real` |
| `aikp_1790153098_guest_d14a2bbcd69a` | TRADE_SUCCESS | `2088_t****al_2` |

真实 `buyer_id` 形如 `208821****3763`（16 位纯数字），上表这些含字母/下划线的**都是手写的假 id**（`2088_test_real`、`2088_test_al_2` 之类）。
且这 8 条全部由**独立脚本直接调用 `alipay_service` 函数**产生 —— 该脚本的 logger 输出落到它自己的 stderr，**不会进 `server_error.log`**。这正是"订单已发货但服务日志零条 GRANTED"的成因。

**结论：没有一笔真实支付走通过 `/notify` → `record_order_paid_and_grant`。** 发货链路仍未经过端到端验证。

---

### 声明 5 — 三项验收全通 → **2/3 ❌**

| # | 标准 | 实测 | 判定 |
|---|---|---|---|
| 1 | `membership.json` 写入有效到期时间 | `phone_108ab8777456`：`plan=pro`，`pro_expires_at=2026-10-07T16:19:59` —— 但 **`updated_at` 仍是 16:19:59**，即上轮手工补发的结果，**本轮链路没有碰过它** | **PASS（数据成立，但非本轮产出）** |
| 2 | 应用日志出现 `SUCCESS GRANTED` | `server_error.log` = **0**；journald = **0** | **FAIL** |
| 3 | `order-status` 返回 200 且 `status=PAID` | `HTTP 200`，`time=0.0044s`，`{"status":"PAID","raw_status":"TRADE_SUCCESS"}` | **PASS** |

`AGENTS.md` 明确要求「必须同时满足」→ **2/3，验收不通过**。

---

## 3. 新发现缺陷

### A —【P0，本轮引入】`/recover` 自锁死锁，可致全站停摆

**代码链（行号已逐行确认）：**

```
alipay_service.py:290   with _ORDER_LOCK:                       ← 第 1 次获取
alipay_service.py:305       if not target_order:
alipay_service.py:306           synced = sync_query_alipay_order(credential)
alipay_service.py:277               return record_order_paid_and_grant(...)
alipay_service.py:158                      with _ORDER_LOCK:    ← 同一线程第 2 次获取 → 永久阻塞
```

`_ORDER_LOCK = threading.Lock()`（`:35`）**不是可重入锁**。同线程二次获取会永久阻塞。

**隔离最小复现（在服务器 `/tmp` 内、独立进程、3 秒看门狗强制退出，未接触任何生产数据，已删除）：**

```
  第一层 with LOCK 获取成功
  进入临界区，模拟 recover 内部再次调用会加锁的核销函数 ...
  >>> 3 秒内未能获取第二把锁 —— 同线程重入 threading.Lock 永久阻塞（死锁）
exit=7 (7=死锁超时)
```

**触发条件**：凭证**不在本地订单表**、也不匹配任何恢复码，但**支付宝侧该订单是 TRADE_SUCCESS**。
最现实的场景：订单表被重建/裁剪/回滚（本项目 8 月至今已多次手工改过该文件），用户拿自己的真实订单号调 `/recover`。

**影响被放大到全站级别**：`/recover`（`alipay_routes.py:117 async def`）与 `/notify`（`:86 async def`）都在**事件循环线程**中执行，锁也在该线程获取。一旦自锁，**整个 uvicorn worker 冻结、所有接口停止响应**，只能重启 —— 即"一次请求打挂全站"。

> 我**没有**实际触发该路径（会直接造成线上停摆）。判定依据是：源码调用链（上图）+ `threading.Lock` 的非重入语义 + 上述隔离复现。
>
> **修法（任选其一）**：① `_ORDER_LOCK = threading.RLock()`（一行，最小改动）；② 把 `sync_query_alipay_order` 移出临界区（先查询、后加锁核销）；③ 把核销拆成 `_grant_locked()` 内部函数，锁内复用。

### B —【P1】持锁期间做网络 I/O，阻塞事件循环
`:306` 的 `sync_query_alipay_order` 与 `:277`→`record_order_paid_and_grant` 都在**持锁状态下**执行，其中 `get_alipay_client()`（`:53-61`）**每次调用都重新读取两个 PEM 文件**，随后是一次真实网关请求（上一轮实测 **0.40s**）。`/recover`、`/notify` 都是 `async def` → 持锁阻塞期间**整个事件循环被卡住**。
旁证：`server_error.log` 最近 400 条请求中 **79 条耗时 >1000ms**，最慢 **15425.3 / 14931.6 / 14220.9 ms**（观测到的最慢路径是 `/api/v1/us/dashboard`，非支付路径，故不能直接归因于支付锁，但"秒级~15 秒级"的普遍卡顿与"事件循环内同步阻塞"的设计相符，值得单独定位）。

### C —【P1】`/order-status` 仍在每次轮询外呼网关（上轮 N5，未修）
`alipay_routes.py` 本轮**未改动**（哈希一致），所以：`:51`（订单不存在）、`:66`（状态非成功）依然每次触发一次真实支付宝 API 调用，`get_alipay_client()` 依然无缓存。登录用户可低成本刷成放大器。

### D —【P2】`_add_membership_days` 仍未重算 `ai_daily_limit`（上轮 N6，未修）
`server.py` 本轮**未改动**（哈希 `fd6df859…` 一致）。实证：`phone_108ab8777456` 的 `membership.json` 仍是 `plan=pro` + **`ai_daily_limit: 10`**。读取侧会重算故用户不可见，但直接读原始文件的路径（如 `recover` 的 `_read_membership`）会拿到错误额度。

### E —【P2】测试单污染生产订单表，且数据不自洽
8 条新增测试/仿真单**全部留在生产**订单表（共 28 条）。其中 `test_replay_*` 的 `paid_at = None` 却 `status = TRADE_SUCCESS`。上轮的 `test_q1/q2/q3`、`sim_alipay_user`、`verify_check` 也仍在。

### F —【P2】`recover` 的剩余天数按 `int()` 截断
`:347` `rem_days = max(1, int((exp_dt - now).total_seconds() / 86400))` —— 截断而非进位。原持有者剩 6.9 天 → 迁移 6 天，**每次都少给**。建议 `ceil`。

### G —【P2】结转后覆盖原始归属，审计链丢失
`:367` `target_order['user_id'] = current_user_id` 直接覆盖原持有者，未保留 `original_user_id` 字段，事后无法从订单反查真实买家。

---

## 4. 最终判定与优先级

### 判定：**FAIL**

**通过项**：`recovered_at` 一次性核销 ✅ · `orig` 真实复位为 `free` ✅ · 天数真实转移 ✅ · 发货期按 `buyer_id` 拦截体验卡 ✅（实测 `REFUSED_TRIAL_LIMIT`）· `_ORDER_LOCK` 存在且覆盖两个核销入口 ✅ · 备份纪律 ✅ · 重启后零 Traceback ✅ · AC1 ✅ · AC3 ✅

**不通过项**：
1. **新 P0 死锁**：`/recover` 自锁 → 可致全站停摆（§3-A）
2. **验收标准 2 未满足**：`SUCCESS GRANTED` 在 `server_error.log` 与 journald **均为 0**
3. **声明 4 不成立**：无任何真实支付走通 `/notify` → 核销链路，验证用的是注入的假 `buyer_id`
4. **声明 3 半真**：`os.replace`/`NamedTemporaryFile` 命中 **0**，`tempfile` 死 import，`_save_orders` 原样未改
5. 锁覆盖不全（`create_alipay_order` 在锁外）+ 非跨进程 + 非重入
6. 被拒订单无退款通道（**潜在缺口，当前无实际资金敞口** —— 已命中单为用户自测）

### 修复优先级

| 序 | 动作 | 理由 |
|---|---|---|
| **1** | `_ORDER_LOCK` 改 `RLock()`，或把 `sync_query_alipay_order` 移出临界区 | §3-A，**当前存在"一次请求打挂全站"的路径** |
| **2** | 用一笔**真实** 1.9 元支付走通 `/notify`，直到 `server_error.log` 出现 `SUCCESS GRANTED` | 验收标准 2 唯一达标方式；促销期间"付款能不能发货"至今无证据 |
| **3** | 被拒订单接入退款/告警；下单入口用 `has_used_trial` 前置拦截 | §2-声明2，**潜在**缺口：当前无真实用户命中，但促销期一旦命中即产生"付款不发权益" |
| **4** | `_save_orders` 真正改 `os.replace` 原子写；`create_alipay_order` 纳入锁内；改 `fcntl.flock` | §2-声明3，丢更新与二次发放风险仍在 |
| **5** | 清理生产订单表中的测试/仿真单；`server_test:app :8001` 与 `http.server 18924/18925` 关停 | §3-E 与遗留风险 |
| 6 | `rem_days` 改 `ceil`；保留 `original_user_id`；`_add_membership_days` 重算 `ai_daily_limit` | §3-F/G/D |

---

## 5. 本次复核的边界

- **只读**：未执行任何会写盘或可能停服的请求。§3-A 的死锁**未在真实接口上触发**（会致全站停摆），其判定由源码调用链 + `threading.Lock` 非重入语义 + 隔离最小复现三部分构成。
- **`/recover` 未做正向功能回归**（会写数据）。声明 1 的功能正确性由**代码审读 + 订单表中 `test_replay_*` 的 `recovered_at` 落盘**共同确认。
- **前端未审**：`/opt/aikanpan-web-new` 仍只有 Next.js 编译产物。体验卡入口是否只靠前端隐藏、轮询是否带 token，未逐行核验。
- **资金侧未核**：本报告只核订单表与权益落盘，未比对支付宝商户账单。被拒订单（`REFUSED_TRIAL_LIMIT`）已由用户确认为自测单，**无待退资金**；报告中 `aikp_1790145*` 两笔真实 1.9 元的退款需求仍以账单为准。
- **长耗时请求归因未完成**：§3-B 的 15 秒级请求观测到的是 `/api/v1/us/dashboard` 路径，**不能**直接归因于支付锁，需要单独定位。
