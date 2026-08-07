# 爱看盘 Web（aikanpan-web）

爱看盘是一款面向 A 股投资者的 AI 复盘与决策辅助工具。Web 端提供实时行情、市场温度、涨停池、强势行业、AI 复盘、智能盯盘、个股诊断、持仓管理与研究台等能力。

线上地址：<https://aikanpan.top>

## 功能特性

- 实时行情：三大指数、行业板块、涨跌停榜，盘中自动刷新
- 市场温度：综合指数强度、板块热度、涨停效应与 AI 焦点生成 0-100 温度分
- AI 复盘：每日收盘后自动生成市场摘要、焦点、风险提示
- AI 深度解读：点击“AI 深度解读”获取市场温度、短线倾向与风险提示
- 智能盯盘：自然语言条件，支持价格、涨跌幅、成交量等多条件组合
- 个股诊断：K 线、技术指标、资金流、财务数据、事件与 AI 摘要
- 研究台：自选、盘前计划、公司档案、投资论点，数据云端同步
- 账户系统：游客自动登录，手机号绑定后自选、持仓、计划跨设备同步

## 技术栈

- 框架：Next.js 16（App Router，Turbopack）
- 语言：TypeScript
- 样式：Tailwind CSS v4 + 自定义 Neomorphism 设计系统
- UI：shadcn/ui、Lucide React
- 图表：TradingView Widget、自研 Sparkline
- 数据同步：SWR + 后端 sync/push、sync/pull
- 部署：Next.js Standalone + PM2

## 快速开始

```bash
npm install
cp .env.example .env.local   # 按需配置 NEXT_PUBLIC_API_BASE
npm run dev
```

生产构建与本地预览：

```bash
npm run build
npm run start
```

## 环境变量

| 变量 | 说明 | 默认值 |
| --- | --- | --- |
| `NEXT_PUBLIC_API_BASE` | 后端 API Base URL | `https://aikanpan.top/api/v1` |

## 项目结构

```
src/
├── app/               # Next.js App Router 页面
│   ├── page.tsx       # AI 复盘工作台（首页）
│   ├── market/        # 市场总览
│   ├── review/        # 每日复盘
│   ├── research/      # 研究台
│   ├── alerts/        # 智能盯盘
│   ├── portfolio/     # 持仓与交易流水
│   └── account/       # 手机号绑定与账户
├── components/
│   ├── ai/            # AI 复盘、市场温度、AI 解读
│   ├── chart/         # TradingView、Sparkline
│   ├── layout/        # 导航、底栏、全局搜索
│   └── market/        # 行情卡片、板块表格
└── lib/
    ├── api.ts         # API client
    ├── auth.tsx       # 游客/手机号认证
    ├── use-sync.ts    # 云端数据同步
    └── use-watchlist.ts
```

## 后端 API

线上 API：<https://aikanpan.top/api/v1>

- `GET /workbench/dashboard` — 工作台仪表盘
- `GET /workbench/temperature` — 市场温度（`?ai=true` 生成 AI 解读）
- `GET /workbench/insights` — AI 市场洞察
- `GET /workbench/daily-review` — 每日复盘
- `GET /market/sectors` — 行业板块
- `GET /stocks/{code}/quote` — 个股实时行情
- `GET /stocks/{code}/history` — 历史 K 线
- `GET /stocks/{code}/indicators` — 技术指标
- `GET /stocks/{code}/moneyflow` — 资金流向
- `POST /auth/sms-send`、`POST /auth/sms-verify` — 手机号登录
- `POST /sync/push`、`GET /sync/pull` — 用户数据同步

完整接口说明见站点内 API 文档：<https://aikanpan.top/api-docs/>

## 部署

本项目使用 Next.js Standalone 输出。部署时除了 `.next/standalone`，必须同时带上 `.next/static` 与 `public`，否则线上 CSS 会 404、页面布局会失效：

```bash
npm run build
robocopy .next\static .next\standalone\.next\static /E
robocopy public .next\standalone\public /E
Compress-Archive -Path .next\standalone\* -DestinationPath standalone.zip
```

上传服务器后：

```bash
cd /opt/aikanpan-web-new
unzip -o standalone.zip -d .
pm2 restart aikanpan-web --update-env
```

## License

[MIT](./LICENSE)

## 免责声明

本项目提供的所有数据和信息仅供参考，不构成任何投资建议。数据来源为第三方平台，不保证数据的准确性、完整性和及时性。投资有风险，入市需谨慎。
