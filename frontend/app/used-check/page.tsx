'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { experimental_useObject } from 'ai/react';
import { apiUrl } from '../../lib/api';
import { LLMResponseSchema, LLMResponse } from '../../lib/schema';
import Link from 'next/link';

/* ============================================
   类型：从 Schema 直接推导
   ============================================ */
type UsedMarketResult = Extract<LLMResponse, { intent: 'used_market' }>;

/* ============================================
   风险等级色系
   ============================================ */
const RISK_STYLES: Record<string, { ring: string; bg: string; text: string; icon: string }> = {
  '极高': { ring: 'border-red-400', bg: 'bg-red-50', text: 'text-red-700', icon: '🔴' },
  '中等': { ring: 'border-yellow-400', bg: 'bg-yellow-50', text: 'text-yellow-700', icon: '🟡' },
  '低': { ring: 'border-emerald-400', bg: 'bg-emerald-50', text: 'text-emerald-700', icon: '🟢' },
};

/* ============================================
   骨架屏
   ============================================ */
function SkeletonLoader() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="card-premium">
        <div className="mb-3 h-4 w-24 rounded bg-slate-200" />
        <div className="h-4 w-full rounded bg-slate-200" />
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="card-premium">
          <div className="mb-3 h-5 w-28 rounded bg-slate-200" />
          <div className="space-y-2">
            <div className="h-4 w-full rounded bg-slate-200" />
            <div className="h-4 w-3/4 rounded bg-slate-200" />
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
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl shadow-sm ring-1 ring-blue-100">
        🛡️
      </div>
      <p className="text-sm font-medium text-slate-400">
        输入你想淘的二手商品型号，AI 将为你拆解交易风险与验机步骤
      </p>
      <p className="mt-1 text-xs text-slate-300">
        例如：闲鱼上想淘一台 iPhone 15 Pro，怎么验机？
      </p>
    </div>
  );
}

/* ============================================
   流程进度条
   ============================================ */
function ProgressBar({ active }: { active: boolean }) {
  return (
    <div className="mb-6 h-1 w-full overflow-hidden rounded-full bg-blue-100">
      <div
        className={`h-full rounded-full bg-blue-400 transition-all duration-1500 ${active ? 'w-2/3 animate-progress-bar' : 'w-full'}`}
      />
    </div>
  );
}

/* ============================================
   可交互的验机清单组件 (核心)
   ============================================ */
