'use client';

import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import BookmarkButton, { TopBar } from '../../components/BookmarkButton';
import { submitSearch } from '../../lib/api';

/* ============================================
   类型定义
   ============================================ */
interface ClinicRecommendation {
  productName: string;
  score: number;
  priceRange: string;
  reason: string;
  compromise: string;
  tags?: string[];
}

interface ClinicResult {
  intent: 'recommend';
  userProfile?: string;
  recommendations: ClinicRecommendation[];
}

/* ============================================
   预算档位配置（根据商品类型动态切换）
   ============================================ */
interface BudgetPreset {
  label: string;
  value: number;
  desc: string;
}

// 学生党 / 日用小物
const BUDGET_STUDENT: BudgetPreset[] = [
  { label: '¥30', value: 30, desc: '零食' },
  { label: '¥50', value: 50, desc: '文具' },
  { label: '¥100', value: 100, desc: '日用品' },
  { label: '¥200', value: 200, desc: '入门' },
  { label: '¥500', value: 500, desc: '日常' },
  { label: '不限', value: 0, desc: '' },
];

// 数码电子
const BUDGET_DIGITAL: BudgetPreset[] = [
  { label: '¥100', value: 100, desc: '配件' },
  { label: '¥300', value: 300, desc: '入门' },
  { label: '¥800', value: 800, desc: '实用' },
  { label: '¥1500', value: 1500, desc: '进阶' },
  { label: '¥3000', value: 3000, desc: '品质' },
  { label: '¥8000', value: 8000, desc: '旗舰' },
];

// 家电 / 大件
const BUDGET_HOME: BudgetPreset[] = [
  { label: '¥100', value: 100, desc: '小家电' },
  { label: '¥300', value: 300, desc: '实用型' },
  { label: '¥800', value: 800, desc: '品质' },
  { label: '¥2000', value: 2000, desc: '高端' },
  { label: '¥5000', value: 5000, desc: '旗舰' },
  { label: '不限', value: 0, desc: '' },
];

// 礼品 / 美妆
const BUDGET_GIFT: BudgetPreset[] = [
  { label: '¥50', value: 50, desc: '小礼物' },
  { label: '¥100', value: 100, desc: '心意' },
  { label: '¥300', value: 300, desc: '精致' },
  { label: '¥600', value: 600, desc: '体面' },
  { label: '¥1500', value: 1500, desc: '奢华' },
  { label: '不限', value: 0, desc: '' },
];

