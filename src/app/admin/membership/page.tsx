"use client";

import { useCallback, useState, type FormEvent } from "react";
import { Ban, KeyRound, Plus, RefreshCw, ShieldCheck } from "lucide-react";
import { api, type AdminMembershipCode } from "@/lib/api";


const STATUS_TEXT = {
  active: "可用",
  used: "已使用",
  revoked: "已作废",
} as const;

function statusClass(status: AdminMembershipCode["status"]) {
  if (status === "active") return "text-neo-primary";
  if (status === "used") return "text-neo-dim";
  return "text-neo-down";
}

export default function AdminMembershipPage() {
  const [tokenInput, setTokenInput] = useState("");
  const [adminToken, setAdminToken] = useState("");
  const [codes, setCodes] = useState<AdminMembershipCode[]>([]);
  const [count, setCount] = useState(1);
  const [days, setDays] = useState(30);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async (token: string) => {
    setLoading(true);
    setError("");
    try {
      const data = await api.adminListMembershipCodes(token);
      setCodes(data.codes);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
      return false;
    } finally {
      setLoading(false);
    }
  }, []);


  async function connect(e: FormEvent) {
    e.preventDefault();
    const token = tokenInput.trim();
    if (!token) {
      setError("请输入管理令牌");
      return;
    }
    const ok = await load(token);
    if (!ok) return;
    setAdminToken(token);
  }

  async function create(e: FormEvent) {
    e.preventDefault();
    if (!adminToken) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const data = await api.adminCreateMembershipCodes(adminToken, {
        count,
        days,
        note: note.trim(),
      });
      setCodes((prev) => [...data.codes, ...prev]);
      setMessage(`已生成 ${data.count} 个激活码`);
      setNote("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "生成失败");
    } finally {
      setBusy(false);
    }
  }

  async function revoke(code: string) {
    if (!adminToken) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const item = await api.adminRevokeMembershipCode(adminToken, code);
      setCodes((prev) => prev.map((row) => row.code === code ? item : row));
      setMessage(`已作废 ${code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "作废失败");
    } finally {
      setBusy(false);
    }
  }

  function disconnect() {
    setAdminToken("");
    setTokenInput("");
    setCodes([]);
  }


  return (
    <div className="neo-page min-h-screen">
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        <section className="neo-card p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} style={{ color: "var(--neo-primary)" }} />
              <h1 className="text-[22px] font-bold tracking-tight text-neo-ink">会员激活码</h1>
            </div>
            {adminToken && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void load(adminToken)}
                  disabled={loading}
                  className="neo-chip flex items-center gap-1.5 px-3 py-1.5 text-[12px]"
                >
                  <RefreshCw size={13} />
                  刷新
                </button>
                <button
                  type="button"
                  onClick={disconnect}
                  className="neo-chip px-3 py-1.5 text-[12px]"
                >
                  退出
                </button>
              </div>
            )}
          </div>

          {!adminToken && (
            <form onSubmit={connect} className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_130px]">
              <input
                value={tokenInput}
                onChange={(event) => setTokenInput(event.target.value)}
                type="password"
                placeholder="管理令牌"
                className="neo-input w-full rounded-md px-3 py-2.5 text-[13px]"
                autoComplete="off"
              />
              <button type="submit" className="neo-btn-primary rounded-md px-5 py-2.5 text-[13px] font-medium">
                进入
              </button>
            </form>
          )}
        </section>

        {adminToken && (
          <>
            <section className="neo-card mt-4 p-6">
              <div className="flex items-center gap-2">
                <Plus size={17} style={{ color: "var(--neo-primary)" }} />
                <h2 className="text-[17px] font-semibold text-neo-ink">生成激活码</h2>
              </div>
              <form onSubmit={create} className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-[110px_110px_1fr_130px]">
                <input
                  value={count}
                  onChange={(event) => setCount(Number(event.target.value))}
                  type="number"
                  min={1}
                  max={100}
                  className="neo-input rounded-md px-3 py-2.5 text-[13px]"
                  aria-label="生成数量"
                />
                <input
                  value={days}
                  onChange={(event) => setDays(Number(event.target.value))}
                  type="number"
                  min={1}
                  max={3650}
                  className="neo-input rounded-md px-3 py-2.5 text-[13px]"
                  aria-label="有效天数"
                />
                <input
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="备注"
                  className="neo-input w-full rounded-md px-3 py-2.5 text-[13px]"
                />
                <button
                  type="submit"
                  disabled={busy}
                  className="neo-btn-primary rounded-md px-5 py-2.5 text-[13px] font-medium disabled:opacity-60"
                >
                  {busy ? "处理中…" : "生成"}
                </button>
              </form>
            </section>

            <section className="neo-card mt-4 overflow-hidden">
              <div className="flex items-center justify-between gap-3 px-6 pt-6">
                <div className="flex items-center gap-2">
                  <KeyRound size={17} style={{ color: "var(--neo-dim)" }} />
                  <h2 className="text-[17px] font-semibold text-neo-ink">激活码列表</h2>
                </div>
                <span className="text-[12px] text-neo-dim">{codes.length} 条</span>
              </div>
              <div className="mt-4 overflow-x-auto px-6 pb-6">
                <table className="w-full min-w-[760px] text-left text-[13px]">
                  <thead>
                    <tr className="text-[11px] uppercase text-neo-dim">
                      <th className="pb-3 pr-4 font-medium">激活码</th>
                      <th className="pb-3 pr-4 font-medium">状态</th>
                      <th className="pb-3 pr-4 font-medium">天数</th>
                      <th className="pb-3 pr-4 font-medium">备注</th>
                      <th className="pb-3 pr-4 font-medium">使用时间</th>
                      <th className="pb-3 font-medium">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {codes.map((item) => (
                      <tr key={item.code} className="border-t border-[var(--neo-border)]">
                        <td className="py-3 pr-4 font-mono text-[12px] text-neo-ink">{item.code}</td>
                        <td className={`py-3 pr-4 font-medium ${statusClass(item.status)}`}>
                          {STATUS_TEXT[item.status]}
                        </td>
                        <td className="py-3 pr-4 text-neo-mid">{item.days}</td>
                        <td className="py-3 pr-4 text-neo-mid">{item.note || "-"}</td>
                        <td className="py-3 pr-4 text-neo-mid">{item.used_at || "-"}</td>
                        <td className="py-3">
                          <button
                            type="button"
                            onClick={() => void revoke(item.code)}
                            disabled={busy || item.status !== "active"}
                            className="neo-chip flex items-center gap-1 px-2.5 py-1 text-[11px] disabled:opacity-50"
                          >
                            <Ban size={11} />
                            作废
                          </button>
                        </td>
                      </tr>
                    ))}
                    {codes.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-[13px] text-neo-dim">
                          暂无激活码
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        {error && <p className="mt-3 text-[12px] text-neo-down">{error}</p>}
        {!error && message && <p className="mt-3 text-[12px] text-neo-up">{message}</p>}
      </main>
    </div>
  );
}
