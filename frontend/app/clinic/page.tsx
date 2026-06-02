'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import BookmarkButton, { TopBar } from '../../components/BookmarkButton';

/* ============================================
   类型定义
   ============================================ */
interface ClinicRecommendation {
  productName: string;
  score: number;
  priceRange: string;
  reason: string;
  compromise: string;
}

interface ClinicResult {
  intent: 'recommend';
  userProfile?: string;
  recommendations: ClinicRecommendation[];
}

/* ============================================
   辅助：根据评分返回色阶
   ============================================ */
function scoreColor(score: number): { ring: string; bg: string; text: string; label: string } {
  if (score < 4) return { ring: '#ef4444', bg: '#fef2f2', text: '#dc2626', label: '慎入' };
  if (score < 7) return { ring: '#f59e0b', bg: '#fffbeb', text: '#d97706', label: '谨慎' };
  return { ring: '#10b981', bg: '#ecfdf5', text: '#059669', label: '推荐' };
}

/* ============================================
   骨架屏
   ============================================ */
function SkeletonLoader() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="card-premium">
        <div className="mb-3 h-4 w-20 rounded bg-slate-200" />
        <div className="space-y-2">
          <div className="h-4 w-full rounded bg-slate-200" />
          <div className="h-4 w-3/4 rounded bg-slate-200" />
        </div>
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="card-premium">
          <div className="mb-3 h-5 w-32 rounded bg-slate-200" />
          <div className="mb-2 h-4 w-20 rounded bg-slate-200" />
          <div className="space-y-2">
            <div className="h-4 w-full rounded bg-slate-200" />
            <div className="h-4 w-5/6 rounded bg-slate-200" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ============================================
   空状态
   ============================================ */
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-50 text-2xl shadow-sm ring-1 ring-purple-100">
        💡
      </div>
      <p className="text-sm font-medium text-slate-400">
        描述你的需求，AI 将为你反向推荐最合适的商品
      </p>
      <p className="mt-1 text-xs text-slate-300">
        例如：想给女朋友买个 500 以内的生日礼物，她喜欢简约风
      </p>
    </div>
  );
}

/* ============================================
   离线兜底：AI 不可用时生成本地推荐结果
   ============================================ */
function generateLocalClinicResult(query: string) {
  const hash = query.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const seed = (hash % 100) + 1;
  return {
    intent: 'recommend' as const,
    userProfile: `用户预算约 ¥${(seed * 80 + 500).toLocaleString()}，追求性价比，注重实用性和品质的平衡`,
    recommendations: [
      {
        productName: `${query} 推荐款 A`,
        score: 6 + (seed % 4),
        priceRange: `¥${(seed * 50 + 800).toLocaleString()} - ¥${(seed * 100 + 2000).toLocaleString()}`,
        reason: '综合性能均衡，口碑稳定，适合大多数使用场景。在同类产品中性价比表现突出，售后服务体系完善。',
        compromise: '部分高端功能缺失，外观设计偏保守，品牌溢价相对较低但品控偶尔有波动。',
      },
      {
        productName: `${query} 推荐款 B`,
        score: 5 + (seed % 3),
        priceRange: `¥${(seed * 30 + 400).toLocaleString()} - ¥${(seed * 60 + 1200).toLocaleString()}`,
        reason: '入门门槛低，基础功能齐全，适合预算有限或初次尝试的用户群体。',
        compromise: '材质和做工一般，长期使用的耐用性存疑，升级空间有限。',
      },
      {
        productName: `${query} 进阶推荐`,
        score: 7 + (seed % 3),
        priceRange: `¥${(seed * 100 + 2000).toLocaleString()} - ¥${(seed * 150 + 4500).toLocaleString()}`,
        reason: '旗舰体验，各项指标领先，适合对品质有较高要求且预算充足的用户。',
        compromise: '价格溢价明显，部分功能日常用不到，存在"买得起用不全"的可能。',
      },
    ],
  };
}

