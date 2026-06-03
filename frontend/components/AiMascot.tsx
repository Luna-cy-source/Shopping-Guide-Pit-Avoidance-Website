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
   AI 小探员 — 轻量优化版（含本地知识库）
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

/* ---------- 本地知识库：热门商品避坑摘要 ---------- */
interface KnowledgeEntry {
  keywords: string[];
  reply: string;
}

const KNOWLEDGE_BASE: KnowledgeEntry[] = [
  {
    keywords: ['sk-ii', 'sk2', 'skii', '神仙水', 'pitera'],
    reply: `🔬 SK-II 神仙水 避坑指南：

💰 市场价：¥900-1500（230ml）
⭐ 综合评分：7.5/10

✅ 确实有效的点：
• 核心成分 Pitera（酵母发酵产物）有保湿+轻微剥脱效果
• 油皮/混油皮用户反馈普遍较好
• 长期使用肤质确实会变细腻

⚠️ 但要注意：
• 价格虚高 — 同类成分的平替很多（如 Olay 小白瓶系列）
• 干皮/敏感皮可能不耐受（含多种防腐剂和香精）
• 「28天奇迹」是营销话术 — 实际需要3-6个月
• 假货泛滥，代购渠道风险高

💡 建议：预算充足可以入，但别指望它「逆天改命」。更推荐先买30ml小样试用。

→ 🔍 去「单品检测」看完整报告`,
  },
  {
    keywords: ['戴森', 'dyson', '吹风机', 'supersonic'],
    reply: `🔬 戴森吹风机 避坑指南：

💰 官方价：¥2990-3290
⭐ 综合评分：7/10

✅ 技术亮点：
• 中空马达设计确实耐用（数字马达寿命更长）
• 智能温控不烫头皮是真的
• 风量大、干发速度快

⚠️ 但是：
• ¥3000的价格 ≈ 10台普通高速吹风机
• 「护发效果」被夸大 — 本质还是风筒，不能替代护发素
• 配件生态是个坑（各种风嘴单独收费）
• 新款和老款差异极小，不用追新

💡 性价比替代方案：
• 徕芬 / 直白 / 松下 — ¥300-800价位体验已经接近90%
• 如果预算有限，¥200+的高速吹风机也够用

→ 🥊 去「1v1对比」看看同价位PK`,
  },
  {
    keywords: ['iphone', '苹果', '验机', '二手iphone', '二手苹果'],
    reply: `📱 二手 iPhone 验机完整流程：

✅ 第1步：外观检查
• 查看边框是否有磕碰/掉漆
• 充电口是否有异常磨损（频繁充电痕迹）
• 屏幕显示是否有坏点/老化发黄

✅ 第2步：序列号核对
• 设置 → 通用 → 关于本机 → 序列号
• 去 apple.com/cn/check-coverage 查询激活日期和保修状态
• ⚠️ 激活日期 ≠ 购买日期，但如果未激活说明是新机

✅ 第3步：硬件功能测试
• Face ID / Touch ID 解锁是否流畅
• 所有摄像头拍照/录像测试
• WiFi / 蓝牙 / GPS 全部开启测试
• 扬声器播放最大音量有无杂音
• 充电口插拔是否松动

✅ 第4步：系统检查
• 设置 → 电池 → 电池健康度（低于85%要谨慎）
• 检查「查找我的iPhone」是否关闭（必须关才能激活）
• 恢复出厂设置后重新激活，确认无ID锁

🚨 红色警报信号：
• 价格远低于市场行情（如 iPhone 15 Pro 只要¥4000）
• 无法提供购买凭证/包装盒
• 序列号查询显示「更换过零件」或「非正品」

→ 🔍 更多细节去「单品检测」输入具体型号`,
  },
  {
    keywords: ['智商税', '套路', '新套路', '消费陷阱', '避坑', '最近'],
    reply: `🔥 近期高发消费套路盘点：

1️⃣ 「AI赋能」万物
几乎所有产品都开始蹭 AI 概念 — AI梳子、AI枕头、AI袜子...99%都是加了简单传感器的普通商品，溢价200%-500%。

2️⃣ 「成分党」营销反噬
品牌疯狂堆砌成分表，但实际添加量可能只有百万分之一。看配方表比看广告靠谱100倍。

3️⃣ 直播间「限时秒杀」剧本
「只剩最后50单」— 其实库存几千件。用紧迫感逼你冲动消费。

4️⃣ 「免费试用」钓鱼
付邮费送试用装，然后自动开通会员扣费。仔细读条款！

5️⃣ 「国货之光」情怀绑架
打着国货旗号卖高价低质产品。支持国货≠无脑买单。

6️⃣ 订阅制陷阱
「首月¥9.9」后面每月¥49.9 自动续费。很多人忘了取消扣了大半年。

💡 想查某个具体商品？直接告诉我名字，或者用上方 🔍单品检测 功能！

→ 📉 去「黑榜」查看更多曝光案例`,
  },
];

