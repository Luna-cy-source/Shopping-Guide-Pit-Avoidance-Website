'use client';

import { useState, useEffect, useCallback, useRef, useMemo, type FormEvent } from 'react';
import Link from 'next/link';
import { apiUrl } from '../lib/api';
import {
  getUserProgress,
  addXP,
  dailyCheckIn,
  XP_ACTIONS,
  type UserProgress,
} from '../lib/userLevel';
import LevelUpPopup from './LevelUpPopup';
import { type LevelConfig } from '../lib/userLevel';

/* ============================================================
   AI 小探员 — 轻量优化版
   ============================================================ */

const BUBBLE_TEXTS = [
  '遇到消费套路？交给我！',
  '今天看点啥智商税？',
  '纠结买哪款？我帮你PK！',
  '有什么想排雷的商品吗？',
  '别急着下单，先让我查查~',
  '消费决策护卫队已就位🛡️',
  '发现个好东西，快看看👀',
  '又有人踩坑了！',
];

const QUICK_QUESTIONS = [
  'SK-II 神仙水是智商税吗？',
  '戴森吹风机值得买吗？',
  '二手 iPhone 怎么验机？',
  '最近有什么新套路？',
];

const QUICK_ACTIONS = [
  { label: '单品检测', href: '/', icon: '🔍', color: 'bg-red-50 text-red-600 hover:bg-red-100' },
  { label: '1v1对比', href: '/compare', icon: '🥊', color: 'bg-amber-50 text-amber-600 hover:bg-amber-100' },
  { label: '黑榜', href: '/blacklist', icon: '📉', color: 'bg-rose-50 text-rose-600 hover:bg-rose-100' },
  { label: '曝光', href: '/expose', icon: '🔥', color: 'bg-orange-50 text-orange-600 hover:bg-orange-100' },
] as const;

type MascotMood = 'normal' | 'happy' | 'thinking' | 'surprised' | 'proud' | 'sleepy';

function getWelcomeMsg(progress: UserProgress | null): string {
  if (!progress || progress.level <= 1) {
    return '你好！我是 AI 避坑实验室的小探员 😎\n不恰饭、只说实话。有想查的商品直接告诉我！';
  }
  return `欢迎回来，${progress.title} ${progress.emoji}！\n今天继续帮你排雷避坑~有什么想查的吗？`;
}

/* ---------- 等级配色表 ---------- */
const LEVEL_GRADIENTS: [number, string][] = [
  [10, 'from-red-400 via-rose-400 to-pink-500'],
  [8, 'from-amber-400 via-yellow-400 to-orange-500'],
  [6, 'from-violet-400 via-purple-400 to-fuchsia-500'],
  [4, 'from-cyan-400 via-blue-400 to-indigo-500'],
];
const DEFAULT_GRADIENT = 'from-blue-400 via-indigo-400 to-purple-500';

const LEVEL_SHADOWS: [number, string][] = [
  [10, 'rgba(239,68,68,0.35)'],
  [8, 'rgba(245,158,11,0.35)'],
  [6, 'rgba(139,92,246,0.35)'],
  [4, 'rgba(59,130,246,0.35)'],
];
const DEFAULT_SHADOW = 'rgba(99,102,241,0.35)';

function pickByLevel(level: number | undefined, table: [number, string][], fallback: string) {
  if (!level) return fallback;
  for (const [min, val] of table) { if (level >= min) return val; }
  return fallback;
}

/* ---------- SVG 表情原子 ---------- */
const EYE_ELEMENTS = {
  normal: <> <circle cx="9.5" cy="11" r="1.2" fill="currentColor" /> <circle cx="14.5" cy="11" r="1.2" fill="currentColor" /> </>,
  happy: <> <path d="M8.5 11.5q1-1.5 2 0" stroke="currentColor" strokeWidth={1.2} fill="none" /> <path d="M13.5 11.5q1-1.5 2 0" stroke="currentColor" strokeWidth={1.2} fill="none" /> </>,
  wink: <> <circle cx="9.5" cy="11" r="1.2" fill="currentColor" /> <path d="M13.5 11.5q1-1 2 0" stroke="currentColor" strokeWidth={1.2} fill="none" /> </>,
  surprised: <> <circle cx="9.5" cy="11" r="1.6" fill="currentColor" /> <circle cx="14.5" cy="11" r="1.6" fill="currentColor" /> </>,
  sleepy: <> <path d="M8 11.5h3" stroke="currentColor" strokeWidth={1.2} /> <path d="M13 11.5h3" stroke="currentColor" strokeWidth={1.2} /> </>,
} as const;