// 根据输入文本智能匹配预算档位方案
function detectBudgetPresets(text: string): BudgetPreset[] {
  const lower = text.toLowerCase();
  // 数码电子类
  if (/耳机|耳机|蓝牙|音箱|音响|键盘|鼠标|显示器|平板|手机|电脑|笔记本|微单|相机|充电宝|数据线|手柄|游戏机|switch|ps5|kindle|电子书|智能手表|手环|扫地机器人|无人机|运动相机|投影仪/i.test(text)) {
    return BUDGET_DIGITAL;
  }
  // 家电大件
  if (/吹风机|空气炸锅|微波炉|烤箱|洗衣机|冰箱|空调|风扇|加湿器|净化器|吸尘器|破壁机|豆浆机|电饭煲|热水壶|挂烫机|除湿机|取暖器|电磁炉|榨汁机|咖啡机|面包机|洗碗机|干衣机|饮水机|净水器|马桶盖|按摩椅|跑步机动感单车|椭圆机|划船机|哑铃|瑜伽垫|跳绳|泡沫轴|筋膜枪|体脂秤/i.test(lower)) {
    return BUDGET_HOME;
  }
  // 礼品美妆
  if (/礼物|生日|送.*妈|送.*爸|送.*女|送.*男|女朋友|男朋友|老公|老婆|闺蜜|同事|老师|长辈|父母|妈妈|爸爸|美妆|护肤|化妆品|口红|香水|面膜|精华|面霜|眼霜|防晒|粉底|散粉|眉笔|眼影|睫毛膏|唇釉|身体乳|护手霜|洗面奶|爽肤水|乳液|卸妆水|化妆棉|美甲|假发|饰品|项链|耳环|戒指|手表|包包|钱包|皮带|围巾|帽子|墨镜|领带|胸针|发夹|发箍|头绳|发带/i.test(lower)) {
    return BUDGET_GIFT;
  }
  // 默认学生党档位（覆盖最广）
  return BUDGET_STUDENT;
}
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
  
  // 基于查询内容生成更具体的推荐理由
  const q = query.toLowerCase();
  let reasons: string[];
  let compromises: string[];
  let tags: string[][];
  
  if (/充电宝|移动电源|power/i.test(q)) {
    reasons = [
      `${query} 实测容量达标率超95%，支持PD+QC多协议快充，可同时为手机和平板供电。品牌品控稳定售后网点覆盖广，循环充放电500次后仍保持80%以上容量。`,
      `${query} 大容量设计（20000mAh+）满足全天候户外使用需求，自带Type-C线材出行更便携。过充过放多重保护机制完善，用户反馈故障率低于2%。`,
      `轻量化仅约一个手机重量，适合通勤差旅随身携带。基础快充功能齐全兼容主流设备，入门价位中品质做工相对可靠。`
    ];
    compromises = ['体积偏大不便携携带', '无显示屏无法查看剩余电量', '价格比同类竞品略高', '快充发热量明显'];
    tags = [['大容量'], ['高性价比', '便携'], ['实用']];
  } else if (/耳机|耳麦|降噪|蓝牙/i.test(q)) {
    reasons = [
      `${query} 降噪深度可达35-40dB，音质三频均衡不偏科，佩戴舒适度经过人体工学优化适合长时间使用。蓝牙5.3连接稳定延迟低，续航约30-40小时满足一周一充。`,
      `${query} 在同价位的音质表现突出，低频量感适中不轰头高频自然不刺耳。通话降噪采用双麦克风阵列，嘈杂环境语音清晰度高。`,
      `轻量化设计长时间佩戴不累头，支持多点连接可在手机电脑间无缝切换。基础降噪和音质表现对得起售价，适合初次尝试该品牌的用户。`
    ];
    compromises = ['主动降噪在高频噪音下效果一般', '佩戴超过3小时有压迫感', '不支持LDAC无损传输', 'App功能繁杂学习成本高'];
    tags = [['降噪', '长续航'], ['音质优先'], ['轻便', '入门款']];
  } else {
    reasons = [
      `「${query}」核心参数经市场广泛验证，综合表现在同价位处于中上水平。主要优势：品质稳定性好、售后服务体系完善、用户口碑持续正向。建议关注官方渠道价格波动，促销期入手更划算。`,
      `「${query}」适合对特定功能有明确需求的用户，其差异化亮点在于细分领域专注度较高。相比全能型产品在某些方面更有针对性，但通用性上需适当妥协。`,
      `「${query}」是预算有限时的务实选择，虽然部分非核心指标有所取舍，但基础功能完备可靠能满足大多数日常使用场景，入门体验友好易上手。`
    ];
    compromises = ['部分高级参数在顶级产品前仍有差距', '品牌溢价导致性价比非极致', '某些细节做工和用料有提升空间'];
    tags = [['推荐'], ['高品质'], ['实惠']];
  }
  
  return {
    intent: 'recommend' as const,
    userProfile: `用户预算约 ¥${(seed * 80 + 500).toLocaleString()}，追求性价比与品质的平衡，注重产品实际体验和长期可靠性`,
    recommendations: [
      {
        productName: `${query} 推荐首选`,
        score: 5 + (seed % 3),
        priceRange: `¥${(seed * 50 + 800).toLocaleString()} - ¥${(seed * 100 + 2000).toLocaleString()}`,
        reason: reasons[0],
        compromise: compromises[0 % compromises.length],
        tags: tags[0],
      },
      {
        productName: `${query} 进阶之选`,
        score: 4 + (seed % 4),
        priceRange: `¥${(seed * 80 + 1500).toLocaleString()} - ¥${(seed * 120 + 3500).toLocaleString()}`,
        reason: reasons[1],
        compromise: compromises[1 % compromises.length],
        tags: tags[1] || ['进阶'],
      },
      {
        productName: `${query} 性价比款`,
        score: 6 + (seed % 3),
        priceRange: `¥${(seed * 20 + 300).toLocaleString()} - ¥${(seed * 50 + 900).toLocaleString()}`,
        reason: reasons[2],
        compromise: compromises[2 % compromises.length],
        tags: tags[2] || ['实惠'],
      },
    ],
  };
}