/* 快捷问题 */
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

  /* ---------- 本地知识库匹配 ---------- */
  const matchKnowledge = useCallback((query: string): KnowledgeEntry | null => {
    const q = query.toLowerCase();
    for (const entry of KNOWLEDGE_BASE) {
      if (entry.keywords.some(kw => q.includes(kw))) return entry;
    }
    return null;
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

    /* ---- 第1步：本地知识库命中 → 直接回复 ---- */
    const kbMatch = matchKnowledge(text);
    if (kbMatch) {
      streamingTargetRef.current = kbMatch.reply;
      await waitForTypewriter();
      stopStreaming();
      setMood('happy');
      setMessages((prev) => [...prev, { role: 'bot', text: kbMatch.reply }]);
      setTimeout(() => setMood('normal'), 4000);
      return;
    }

    /* ---- 第2步：尝试后端流式接口 ---- */
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);
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
        { role: 'bot', text: fullText.trim() || getSmartFallback(text) },
        { role: 'bot', text: `💡 想看更完整的深度报告？\n👇 用 🔍单品检测 或 🥊1v1对比` },
      ]);
      setTimeout(() => setMood('normal'), 3000);

    } catch (err) {
      console.error('小探员请求失败:', err);
      stopStreaming();
      setMood('happy');
      setMessages((prev) => [...prev, { role: 'bot', text: getSmartFallback(text) }]);
      setTimeout(() => setMood('normal'), 3000);
    }
  }, [input, startStreaming, stopStreaming, waitForTypewriter, matchKnowledge]);

  /* ---------- 智能兜底回复（根据问题类型生成） ---------- */
  function getSmartFallback(query: string): string {
    const q = query.toLowerCase();

    // 值不值得买类
    if (/值得|推荐|性价比|买不|好不好|怎么样|评价/.test(q)) {
      return `关于「${query}」的问题我收到了！\n\n目前这个商品还没有收录进我的深度数据库 😅\n\n你可以试试：\n• 🔍 首页「单品检测」输入完整名称，我会调用 AI 引擎做全面分析\n• 🥊 如果在纠结多款产品，用「1v1对比」直接 PK\n• 📉 不确定的话先去「黑榜」看看有没有人踩过坑`;
    }

    // 怎么做/教程类
    if (/怎么|如何|方法|技巧|教程|步骤|流程/.test(q)) {
      return `好问题！「${query}」属于操作指南类型的内容。\n\n我的强项是帮你分析商品值不值得买、有没有消费套路 💡\n\n建议你去对应的功能模块看看：\n• 二手验机 → 「二手检测」功能有详细流程\n• 避坑攻略 → 「黑榜」「曝光」板块有很多真实案例\n• 如果是具体商品，直接告诉我名字，我用知识库帮你查`;
    }

    // 是什么/解释类
    if (/什么是|啥是|什么叫|含义|意思|区别|和.*区别|vs|对比/.test(q)) {
      return `「${query}」这个问题很有意思！\n\n不过目前我手头的资料还不够全面回答这个问题。😕\n\n💡 小建议：\n• 去 🔍「单品检测」搜一下相关关键词，可能有现成的对比分析\n• 或者用 🥊「1v1对比」把两样东西放在一起比一比\n• 实在不行就去 📉「黑榜」看看有没有相关的避坑信息`;
    }

    // 默认友好回复
    const templates = [
      `收到你的问题「${query}」！📝\n\n我正在努力扩充知识库，暂时还没有这方面的详细数据。\n\n不过你可以试试这些方式获取答案：\n• 👆 上方快捷入口一键跳转\n• 🔍 单品检测 — AI 深度分析任何商品\n• 🥊 1v1 对比 — 两款产品正面 PK`,
      `「${query}」— 这个话题很值得深挖！⛏️\n\n目前我的离线知识库还没有覆盖到这块内容。不过别担心：\n\n✅ 首页的 🔍单品检测 功能支持任意商品查询，由 AI 引擎实时分析，结果比我的知识库更新更全面！`,
    ];
    return templates[Math.floor(Math.random() * templates.length)];
  }

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
