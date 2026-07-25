# 爱看盘 Web

AI 股票复盘工具 — Web 版

## 技术栈

- **框架**: Next.js 16 (App Router)
- **语言**: TypeScript
- **样式**: Tailwind CSS v4 + shadcn/ui
- **字体**: Inter (正文) + JetBrains Mono (数字)
- **图标**: Lucide React
- **部署**: 静态导出，部署于 aikanpan.top

## 开发

```bash
npm run dev    # 开发服务器
npm run build  # 生产构建
npm run start  # 生产服务器
```

## 项目结构

```
src/
├── app/              # Next.js App Router (页面)
├── components/       # UI 组件
│   ├── layout/       # 导航栏、页脚
│   ├── market/       # 行情卡片、股票行
│   └── charts/       # 图表组件
├── lib/              # API client、格式化工具
├── types/            # TypeScript 类型
└── hooks/            # React Hooks
```

## 后端 API

共用鸿蒙 APP 后端: `https://aikanpan.top/api/v1`
