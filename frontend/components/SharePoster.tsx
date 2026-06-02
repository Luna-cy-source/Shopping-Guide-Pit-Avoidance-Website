'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import html2canvas from 'html2canvas';

// ============================================
// 分享海报组件 v2 — 精致卡片风格
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
  if (score < 4) return { bg: '#fef2f2', text: '#dc2626', border: '#fca5a5', label: '慎入', ring: '#ef4444', gradient: 'linear-gradient(135deg, #fecaca 0%, #fee2e2 100%)' };
  if (score < 7) return { bg: '#fffbeb', text: '#d97706', border: '#fcd34d', label: '谨慎', ring: '#f59e0b', gradient: 'linear-gradient(135deg, #fde68a 0%, #fef3c7 100%)' };
  return { bg: '#ecfdf5', text: '#059669', border: '#6ee7b7', label: '推荐', ring: '#10b981', gradient: 'linear-gradient(135deg, #a7f3d0 0%, #d1fae5 100%)' };
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

  const close = useCallback(() => {
    setOpen(false);
    setCapturing(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, close]);

  const handleCapture = useCallback(async () => {
    if (!posterRef.current) return;
    setCapturing(true);
    try {
      const canvas = await html2canvas(posterRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        logging: false,
      });
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
      {/* 触发按钮 */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl border-2 border-red-200 bg-white px-6 py-3 text-sm font-bold text-red-500 shadow-sm transition-all hover:border-red-400 hover:bg-red-50 hover:shadow-md active:scale-95"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933-2.185z" />
        </svg>
        生成分享海报
      </button>

      {/* 弹窗 */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm"
          onClick={close}
        >
          <div
            className="relative my-8 w-full max-w-lg rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={close}
              className="absolute -right-3 -top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-gray-800 text-white shadow-lg transition-transform hover:scale-110"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="overflow-auto rounded-t-2xl bg-gray-100 p-4">
              <p className="mb-3 text-center text-xs text-gray-400">
                海报预览 · 点击下方按钮保存图片
              </p>
              <div className="flex justify-center">
                <div
                  ref={posterRef}
                  style={{
                    width: 375,
                    backgroundColor: '#fff',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans SC", sans-serif',
                    overflow: 'hidden',
                    borderRadius: 16,
                    boxShadow: '0 8px 40px rgba(0,0,0,0.12)',
                  }}
                >
                  {/* ===== 渐变头部 ===== */}
                  <div style={{
                    background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 50%, #7f1d1d 100%)',
                    padding: '28px 24px 24px',
                    color: '#fff',
                    position: 'relative',
                    overflow: 'hidden',
                  }}>
                    {/* 装饰圆圈 */}
                    <div style={{
                      position: 'absolute',
                      top: -30,
                      right: -20,
                      width: 120,
                      height: 120,
                      borderRadius: '50%',
                      backgroundColor: 'rgba(255,255,255,0.06)',
                    }} />
                    <div style={{
                      position: 'absolute',
                      bottom: -20,
                      left: -10,
                      width: 80,
                      height: 80,
                      borderRadius: '50%',
                      backgroundColor: 'rgba(255,255,255,0.04)',
                    }} />

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, position: 'relative', zIndex: 1 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 3, opacity: 0.85 }}>
                        ⚠ AI 独立检测实验室
                      </span>
                    </div>
                    <h2 style={{
                      fontSize: 22,
                      fontWeight: 900,
                      lineHeight: 1.3,
                      margin: 0,
                      wordBreak: 'break-all',
                      position: 'relative',
                      zIndex: 1,
                      textShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    }}>
                      「{productName}」
                    </h2>
                    <div style={{
                      display: 'inline-block',
                      marginTop: 8,
                      padding: '3px 14px',
                      borderRadius: 20,
                      fontSize: 13,
                      fontWeight: 800,
                      backgroundColor: 'rgba(255,255,255,0.2)',
                      backdropFilter: 'blur(4px)',
                      position: 'relative',
                      zIndex: 1,
                    }}>
                      避坑报告
                    </div>
                    <p style={{ fontSize: 10, marginTop: 10, opacity: 0.65, position: 'relative', zIndex: 1 }}>
                      客观中立 · 不恰饭 · {formatDate()}
                    </p>
                  </div>

                  {/* ===== 评分区 — 大气设计 ===== */}
                  <div style={{
                    padding: '22px 24px',
                    background: style.gradient,
                    borderBottom: `2px solid ${style.border}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 18,
                  }}>
                    {/* 分数圆环 */}
                    <div style={{
                      width: 82,
                      height: 82,
                      borderRadius: '50%',
                      backgroundColor: '#fff',
                      border: `3.5px solid ${style.ring}`,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                    }}>
                      <span style={{ fontSize: 28, fontWeight: 950, color: style.text, lineHeight: 1, letterSpacing: -1 }}>
                        {score.toFixed(1)}
                      </span>
                      <span style={{ fontSize: 9, color: style.text, opacity: 0.55, marginTop: -2 }}>
                        / 10
                      </span>
                    </div>
                    {/* 评语 */}
                    <div style={{ flex: 1 }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '3px 14px',
                        borderRadius: 20,
                        fontSize: 13,
                        fontWeight: 800,
                        color: '#fff',
                        backgroundColor: style.ring,
                        boxShadow: `0 2px 8px ${style.ring}33`,
                      }}>
                        {style.label}
                      </span>
                      <p style={{ fontSize: 11.5, color: '#4b5563', marginTop: 7, lineHeight: 1.55, fontWeight: 500 }}>
                        {score < 4 ? '综合不建议购买，风险较高' : score < 7 ? '综合需谨慎决策，有亮点也有槽点' : '综合可以考虑入手'}
                      </p>
                    </div>
                  </div>

                  {/* ===== 坑点列表 ===== */}
                  <div style={{ padding: '20px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                      <div style={{
                        width: 4, height: 16, borderRadius: 2,
                        backgroundColor: '#dc2626',
                      }} />
                      <span style={{ fontSize: 15, fontWeight: 800, color: '#111827' }}>核心坑点</span>
                      <span style={{
                        fontSize: 9.5,
                        backgroundColor: '#fef2f2',
                        color: '#dc2626',
                        padding: '2px 10px',
                        borderRadius: 10,
                        fontWeight: 700,
                        letterSpacing: 0.5,
                      }}>
                        TOP {topFlaws.length}
                      </span>
                    </div>

                    {topFlaws.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {topFlaws.map((flaw, i) => (
                          <div key={i} style={{
                            display: 'flex',
                            gap: 12,
                            alignItems: 'flex-start',
                          }}>
                            <span style={{
                              width: 24,
                              height: 24,
                              borderRadius: '50%',
                              backgroundColor: i === 0 ? '#dc2626' : i === 1 ? '#f97316' : '#eab308',
                              color: '#fff',
                              fontSize: 11.5,
                              fontWeight: 800,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              marginTop: 1,
                              boxShadow: `0 2px 8px ${
                                i === 0 ? 'rgba(220,38,38,0.3)' : i === 1 ? 'rgba(249,115,22,0.3)' : 'rgba(234,179,8,0.3)'
                              }`,
                            }}>
                              {i + 1}
                            </span>
                            <div style={{ flex: 1, paddingTop: 1 }}>
                              <p style={{
                                fontSize: 13.5,
                                fontWeight: 700,
                                color: '#1f2937',
                                margin: 0,
                                lineHeight: 1.45,
                              }}>
                                {flaw.title}
                              </p>
                              {flaw.analysis && (
                                <p style={{
                                  fontSize: 11,
                                  color: '#6b7280',
                                  lineHeight: 1.65,
                                  marginTop: 4,
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
                      <p style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center', padding: '20px 0' }}>数据加载中...</p>
                    )}
                  </div>

                  {/* ===== 底部栏 ===== */}
                  <div style={{
                    borderTop: '1px solid #f3f4f6',
                    margin: '0 24px',
                  }} />
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 24px 20px',
                    backgroundColor: '#fafafa',
                  }}>
                    <div>
                      <p style={{
                        fontSize: 13,
                        fontWeight: 800,
                        color: '#111827',
                        margin: 0,
                        letterSpacing: 0.5,
                      }}>
                        AI 避坑导购
                      </p>
                      <p style={{
                        fontSize: 10,
                        color: '#9ca3af',
                        margin: '3px 0 0',
                        letterSpacing: 0.3,
                      }}>
                        扫码测一测 · 你的下一笔消费
                      </p>
                    </div>
                    <div style={{
                      width: 44,
                      height: 44,
                      backgroundColor: '#1f2937',
                      borderRadius: 10,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    }}>
                      <svg width="26" height="26" viewBox="0 0 28 28" fill="none">
                        <rect x="2" y="2" width="8" height="8" rx="1.5" fill="#fff" />
                        <rect x="3" y="3" width="6" height="6" rx="0.5" fill="#1f2937" />
                        <rect x="18" y="2" width="8" height="8" rx="1.5" fill="#fff" />
                        <rect x="19" y="3" width="6" height="6" rx="0.5" fill="#1f2937" />
                        <rect x="2" y="18" width="8" height="8" rx="1.5" fill="#fff" />
                        <rect x="3" y="19" width="6" height="6" rx="0.5" fill="#1f2937" />
                        <rect x="12" y="12" width="4" height="4" rx="1" fill="#fff" />
                        <rect x="18" y="18" width="4" height="4" rx="0.5" fill="#fff" />
                        <rect x="19" y="19" width="2" height="2" rx="0.3" fill="#1f2937" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 操作栏 */}
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

            <p className="px-6 pb-4 text-center text-[11px] text-gray-400">
              支持分享到小红书、微信朋友圈等社交平台
            </p>
          </div>
        </div>
      )}
    </>
  );
}
