"use client";

/**
 * 访客身份未建立时的统一提示 + 重试入口。
 *
 * 文案取舍：原先写「账户初始化失败」，但这里失败的**不是用户的账户**，
 * 而是后台自动建的匿名访客身份（游客 token）。游客看到「账户失败」会以为
 * 自己注册的账号出问题，甚至以为必须注册才能用——恰好是反的：游客本就能用。
 * 故标题只说「访客身份未建立」，不碰「账户」二字。
 *
 * 背景：AuthProvider 在没有本地用户时会自动做游客登录（src/lib/auth.tsx）。
 * 登录失败后 user 恒为 null、loading 变 false，于是所有
 * `ready = !authLoading && !!user` 的组件永久不可用：按钮 disabled、
 * SWR key 恒为 null（列表根本不发请求），且没有任何重试入口。
 * 修复前这些位置只能「禁用」或「让用户刷新整页」——前者是静默死路，
 * 后者会丢掉页面上已填的内容。
 *
 * compact：只渲染「重试」按钮（不带标题与说明），给空间窄到放不下整块提示的位置，
 * 例如个股页标题栏的自选按钮位、自选列表行。
 */
export function AuthRetryNotice({
  onRetry,
  compact = false,
}: {
  onRetry: () => void;
  compact?: boolean;
}) {
  if (compact) {
    // 只放一个按钮，不放标题。
    // 原因：用它的位置（个股页标题栏 stock-title-bar.tsx:27 带 overflow-hidden、
    // :36 是不换行的 flex 行；自选列表行同理）在 375px 下已经没有富余宽度，
    // 「标题 + 按钮」会被父容器裁掉——被裁的恰好可能是按钮，等于重试入口点不到。
    // 失败原因放进 title / aria-label，无障碍名称仍包含可见文字「重试」（2.5.3）。
    return (
      <button
        type="button"
        onClick={onRetry}
        title="访客身份未建立，点此重试"
        aria-label="访客身份未建立，点此重试"
        className="neo-btn-primary min-h-9 shrink-0 rounded-md px-2 py-1 text-xs font-medium text-white"
      >
        重试
      </button>
    );
  }

  return (
    <div className="neo-inset rounded-md px-3 py-2.5" role="status">
      <p className="text-xs font-medium text-neo-ink">访客身份未建立</p>
      <p className="mt-0.5 text-xs text-neo-dim">点重试再连一次，不用刷新页面。</p>
      <button
        type="button"
        onClick={onRetry}
        className="neo-btn-primary mt-2 min-h-9 rounded-md px-3 py-1 text-xs font-medium text-white"
      >
        重试
      </button>
    </div>
  );
}