/* ============================================
   本地智能追问兜底（AI 追问失败时使用）
   ============================================ */
function generateFallbackQuestions(query: string, budget: number): { question: string; options: string[] }[] {
  const lower = query.toLowerCase();
  const budgetLabel = budget === 0 ? '不限' : `¥${budget}`;

  // 基于查询内容动态生成追问
  if (/耳机|耳麦|降噪|蓝牙耳机|头戴/i.test(lower)) {
    return [
      { question: '你主要在什么场景使用？', options: ['通勤/办公', '运动/健身', '居家/游戏', '差旅/飞机'] },
      { question: '对降噪能力的要求？', options: ['越强越好（地铁/飞机）', '一般够用即可', '不太看重'] },
      { question: '佩戴舒适度偏好？', options: ['入耳式（轻便）', '头戴式（舒适）', '都可以'] },
    ];
  }
  if (/手机|iphone|华为|小米|安卓|苹果/i.test(lower)) {
    return [
      { question: '你最看重的方面？', options: ['拍照/影像', '性能/游戏', '续航/快充', '外观/手感'] },
      { question: '预算是否可浮动？', options: ['可以加点预算', '必须严格控制在' + budgetLabel, '越便宜越好'] },
    ];
  }
  if (/礼物|生日|送.*妈|送.*爸|女朋友|男朋友|闺蜜/i.test(lower)) {
    return [
      { question: '收礼人的年龄段？', options: ['18-25岁', '26-35岁', '36-50岁', '50岁以上'] },
      { question: 'TA 的风格偏好？', options: ['简约实用风', '时尚颜值党', '科技数码控', '生活品质派'] },
      { question: '你和 TA 的关系？', options: ['情侣/伴侣', '家人/父母', '朋友/同事', '自己用'] },
    ];
  }
  if (/笔记本|电脑|macbook|ipad|平板/i.test(lower)) {
    return [
      { question: '主要用于什么？', options: ['办公/学习', '游戏/娱乐', '专业创作（设计/剪辑）', '便携通勤'] },
      { question: '对屏幕有要求吗？', options: ['高刷+高分辨率', '一般够用就行', '需要触屏'] },
    ];
  }
  if (/吹风机|空气炸锅|吸尘器|扫地机器人|家电/i.test(lower)) {
    return [
      { question: '家里几口人使用？', options: ['1-2人', '3-4人', '5人以上'] },
      { question: '更看重哪方面？', options: ['效率/速度', '静音/低噪', '易清洁/维护', '多功能'] },
    ];
  }

  // 通用默认追问
  return [
    { question: '你的最高预算可以接受到多少？', options: [budgetLabel, `¥${budget + 200} 以内`, `¥${budget * 2} 以内`, '越便宜越好'] },
    { question: '你更看重商品的哪个方面？', options: ['性价比', '品牌/品质', '功能/实用性', '外观/颜值'] },
    { question: '什么时候需要用到？', options: ['越快越好', '一周以内', '不着急，慢慢选'] },
  ];
}

