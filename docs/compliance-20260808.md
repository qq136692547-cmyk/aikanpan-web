# 合规与可运营清单（2026-08-08）

目标：把 `aikanpan.top` 从“线上可用”推进到“可运营、可追踪”。

## 1. ICP 备案

- 状态：已完成（用户确认，2026-08-08）
- 站点展示：渝ICP备2026014729号-1
- 页面：`/privacy/`、页脚

## 2. 数据源商用授权

- 状态：待运营方最终确认
- 已做：隐私政策与用户协议改为保守口径，声明“不会转售第三方行情数据；部分数据源授权尚未最终确认”
- 调研：详见 `docs/data-license-research-20260808.md`（交易所规则、平台条款、费用与申请流程）
- 需办：确认东方财富、新浪财经等数据源的商用授权后再对外商用

## 3. 用户协议与隐私政策

- 状态：已完成一版合规复核（2026-08-08）
- 已补：备案信息、访问统计与留存说明、数据来源与授权、Cookie/本地存储、未成年人保护、用户义务、合规提示
- 注意：仍建议正式商用前由法律专业人士复核

## 4. 埋点与留存验证

- 后端：`POST /api/v1/analytics/events`、`GET /api/v1/analytics/retention?days=30`
- 前端：`src/lib/analytics.ts` + `AnalyticsReporter`，记录 `first_visit / return_visit / page_view`
- 验证：`npm run monitor:retention`，输出 D1/D7/D30 留存与总量
- 隐私：访问者 ID 为不可逆哈希，不采集 IP 明细、设备指纹、账号密码、持仓明细

## 5. 开源 CI

- 新增 `.github/workflows/ci.yml`
- 自动：`npm ci` + `npm run build` + `npm run test:unit`
- 手动：`workflow_dispatch` 输入 `run_live_smoke=true` 时跑线上冒烟测试

## 剩余外部动作

- 数据源授权确认（唯一未闭环项）
- 正式商用前法律复核（建议项）
- 若提供“评分/决策参考”等金融信息服务，需评估投顾资质要求
- CI 推送状态：已推送（2026-08-08），GitHub Actions 自动运行 build + test:unit
