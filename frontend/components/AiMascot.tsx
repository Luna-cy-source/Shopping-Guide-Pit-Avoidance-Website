'use client';

import { useState, useEffect, useCallback, useRef, type FormEvent } from 'react';
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
   AI 小探员 — 升级版本
   - 多种表情状态切换
   - 快捷功能入口
   - 等级个性化
   - 每日签到
   ============================================================ */

/* 对话气泡文案池（按情绪分组） */
const BUBBLE_TEXTS = [
  '遇到消费套路？交给我！',
  '今天想看点什么智商税？',
  '纠结买哪款？我帮你 PK！',
  '有什么想排雷的商品吗？',
  '别急着下单，先让我查查~',
  '你的消费决策护卫队已就位🛡️',
  '发现个好东西，快来看看👀',
  '又有人踩坑了，快去看看👇',
];

/* 快捷问题 */
const QUICK_QUESTIONS = [
  'SK-II 神仙水是智商税吗？',
  '戴森吹风机值得买吗？',
  '二手 iPhone 怎么验机？',
  '最近有什么新套路？',
];

/* 快捷功能入口 */
const QUICK_ACTIONS = [
  { label: '单品检测', href: '/', icon: '🔍', color: 'bg-red-50 text-red-600 hover:bg-red-100' },
  { label: '1v1对比', href: '/compare', icon: '🥊', color: 'bg-amber-50 text-amber-600 hover:bg-amber-100' },
  { label: '黑榜', href: '/blacklist', icon: '📉', color: 'bg-rose-50 text-rose-600 hover:bg-rose-100' },
  { label: '曝光', href: '/expose', icon: '🔥', color: 'bg-orange-50 text-orange-600 hover:bg-orange-100' },
];

/* 小精灵表情状态 */
type MascotMood = 'normal' | 'happy' | 'thinking' | 'surprised' | 'proud' | 'sleepy';