function InspectionChecklist({
  items,
}: {
  items: { step: string; detail: string }[];
}) {
  const [checkedMap, setCheckedMap] = useState<Record<number, boolean>>({});
  const totalChecked = Object.values(checkedMap).filter(Boolean).length;
  const total = items.length;
  const progress = total > 0 ? Math.round((totalChecked / total) * 100) : 0;

  const toggle = useCallback((idx: number) => {
    setCheckedMap((prev) => ({ ...prev, [idx]: !prev[idx] }));
  }, []);

  const toggleAll = useCallback(() => {
    if (totalChecked === total) {
      setCheckedMap({});
    } else {
      const all: Record<number, boolean> = {};
      items.forEach((_, i) => (all[i] = true));
      setCheckedMap(all);
    }
  }, [totalChecked, total, items]);

  if (!items || items.length === 0) return null;

  return (
    <div className="card-premium !p-0 !overflow-hidden">
      {/* 清单头部 */}
      <div className="flex items-center justify-between border-b border-slate-50 px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-sm">
            📋
          </span>
          <div>
            <h3 className="text-sm font-bold text-slate-900">验机清单</h3>
            <p className="text-xs text-slate-400">
              已检查 {totalChecked}/{total} 项 · {progress}%
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={toggleAll}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:border-blue-300 hover:text-blue-500"
        >
          {totalChecked === total ? '全部取消' : '全部勾选'}
        </button>
      </div>

      {/* 进度条 */}
      <div className="mx-5 mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-blue-400 to-blue-500 transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* 清单列表 */}
      <div className="divide-y divide-slate-50 px-5 py-3">
        {items.map((item, idx) => {
          const checked = !!checkedMap[idx];
          return (
            <button
              key={idx}
              type="button"
              onClick={() => toggle(idx)}
              className={`flex w-full items-start gap-3 py-3 text-left transition-colors ${checked ? 'opacity-70' : ''}`}
            >
              <span
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-all ${
                  checked
                    ? 'border-blue-500 bg-blue-500'
                    : 'border-slate-300 bg-white hover:border-blue-300'
                }`}
              >
                {checked && (
                  <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p
                  className={`text-sm font-semibold transition-colors ${
                    checked ? 'text-slate-400 line-through' : 'text-slate-900'
                  }`}
                >
                  {idx + 1}. {item.step}
                </p>
                <p
                  className={`mt-0.5 text-xs leading-relaxed transition-colors ${
                    checked ? 'text-slate-300' : 'text-slate-500'
                  }`}
                >
                  {item.detail}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {totalChecked === total && total > 0 && (
        <div className="border-t border-emerald-100 bg-emerald-50/60 px-5 py-3 text-center">
          <p className="text-xs font-medium text-emerald-600">
            ✅ 全部检查项已完成 — 可以放心交易了
          </p>
        </div>
      )}
    </div>
  );
}

/* ============================================
   骗局话术卡片列表
   ============================================ */
function ScamCards({ routines }: { routines: { title: string; routine: string; counterMeasure: string }[] }) {
  if (!routines || routines.length === 0) return null;

  return (
    <div>
      <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
        🎭 常见骗局话术拆解
        <span className="rounded-full bg-slate-100 px-2 text-xs font-normal text-slate-500">
          {routines.length} 种
        </span>
      </h3>
      <div className="space-y-3">
        {routines.map((scam, i) => (
          <div
            key={i}
            className="rounded-xl border border-red-100 bg-red-50/40 p-4 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-100 text-[10px] font-bold text-red-600">
                {i + 1}
              </span>
              <h4 className="text-sm font-bold text-red-800">{scam.title}</h4>
            </div>
            <p className="mb-2 ml-7 text-xs leading-relaxed text-red-700">
              <span className="font-semibold">套路：</span>
              {scam.routine}
            </p>
            <p className="ml-7 text-xs leading-relaxed text-emerald-700">
              <span className="font-semibold">应对：</span>
              {scam.counterMeasure}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================
   主组件
   ============================================ */
/* ============================================
   离线兜底：AI 不可用时生成本地鉴定结果
   ============================================ */
function generateLocalUsedCheckResult(query: string) {
  const hash = query.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const seed = (hash % 100) + 1;
  return {
    intent: 'used_market' as const,
    productName: query,
    riskLevel: (seed % 3 === 0 ? '极高' : seed % 3 === 1 ? '中等' : '低') as '极高' | '中等' | '低',
    riskSummary: `「${query}」在二手市场流通量较大，但存在翻新机、组装机冒充原装的风险。建议重点查验序列号一致性、电池健康度、屏幕显示异常等关键指标。`,
    scamRoutines: [
      { title: '"全新未拆封"套路', routine: '卖家声称"全新仅拆封"，实际可能是退换货或翻新机重新塑封', counterMeasure: '要求提供购买凭证、开箱视频，检查包装内是否有非原厂配件' },
      { title: '"急用钱贱卖"话术', routine: '营造紧迫感，声称急需用钱所以低价出手，掩盖商品实际问题', counterMeasure: '不因价格过低而放松验机标准，反而应更仔细检查各项功能' },
      { title: '"当面交易"陷阱', routine: '约在嘈杂公共场所见面，利用环境压力让你匆忙验机', counterMeasure: '选择安静明亮场所，预留充足验机时间（至少30分钟），可录音留存证据' },
    ],
    inspectionChecklist: [
      { step: '核对序列号（IMEI/序列号）', detail: '进入系统设置查看序列号，与包装盒、保修卡上的号码三方一致。登录苹果/三星等官网查询保修状态和激活日期。' },
      { step: '外观全面检查', detail: '在强光下检查机身四周有无划痕、磕碰、掉漆。特别注意接口处、边框转角等易损部位，这些地方最暴露使用痕迹。' },
      { step: '屏幕检测', detail: '全屏切换纯白/纯黑/纯色背景，检查坏点、漏光、色斑。用手指轻按屏幕确认无触控失灵区域，测试多点触控是否正常。' },
      { step: '电池健康度测试', detail: '查看设置中的电池健康百分比（iPhone低于85%需谨慎）。记录满电到关机的实际使用时长，对比官方标称数据。' },
      { step: '摄像头与传感器测试', detail: '前后摄像头分别拍照录像，检查对焦速度、成像清晰度、有无噪点或模糊。测试人脸解锁/指纹识别响应速度。' },
      { step: '接口与按键测试', detail: '逐一测试充电口、耳机孔、Type-C口插拔是否顺滑。每个物理按键反复按压确认回弹手感正常无异响。' },
      { step: '网络与通信测试', detail: '插入SIM卡测试通话质量、4G/5G信号稳定性。连接WiFi测试网速，开启蓝牙配对设备验证无线功能。' },
      { step: '恢复出厂设置后重启', detail: '当面执行恢复出厂设置（抹除所有数据），观察重启过程是否正常。这能清除可能存在的隐藏恶意软件。' },
    ],
  };
}

export default function UsedCheckPage() {
  const [description, setDescription] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  // 离线兜底状态
  const [localResult, setLocalResult] = useState<ReturnType<typeof generateLocalUsedCheckResult> | null>(null);
  const [analyzingBridge, setAnalyzingBridge] = useState(false); // 桥接loading
  const { object: aiObject, submit, isLoading, error, stop } = experimental_useObject({
    api: apiUrl('/api/search/stream'),
    schema: LLMResponseSchema,
    onError: (err) => {
      const msg = err?.message || String(err);
      console.error('[UsedCheck] AI 请求失败:', msg);
      if ((msg.includes('fetch') || msg.includes('network') || msg.includes('Failed') ||
           msg.includes('ECONNREFUSED') || msg.includes('timeout') ||
           msg.includes('Not Found') || msg.includes('404')) && !localResult) {
        setLocalResult(generateLocalUsedCheckResult(submittedQuery || description));
      }
    },
  });
  // 合并：优先本地兜底，其次 AI 返回
  const object = localResult || aiObject;

  const resultsRef = useRef<HTMLDivElement>(null);
  const hasResult = object?.intent === 'used_market';

  // ★ 超时兜底：AI 请求超过 18 秒无结果 → 自动展示本地模拟数据
  useEffect(() => {
    if (!isLoading || localResult || hasResult) return;
    const timer = setTimeout(() => {
      console.warn('[UsedCheck] ⏰ AI 响应超时(18s)，启用本地兜底');
      if (!hasResult) {
        setLocalResult(generateLocalUsedCheckResult(submittedQuery || description));
      }
    }, 18000);
    return () => clearTimeout(timer);
  }, [isLoading, localResult, hasResult]);

  // ★ 桥接清理：当 useObject 的 isLoading 生效后，关闭 bridge
  useEffect(() => {
    if (isLoading || hasResult || localResult) {
      setAnalyzingBridge(false);
    }
  }, [isLoading, hasResult, localResult]);

  useEffect(() => {
    if (hasResult && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [hasResult]);

  const handleSubmit = () => {
    const trimmed = description.trim();
    if (!trimmed || trimmed.length < 4) return;

    setAnalyzingBridge(true); // 确保loading立即显示
    const prompt = `【二手防坑鉴定模式】以下是用户在二手交易中关注的商品，请你：

1. 识别该商品在二手市场中常见的骗局话术和套路，逐一拆解并给出应对措施
2. 给出整体风险等级：极高 / 中等 / 低
3. 生成一份保姆级的线下验机步骤清单，按验机顺序排列，每条包含步骤名称和操作细节

用户关注的商品："${trimmed}"

请使用 intent='used_market' 模式输出结果。`;

    submit({ query: prompt });
    setSubmittedQuery(trimmed);
    setLocalResult(null);
  };

  const renderResult = () => {
    const data = object as UsedMarketResult | undefined;
    if (!data || data.intent !== 'used_market') return null;

    const riskStyle = RISK_STYLES[data.riskLevel] ?? RISK_STYLES['中等'];
    const checklist = data.inspectionChecklist ?? [];
    const scams = data.scamRoutines ?? [];

    return (
      <div ref={resultsRef} className="space-y-6 animate-fade-in-up">
        {/* ===== 风险概览卡片 ===== */}
        <div className={`rounded-2xl border-2 ${riskStyle.ring} ${riskStyle.bg} p-6 shadow-sm`}>
          <div className="mb-3 flex items-center gap-3">
            <span className="text-xl">{riskStyle.icon}</span>
            <div>
              <p className={`text-sm font-bold ${riskStyle.text}`}>
                {data.productName ?? '该商品'}
              </p>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                整体风险：{data.riskLevel}
              </p>
            </div>
          </div>
          <p className="text-sm leading-relaxed text-slate-700">{data.riskSummary}</p>
        </div>

        {/* ===== 骗局话术 ===== */}
        <ScamCards routines={scams} />

        {/* ===== 验机清单 ===== */}
        <InspectionChecklist items={checklist} />
      </div>
    );
  };

  return (
    <main className="flex flex-1 flex-col items-center px-4 pt-16">
      {/* ===== 页面标题区 ===== */}
      <section className="mb-8 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-3xl shadow-sm ring-1 ring-blue-100">
          🛡️
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">二手防坑鉴定</h1>
        <p className="mt-2 text-sm font-medium text-slate-500">
          输入想淘的二手商品，AI 拆解交易风险 + 生成验机清单
        </p>
        <p className="mt-0.5 text-xs text-slate-400">
          线下验机时打开此页面，一边检查一边打钩确认
        </p>
        <div className="mx-auto mt-4 w-10 border-t-2 border-blue-400" />
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
                ? '试试鉴定其他二手商品？'
                : '输入你想淘的二手商品型号...\n\n例如：\n- 闲鱼上想买 iPhone 15 Pro，怎么避坑？\n- 二手相机索尼 A7M4，验机要检查什么？\n- 想淘一辆二手九号 E100，怕买到翻新车'
            }
            rows={hasResult ? 3 : 5}
            maxLength={300}
            className="w-full resize-none bg-transparent px-5 py-4 text-sm leading-relaxed text-slate-900 placeholder-slate-400 outline-none"
            disabled={isLoading}
          />
          <div className="flex items-center justify-between border-t border-slate-50 bg-slate-50/50 px-4 py-2.5">
            <span className="text-xs text-slate-400">
              {description.length}/300 · Ctrl+Enter 发送
            </span>
            <div className="flex items-center gap-2">
              {isLoading && (
                <button
                  type="button"
                  onClick={stop}
                  className="rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:border-red-300 hover:text-red-500"
                >
                  停止
                </button>
              )}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isLoading || description.trim().length < 4}
                className="rounded-lg bg-blue-600 px-5 py-1.5 text-xs font-semibold text-white transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {isLoading ? (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    鉴定中...
                  </span>
                ) : (
                  '开始鉴定'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ===== 提示示例 ===== */}
      {!hasResult && !isLoading && (
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {[
            '闲鱼 iPhone 15 Pro 验机',
            '二手相机索尼 A7M4',
            '电动车九号 E100',
            '二手显卡 RTX 4090',
            '二手积家手表鉴定',
            'AirPods Pro 真伪鉴别',
          ].map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => setDescription(suggestion)}
              className="rounded-full border border-slate-100 bg-white px-3 py-1 text-xs text-slate-500 shadow-sm transition-all hover:border-blue-200 hover:text-blue-600 hover:shadow-md"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {/* ===== 离线兜底警告横幅 ===== */}
      {localResult && (
        <div className="mt-6 w-full max-w-2xl rounded-2xl border border-amber-200 bg-amber-50/80 p-4">
          <p className="text-xs font-medium text-amber-700">
            ⚠️ AI 服务暂时不可用，当前展示的是基于通用二手交易经验的模拟鉴定，仅供参考。
          </p>
        </div>
      )}

      {/* ===== 错误提示（仅无离线数据时显示） ===== */}
      {error && !hasResult && !localResult && (
        <div className="mt-8 w-full max-w-2xl rounded-2xl border border-red-200 bg-red-50 p-5 text-center">
          <p className="text-sm font-semibold text-red-700">鉴定失败</p>
          <p className="mt-1 text-xs text-red-500">{error.message || '未知错误，请稍后重试'}</p>
          <button
            type="button"
            onClick={handleSubmit}
            className="mt-3 rounded-md bg-red-500 px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-600"
          >
            重新鉴定
          </button>
        </div>
      )}

      {/* ===== 结果区 ===== */}
      <div className="mt-8 w-full max-w-4xl">
        {(isLoading || analyzingBridge) && !hasResult && <SkeletonLoader />}
        {!isLoading && !hasResult && !error && !submittedQuery && <EmptyState />}
        {(isLoading || analyzingBridge) && hasResult && <ProgressBar active />}
        {renderResult()}
      </div>

      {/* 底部导航 */}
      <div className="mt-12 mb-8 flex items-center gap-4">
        <Link href="/" className="text-xs font-medium text-slate-400 transition-colors hover:text-blue-500">
          ← 返回单品检测
        </Link>
        <span className="text-slate-200">|</span>
        <Link href="/compare" className="text-xs font-medium text-slate-400 transition-colors hover:text-blue-500">
          1v1 对比
        </Link>
        <span className="text-slate-200">|</span>
        <Link href="/blacklist" className="text-xs font-medium text-slate-400 transition-colors hover:text-blue-500">
          智商税黑榜
        </Link>
        <span className="text-slate-200">|</span>
        <Link href="/clinic" className="text-xs font-medium text-slate-400 transition-colors hover:text-blue-500">
          选品诊所
        </Link>
      </div>

      <p className="mb-8 text-center text-xs font-medium text-slate-300">
        本实验室独立运营，分析结果仅供参考，交易决策请自行判断。
      </p>
    </main>
  );
}