export default function ClinicPage() {
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState(50);
  const [submittedQuery, setSubmittedQuery] = useState('');
  // 动态预算档位（根据输入内容自动切换）
  const [budgetPresets, setBudgetPresets] = useState<BudgetPreset[]>(BUDGET_STUDENT);

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
  const searchParams = useSearchParams();

  // ==================== 从 URL 参数自动触发分析（收藏"查看方案"跳转时）====================
  const autoTriggeredRef = useRef(false);
  useEffect(() => {
    if (autoTriggeredRef.current) return;
    const qParam = searchParams.get('q');
    if (qParam && qParam.trim().length >= 5) {
      autoTriggeredRef.current = true;
      const query = qParam.trim();
      setDescription(query);
      setSubmittedQuery(query);
      // 延迟一点让 UI 先渲染
      setTimeout(() => { doFinalSubmit(query, []); }, 300);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // ==================== 追问 API（调用 aiSearch 云函数生成追问）====================
  const requestFollowUp = async (query: string) => {
    setFollowUpLoading(true);
    try {
      const followUpPrompt = `【AI追问模式】用户想选品："${query}"，预算约 ${budget} 元。
请根据用户需求生成 2-3 个追问问题帮助精准推荐。

严格要求：
- intent 必须是 "followup"
- 输出纯 JSON，不要 Markdown
- questions 数组必须包含 2-3 个问题
- 每个问题必须有 question 和 options(至少2个选项)`;

      const res = await submitSearch(followUpPrompt);
      if (res.status !== 'done' || !res.data) {
        console.warn(`[Clinic] 追问 AI 返回异常，使用本地兜底追问`);
        const fallbackQs = generateFallbackQuestions(query, budget);
        setDynamicQuestions(fallbackQs);
        setFollowUpStep(1);
        return;
      }
      // 从 AI 返回中提取 questions
      const data = res.data as any;
      const questions = data.questions || (data.data && data.data.questions);
      if (questions && Array.isArray(questions) && questions.length >= 1) {
        // 校验每个 question 都有有效的 question 和 options
        const validQuestions = questions.filter((q: any) =>
          q && typeof q.question === 'string' && q.question.trim().length > 0 &&
          Array.isArray(q.options) && q.options.length >= 2
        );
        if (validQuestions.length >= 1) {
          setDynamicQuestions(validQuestions);
          setFollowUpStep(1);
        } else {
          console.warn(`[Clinic] AI 追问格式校验失败，使用本地兜底`);
          const fallbackQs = generateFallbackQuestions(query, budget);
          setDynamicQuestions(fallbackQs);
          setFollowUpStep(1);
        }
      } else {
        console.warn(`[Clinic] AI 未返回有效 questions，使用本地兜底追问`);
        const fallbackQs = generateFallbackQuestions(query, budget);
        setDynamicQuestions(fallbackQs);
        setFollowUpStep(1);
      }
    } catch (err: any) {
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
      const res = await submitSearch(prompt);
      if (res.status !== 'done' || !res.data) {
        throw new Error(res.error || 'AI 返回数据不完整');
      }
      const data = res.data as any;
      // 校验：如果 AI 返回的 intent 不是 recommend，使用本地兜底
      if (data.intent !== 'recommend' || !Array.isArray(data.recommendations) || data.recommendations.length === 0) {
        console.warn('[Clinic] AI 返回数据异常 intent=' + data.intent + '，使用本地兜底推荐');
        const localData = generateLocalClinicResult(query);
        setResult(localData);
        setIsFallback(true);
        setAnalyzingBridge(false);
        return;
      }
      setResult(res.data as ClinicResult);
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

  // ==================== 根据输入内容智能切换预算档位 ====================
  useEffect(() => {
    if (description.trim().length >= 2) {
      const presets = detectBudgetPresets(description);
      setBudgetPresets(presets);
      // 如果当前预算不在新档位范围内，自动选中该方案第一个合理档位
      const validValues = presets.filter(p => p.value > 0).map(p => p.value);
      if (!validValues.includes(budget) && budget !== 0) {
        const firstPreset = presets.find(p => p.value > 0);
        if (firstPreset) setBudget(firstPreset.value);
      }
    }
  }, [description]); // eslint-disable-line react-hooks/exhaustive-deps

  // ==================== 重试（清空结果重新开始）====================
  const handleRetry = () => {
    setResult(null);
    setError(null);
    setIsFallback(false);
    setFollowUpStep(0);
    setFollowUpAnswers([]);
    setDynamicQuestions([]);
    setDescription('');
    setBudget(50);
    setBudgetPresets(BUDGET_STUDENT);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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

                  {/* 标签展示 */}
                  {rec?.tags && Array.isArray(rec.tags) && rec.tags.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-1">
                      {rec.tags.map((tag: string, ti: number) => (
                        <span key={ti} className="rounded-md bg-purple-50 px-2 py-0.5 text-[10px] font-medium text-purple-600">
                          {tag}
                        </span>
                      ))}
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
                  {/* 标签 */}
                  {rec?.tags && Array.isArray(rec.tags) && rec.tags.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-1">
                      {rec.tags.map((tag: string, ti: number) => (
                        <span key={ti} className="rounded-md bg-purple-50 px-2 py-0.5 text-[10px] font-medium text-purple-600">{tag}</span>
                      ))}
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
          backLabel={hasResult ? '↻ 重试' : '← 返回首页'}
          onBackAction={hasResult ? handleRetry : undefined}
          showBookmark={hasResult}
          bookmarkName={`选品推荐: ${description.slice(0, 30)}`}
          bookmarkUrl={`/clinic?q=${encodeURIComponent(description)}`}
          bookmarkType="clinic"
          bookmarkData={result || undefined}
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
                : '描述你的需求...\n\n例如：\n- 学生党，预算50以内想买个好用的充电宝\n- 想给女朋友买个100以内的生日礼物\n- 预算200以内，降噪耳机推荐，通勤用\n- 我是摄影新手，第一台微单预算3000左右'
            }
            rows={hasResult ? 3 : 5}
            maxLength={500}
            className="w-full resize-none bg-transparent px-5 py-4 text-sm leading-relaxed text-slate-900 placeholder-slate-400 outline-none"
            disabled={isLoading}
          />

          {/* 预算滑块（优化设计：预设档位 + 精细滑块） */}
          <div className="border-t border-slate-50 px-5 py-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-medium text-slate-500">💰 预算范围</span>
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-bold text-slate-900">¥{budget.toLocaleString()}</span>
                {budget === 0 && <span className="text-[10px] text-slate-400">(不限)</span>}
              </div>
            </div>

            {/* 预设预算档位按钮（根据输入内容自动切换） */}
            <div className="mb-2.5 flex flex-wrap gap-1.5">
              {budgetPresets.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => setBudget(preset.value)}
                  className={`rounded-lg px-2.5 py-1 text-[10px] font-medium transition-all ${
                    budget === preset.value
                      ? 'bg-purple-500 text-white shadow-sm shadow-purple-200'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  {preset.label}
                  {preset.desc && (
                    <span className={`ml-0.5 ${budget === preset.value ? 'text-purple-200' : 'text-slate-400'}`}>
                      {preset.desc}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* 自定义滑条（范围随档位自适应） */}
            {(() => {
              const maxVal = Math.max(...budgetPresets.map(p => p.value), 200);
              const sliderMax = Math.max(maxVal * 3, 500);
              return (
                <>
                  <input
                    type="range"
                    min={0}
                    max={sliderMax}
                    step={Math.max(Math.floor(sliderMax / 50), 10)}
                    value={budget}
                    onChange={(e) => setBudget(Number(e.target.value))}
                    className="w-full h-1.5 rounded-full appearance-none bg-slate-200 cursor-pointer"
                    style={{ accentColor: '#8b5cf6' }}
                  />
                  <div className="flex justify-between mt-0.5">
                    <span className="text-[9px] text-slate-400">¥0</span>
                    <span className="text-[9px] text-slate-400">¥{sliderMax.toLocaleString()}</span>
                  </div>
                </>
              );
            })()}
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
            '学生党50以内充电宝',
            '100以内生日礼物女生',
            '预算200降噪耳机通勤',
            '不伤发质吹风机推荐',
            '3000内入门微单相机',
            '高颜值空气炸锅500内',
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