export default function ClinicPage() {
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState(500);
  const [submittedQuery, setSubmittedQuery] = useState('');

  // 分析状态（直接 fetch + 状态管理，不再依赖 experimental_useObject）
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ClinicResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isFallback, setIsFallback] = useState(false); // 是否使用了离线兜底

  // AI 追问状态
  const [followUpStep, setFollowUpStep] = useState(0);
  const [followUpAnswers, setFollowUpAnswers] = useState<string[]>([]);
  const [followUpLoading, setFollowUpLoading] = useState(false);
  const [dynamicQuestions, setDynamicQuestions] = useState<{ question: string; options: string[] }[]>([]);
  const [analyzingBridge, setAnalyzingBridge] = useState(false);

  const resultsRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // ==================== 核心分析函数 ====================
  const callAnalysisAPI = async (prompt: string): Promise<ClinicResult> => {
    // 取消之前的请求
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s超时（后端45s+重试）

    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: prompt }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`服务器返回 ${res.status}`);
      }

      const json = await res.json();

      if (json.error) {
        throw new Error(json.error);
      }

      if (json.status !== 'done' || !json.data) {
        throw new Error('AI 返回数据不完整');
      }

      // 验证返回的数据
      const data = json.data;
      if (!data || data.intent !== 'recommend' || !Array.isArray(data.recommendations) || data.recommendations.length === 0) {
        throw new Error('AI 推荐结果格式异常');
      }

      return data as ClinicResult;
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err?.name === 'AbortError') {
        throw new Error('请求超时，AI 服务响应过慢');
      }
      throw err;
    }
  };

  // ==================== 追问 API ====================
  const requestFollowUp = async (query: string) => {
    setFollowUpLoading(true);
    try {
      const res = await fetch('/api/follow-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, budget }),
      });
      if (!res.ok) {
        console.warn(`[Clinic] 追问接口异常 HTTP ${res.status}，跳过追问直接分析`);
        doFinalSubmit(query, []);
        return;
      }
      const data = await res.json();
      if (data.questions && data.questions.length > 0) {
        setDynamicQuestions(data.questions);
        setFollowUpStep(1);
      } else {
        doFinalSubmit(query, []);
      }
    } catch (err) {
      console.warn('[Clinic] 追问请求失败:', err instanceof Error ? err.message : err);
      doFinalSubmit(query, []);
    } finally {
      setFollowUpLoading(false);
    }
  };

  // ==================== 最终提交 ====================
  const doFinalSubmit = async (query: string, answers: string[]) => {
    setAnalyzingBridge(true);
    setError(null);
    setIsFallback(false);
    setIsLoading(true);

    const qaText = answers.length > 0 && dynamicQuestions.length > 0
      ? `\n追问回答：${dynamicQuestions.map((dq, i) => {
          const idx = parseInt(answers[i] || '0');
          return `Q${i + 1}: ${dq.question} → A: ${dq.options[idx] ?? '未回答'}`;
        }).join('\n')}`
      : '';

    const prompt = `【选品诊所模式】以下是一位用户的自然语言需求描述，请你：

1. 提取用户画像（预算: ¥${budget}、使用场景、偏好、痛点等）
2. 根据需求反向推荐 3-5 款最匹配的商品
3. 每款商品必须诚实列出"核心妥协点 / 坑点"，不得回避

用户需求："${query}"${qaText}

请使用 intent='recommend' 模式输出结果。`;

    try {
      const data = await callAnalysisAPI(prompt);
      setResult(data);
      setAnalyzingBridge(false);
    } catch (err: any) {
      const msg = err?.message || String(err);
      console.error('[Clinic] AI 分析失败:', msg);

      // 尝试离线兜底
      if (!result) {
        const localData = generateLocalClinicResult(query);
        setResult(localData);
        setIsFallback(true);
      } else {
        setError(msg);
      }
      setAnalyzingBridge(false);
    } finally {
      setIsLoading(false);
    }

    setFollowUpStep(0);
    setFollowUpAnswers([]);
    setDynamicQuestions([]);
  };

  // ==================== 停止分析 ====================
  const handleStop = () => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setIsLoading(false);
    setAnalyzingBridge(false);
  };

  // ==================== 提交入口 ====================
  const handleSubmit = () => {
    const trimmed = description.trim();
    if (!trimmed || trimmed.length < 5) return;

    if (followUpStep === 0) {
      setSubmittedQuery(trimmed);
      requestFollowUp(trimmed);
      return;
    }
  };

  // ==================== 滚动到结果 ====================
  useEffect(() => {
    if (result && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [result]);

  // ==================== 渲染推荐结果 ====================
  const renderRecommendations = () => {
    if (!result || result.intent !== 'recommend') return null;

    const recs = result.recommendations || [];
    // 防御：如果 AI 返回的 recommendations 为空或格式异常，不渲染
    if (!Array.isArray(recs) || recs.length === 0) return null;
    const profile = result.userProfile;

    return (
      <div ref={resultsRef} className="space-y-6 animate-fade-in-up">
        {/* 用户画像卡片 */}
        {profile && (
          <div className="rounded-2xl border border-purple-100 bg-purple-50/50 p-6 shadow-sm">
            <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-purple-500">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
              用户画像
            </h3>
            <p className="text-sm leading-relaxed text-slate-700">{profile}</p>
          </div>
        )}

        {/* 推荐卡片 */}
        <div>
          <h3 className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
            </svg>
            AI 推荐清单
            <span className="rounded-full bg-slate-100 px-2 text-xs font-normal text-slate-500">
              {recs.length} 款
            </span>
          </h3>

          {/* 桌面端横向滚动 */}
          <div className="hidden sm:flex sm:gap-4 sm:overflow-x-auto sm:pb-2">
            {recs.map((rec, i) => {
              const s = typeof rec?.score === 'number' ? rec.score : null;
              const c = s !== null ? scoreColor(s) : null;

              return (
                <div
                  key={i}
                  className="flex w-[300px] shrink-0 flex-col rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-shadow hover:shadow-md"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white">
                        {i + 1}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 leading-tight">
                        {rec?.productName ?? '...'}
                      </h4>
                    </div>
                    {s !== null && c && (
                      <span
                        className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold"
                        style={{ backgroundColor: c.bg, color: c.text }}
                      >
                        {s.toFixed(1)}
                      </span>
                    )}
                    {s === null && (
                      <span className="h-5 w-9 animate-pulse rounded-full bg-slate-100" />
                    )}
                  </div>

                  {rec?.priceRange && (
                    <p className="mb-2 text-xs font-medium text-slate-400">{rec.priceRange}</p>
                  )}

                  {rec?.reason && (
                    <div className="mb-3 rounded-xl bg-emerald-50 px-3 py-2.5">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-500">
                        👍 推荐理由
                      </p>
                      <p className="mt-0.5 text-xs leading-relaxed text-emerald-800">{rec.reason}</p>
                    </div>
                  )}

                  {rec?.compromise && (
                    <div className="mt-auto rounded-xl border border-red-100 bg-red-50 px-3 py-2.5">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-red-400">
                        ⚠ 核心妥协点
                      </p>
                      <p className="mt-0.5 text-xs leading-relaxed text-red-700">{rec.compromise}</p>
                    </div>
                  )}

                  {!rec?.reason && (
                    <div className="space-y-2">
                      <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
                      <div className="h-4 w-3/4 animate-pulse rounded bg-slate-100" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* 移动端垂直堆叠 */}
          <div className="space-y-3 sm:hidden">
            {recs.map((rec, i) => {
              const s = typeof rec?.score === 'number' ? rec.score : null;
              const c = s !== null ? scoreColor(s) : null;

              return (
                <div key={i} className="card-premium">
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white">
                        {i + 1}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900">
                        {rec?.productName ?? '...'}
                      </h4>
                    </div>
                    {s !== null && c && (
                      <span
                        className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold"
                        style={{ backgroundColor: c.bg, color: c.text }}
                      >
                        {s.toFixed(1)}
                      </span>
                    )}
                  </div>
                  {rec?.priceRange && <p className="mb-2 text-xs text-slate-400">{rec.priceRange}</p>}
                  {rec?.reason && (
                    <div className="mb-2 rounded-xl bg-emerald-50 px-3 py-1.5">
                      <p className="text-xs text-emerald-700">{rec.reason}</p>
                    </div>
                  )}
                  {rec?.compromise && (
                    <div className="rounded-xl bg-red-50 px-3 py-1.5">
                      <p className="text-[10px] font-semibold text-red-400">⚠ 妥协点</p>
                      <p className="mt-0.5 text-xs text-red-700">{rec.compromise}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const hasResult = result?.intent === 'recommend';

  return (
    <main className="flex flex-1 flex-col items-center px-4 pt-16">
      {/* ===== 顶部导航：返回 + 收藏 ===== */}
      <div className="w-full max-w-4xl">
        <TopBar
          backLabel="← 返回首页"
          showBookmark={hasResult}
          bookmarkName={`选品推荐: ${description.slice(0, 30)}`}
          bookmarkUrl={`/clinic?q=${encodeURIComponent(description)}`}
          bookmarkType="clinic"
        />
      </div>

      {/* ===== 页面标题区 ===== */}
      <section className="mb-8 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-50 text-3xl shadow-sm ring-1 ring-purple-100">
          💡
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">AI 选品诊所</h1>
        <p className="mt-2 text-sm font-medium text-slate-500">
          用自然语言描述你的需求，AI 反向推荐最匹配的商品
        </p>
        <p className="mt-0.5 text-xs text-slate-400">
          不盲目种草，每款推荐都诚实列出妥协点
        </p>
        <div className="mx-auto mt-4 w-10 border-t-2 border-purple-400" />
      </section>

      {/* ===== 输入区 ===== */}
      <div className="w-full max-w-2xl">
        <div className="card-input overflow-hidden p-0">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder={
              hasResult
                ? '试试换一种需求描述？'
                : '描述你的需求...\n\n例如：\n- 预算 2000 以内，想要一个降噪好的无线耳机，主要通勤用\n- 想给家里老人买一台操作简单的空气炸锅，预算 300\n- 我是摄影新手，想买第一台微单，预算 8000 左右'
            }
            rows={hasResult ? 3 : 5}
            maxLength={500}
            className="w-full resize-none bg-transparent px-5 py-4 text-sm leading-relaxed text-slate-900 placeholder-slate-400 outline-none"
            disabled={isLoading}
          />

          {/* 预算滑块 */}
          <div className="border-t border-slate-50 px-5 py-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-medium text-slate-500">💰 预算范围</span>
              <span className="text-sm font-bold text-slate-900">¥{budget.toLocaleString()}</span>
            </div>
            <input type="range" min={0} max={10000} step={100} value={budget} onChange={(e) => setBudget(Number(e.target.value))} className="w-full h-1.5 rounded-full appearance-none bg-slate-200 cursor-pointer" style={{ accentColor: '#8b5cf6' }} />
            <div className="flex justify-between mt-0.5">
              <span className="text-[9px] text-slate-400">¥0</span>
              <span className="text-[9px] text-slate-400">¥10,000</span>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-slate-50 bg-slate-50/50 px-4 py-2.5">
            <span className="text-xs text-slate-400">
              {description.length}/500 · Ctrl+Enter 发送
            </span>
            <div className="flex items-center gap-2">
              {isLoading && (
                <button
                  type="button"
                  onClick={handleStop}
                  className="rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:border-red-300 hover:text-red-500"
                >
                  停止
                </button>
              )}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isLoading || description.trim().length < 5}
                className="rounded-lg bg-purple-600 px-5 py-1.5 text-xs font-semibold text-white transition-all hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {isLoading ? (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    分析中...
                  </span>
                ) : (
                  '开始分析'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* AI 动态追问面板 */}
      {followUpStep > 0 && followUpStep <= dynamicQuestions.length && !hasResult && !followUpLoading && (
        <div className="mt-6 w-full max-w-2xl animate-fade-in-up">
          <div className="rounded-2xl border border-purple-200 bg-purple-50/50 p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-purple-500 text-white text-xs font-bold">{followUpStep}</span>
              <span className="text-xs font-semibold text-purple-700">AI 追问（{followUpStep}/{dynamicQuestions.length}）</span>
              <span className="ml-auto text-[10px] text-purple-400">基于你的需求智能生成</span>
            </div>
            <p className="text-sm font-bold text-slate-800 mb-3">{dynamicQuestions[followUpStep - 1]?.question}</p>
            <div className="flex flex-wrap gap-2">
              {(dynamicQuestions[followUpStep - 1]?.options || []).map((ans, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    const newAnswers = [...followUpAnswers, String(i)];
                    if (followUpStep >= dynamicQuestions.length) {
                      setFollowUpAnswers(newAnswers);
                      setFollowUpStep(99);
                      setTimeout(() => {
                        doFinalSubmit(submittedQuery, newAnswers);
                      }, 300);
                    } else {
                      setFollowUpAnswers(newAnswers);
                      setFollowUpStep(followUpStep + 1);
                    }
                  }}
                  className="rounded-full border border-purple-200 bg-white px-4 py-2 text-xs font-medium text-purple-600 transition-all hover:bg-purple-100 hover:border-purple-300 hover:shadow-sm"
                >
                  {ans}
                </button>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-2 border-t border-purple-100 pt-3">
              {followUpStep > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    setFollowUpStep(followUpStep - 1);
                    setFollowUpAnswers(followUpAnswers.slice(0, -1));
                  }}
                  className="text-xs text-purple-400 hover:text-purple-600 transition-colors"
                >
                  ← 返回上一题
                </button>
              )}
              <button
                type="button"
                onClick={() => doFinalSubmit(submittedQuery, followUpAnswers)}
                className="ml-auto rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-700"
              >
                跳过追问，直接分析 →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 追问加载中 */}
      {followUpLoading && !hasResult && (
        <div className="mt-6 w-full max-w-2xl animate-fade-in-up">
          <div className="rounded-2xl border border-purple-100 bg-purple-50/30 p-6 text-center">
            <div className="mx-auto mb-3 h-6 w-6 animate-spin rounded-full border-2 border-purple-200 border-t-purple-500" />
            <p className="text-sm font-medium text-purple-600">AI 正在理解你的需求...</p>
            <p className="mt-1 text-xs text-purple-400">分析语义并生成精准追问</p>
          </div>
        </div>
      )}

      {/* ===== 提示示例 ===== */}
      {!hasResult && !isLoading && followUpStep === 0 && (
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {[
            '预算1500以内的降噪耳机',
            '适合新手的入门微单',
            '送给妈妈的生日礼物500以内',
            '不伤发质的吹风机推荐',
            '学生党性价比笔记本电脑',
            '颜值高又好用的空气炸锅',
          ].map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => setDescription(suggestion)}
              className="rounded-full border border-slate-100 bg-white px-3 py-1 text-xs text-slate-500 shadow-sm transition-all hover:border-purple-200 hover:text-purple-600 hover:shadow-md"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {/* ===== 离线兜底警告横幅 ===== */}
      {isFallback && hasResult && (
        <div className="mt-6 w-full max-w-2xl rounded-2xl border border-amber-200 bg-amber-50/80 p-4">
          <p className="text-xs font-medium text-amber-700">
            ⚠️ AI 服务暂时不可用，当前展示的是基于通用消费经验的模拟推荐，仅供参考。
          </p>
        </div>
      )}

      {/* ===== 错误提示 ===== */}
      {error && !hasResult && (
        <div className="mt-8 w-full max-w-2xl rounded-2xl border border-red-200 bg-red-50 p-5 text-center">
          <p className="text-sm font-semibold text-red-700">分析失败</p>
          <p className="mt-1 text-xs text-red-500">{error}</p>
          <button
            type="button"
            onClick={handleSubmit}
            className="mt-3 rounded-md bg-red-500 px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-600"
          >
            重新分析
          </button>
        </div>
      )}

      {/* ===== 结果区 ===== */}
      <div className="mt-8 w-full max-w-4xl">
        {(isLoading || analyzingBridge) && !hasResult && <SkeletonLoader />}
        {!isLoading && !hasResult && !error && !submittedQuery && <EmptyState />}
        {renderRecommendations()}
        {(isLoading || analyzingBridge) && hasResult && (
          <div className="mb-4 h-1 w-full overflow-hidden rounded-full bg-purple-100">
            <div className="h-full animate-progress-bar rounded-full bg-purple-400" />
          </div>
        )}
      </div>

      {/* 底部导航 */}
      <div className="mt-12 mb-8 flex items-center gap-4">
        <Link href="/" className="text-xs font-medium text-slate-400 transition-colors hover:text-purple-500">
          ← 返回单品检测
        </Link>
        <span className="text-slate-200">|</span>
        <Link href="/compare" className="text-xs font-medium text-slate-400 transition-colors hover:text-purple-500">
          1v1 对比
        </Link>
        <span className="text-slate-200">|</span>
        <Link href="/blacklist" className="text-xs font-medium text-slate-400 transition-colors hover:text-purple-500">
          智商税黑榜
        </Link>
      </div>

      <p className="mb-8 text-center text-xs font-medium text-slate-300">
        本实验室独立运营，不收取任何商家佣金，分析结果仅供参考。
      </p>
    </main>
  );
}
