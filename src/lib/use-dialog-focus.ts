"use client";

import { useEffect, useRef } from "react";

/**
 * 浮层（dialog）的通用无障碍行为，两个弹窗复用：
 * - 全局搜索（src/components/layout/global-search.tsx）
 * - AI 海报弹窗（src/components/ai/ai-share-poster-modal.tsx）
 *
 * 负责四件事：
 * 1. 打开时把焦点移进浮层（目标元素由调用方把 focusRef 贴上去决定）
 * 2. Esc 关闭
 * 3. Tab / Shift+Tab 在浮层内循环，不跑到浮层外
 * 4. 关闭后焦点归位到「打开浮层之前焦点所在的那个元素」
 *
 * 不引第三方库：焦点循环用「取容器内可聚焦元素 → 判断越界 → 拉回首/末个」自己实现。
 */

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

/** 取容器内当前可聚焦的元素（DOM 顺序）。 */
function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => !el.hasAttribute("disabled") && el.getAttribute("aria-hidden") !== "true"
  );
}

/**
 * @param open     浮层是否打开
 * @param onClose  关闭浮层的回调（Esc 走它；点遮罩是否也走它由调用方决定）
 * @returns containerRef 贴在浮层的语义容器（dialog 那一层）上，焦点循环以它为范围；
 *          focusRef 贴在「打开时该先拿到焦点的元素」上
 *
 * TContainer / TFocus 由调用方指定具体元素类型（如 HTMLDivElement / HTMLInputElement），
 * 这样 ref 能直接贴到对应标签上，TypeScript 严格模式下也不会因为 HTMLElement 与
 * HTMLInputElement 之间不可赋值而报错。
 */
export function useDialogFocus<
  TContainer extends HTMLElement = HTMLElement,
  TFocus extends HTMLElement = HTMLElement,
>(open: boolean, onClose: () => void) {
  /** 浮层的语义容器（dialog 那一层） */
  const containerRef = useRef<TContainer | null>(null);
  /** 调用方指定的初始焦点目标（全局搜索=输入框，海报弹窗=关闭按钮） */
  const focusRef = useRef<TFocus | null>(null);
  /** 打开浮层之前焦点所在的元素 —— 关闭后焦点回到这里 */
  const focusRestoreRef = useRef<HTMLElement | null>(null);
  /** onClose 存进 ref：事件监听只依赖 open，不必因回调换了身份就重绑 */
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  // 打开时：抓归位目标 → 把焦点移进浮层。
  // 关闭（或卸载）时由上面这个 effect 的 cleanup 负责归位，
  // 这样「父组件直接卸载浮层」也能归位，不只是 open 变 false 的情况。
  useEffect(() => {
    if (!open) return;

    // 归位目标必须在焦点被移走之前抓 —— 抓到的是打开前那个元素，
    // 而不是刚被移进来的输入框。
    const active = document.activeElement;
    focusRestoreRef.current = active instanceof HTMLElement ? active : null;

    const target = focusRef.current;
    if (target) {
      target.focus();
    } else {
      // 调用方没指定目标时，退回到容器内第一个可聚焦元素
      const container = containerRef.current;
      if (container) getFocusableElements(container)[0]?.focus();
    }

    return () => {
      const restoreTo = focusRestoreRef.current;
      focusRestoreRef.current = null;
      // 目标可能已随浮层一起从文档里消失，这时不该 focus 一个游离节点
      if (restoreTo && document.contains(restoreTo)) restoreTo.focus();
    };
  }, [open]);

  // Esc 关闭 + Tab 焦点循环。只在浮层打开时监听，关闭后自动摘掉。
  useEffect(() => {
    if (!open) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab") return;

      const container = containerRef.current;
      if (!container) return;
      const focusable = getFocusableElements(container);
      if (focusable.length === 0) {
        // 容器里没有可聚焦元素（比如搜索结果为空），别让 Tab 跑到浮层外
        e.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      // 焦点已经跑到浮层外（比如用户点了遮罩），拉回首/末个
      if (!active || !container.contains(active)) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
        return;
      }

      // 在末尾按 Tab / 在开头按 Shift+Tab → 绕回另一端
      if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return { containerRef, focusRef };
}
