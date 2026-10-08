"use client";

import React, { useEffect, useRef, useState } from "react";
import { X, Copy, Download, Check, Sparkles } from "lucide-react";
import type { StockReport } from "@/lib/api";

interface AISharePosterModalProps {
  isOpen: boolean;
  onClose: () => void;
  code: string;
  name: string;
  price?: number | string | null;
  changePercent?: number | string | null;
  report?: StockReport | null;
  model?: string;
  supportLevel?: string;
  resistanceLevel?: string;
  riskReward?: string;
}

export function AISharePosterModal({
  isOpen,
  onClose,
  code,
  name,
  price,
  changePercent,
  report,
  model = "开源深度量化模型",
  supportLevel = "--",
  resistanceLevel = "--",
  riskReward = "--",
}: AISharePosterModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [dataUrl, setDataUrl] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);
  const [isRendering, setIsRendering] = useState<boolean>(true);

  useEffect(() => {
    if (!isOpen) {
      setDataUrl("");
      setCopied(false);
      return;
    }

    setIsRendering(true);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 设定 3:4 比例高清画布 (750 x 1000, 2x 缩放)
    const scale = 2;
    const width = 720;
    const height = 960;
    canvas.width = width * scale;
    canvas.height = height * scale;
    ctx.scale(scale, scale);

    // 1. 背景绘制 (暗黑新拟态基底 #0A0B0D)
    ctx.fillStyle = "#0A0B0D";
    ctx.fillRect(0, 0, width, height);

    // 顶部背景光晕微光
    const glowGrad = ctx.createRadialGradient(width / 2, 80, 20, width / 2, 80, 280);
    glowGrad.addColorStop(0, "rgba(56, 189, 248, 0.08)");
    glowGrad.addColorStop(1, "rgba(10, 11, 13, 0)");
    ctx.fillStyle = glowGrad;
    ctx.fillRect(0, 0, width, 400);

    // 辅助圆角矩形函数
    const roundRect = (
      x: number,
      y: number,
      w: number,
      h: number,
      r: number,
      fill?: string | CanvasGradient,
      stroke?: string,
      lineWidth = 1
    ) => {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
      if (fill) {
        ctx.fillStyle = fill;
        ctx.fill();
      }
      if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = lineWidth;
        ctx.stroke();
      }
    };

    // 2. 顶部品牌栏
    roundRect(36, 32, 108, 28, 6, "#14171D", "rgba(255, 255, 255, 0.08)");
    ctx.fillStyle = "#38BDF8";
    ctx.font = "bold 12px Inter, sans-serif";
    ctx.fillText("爱看盘 · AI 数据摘要", 48, 51);

    ctx.fillStyle = "#6B7280";
    ctx.font = "12px Inter, sans-serif";
    ctx.textAlign = "right";
    const dateStr = new Date().toISOString().slice(0, 10);
    ctx.fillText(`AI 数据观察记录 · ${dateStr}`, width - 36, 51);
    ctx.textAlign = "left";

    // 3. Hero 核心标的便当盒
    roundRect(36, 76, width - 72, 110, 16, "#101216", "rgba(255, 255, 255, 0.08)");

    // 标的名称与代码
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 26px Inter, sans-serif";
    ctx.fillText(name || code, 58, 122);

    roundRect(58 + ctx.measureText(name || code).width + 12, 102, 80, 24, 6, "#0C0E11", "rgba(255, 255, 255, 0.06)");
    ctx.fillStyle = "#A7B6FA";
    ctx.font = "bold 12px Inter, monospace";
    ctx.fillText(code, 68 + ctx.measureText(name || code).width + 12, 119);

    // 现价与涨跌幅
    ctx.textAlign = "right";
    const priceText = price != null ? String(price) : "--";
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 32px Inter, monospace";
    ctx.fillText(priceText, width - 58, 126);

    const changeVal = typeof changePercent === "number" ? changePercent : parseFloat(String(changePercent || "0"));
    const isUp = changeVal >= 0;
    const changeText = isUp ? `+${changeVal.toFixed(2)}%` : `${changeVal.toFixed(2)}%`;
    const pillColor = isUp ? "#FF5C61" : "#46D993";
    const pillBg = isUp ? "rgba(239, 68, 68, 0.12)" : "rgba(16, 185, 129, 0.12)";

    const pillW = 86;
    roundRect(width - 58 - pillW, 140, pillW, 24, 6, pillBg);
    ctx.fillStyle = pillColor;
    ctx.font = "bold 12px Inter, monospace";
    ctx.fillText(changeText, width - 68, 157);
    ctx.textAlign = "left";

    // 4. 多空评级与能量槽便当盒
    roundRect(36, 204, width - 72, 116, 16, "#101216", "rgba(255, 255, 255, 0.08)");

    const score = report?.score ?? null;
    const statusText = report?.status || (score === null ? "数据不足" : score >= 7 ? "分数偏高" : score <= 4 ? "分数偏低" : "区间震荡");
    const stampColor = score === null ? "#9AA3B2" : score >= 7 ? "#FF5C61" : score <= 4 ? "#46D993" : "#F5A623";

    // 拟态多空图章
    roundRect(58, 226, 110, 32, 8, "rgba(255, 255, 255, 0.04)", stampColor, 1.5);
    ctx.fillStyle = stampColor;
    ctx.font = "bold 14px Inter, sans-serif";
    ctx.fillText(statusText, 80, 248);

    ctx.fillStyle = "#9AA3B2";
    ctx.font = "12px Inter, sans-serif";
    ctx.fillText("AI 综合量化得分", 184, 247);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 24px Inter, monospace";
    ctx.fillText(`${score === null ? "--" : score.toFixed(1)} / 10`, width - 58 - 90, 248);

    // 拟态能量槽 (激光内凹槽)
    roundRect(58, 276, width - 116, 14, 7, "#0C0E11", "rgba(255, 255, 255, 0.04)");
    const fillW = score === null ? 0 : Math.max(16, Math.min(width - 116, ((width - 116) * score) / 10));
    const scoreGrad = ctx.createLinearGradient(58, 276, 58 + fillW, 276);
    scoreGrad.addColorStop(0, "#38BDF8");
    scoreGrad.addColorStop(1, stampColor);
    roundRect(58, 276, fillW, 14, 7, scoreGrad);

    // 5. 关键量化点位三联盒
    roundRect(36, 338, width - 72, 146, 16, "#101216", "rgba(255, 255, 255, 0.08)");

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 14px Inter, sans-serif";
    ctx.fillText("关键量化参考价位", 58, 368);

    const cellW = (width - 116 - 24) / 3;
    // 支撑位
    roundRect(58, 386, cellW, 76, 10, "#0C0E11", "rgba(255, 255, 255, 0.05)");
    ctx.fillStyle = "#9AA3B2";
    ctx.font = "11px Inter, sans-serif";
    ctx.fillText("下方参考价位", 70, 408);
    ctx.fillStyle = "#46D993";
    ctx.font = "bold 16px Inter, monospace";
    ctx.fillText(supportLevel, 70, 434);
    ctx.fillStyle = "#6B7280";
    ctx.font = "10px Inter, sans-serif";
    ctx.fillText("取自公开行情，非操作建议", 70, 452);

    // 压力位
    roundRect(58 + cellW + 12, 386, cellW, 76, 10, "#0C0E11", "rgba(255, 255, 255, 0.05)");
    ctx.fillStyle = "#9AA3B2";
    ctx.font = "11px Inter, sans-serif";
    ctx.fillText("短期第一压力", 70 + cellW + 12, 408);
    ctx.fillStyle = "#FF5C61";
    ctx.font = "bold 16px Inter, monospace";
    ctx.fillText(resistanceLevel, 70 + cellW + 12, 434);
    ctx.fillStyle = "#6B7280";
    ctx.font = "10px Inter, sans-serif";
    ctx.fillText("阻力密集区", 70 + cellW + 12, 452);

    // 风险参考比值
    roundRect(58 + (cellW + 12) * 2, 386, cellW, 76, 10, "#0C0E11", "rgba(255, 255, 255, 0.05)");
    ctx.fillStyle = "#9AA3B2";
    ctx.font = "11px Inter, sans-serif";
    ctx.fillText("风险参考比值", 70 + (cellW + 12) * 2, 408);
    ctx.fillStyle = "#F5A623";
    ctx.font = "bold 16px Inter, monospace";
    ctx.fillText(riskReward, 70 + (cellW + 12) * 2, 434);
    ctx.fillStyle = "#6B7280";
    ctx.font = "10px Inter, sans-serif";
    ctx.fillText("风险参考比值", 70 + (cellW + 12) * 2, 452);

    // 6. 核心数据摘要
    roundRect(36, 502, width - 72, 320, 16, "#101216", "rgba(255, 255, 255, 0.08)");

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 14px Inter, sans-serif";
    ctx.fillText("AI 生成的结构化数据摘要", 58, 534);

    // 一句话总评
    roundRect(58, 552, width - 116, 54, 8, "#14171D", "rgba(255, 255, 255, 0.04)");
    ctx.fillStyle = "#EDEFF3";
    ctx.font = "13px Inter, sans-serif";
    const oneSentence = report?.one_sentence || "本次未生成结构化结论，请稍后重试或改用行情数据自行判断。";
    ctx.fillText(oneSentence.slice(0, 42), 70, 576);
    if (oneSentence.length > 42) {
      ctx.fillText(oneSentence.slice(42, 84), 70, 594);
    }

    // 持仓建议
    ctx.fillStyle = "#38BDF8";
    ctx.font = "bold 13px Inter, sans-serif";
    ctx.fillText("【已持仓视角数据】", 58, 638);
    ctx.fillStyle = "#9AA3B2";
    ctx.font = "12px Inter, sans-serif";
    const holderAdv = report?.holders_advice || "暂无针对已持仓情形的结构化结论，请自行查证并以交易所披露为准。";
    ctx.fillText(holderAdv.slice(0, 45), 58, 660);
    if (holderAdv.length > 45) {
      ctx.fillText(holderAdv.slice(45, 90), 58, 680);
    }

    // 观望建议
    ctx.fillStyle = "#A7B6FA";
    ctx.font = "bold 13px Inter, sans-serif";
    ctx.fillText("【未持仓视角数据】", 58, 718);
    ctx.fillStyle = "#9AA3B2";
    ctx.font = "12px Inter, sans-serif";
    const watcherAdv = report?.watchers_advice || "暂无针对未持仓情形的结构化结论，请自行查证并以交易所披露为准。";
    ctx.fillText(watcherAdv.slice(0, 45), 58, 740);
    if (watcherAdv.length > 45) {
      ctx.fillText(watcherAdv.slice(45, 90), 58, 760);
    }

    // 说明行
    roundRect(58, 782, width - 116, 26, 6, "rgba(56, 189, 248, 0.08)");
    ctx.fillStyle = "#38BDF8";
    ctx.font = "11px Inter, sans-serif";
    ctx.fillText("说明：仓位与资金管理属个人决策范围，本站不提供任何仓位建议", 70, 799);

    // 7. 底部版权与免责水印
    ctx.fillStyle = "#9AA3B2";
    ctx.font = "bold 12px Inter, sans-serif";
    ctx.fillText("本图由 AI 自动生成，数据来自第三方公开接口，可能存在延迟或缺失，仅作个人研究参考", 58, 845);
    ctx.fillText("不构成证券投资建议，不作为任何买卖依据；请勿据此决策或转发给他人作为投资依据", 58, 862);

    ctx.fillStyle = "#9AA3B2";
    ctx.font = "bold 13px Inter, monospace";
    ctx.textAlign = "right";
    ctx.fillText("aikanpan.top", width - 58, 862);
    ctx.textAlign = "left";

    // 导出为高清图片
    const url = canvas.toDataURL("image/png");
    setDataUrl(url);
    setIsRendering(false);
  }, [isOpen, code, name, price, changePercent, report, model, supportLevel, resistanceLevel, riskReward]);

  const handleCopy = async () => {
    if (!dataUrl) return;
    try {
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      await navigator.clipboard.write([
        new ClipboardItem({
          "image/png": blob,
        }),
      ]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 降级为下载
      handleDownload();
    }
  };

  const handleDownload = () => {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `爱看盘_AI数据摘要_${code}_${new Date().toISOString().slice(0, 10)}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative flex max-h-[95vh] w-full max-w-lg flex-col overflow-hidden rounded-[20px] border border-white/[0.12] bg-[#101216] shadow-2xl">
        {/* 标题栏 */}
        <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-sky-400" />
            <h3 className="text-[15px] font-semibold text-white">AI 数据摘要 · 导出图片</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-400 hover:bg-white/[0.08] hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 海报预览视口 */}
        <div className="flex flex-1 items-center justify-center overflow-y-auto p-4 sm:p-6 bg-[#0A0B0D]">
          {isRendering ? (
            <div className="flex h-96 items-center justify-center text-sm text-neutral-400">
              <span className="animate-pulse">正在生成暗黑新拟态体检单...</span>
            </div>
          ) : (
            <img
              src={dataUrl}
              alt="AI 数据摘要图片预览"
              className="max-h-[62vh] w-auto rounded-xl border border-white/[0.08] shadow-2xl transition-transform hover:scale-[1.01]"
            />
          )}
        </div>

        {/* 底部操作按键栏 */}
        <div className="flex items-center justify-between border-t border-white/[0.08] bg-[#14171D] px-5 py-4">
          <span className="text-[12px] text-neutral-400">手机端可长按图片保存到相册</span>
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleCopy}
              disabled={isRendering}
              className="flex min-h-11 sm:min-h-9 items-center gap-1.5 rounded-[10px] border border-white/[0.1] bg-[#1A1D24] px-4 text-[13px] font-medium text-white transition-all hover:bg-white/[0.08] active:scale-[0.98]"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4 text-neutral-300" />}
              <span>{copied ? "已复制到剪贴板" : "复制图片"}</span>
            </button>
            <button
              onClick={handleDownload}
              disabled={isRendering}
              className="flex min-h-11 sm:min-h-9 items-center gap-1.5 rounded-[10px] bg-gradient-to-r from-sky-500 to-indigo-500 px-4 text-[13px] font-semibold text-white shadow-lg shadow-sky-500/20 transition-all hover:opacity-95 active:scale-[0.98]"
            >
              <Download className="h-4 w-4" />
              <span>保存图片</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}