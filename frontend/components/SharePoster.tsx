'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import html2canvas from 'html2canvas';

// ============================================
// 分享海报组件
// 一键生成美观避坑海报，用于小红书/微信朋友圈分享
// ============================================

interface FlawItem {
  title: string;
  analysis?: string;
}

interface SharePosterProps {
  productName: string;
  score: number;
  flaws: FlawItem[];
  query: string;
}

// ---- 评分配色 ----
function scoreStyle(score: number) {
  if (score < 4) return { bg: '#fef2f2', text: '#dc2626', border: '#fca5a5', label: '慎入', ring: '#ef4444' };
  if (score < 7) return { bg: '#fffbeb', text: '#d97706', border: '#fcd34d', label: '谨慎', ring: '#f59e0b' };
  return { bg: '#ecfdf5', text: '#059669', border: '#6ee7b7', label: '推荐', ring: '#10b981' };
}

// ---- 格式化日期 ----
function formatDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}.${m}.${d}`;
}

export default function SharePoster({ productName, score, flaws, query }: SharePosterProps) {
  const [open, setOpen] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const posterRef = useRef<HTMLDivElement>(null);
  const style = scoreStyle(score);

  // top 3 flaws only
  const topFlaws = flaws.slice(0, 3);

  // 关弹窗时重置
  const close = useCallback(() => {
    setOpen(false);
    setCapturing(false);
  }, []);

  // 按 ESC 关闭
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, close]);

  // 截取海报
  const handleCapture = useCallback(async () => {
    if (!posterRef.current) return;
    setCapturing(true);

    try {
      const canvas = await html2canvas(posterRef.current, {
        backgroundColor: '#ffffff',
        scale: 2, // 2x 高清
        useCORS: true,
        logging: false,
      });

      // 触发下载
      const link = document.createElement('a');
      link.download = `避坑报告_${productName}_${formatDate()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('[海报] 生成失败:', err);
      alert('海报生成失败，请重试');
    } finally {
      setCapturing(false);
    }
  }, [productName]);

  return (
    <>
      {/* ===== 触发按钮 ===== */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl border-2 border-red-200 bg-white px-6 py-3 text-sm font-bold text-red-500 shadow-sm transition-all hover:border-red-400 hover:bg-red-50 hover:shadow-md active:scale-95"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
        </svg>
        生成分享海报
      </button>

      {/* ===== 弹窗：预览 + 下载 ===== */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm"
          onClick={close}
        >
          <div
            className="relative my-8 w-full max-w-lg rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 关闭按钮 */}
            <button
              type="button"
              onClick={close}
              className="absolute -right-3 -top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-gray-800 text-white shadow-lg transition-transform hover:scale-110"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* 预览区域 — 缩放展示 */}
            <div className="overflow-auto rounded-t-2xl bg-gray-100 p-4">
              <p className="mb-3 text-center text-xs text-gray-400">
                海报预览 · 点击下方按钮保存图片
              </p>

              <div className="flex justify-center">
                {/* 海报 DOM — html2canvas 截图目标 */}
                <div
                  ref={posterRef}
                  style={{
                    width: 375, // 375*2=750，契合手机宽度
                    backgroundColor: '#fff',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans SC", sans-serif',
                    overflow: 'hidden',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
                    borderRadius: 12,
                  }}
                >
                  {/* ===== 顶部红色横幅 ===== */}
                  <div style={{ backgroundColor: '#dc2626', padding: '24px 20px 20px', color: '#fff' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, opacity: 0.9 }}>
                        ⚠ AI 独立检测实验室
                      </span>
                    </div>
                    <h2 style={{
                      fontSize: 20,
                      fontWeight: 800,
                      lineHeight: 1.3,
                      letterSpacing: 1,
                      margin: 0,
                      wordBreak: 'break-all',
                    }}>
                      「{productName}」
                      <br />
                      避坑报告
                    </h2>
                    <p style={{ fontSize: 11, marginTop: 6, opacity: 0.75 }}>
                      客观中立 · 不恰饭 · {formatDate()}
                    </p>
                  </div>

                  {/* ===== 评分大圆 ===== */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    padding: '20px',
                    backgroundColor: style.bg,
                    borderBottom: `3px solid ${style.border}`,
                  }}>
                    <div style={{
                      width: 76,
                      height: 76,
                      borderRadius: '50%',
                      backgroundColor: '#fff',
                      border: `4px solid ${style.ring}`,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <span style={{ fontSize: 26, fontWeight: 900, color: style.text, lineHeight: 1 }}>
                        {score.toFixed(1)}
                      </span>
                      <span style={{ fontSize: 9, color: style.text, opacity: 0.7 }}>
                        / 10
                      </span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 12px',
                        borderRadius: 20,
                        fontSize: 13,
                        fontWeight: 800,
                        color: '#fff',
                        backgroundColor: style.ring,
                      }}>
                        {style.label}
                      </span>
                      <p style={{ fontSize: 11, color: '#6b7280', marginTop: 6, lineHeight: 1.5 }}>
                        综合{score < 4 ? '不建议购买' : score < 7 ? '需谨慎决策' : '可以考虑入手'}
                      </p>
                    </div>
                  </div>

                  {/* ===== 坑点列表 ===== */}
                  <div style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
                      <span style={{ fontSize: 14, fontWeight: 800, color: '#dc2626' }}>🔴 核心坑点</span>
                      <span style={{
                        fontSize: 10,
                        backgroundColor: '#fef2f2',
                        color: '#dc2626',
                        padding: '1px 8px',
                        borderRadius: 10,
                        fontWeight: 600,
                      }}>
                        TOP {topFlaws.length}
                      </span>
                    </div>

                    {topFlaws.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {topFlaws.map((flaw, i) => (
                          <div key={i} style={{
                            display: 'flex',
                            gap: 10,
                            alignItems: 'flex-start',
                          }}>
                            <span style={{
                              width: 22,
                              height: 22,
                              borderRadius: '50%',
                              backgroundColor: '#fef2f2',
                              color: '#dc2626',
                              fontSize: 12,
                              fontWeight: 800,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              marginTop: 1,
                            }}>
                              {i + 1}
                            </span>
                            <div style={{ flex: 1 }}>
                              <p style={{
                                fontSize: 13,
                                fontWeight: 700,
                                color: '#1f2937',
                                margin: 0,
                                lineHeight: 1.4,
                              }}>
                                {flaw.title}
                              </p>
                              {flaw.analysis && (
                                <p style={{
                                  fontSize: 11,
                                  color: '#6b7280',
                                  lineHeight: 1.6,
                                  marginTop: 3,
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden',
                                } as React.CSSProperties}>
                                  {flaw.analysis}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ fontSize: 11, color: '#9ca3af' }}>数据加载中...</p>
                    )}
                  </div>

                  {/* ===== 底部水印 ===== */}
                  <div style={{
                    borderTop: '1px dashed #e5e7eb',
                    margin: '0 20px',
                  }} />
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 20px',
                    backgroundColor: '#f9fafb',
                  }}>
                    {/* 左侧文字 */}
                    <div>
                      <p style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: '#374151',
                        margin: 0,
                        letterSpacing: 0.5,
                      }}>
                        AI 避坑导购
                      </p>
                      <p style={{
                        fontSize: 10,
                        color: '#9ca3af',
                        margin: '2px 0 0',
                      }}>
                        扫码测一测 · 你的下一笔消费
                      </p>
                    </div>

                    {/* 右侧伪二维码 */}
                    <div style={{
                      width: 48,
                      height: 48,
                      backgroundColor: '#1f2937',
                      borderRadius: 8,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      {/* 简易 QR 占位图案 */}
                      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                        <rect x="2" y="2" width="8" height="8" rx="1" fill="#fff" />
                        <rect x="3" y="3" width="6" height="6" rx="0.5" fill="#1f2937" />
                        <rect x="18" y="2" width="8" height="8" rx="1" fill="#fff" />
                        <rect x="19" y="3" width="6" height="6" rx="0.5" fill="#1f2937" />
                        <rect x="2" y="18" width="8" height="8" rx="1" fill="#fff" />
                        <rect x="3" y="19" width="6" height="6" rx="0.5" fill="#1f2937" />
                        <rect x="12" y="12" width="4" height="4" rx="1" fill="#fff" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ===== 底部操作 ===== */}
            <div className="flex items-center gap-3 border-t border-gray-100 px-6 py-4">
              <button
                type="button"
                onClick={close}
                className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-500 transition-colors hover:bg-gray-50"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleCapture}
                disabled={capturing}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-500 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-red-600 active:scale-[0.98] disabled:opacity-60"
              >
                {capturing ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    生成中...
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                    保存海报图片
                  </>
                )}
              </button>
            </div>

            {/* 提示 */}
            <p className="px-6 pb-4 text-center text-[11px] text-gray-400">
              支持分享到小红书、微信朋友圈等社交平台
            </p>
          </div>
        </div>
      )}
    </>
  );
}
