"use client";

import { useMemo, useSyncExternalStore } from "react";
import Link from "next/link";
import { BellRing, BookOpenCheck, ClipboardList, Search, Sparkles } from "lucide-react";
import { reportConversionEvent } from "@/lib/analytics";

const STEPS = [
  {
    id: "review",
    title: "看今日复盘",
    desc: "先看市场结构和 AI 结论",
    href: "/review/",
    icon: ClipboardList,
  },
  {
    id: "stocks",
    title: "选 3 只重点股",
    desc: "从市场页挑出跟踪对象",
    href: "/market/",
    icon: Search,
  },
  {
    id: "research",
    title: "写入自选/计划",
    desc: "记录观察点和操作预期",
    href: "/research/",
    icon: BookOpenCheck,
  },
  {
    id: "alerts",
    title: "设置盯盘提醒",
    desc: "条件触发时自动提醒",
    href: "/alerts",
    icon: BellRing,
  },
  {
    id: "ai",
    title: "AI 复盘归档",
    desc: "收盘后生成连续记录",
    href: "/review/",
    icon: Sparkles,
  },
];

const WORKFLOW_EVENT = "aikanpan_workflow_changed";

function workflowKey() {
  return `aikanpan_workflow_${new Date().toLocaleDateString("sv")}`;
}

function subscribeWorkflow(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(WORKFLOW_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(WORKFLOW_EVENT, onStoreChange);
  };
}

function getWorkflowSnapshot() {
  return localStorage.getItem(workflowKey()) ?? "";
}

function getServerWorkflowSnapshot() {
  return "";
}

function parseWorkflow(raw: string): string[] {
  try {
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function DailyWorkflow({ className = "" }: { className?: string }) {
  const raw = useSyncExternalStore(subscribeWorkflow, getWorkflowSnapshot, getServerWorkflowSnapshot);
  const completed = useMemo(() => parseWorkflow(raw), [raw]);

  function markCompleted(id: string) {
    if (completed.includes(id)) return;
    try {
      localStorage.setItem(workflowKey(), JSON.stringify([...completed, id]));
      window.dispatchEvent(new Event(WORKFLOW_EVENT));
    } catch {
      // 进度记录失败不应阻断跳转。
    }
    reportConversionEvent("daily_workflow_click", { source: id });
  }

  return (
    <section aria-label="今日工作流" className={`neo-card p-4 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-[14px] font-semibold text-neo-ink">今日工作流</h2>
          <p className="mt-0.5 text-[11px] text-neo-dim">5 步完成当日看盘闭环，进度按天保存。</p>
        </div>
        <span className="neo-inset-sm rounded-md px-2.5 py-1 text-[11px] font-medium text-neo-mid">
          {completed.length}/5 已完成
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-5">
        {STEPS.map((step, index) => {
          const done = completed.includes(step.id);
          const Icon = step.icon;
          return (
            <Link
              key={step.id}
              href={step.href}
              onClick={() => markCompleted(step.id)}
              className={`rounded-md p-3 transition-all duration-200 hover:-translate-y-0.5 ${done ? "neo-inset" : "neo-card-sm"}`}
            >
              <div className="flex items-center justify-between">
                <Icon size={15} style={{ color: done ? "var(--neo-primary)" : "var(--neo-dim)" }} />
                <span className={`text-[10px] font-medium ${done ? "text-neo-primary" : "text-neo-dim"}`}>
                  {done ? "已完成" : `第 ${index + 1} 步`}
                </span>
              </div>
              <div className="mt-2 text-[13px] font-medium text-neo-ink">{step.title}</div>
              <p className="mt-1 text-[11px] leading-relaxed text-neo-dim">{step.desc}</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