/* 欢迎消息（根据等级动态） */
function getWelcomeMsg(progress: UserProgress | null): string {
  if (!progress || progress.level <= 1) {
    return '你好！我是 AI 避坑实验室的小探员 😎\n不恰饭、只说实话。有想查的商品直接告诉我！';
  }
  return `欢迎回来，${progress.title} ${progress.emoji}！\n今天继续帮你排雷避坑~有什么想查的吗？`;
}

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
  const [isTyping, setIsTyping] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [displayedText, setDisplayedText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const msgEndRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const streamingTextRef = useRef('');
  const displayedTextRef = useRef('');

  /* ---------- 初始化 ---------- */
  useEffect(() => {
    const p = getUserProgress();
    setProgress(p);
    setMessages([{ role: 'bot', text: getWelcomeMsg(p) }]);

    // 检查今日是否已签到
    const today = new Date().toISOString().slice(0, 10);
    setCheckedIn(p.dailyCheckInDate === today);
  }, []);

  /* ---------- 消息自动滚动 ---------- */
  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, displayedText]);

  /* ---------- 同步 ref ---------- */
  useEffect(() => { streamingTextRef.current = streamingText; }, [streamingText]);
  useEffect(() => { displayedTextRef.current = displayedText; }, [displayedText]);

  /* ---------- 打字机效果 ---------- */
  useEffect(() => {
    const timer = setInterval(() => {
      const target = streamingTextRef.current;
      const current = displayedTextRef.current;
      if (current.length < target.length) {
        const next = target.slice(0, current.length + 1);
        displayedTextRef.current = next;
        setDisplayedText(next);
      }
    }, 25);
    return () => clearInterval(timer);
  }, []);

  /* ---------- 定时切换气泡 ---------- */
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setBubbleVisible(false);
      setTimeout(() => {
        setBubbleIndex((i) => (i + 1) % BUBBLE_TEXTS.length);
        setBubbleVisible(true);
        // 随机切换心情
        const moods: MascotMood[] = ['normal', 'happy', 'thinking', 'proud'];
        setMood(moods[Math.floor(Math.random() * moods.length)]);
      }, 400);
    }, 6000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  /* ---------- ESC 关闭 ---------- */
  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') setOpen(false);
  }, []);
  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  /* ---------- 发送消息 ---------- */
  const sendMessage = async (textOverride?: string) => {
    const text = (textOverride ?? input).trim();
    if (!text) return;

    setMessages((prev) => [...prev, { role: 'user', text }]);
    setInput('');
    setIsTyping(true);
    setMood('thinking');
    setStreamingText('');
    setDisplayedText('');
    setIsStreaming(true);
    streamingTextRef.current = '';
    displayedTextRef.current = '';

    // 增加搜索 XP
    const xpResult = addXP('SEARCH');
    if (xpResult.leveledUp && xpResult.newTitle) {
      const lvl = getUserProgress();
      setProgress(lvl);
      setLevelUpInfo({
        level: lvl.level,
        title: lvl.title,
        emoji: lvl.emoji,
        minXP: 0,
        color: '',
        bgColor: '',
        ringColor: '',
        desc: '',
      });
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
      const decoder = new TextDecoder();
      let fullText = '';
      let receivedFirstChunk = false;

      if (!reader) throw new Error('No response body');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          // 尝试新格式：纯 JSON NDJSON 行（与 ReportStreamer 兼容）
          try {
            const obj = JSON.parse(trimmed);
            // 提取摘要信息用于聊天展示
            if (obj && typeof obj === 'object' && 'intent' in obj) {
              const productName = obj.productName || obj.categoryName || text || '';
              const score = typeof obj.score === 'number' ? ` ${obj.score}/10分` : '';
              const priceInfo = obj.priceAnalysis || obj.overview || '';
              fullText = `「${productName}」${score}\n${priceInfo}`;
              streamingTextRef.current = fullText;
              setStreamingText(fullText);
              receivedFirstChunk = true;
              setIsTyping(false);
            }
          } catch {
            // 不是有效 JSON → 尝试旧格式：SSE/DataStream 协议
            if (trimmed.startsWith('data:')) {
              const data = trimmed.slice(5).trim();
              if (data.startsWith('0:')) {
                try {
                  const textChunk = JSON.parse(data.slice(2));
                  if (typeof textChunk === 'string') {
                    fullText += textChunk;
                    streamingTextRef.current = fullText;
                    setStreamingText(fullText);
                    if (!receivedFirstChunk) {
                      receivedFirstChunk = true;
                      setIsTyping(false);
                    }
                  }
                } catch {
                  // 忽略解析失败的 chunk
                }
              }
            }
          }
        }

        // 限制最大长度，小探员不需要完整报告
        if (fullText.length > 250) {
          reader.cancel();
          break;
        }
      }

      // 等待打字机打完
      await new Promise<void>((resolve) => {
        const check = setInterval(() => {
          if (displayedTextRef.current.length >= streamingTextRef.current.length) {
            clearInterval(check);
            resolve();
          }
        }, 50);
      });

      setIsStreaming(false);
      setMood('happy');

      // 添加 AI 回复
      setMessages((prev) => [
        ...prev,
        { role: 'bot', text: fullText.trim() || '抱歉，暂时无法获取分析结果。' },
      ]);

      // 添加推荐
      const recommendMsg = `💡 想查看「${text}」的完整深度报告？\n👇 试试上方快捷功能：🔍单品检测 🥊1v1对比 📉黑榜`;
      setMessages((prev) => [...prev, { role: 'bot', text: recommendMsg }]);

      setStreamingText('');
      setDisplayedText('');
      setTimeout(() => setMood('normal'), 3000);
    } catch (err) {
      console.error('小探员 AI 请求失败:', err);
      setIsTyping(false);
      setIsStreaming(false);
      setMood('happy');

      // fallback 静态回复
      const replies = [
        `收到「${text}」~ AI 客服正在接入，先去首页搜索查看深度报告吧！`,
        `「${text}」讨论很火！去「单品检测」模块能看到详细报告。`,
        `关于「${text}」已有不少用户讨论，去看看黑榜或对比功能吧~`,
        `小探员正在分析「${text}」... 先用搜索功能，报告马上好！`,
      ];
      const reply = replies[Math.floor(Math.random() * replies.length)];
      setMessages((prev) => [...prev, { role: 'bot', text: reply }]);

      setTimeout(() => setMood('normal'), 3000);
    }
  };

  const handleSubmit = async (e?: FormEvent) => {
    e?.preventDefault();
    await sendMessage();
  };

  /* ---------- 每日签到 ---------- */
  const handleCheckIn = () => {
    if (checkedIn) return;
    const result = dailyCheckIn();
    setProgress(result.progress);
    setCheckedIn(true);

    const bonusText = result.streakBonus > 0 ? `连续${result.progress.streakDays}天！额外奖励${result.streakBonus}XP 🎉` : '';
    setMessages((prev) => [
      ...prev,
      { role: 'bot', text: `签到成功！获得 ${XP_ACTIONS.DAILY_LOGIN.xp} XP ${bonusText}` },
    ]);
    setMood('proud');
    setTimeout(() => setMood('normal'), 3000);
  };

  /* ---------- 渲染小精灵表情（根据 mood 动态） ---------- */
  const renderMascotFace = () => {
    const eyeNormal = (
      <>
        <circle cx="9.5" cy="11" r="1.2" fill="currentColor" />
        <circle cx="14.5" cy="11" r="1.2" fill="currentColor" />
      </>
    );
    const eyeHappy = (
      <>
        <path d="M8.5 11.5q1-1.5 2 0" stroke="currentColor" strokeWidth={1.2} fill="none" />
        <path d="M13.5 11.5q1-1.5 2 0" stroke="currentColor" strokeWidth={1.2} fill="none" />
      </>
    );
    const eyeWink = (
      <>
        <circle cx="9.5" cy="11" r="1.2" fill="currentColor" />
        <path d="M13.5 11.5q1-1 2 0" stroke="currentColor" strokeWidth={1.2} fill="none" />
      </>
    );
    const eyeSurprised = (
      <>
        <circle cx="9.5" cy="11" r="1.6" fill="currentColor" />
        <circle cx="14.5" cy="11" r="1.6" fill="currentColor" />
      </>
    );
    const eyeSleepy = (
      <>
        <path d="M8 11.5h3" stroke="currentColor" strokeWidth={1.2} />
        <path d="M13 11.5h3" stroke="currentColor" strokeWidth={1.2} />
      </>
    );

    const mouthNormal = <path d="M9 15h6" />;
    const mouthHappy = <path d="M9 14.5q3 2.5 6 0" />;
    const mouthSurprised = <circle cx="12" cy="15.5" r="1" fill="currentColor" />;
    const mouthProud = <path d="M10 15.5l2 1.5 2-1.5" />;

    const faceMap: Record<MascotMood, { eyes: JSX.Element; mouth: JSX.Element }> = {
      normal: { eyes: eyeNormal, mouth: mouthNormal },
      happy: { eyes: eyeHappy, mouth: mouthHappy },
      thinking: { eyes: eyeWink, mouth: mouthNormal },
      surprised: { eyes: eyeSurprised, mouth: mouthSurprised },
      proud: { eyes: eyeHappy, mouth: mouthProud },
      sleepy: { eyes: eyeSleepy, mouth: mouthNormal },
    };

    const f = faceMap[mood];
    return (
      <svg
        className="relative z-10 h-6 w-6 text-white drop-shadow-sm transition-all duration-300"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 2v2" />
        <path d="M9 4h6" />
        <rect x="4" y="6" width="16" height="12" rx="3" />
        {f.eyes}
        {f.mouth}
      </svg>
    );
  };

  /* ---------- 小精灵外观随等级变化 ---------- */
  const getMascotGradient = () => {
    if (!progress) return 'from-blue-400 via-indigo-400 to-purple-500';
    if (progress.level >= 10) return 'from-red-400 via-rose-400 to-pink-500';
    if (progress.level >= 8) return 'from-amber-400 via-yellow-400 to-orange-500';
    if (progress.level >= 6) return 'from-violet-400 via-purple-400 to-fuchsia-500';
    if (progress.level >= 4) return 'from-cyan-400 via-blue-400 to-indigo-500';
    return 'from-blue-400 via-indigo-400 to-purple-500';
  };

  const getMascotShadow = () => {
    if (!progress) return 'rgba(99,102,241,0.35)';
    if (progress.level >= 10) return 'rgba(239,68,68,0.35)';
    if (progress.level >= 8) return 'rgba(245,158,11,0.35)';
    if (progress.level >= 6) return 'rgba(139,92,246,0.35)';
    if (progress.level >= 4) return 'rgba(59,130,246,0.35)';
    return 'rgba(99,102,241,0.35)';
  };

  return (
    <>
      {/* ============ 悬浮小精灵 + 对话气泡 ============ */}
      <div className="fixed bottom-8 right-8 z-[100]">
        {/* 对话气泡 */}
        <div
          className={[
            'absolute bottom-full right-0 mb-4 min-w-[200px] max-w-[280px] transition-all duration-400',
            bubbleVisible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0',
          ].join(' ')}
        >
          <div className="glass-card relative rounded-2xl rounded-br-sm px-4 py-2.5">
            <p className="whitespace-nowrap text-xs leading-relaxed text-slate-600">
              {BUBBLE_TEXTS[bubbleIndex]}
            </p>
            {/* 气泡小三角 */}
            <div className="absolute -bottom-1.5 right-5 h-3 w-3 rotate-45 border-b border-r border-white/40 bg-white/60 backdrop-blur-2xl" />
          </div>
        </div>

        {/* 小精灵按钮 */}
        <button
          type="button"
          onClick={() => {
            setOpen((v) => !v);
            setMood('happy');
            setTimeout(() => setMood('normal'), 2000);
          }}
          className={`group relative flex h-14 w-14 items-center justify-center rounded-full
                     bg-gradient-to-br ${getMascotGradient()}
                     transition-all duration-300
                     hover:-translate-y-1 active:scale-95`}
          style={{
            boxShadow: `0 4px 20px ${getMascotShadow()}`,
          }}
          onMouseEnter={() => setMood('happy')}
          onMouseLeave={() => setMood('normal')}
          title={`AI 小探员 ${progress ? `· ${progress.title}` : ''}`}
        >
          {/* 呼吸灯外环（高级用户更强） */}
          <span
            className={`absolute inset-0 rounded-full ${progress && progress.level >= 6 ? 'animate-ping opacity-20' : ''}`}
            style={{ background: 'inherit' }}
          />
          <span className="breathe-ring absolute inset-0 rounded-full" />

          {/* 等级角标 */}
          {progress && progress.level > 1 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[9px] font-bold shadow-sm"
              style={{ color: 'inherit' }}>
              {progress.level}
            </span>
          )}

          {renderMascotFace()}
        </button>
      </div>

      {/* ============ 升级弹窗 ============ */}
      {levelUpInfo && (
        <LevelUpPopup
          levelInfo={levelUpInfo}
          onClose={() => setLevelUpInfo(null)}
        />
      )}

      {/* ============ 迷你对话面板 ============ */}
      {open && (
        <>
          {/* 背景遮罩 */}
          <div
            className="fixed inset-0 z-[99] bg-black/15 backdrop-blur-[2px] sm:hidden"
            onClick={() => setOpen(false)}
          />

          {/* 对话卡片 */}
          <div
            className="fixed bottom-24 right-8 z-[100] flex h-[480px] w-[360px] max-w-[calc(100vw-2rem)]
                       flex-col overflow-hidden rounded-2xl
                       bg-white/90 shadow-[0_16px_60px_rgba(0,0,0,0.14)]
                       backdrop-blur-3xl border border-white/50"
          >
            {/* ---- 头部 ---- */}
            <div className="flex items-center gap-3 border-b border-slate-100/60 px-4 py-3">
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${getMascotGradient()} shadow-sm`}>
                <span className="text-base">🤖</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  AI 小探员
                  {progress && progress.level > 1 && (
                    <span className="rounded-full bg-slate-100 px-1.5 py-0 text-[9px] font-bold text-slate-500">
                      Lv.{progress.level}
                    </span>
                  )}
                </p>
                <p className="text-[10px] text-green-500 flex items-center gap-1">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                  在线
                  {progress && (
                    <span className="text-slate-300 ml-1">
                      · {progress.xp} XP
                    </span>
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400
                           transition-colors hover:bg-slate-100 hover:text-slate-600"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* ---- 快捷功能区 ---- */}
            <div className="grid grid-cols-4 gap-1.5 border-b border-slate-50 px-3 py-2.5">
              {QUICK_ACTIONS.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  onClick={() => setOpen(false)}
                  className={`flex flex-col items-center gap-0.5 rounded-lg py-1.5 px-1
                             text-[10px] font-medium transition-colors ${action.color}`}
                >
                  <span className="text-sm">{action.icon}</span>
                  <span>{action.label}</span>
                </Link>
              ))}
            </div>

            {/* ---- 消息列表 ---- */}
            <div className="flex-1 overflow-y-auto px-4 py-3 scrollbar-thin space-y-3">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'bot' && (
                    <div className={`mr-1.5 mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full
                                    bg-gradient-to-br ${getMascotGradient()}`}>
                      <span className="text-[10px]">🤖</span>
                    </div>
                  )}
                  <div
                    className={[
                      'max-w-[86%] rounded-2xl px-3.5 py-2.5 leading-snug',
                      msg.role === 'user'
                        ? 'rounded-br-md bg-gradient-to-br from-blue-500 to-indigo-500 text-[12px] text-white shadow-sm'
                        : 'rounded-bl-md bg-slate-100/80 text-[11px] text-slate-700',
                    ].join(' ')}
                  >
                    {msg.text.split('\n').map((line, idx) => (
                      <p key={idx} className={idx > 0 ? 'mt-1.5' : ''}>
                        {line}
                      </p>
                    ))}
                  </div>
                </div>
              ))}

              {/* 输入中动画 */}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-purple-500 mr-1.5">
                    <span className="text-[10px]">🤖</span>
                  </div>
                  <div className="rounded-2xl rounded-bl-md bg-slate-100/80 px-3.5 py-2.5">
                    <div className="flex gap-1">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: '0ms' }} />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: '150ms' }} />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}

              {/* 流式 AI 回答（打字机效果） */}
              {(isStreaming || displayedText) && (
                <div className="flex justify-start">
                  <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${getMascotGradient()} mr-1.5`}>
                    <span className="text-[10px]">🤖</span>
                  </div>
                  <div className="max-w-[86%] rounded-2xl rounded-bl-md bg-slate-100/80 px-3.5 py-2.5 leading-snug text-[11px] text-slate-700">
                    {displayedText}
                    <span className="inline-block w-1 h-3.5 ml-0.5 bg-blue-400 animate-pulse align-middle" />
                  </div>
                </div>
              )}

              <div ref={msgEndRef} />
            </div>

            {/* ---- 快捷问题栏 ---- */}
            <div className="flex flex-wrap gap-1.5 border-t border-slate-50 px-3 pt-2 pb-1">
              {QUICK_QUESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => sendMessage(q)}
                  className="rounded-full border border-slate-200/60 bg-slate-50/60 px-2.5 py-1
                             text-[10px] text-slate-500 transition-all
                             hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                >
                  {q}
                </button>
              ))}
            </div>

            {/* ---- 签到 + 输入栏 ---- */}
            <div className="flex flex-col gap-1.5 border-t border-slate-100/60 px-3 py-2.5">
              {/* 签到按钮 */}
              {!checkedIn && (
                <button
                  type="button"
                  onClick={handleCheckIn}
                  className="flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-400 to-orange-400
                             px-3 py-1.5 text-[11px] font-bold text-white shadow-sm
                             transition-all hover:shadow-md active:scale-95"
                >
                  <span>📅</span>
                  每日签到 +{XP_ACTIONS.DAILY_LOGIN.xp} XP
                  {progress && progress.streakDays > 0 && (
                    <span className="rounded-full bg-white/20 px-1.5 py-0 text-[9px]">
                      连续{progress.streakDays}天
                    </span>
                  )}
                </button>
              )}
              {checkedIn && (
                <div className="flex items-center justify-center gap-1 rounded-lg bg-emerald-50 px-3 py-1.5 text-[11px] text-emerald-600">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  今日已签到
                  {progress && progress.streakDays > 1 && (
                    <span className="text-emerald-400">· 连续{progress.streakDays}天</span>
                  )}
                </div>
              )}

              <form onSubmit={handleSubmit} className="flex items-center gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="问小探员任何消费问题..."
                  className="flex-1 rounded-full border border-slate-200/60 bg-slate-50/60 px-3.5 py-2
                             text-xs outline-none backdrop-blur
                             transition-all duration-300
                             focus:border-blue-300 focus:bg-white focus:shadow-sm"
                  maxLength={200}
                />
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full
                             bg-gradient-to-br from-blue-400 to-indigo-500 text-white
                             shadow-sm transition-all duration-300
                             hover:-translate-y-0.5 hover:shadow-md
                             disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </button>
              </form>
            </div>
          </div>
        </>
      )}
    </>
  );
}