const MOUTH_ELEMENTS = {
  normal: <path d="M9 15h6" />,
  happy: <path d="M9 14.5q3 2.5 6 0" />,
  surprised: <circle cx="12" cy="15.5" r="1" fill="currentColor" />,
  proud: <path d="M10 15.5l2 1.5 2-1.5" />,
} as const;

const MOOD_FACE: Record<MascotMood, { eyes: keyof typeof EYE_ELEMENTS; mouth: keyof typeof MOUTH_ELEMENTS }> = {
  normal: { eyes: 'normal', mouth: 'normal' },
  happy: { eyes: 'happy', mouth: 'happy' },
  thinking: { eyes: 'wink', mouth: 'normal' },
  surprised: { eyes: 'surprised', mouth: 'surprised' },
  proud: { eyes: 'happy', mouth: 'proud' },
  sleepy: { eyes: 'sleepy', mouth: 'normal' },
};

export default function AiMascot() {
  const [open, setOpen] = useState(false);
  const [bubbleIndex, setBubbleIndex] = useState(0);
  const [bubbleVisible, setBubbleVisible] = useState(true);
  const [mood, setMood] = useState<MascotMood>('normal');
  const [messages, setMessages] = useState<{ role: 'user' | 'bot'; text: string }[]>([]);
  const [input, setInput] = useState('');
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [checkedIn, setCheckedIn] = useState(false);
  const [levelUpInfo, setLevelUpInfo] = useState<LevelConfig | null>(null);
  const [displayedText, setDisplayedText] = useState('');
  const msgEndRef = useRef<HTMLDivElement>(null);
  const streamingTargetRef = useRef('');
  const streamingRef = useRef(false);
  const typingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isStreaming = streamingRef;

  /* ---------- 初始化 ---------- */
  useEffect(() => {
    const p = getUserProgress();
    setProgress(p);
    setMessages([{ role: 'bot', text: getWelcomeMsg(p) }]);
    setCheckedIn(p.dailyCheckInDate === new Date().toISOString().slice(0, 10));
  }, []);

  /* ---------- 消息滚动 ---------- */
  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, displayedText]);

  /* ---------- 打字机（仅 isStreaming 为 true 时运行） ---------- */
  useEffect(() => {
    if (!streamingRef.current) {
      if (typingTimerRef.current) { clearInterval(typingTimerRef.current); typingTimerRef.current = null; }
      return;
    }
    const timer = setInterval(() => {
      setDisplayedText((cur) => {
        const target = streamingTargetRef.current;
        return cur.length < target.length ? target.slice(0, cur.length + 1) : cur;
      });
    }, 20);
    typingTimerRef.current = timer;
    return () => { clearInterval(timer); typingTimerRef.current = null; };
  }, []);

  /* ---------- 定时切换气泡 ---------- */
  useEffect(() => {
    const timer = setInterval(() => {
      setBubbleVisible(false);
      setTimeout(() => {
        setBubbleIndex((i) => (i + 1) % BUBBLE_TEXTS.length);
        setBubbleVisible(true);
      }, 400);
    }, 8000);
    return () => clearInterval(timer);
  }, []);

  /* ---------- ESC 关闭 ---------- */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  /* ---------- 流式状态切换 ---------- */
  const startStreaming = useCallback(() => {
    streamingRef.current = true;
    setDisplayedText('');
    streamingTargetRef.current = '';
  }, []);

  const stopStreaming = useCallback(() => {
    streamingRef.current = false;
    if (typingTimerRef.current) { clearInterval(typingTimerRef.current); typingTimerRef.current = null; }
    setDisplayedText('');
  }, []);

  /* ---------- 等待打字机播完 ---------- */
  const waitForTypewriter = useCallback(async () => {
    await new Promise<void>((resolve) => {
      const check = setInterval(() => {
        let done = false;
        setDisplayedText((cur) => {
          const target = streamingTargetRef.current;
          if (cur.length >= target.length) { done = true; return cur; }
          return target.slice(0, cur.length + 1);
        });
        if (done) { clearInterval(check); resolve(); }
      }, 20);
    });
  }, []);

  /* ---------- 发送消息 ---------- */
  const sendMessage = useCallback(async (textOverride?: string) => {
    const text = (textOverride ?? input).trim();
    if (!text) return;

    setMessages((prev) => [...prev, { role: 'user', text }]);
    setInput('');
    setMood('thinking');
    startStreaming();

    const xpResult = addXP('SEARCH');
    if (xpResult.leveledUp && xpResult.newTitle) {
      const lvl = getUserProgress();
      setProgress(lvl);
      setLevelUpInfo({ level: lvl.level, title: lvl.title, emoji: lvl.emoji, minXP: 0, color: '', bgColor: '', ringColor: '', desc: '' });
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const res = await fetch(apiUrl('/api/search/stream'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: text }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response body');
      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value, { stream: true }).split('\n')) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const obj = JSON.parse(trimmed);
            if (obj && typeof obj === 'object' && 'intent' in obj) {
              const pn = obj.productName || obj.categoryName || text;
              const score = typeof obj.score === 'number' ? ` ${obj.score}/10分` : '';
              fullText = `「${pn}」${score}\n${obj.priceAnalysis || obj.overview || ''}`;
              streamingTargetRef.current = fullText;
            }
          } catch {
            if (trimmed.startsWith('data:') && trimmed.slice(5).trim().startsWith('0:')) {
              try {
                const chunk = JSON.parse(trimmed.slice(5).trim().slice(2));
                if (typeof chunk === 'string') { fullText += chunk; streamingTargetRef.current = fullText; }
              } catch { /* skip */ }
            }
          }
        }
        if (fullText.length > 250) { reader.cancel(); break; }
      }

      await waitForTypewriter();
      stopStreaming();
      setMood('happy');
      setMessages((prev) => [
        ...prev,
        { role: 'bot', text: fullText.trim() || '抱歉，暂时无法获取分析结果。' },
        { role: 'bot', text: `💡 想查看「${text}」的完整深度报告？\n👇 试试上方快捷功能：🔍单品检测 🥊1v1对比 📉黑榜` },
      ]);
      setTimeout(() => setMood('normal'), 3000);

    } catch (err) {
      console.error('小探员 AI 请求失败:', err);
      stopStreaming();
      setMood('happy');
      const replies = [
        `收到「${text}」~ AI 客服正在接入，先去首页搜索查看深度报告吧！`,
        `「${text}」讨论很火！去「单品检测」模块能看到详细报告。`,
        `关于「${text}」已有不少用户讨论，去看看黑榜或对比功能吧~`,
        `小探员正在分析「${text}」... 先用搜索功能，报告马上好！`,
      ];
      setMessages((prev) => [...prev, { role: 'bot', text: replies[Math.floor(Math.random() * replies.length)] }]);
      setTimeout(() => setMood('normal'), 3000);
    }
  }, [input, startStreaming, stopStreaming, waitForTypewriter]);

  const handleSubmit = useCallback(async (e?: FormEvent) => {
    e?.preventDefault();
    await sendMessage();
  }, [sendMessage]);

  /* ---------- 每日签到 ---------- */
  const handleCheckIn = useCallback(() => {
    if (checkedIn) return;
    const result = dailyCheckIn();
    setProgress(result.progress);
    setCheckedIn(true);
    const bonus = result.streakBonus > 0 ? `连续${result.progress.streakDays}天！额外奖励${result.streakBonus}XP 🎉` : '';
    setMessages((prev) => [...prev, { role: 'bot', text: `签到成功！获得 ${XP_ACTIONS.DAILY_LOGIN.xp} XP ${bonus}` }]);
    setMood('proud');
    setTimeout(() => setMood('normal'), 3000);
  }, [checkedIn]);

  /* ---------- 等级化外观（memoized） ---------- */
  const mascotGradient = useMemo(
    () => pickByLevel(progress?.level, LEVEL_GRADIENTS, DEFAULT_GRADIENT),
    [progress?.level],
  );
  const mascotShadow = useMemo(
    () => pickByLevel(progress?.level, LEVEL_SHADOWS, DEFAULT_SHADOW),
    [progress?.level],
  );

  /* ---------- 表情脸（memoized by mood） ---------- */
  const mascotFace = useMemo(() => {
    const { eyes: ek, mouth: mk } = MOOD_FACE[mood];
    return (
      <svg className="relative z-10 h-6 w-6 text-white drop-shadow-sm transition-all duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v2" /><path d="M9 4h6" /><rect x="4" y="6" width="16" height="12" rx="3" />
        {EYE_ELEMENTS[ek]}{MOUTH_ELEMENTS[mk]}
      </svg>
    );
  }, [mood]);

  const showStreamingBubble = isStreaming.current || displayedText;

  return (
    <>
      {/* ============ 悬浮小精灵 + 对话气泡 ============ */}
      <div className="fixed bottom-8 right-8 z-[100]">
        <div className={[
          'absolute bottom-full right-0 mb-4 min-w-[200px] max-w-[280px] transition-all duration-400',
          bubbleVisible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0',
        ].join(' ')}>
          <div className="glass-card relative rounded-2xl rounded-br-sm px-4 py-2.5">
            <p className="whitespace-nowrap text-xs leading-relaxed text-slate-600">{BUBBLE_TEXTS[bubbleIndex]}</p>
            <div className="absolute -bottom-1.5 right-5 h-3 w-3 rotate-45 border-b border-r border-white/40 bg-white/60 backdrop-blur-2xl" />
          </div>
        </div>

        <button
          type="button"
          onClick={() => { setOpen((v) => !v); setMood('happy'); setTimeout(() => setMood('normal'), 2000); }}
          className={`group relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br ${mascotGradient} transition-all duration-300 hover:-translate-y-1 active:scale-95`}
          style={{ boxShadow: `0 4px 20px ${mascotShadow}` }}
          onMouseEnter={() => setMood('happy')}
          onMouseLeave={() => setMood('normal')}
          title={`AI 小探员 ${progress ? `· ${progress.title}` : ''}`}
        >
          {progress && progress.level >= 6 && <span className="absolute inset-0 rounded-full animate-ping opacity-20" style={{ background: 'inherit' }} />}
          <span className="breathe-ring absolute inset-0 rounded-full" />
          {progress && progress.level > 1 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[9px] font-bold shadow-sm" style={{ color: 'inherit' }}>
              {progress.level}
            </span>
          )}
          {mascotFace}
        </button>
      </div>

      {/* ============ 升级弹窗 ============ */}
      {levelUpInfo && <LevelUpPopup levelInfo={levelUpInfo} onClose={() => setLevelUpInfo(null)} />}

      {/* ============ 迷你对话面板 ============ */}
      {open && (
        <>
          <div className="fixed inset-0 z-[99] bg-black/15 backdrop-blur-[2px] sm:hidden" onClick={() => setOpen(false)} />

          <div className="fixed bottom-24 right-8 z-[100] flex h-[480px] w-[360px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl bg-white/90 shadow-[0_16px_60px_rgba(0,0,0,0.14)] backdrop-blur-3xl border border-white/50">

            {/* 头部 */}
            <div className="flex items-center gap-3 border-b border-slate-100/60 px-4 py-3">
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${mascotGradient} shadow-sm`}>
                <span className="text-base">🤖</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  AI 小探员
                  {progress && progress.level > 1 && <span className="rounded-full bg-slate-100 px-1.5 py-0 text-[9px] font-bold text-slate-500">Lv.{progress.level}</span>}
                </p>
                <p className="text-[10px] text-green-500 flex items-center gap-1">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                  在线{progress && <span className="text-slate-300 ml-1">· {progress.xp} XP</span>}
                </p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* 快捷功能 */}
            <div className="grid grid-cols-4 gap-1.5 border-b border-slate-50 px-3 py-2.5">
              {QUICK_ACTIONS.map((a) => (
                <Link key={a.href} href={a.href} onClick={() => setOpen(false)} className={`flex flex-col items-center gap-0.5 rounded-lg py-1.5 px-1 text-[10px] font-medium transition-colors ${a.color}`}>
                  <span className="text-sm">{a.icon}</span><span>{a.label}</span>
                </Link>
              ))}
            </div>

            {/* 消息列表 */}
            <div className="flex-1 overflow-y-auto px-4 py-3 scrollbar-thin space-y-3">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'bot' && (
                    <div className={`mr-1.5 mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${mascotGradient}`}>
                      <span className="text-[10px]">🤖</span>
                    </div>
                  )}
                  <div className={['max-w-[86%] rounded-2xl px-3.5 py-2.5 leading-snug', msg.role === 'user' ? 'rounded-br-md bg-gradient-to-br from-blue-500 to-indigo-500 text-[12px] text-white shadow-sm' : 'rounded-bl-md bg-slate-100/80 text-[11px] text-slate-700'].join(' ')}>
                    {msg.text.split('\n').map((line, idx) => <p key={idx} className={idx > 0 ? 'mt-1.5' : ''}>{line}</p>)}
                  </div>
                </div>
              ))}

              {/* 等待中 / 打字机 */}
              {showStreamingBubble && (
                <div className="flex justify-start">
                  <div className={`mr-1.5 mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${mascotGradient}`}>
                    <span className="text-[10px]">🤖</span>
                  </div>
                  <div className="max-w-[86%] rounded-2xl rounded-bl-md bg-slate-100/80 px-3.5 py-2.5 leading-snug text-[11px] text-slate-700">
                    {displayedText ? (
                      <>{displayedText}<span className="inline-block w-1 h-3.5 ml-0.5 bg-blue-400 animate-pulse align-middle" /></>
                    ) : (
                      <div className="flex gap-1">
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: '0ms' }} />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: '150ms' }} />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: '300ms' }} />
                      </div>
                    )}
                  </div>
                </div>
              )}
              <div ref={msgEndRef} />
            </div>

            {/* 快捷问题 */}
            <div className="flex flex-wrap gap-1.5 border-t border-slate-50 px-3 pt-2 pb-1">
              {QUICK_QUESTIONS.map((q) => (
                <button key={q} type="button" onClick={() => sendMessage(q)} className="rounded-full border border-slate-200/60 bg-slate-50/60 px-2.5 py-1 text-[10px] text-slate-500 transition-all hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600">{q}</button>
              ))}
            </div>

            {/* 签到 + 输入 */}
            <div className="flex flex-col gap-1.5 border-t border-slate-100/60 px-3 py-2.5">
              {!checkedIn ? (
                <button type="button" onClick={handleCheckIn} className="flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-400 to-orange-400 px-3 py-1.5 text-[11px] font-bold text-white shadow-sm transition-all hover:shadow-md active:scale-95">
                  <span>📅</span> 每日签到 +{XP_ACTIONS.DAILY_LOGIN.xp} XP
                  {progress && progress.streakDays > 0 && <span className="rounded-full bg-white/20 px-1.5 py-0 text-[9px]">连续{progress.streakDays}天</span>}
                </button>
              ) : (
                <div className="flex items-center justify-center gap-1 rounded-lg bg-emerald-50 px-3 py-1.5 text-[11px] text-emerald-600">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  今日已签到{progress && progress.streakDays > 1 && <span className="text-emerald-400">· 连续{progress.streakDays}天</span>}
                </div>
              )}
              <form onSubmit={handleSubmit} className="flex items-center gap-2">
                <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="问小探员任何消费问题..." className="flex-1 rounded-full border border-slate-200/60 bg-slate-50/60 px-3.5 py-2 text-xs outline-none backdrop-blur transition-all duration-300 focus:border-blue-300 focus:bg-white focus:shadow-sm" maxLength={200} />
                <button type="submit" disabled={!input.trim()} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 text-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" /></svg>
                </button>
              </form>
            </div>
          </div>
        </>
      )}
    </>
  );
}
