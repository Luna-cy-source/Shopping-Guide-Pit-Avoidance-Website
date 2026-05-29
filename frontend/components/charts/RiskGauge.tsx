'use client';

import { useMemo } from 'react';

// ============================================
// Props
// ============================================
interface RiskGaugeProps {
  score?: number | null;
}

// ============================================
// 状态映射：0-10 分 → 标签/颜色
// ============================================
function getStatus(value: number) {
  if (value < 4) return { label: '高风险', color: '#ef4444', gradientId: 'gradRed' } as const;
  if (value < 7) return { label: '一般',   color: '#f59e0b', gradientId: 'gradAmber' } as const;
  return            { label: '低风险', color: '#10b981', gradientId: 'gradGreen' } as const;
}

function getRecommendation(value: number) {
  if (value < 4) return { label: '不推荐', color: '#ef4444' } as const;
  if (value < 7) return { label: '谨慎',   color: '#f59e0b' } as const;
  return            { label: '推荐',   color: '#10b981' } as const;
}

// ============================================
// SVG 辅助函数
// ============================================
function angleToPos(cx: number, cy: number, r: number, rad: number) {
  return { x: cx + r * Math.cos(rad), y: cy - r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, r: number, fromRad: number, toRad: number): string {
  const s = angleToPos(cx, cy, r, fromRad);
  const e = angleToPos(cx, cy, r, toRad);
  const largeArc = Math.abs(toRad - fromRad) > Math.PI ? 1 : 0;
  const sweep = 1; // 顺时针: 180° → 0°（走下半周，标准仪表盘方向）
  return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 ${largeArc} ${sweep} ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
}

// ============================================
// 布局常量
// ============================================
const SIZE       = 320;
const CX         = 160;
const CY         = 185;
const ARC_R      = 105;
const STROKE_W   = 24;
const FACE_R     = 124;
const BEZEL_R    = 134;
const MAX_SCORE  = 10;

const TRACK_INNER = ARC_R - STROKE_W / 2;
const TRACK_OUTER = ARC_R + STROKE_W / 2;

// 三段颜色分段（角度制: 180°→0°，对应 0-10 分）
const SEGMENTS = [
  { fromDeg: 180, toDeg: 108, color: '#ef4444', gradId: 'gradRed',    glowColor: 'rgba(239,68,68,0.35)' },
  { fromDeg: 108, toDeg: 54,  color: '#f59e0b', gradId: 'gradAmber',  glowColor: 'rgba(245,158,11,0.35)' },
  { fromDeg: 54,  toDeg: 0,   color: '#10b981', gradId: 'gradGreen',  glowColor: 'rgba(16,185,129,0.35)' },
];

// ============================================
// 主组件
// ============================================
export function RiskGauge({ score }: RiskGaugeProps) {

  // ── 无数据 / partial data → Loading 动画 ──
  if (score == null || Number.isNaN(score)) {
    return <LoadingGauge />;
  }

  // score 可能是 0-100（百分制）或 0-10（十分制）
  // 如果 > 10 则认为是百分制，需要除以 10
  const rawScore = score > 10 ? score / 10 : score;
  const gaugeValue = Math.min(MAX_SCORE, Math.max(0, rawScore));
  const status     = getStatus(gaugeValue);

  // 指针角度 (180°→0° 顺时针)
  const pointerRad = Math.PI * (1 - gaugeValue / MAX_SCORE);

  // ── 刻度线：每 0.2 分细线，每 1 分粗线 + 标签 ──
  const ticks = useMemo(() => {
    const items: { rad: number; coarse: boolean; label?: string }[] = [];
    for (let i = 0; i <= MAX_SCORE; i += 0.2) {
      const coarse = Math.abs(i % 1) < 0.01;
      const rad    = Math.PI * (1 - i / MAX_SCORE);
      items.push({ rad, coarse, label: coarse ? `${Math.round(i)}` : undefined });
    }
    return items;
  }, []);

  // ── 指针几何 ──
  const pointerTip   = angleToPos(CX, CY, ARC_R - 3, pointerRad);
  const pointerTail  = angleToPos(CX, CY, 22, pointerRad + Math.PI);
  const pointerBaseL = angleToPos(CX, CY, 7, pointerRad - Math.PI / 2);
  const pointerBaseR = angleToPos(CX, CY, 7, pointerRad + Math.PI / 2);

  // ── 四角装饰螺钉 ──
  const screws = [
    { x: CX - 94, y: CY - 94 },
    { x: CX + 94, y: CY - 94 },
    { x: CX - 94, y: CY + 50 },
    { x: CX + 94, y: CY + 50 },
  ];

  // ── 中心显示面板 ──
  const panelTop    = CY + 26;
  const panelHeight = 62;
  const panelWidth  = 100;
  const panelRx     = 16;

  return (
    <div className="relative flex flex-col items-center select-none"
      style={{ filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.08))' }}>
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        width={300}
        height={300}
        role="img"
        aria-label={`避坑评分 ${gaugeValue.toFixed(1)} 分 — ${status.label}`}
      >
        <defs>
          {/* 红色段渐变 */}
          <linearGradient id="gradRed" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#991b1b" />
            <stop offset="15%"  stopColor="#dc2626" />
            <stop offset="35%"  stopColor="#ef4444" />
            <stop offset="60%"  stopColor="#f87171" />
            <stop offset="85%"  stopColor="#fca5a5" />
            <stop offset="100%" stopColor="#fecaca" />
          </linearGradient>

          {/* 黄色段渐变 */}
          <linearGradient id="gradAmber" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#92400e" />
            <stop offset="15%"  stopColor="#d97706" />
            <stop offset="35%"  stopColor="#f59e0b" />
            <stop offset="60%"  stopColor="#fbbf24" />
            <stop offset="85%"  stopColor="#fcd34d" />
            <stop offset="100%" stopColor="#fef08a" />
          </linearGradient>

          {/* 绿色段渐变 */}
          <linearGradient id="gradGreen" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#065f46" />
            <stop offset="15%"  stopColor="#059669" />
            <stop offset="35%"  stopColor="#10b981" />
            <stop offset="60%"  stopColor="#34d399" />
            <stop offset="85%"  stopColor="#6ee7b7" />
            <stop offset="100%" stopColor="#a7f3d0" />
          </linearGradient>

          {/* 镀铬指针渐变 */}
          <linearGradient id="gradPointer" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor="#9ca3af" />
            <stop offset="20%"  stopColor="#d1d5db" />
            <stop offset="35%"  stopColor="#f9fafb" />
            <stop offset="45%"  stopColor="#6b7280" />
            <stop offset="60%"  stopColor="#9ca3af" />
            <stop offset="100%" stopColor="#374151" />
          </linearGradient>

          {/* 指针配重渐变 */}
          <radialGradient id="gradCounterweight" cx="40%" cy="35%" r="55%">
            <stop offset="0%"   stopColor="#f3f4f6" />
            <stop offset="50%"  stopColor="#9ca3af" />
            <stop offset="100%" stopColor="#374151" />
          </radialGradient>

          {/* 金属表圈渐变 */}
          <linearGradient id="gradBezel" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor="#e5e7eb" />
            <stop offset="15%"  stopColor="#f9fafb" />
            <stop offset="30%"  stopColor="#d1d5db" />
            <stop offset="50%"  stopColor="#9ca3af" />
            <stop offset="65%"  stopColor="#d1d5db" />
            <stop offset="85%"  stopColor="#f3f4f6" />
            <stop offset="100%" stopColor="#9ca3af" />
          </linearGradient>

          {/* 表圈内环高光 */}
          <linearGradient id="gradBezelInner" x1="100%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%"   stopColor="#9ca3af" />
            <stop offset="50%"  stopColor="#f3f4f6" />
            <stop offset="100%" stopColor="#d1d5db" />
          </linearGradient>

          {/* 表盘底板渐变 */}
          <radialGradient id="gradFace" cx="48%" cy="42%" r="58%">
            <stop offset="0%"   stopColor="#fafbfc" />
            <stop offset="55%"  stopColor="#f3f4f6" />
            <stop offset="90%"  stopColor="#e5e7eb" />
            <stop offset="100%" stopColor="#d1d5db" />
          </radialGradient>

          {/* 中心面板磨砂背景 */}
          <linearGradient id="gradPanel" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor="rgba(255,255,255,0.75)" />
            <stop offset="40%"  stopColor="rgba(255,255,255,0.55)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.30)" />
          </linearGradient>

          {/* 玻璃面板反光斜条 */}
          <linearGradient id="gradGlassSheen" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor="rgba(255,255,255,0.45)" />
            <stop offset="45%"  stopColor="rgba(255,255,255,0.08)" />
            <stop offset="55%"  stopColor="rgba(255,255,255,0.0)"  />
            <stop offset="100%" stopColor="rgba(255,255,255,0.0)"  />
          </linearGradient>

          {/* SVG 滤镜 */}
          <filter id="grooveShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur" />
            <feOffset dx="0" dy="3" in="blur" result="offset" />
            <feFlood floodColor="rgba(0,0,0,0.35)" result="color" />
            <feComposite operator="in" in2="offset" in="color" result="shadow" />
            <feComposite operator="over" in2="SourceGraphic" in="shadow" />
          </filter>

          <filter id="trackHighlight" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="1.5" result="blur" />
            <feOffset dx="0" dy="-2" in="blur" result="offset" />
            <feFlood floodColor="rgba(255,255,255,0.45)" result="color" />
            <feComposite operator="in" in2="offset" in="color" result="highlight" />
            <feComposite operator="over" in2="SourceGraphic" in="highlight" />
          </filter>

          <filter id="engrave" x="-30%" y="-30%" width="160%" height="160%">
            <feOffset dx="0" dy="1" in="SourceAlpha" result="offDark" />
            <feGaussianBlur stdDeviation="0.6" in="offDark" result="blurDark" />
            <feFlood floodColor="rgba(0,0,0,0.25)" result="colorDark" />
            <feComposite operator="in" in2="blurDark" in="colorDark" result="shadowDark" />
            <feOffset dx="0" dy="-1" in="SourceAlpha" result="offLight" />
            <feGaussianBlur stdDeviation="0.6" in="offLight" result="blurLight" />
            <feFlood floodColor="rgba(255,255,255,0.5)" result="colorLight" />
            <feComposite operator="in" in2="blurLight" in="colorLight" result="shadowLight" />
            <feMerge>
              <feMergeNode in="shadowDark" />
              <feMergeNode in="shadowLight" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="pointerShadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="2" dy="3" stdDeviation="3" floodColor="rgba(0,0,0,0.3)" />
          </filter>

        </defs>

        {/* 1. 外层金属表圈（无 SVG filter，阴影已移到外层 div） */}
        <circle cx={CX} cy={CY} r={BEZEL_R} fill="none" stroke="url(#gradBezel)" strokeWidth="10" />
        <circle cx={CX} cy={CY} r={BEZEL_R - 4} fill="none" stroke="url(#gradBezelInner)" strokeWidth="1.2" />
        <circle cx={CX} cy={CY} r={BEZEL_R + 4} fill="none" stroke="rgba(0,0,0,0.12)" strokeWidth="0.8" />

        {/* 2. 表盘底板 */}
        <circle cx={CX} cy={CY} r={FACE_R} fill="url(#gradFace)" />
        <circle cx={CX} cy={CY} r={FACE_R} fill="rgba(255,255,255,0.25)" />
        <circle cx={CX} cy={CY} r={FACE_R} fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="1.5" />

        {/* 3. 轨道凹槽背景 */}
        <path
          d={arcPath(CX, CY, ARC_R, Math.PI, 0)}
          fill="none"
          stroke="rgba(0,0,0,0.12)"
          strokeWidth={STROKE_W + 2}
          strokeLinecap="butt"
        />

        {/* 4. 三段彩色轨道 */}
        <g>
          {SEGMENTS.map((seg) => {
            const rFrom = (seg.fromDeg / 180) * Math.PI;
            const rTo   = (seg.toDeg   / 180) * Math.PI;
            const padS  = rFrom + 0.025;
            const padE  = Math.max(0, rTo - 0.025);
            return (
              <path
                key={seg.gradId}
                d={arcPath(CX, CY, ARC_R, padS, padE)}
                fill="none"
                stroke={`url(#${seg.gradId})`}
                strokeWidth={STROKE_W}
                strokeLinecap="butt"
              />
            );
          })}
        </g>

        {/* 轨道薄高光线 */}
        <g filter="url(#trackHighlight)">
          <path
            d={arcPath(CX, CY, ARC_R - 2, Math.PI, 0)}
            fill="none"
            stroke="rgba(255,255,255,0.15)"
            strokeWidth="2"
            strokeLinecap="butt"
          />
        </g>

        {/* 5. 刻度线（雕刻质感）*/}
        <g filter="url(#engrave)">
          {ticks.map((tick, i) => {
            const outerPad = tick.coarse ? -1 : 1.5;
            const innerPad = tick.coarse ? 10 : 6;
            const start = angleToPos(CX, CY, TRACK_OUTER - outerPad,  tick.rad);
            const end   = angleToPos(CX, CY, TRACK_INNER + innerPad, tick.rad);
            return (
              <g key={i}>
                <line
                  x1={start.x} y1={start.y}
                  x2={end.x}   y2={end.y}
                  stroke={tick.coarse ? '#6b7280' : '#c4c9d0'}
                  strokeWidth={tick.coarse ? 2.0 : 0.9}
                  strokeLinecap="round"
                />
                {tick.coarse && (
                  <circle cx={end.x} cy={end.y} r="1.6" fill="#6b7280" />
                )}
                {tick.coarse && tick.label !== undefined && (
                  <text
                    x={angleToPos(CX, CY, TRACK_INNER + 6 + 14, tick.rad).x}
                    y={angleToPos(CX, CY, TRACK_INNER + 6 + 14, tick.rad).y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="#4b5563"
                    fontSize="10"
                    fontWeight="600"
                    fontFamily="'Inter', system-ui, -apple-system, sans-serif"
                  >
                    {tick.label}
                  </text>
                )}
              </g>
            );
          })}
        </g>

        {/* 6. 四角装饰螺钉 */}
        {screws.map((screw, i) => (
          <g key={`screw-${i}`}>
            <circle cx={screw.x} cy={screw.y} r="5" fill="rgba(0,0,0,0.12)" />
            <circle cx={screw.x} cy={screw.y} r="4.5" fill="rgba(0,0,0,0.06)" />
            <circle cx={screw.x} cy={screw.y} r="3.5" fill="url(#gradBezel)" />
            <line
              x1={screw.x - 2} y1={screw.y}
              x2={screw.x + 2} y2={screw.y}
              stroke="rgba(0,0,0,0.35)"
              strokeWidth="0.9"
              strokeLinecap="round"
            />
            <circle cx={screw.x - 0.6} cy={screw.y - 0.8} r="1.2" fill="rgba(255,255,255,0.4)" />
          </g>
        ))}

        {/* 7. 指针 */}
        <g filter="url(#pointerShadow)">
          <polygon
            points={`
              ${pointerTip.x.toFixed(1)},${pointerTip.y.toFixed(1)}
              ${pointerBaseL.x.toFixed(1)},${pointerBaseL.y.toFixed(1)}
              ${CY - 1},${CY}
              ${pointerBaseR.x.toFixed(1)},${pointerBaseR.y.toFixed(1)}
            `}
            fill="url(#gradPointer)"
            stroke="#374151"
            strokeWidth="0.4"
          />
          <line
            x1={CX} y1={CY}
            x2={pointerTip.x} y2={pointerTip.y}
            stroke="rgba(255,255,255,0.55)"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
          <circle cx={pointerTip.x} cy={pointerTip.y} r="1.8" fill="rgba(255,255,255,0.6)" />
          <circle cx={pointerTail.x} cy={pointerTail.y} r="7.5" fill="url(#gradCounterweight)" />
          <circle cx={pointerTail.x} cy={pointerTail.y} r="7.5" fill="none" stroke="#374151" strokeWidth="0.6" />
          <circle cx={CX} cy={CY} r="13" fill="#4b5563" stroke="#1f2937" strokeWidth="1" />
          <circle cx={CX} cy={CY} r="9" fill="#6b7280" />
          <circle cx={CX} cy={CY} r="5" fill="#9ca3af" />
          <circle cx={CX - 2} cy={CY - 2.5} r="2.5" fill="rgba(255,255,255,0.5)" />
          <circle cx={CX} cy={CY} r="12.5" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="0.6" />
        </g>

        {/* 8. 玻璃反射高光 */}
        <ellipse
          cx={CX - 40} cy={CY - 60}
          rx={50} ry={18}
          fill="rgba(255,255,255,0.09)"
          transform={`rotate(-20, ${CX - 40}, ${CY - 60})`}
        />

        {/* 9. 中心显示面板 */}
        <g filter="url(#panelInnerShadow)">
          <rect
            x={CX - panelWidth / 2}
            y={panelTop}
            width={panelWidth}
            height={panelHeight}
            rx={panelRx}
            fill="url(#gradPanel)"
            stroke="rgba(255,255,255,0.5)"
            strokeWidth="0.8"
            filter="url(#frostedGlass)"
          />
          <rect
            x={CX - panelWidth / 2}
            y={panelTop}
            width={panelWidth}
            height={panelHeight}
            rx={panelRx}
            fill="none"
            stroke="rgba(0,0,0,0.08)"
            strokeWidth="1"
          />
        </g>

        {/* 10. 面板内：分数、/10、状态 */}
        <text
          x={CX - 14}
          y={panelTop + 25}
          textAnchor="end"
          dominantBaseline="central"
          fill="#111827"
          fontSize="30"
          fontWeight="800"
          fontFamily="'Inter', system-ui, -apple-system, sans-serif"
          letterSpacing="-1.5"
        >
          {gaugeValue.toFixed(1)}
        </text>
        <text
          x={CX - 8}
          y={panelTop + 16}
          textAnchor="start"
          dominantBaseline="central"
          fill="#9ca3af"
          fontSize="12"
          fontWeight="600"
          fontFamily="system-ui, sans-serif"
        >
          /10
        </text>
        <text
          x={CX}
          y={panelTop + 46}
          textAnchor="middle"
          dominantBaseline="central"
          fill={status.color}
          fontSize="13"
          fontWeight="700"
          fontFamily="system-ui, sans-serif"
          letterSpacing="2.5"
        >
          {status.label}
        </text>
        <line
          x1={CX - 32}
          y1={panelTop + 33}
          x2={CX + 32}
          y2={panelTop + 33}
          stroke="rgba(0,0,0,0.06)"
          strokeWidth="0.8"
        />

        {/* 11. 玻璃面板对角线反光 */}
        <rect
          x={CX - panelWidth / 2 + 4}
          y={panelTop + 2}
          width={panelWidth - 8}
          height={panelHeight / 3}
          rx={panelRx - 2}
          fill="url(#gradGlassSheen)"
          opacity="0.5"
        />
      </svg>

      {/* 底部状态标签：风险等级 + 推荐意见 */}
      <div className="mt-3 flex items-center justify-center gap-2.5">
        <span
          className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold shadow-sm"
          style={{ color: status.color }}
        >
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: status.color }}
          />
          {status.label}
        </span>
        <span
          className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold shadow-sm"
          style={{ color: getRecommendation(gaugeValue).color }}
        >
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: getRecommendation(gaugeValue).color }}
          />
          {getRecommendation(gaugeValue).label}
        </span>
      </div>
    </div>
  );
}

// ============================================================
// Loading / Partial Data 动画态
// ============================================================
const loadingStyles = `
@keyframes gaugePulse {
  0%, 100% { opacity: 0.3; }
  50%      { opacity: 0.6; }
}
`;

function LoadingGauge() {
  const scanLen = Math.round(ARC_R * Math.PI);

  return (
    <div className="relative flex flex-col items-center select-none"
      style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.06))' }}>
      <style>{loadingStyles}</style>
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        width={300}
        height={300}
        role="img"
        aria-label="评分数据加载中"
      >
        <defs>
          <linearGradient id="gradSweep" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#9ca3af" stopOpacity="0"   />
            <stop offset="30%"  stopColor="#9ca3af" stopOpacity="0.3" />
            <stop offset="70%"  stopColor="#9ca3af" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#9ca3af" stopOpacity="0"   />
          </linearGradient>
          <linearGradient id="gradBezel2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor="#e5e7eb" />
            <stop offset="50%"  stopColor="#d1d5db" />
            <stop offset="100%" stopColor="#9ca3af" />
          </linearGradient>
          <radialGradient id="gradFace2" cx="48%" cy="42%" r="58%">
            <stop offset="0%"   stopColor="#f9fafb" />
            <stop offset="100%" stopColor="#f3f4f6" />
          </radialGradient>
          <linearGradient id="gradPanel2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor="rgba(255,255,255,0.7)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.25)" />
          </linearGradient>
        </defs>

        <circle cx={CX} cy={CY} r={BEZEL_R} fill="none" stroke="url(#gradBezel2)" strokeWidth="10" />
        <circle cx={CX} cy={CY} r={FACE_R} fill="url(#gradFace2)" />
        <circle cx={CX} cy={CY} r={FACE_R} fill="rgba(255,255,255,0.18)" />
        <circle cx={CX} cy={CY} r={FACE_R} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="1.5" />

        {SEGMENTS.map((seg) => {
          const rFrom = (seg.fromDeg / 180) * Math.PI;
          const rTo   = (seg.toDeg   / 180) * Math.PI;
          return (
            <path
              key={seg.gradId}
              d={arcPath(CX, CY, ARC_R, rFrom, rTo)}
              fill="none"
              stroke="#e5e7eb"
              strokeWidth={STROKE_W}
              strokeLinecap="butt"
            />
          );
        })}

        <path
          d={arcPath(CX, CY, ARC_R, Math.PI, 0)}
          fill="none"
          stroke="url(#gradSweep)"
          strokeWidth={STROKE_W - 2}
          strokeLinecap="round"
          strokeDasharray={`${scanLen} ${scanLen}`}
          strokeDashoffset="0"
        >
          <animate
            attributeName="stroke-dashoffset"
            from={scanLen}
            to={-scanLen}
            dur="2.2s"
            repeatCount="indefinite"
          />
        </path>

        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => {
          const rad = Math.PI * (1 - n / 10);
          const start = angleToPos(CX, CY, TRACK_OUTER - 1, rad);
          const end   = angleToPos(CX, CY, TRACK_INNER + 10, rad);
          const lbl   = angleToPos(CX, CY, TRACK_INNER + 6 + 14, rad);
          return (
            <g key={n}>
              <line x1={start.x} y1={start.y} x2={end.x} y2={end.y}
                stroke="#d1d5db" strokeWidth="1.6" strokeLinecap="round" />
              <text x={lbl.x} y={lbl.y} textAnchor="middle" dominantBaseline="central"
                fill="#d1d5db" fontSize="10" fontWeight="600"
                fontFamily="'Inter', system-ui, sans-serif">{n}</text>
            </g>
          );
        })}

        <g opacity="0.25">
          <polygon
            points={`${CX},${CY - ARC_R + 4}  ${CX - 6},${CY + 2}  ${CX + 6},${CY + 2}`}
            fill="#9ca3af"
          />
          <circle cx={CX} cy={CY} r="11" fill="#9ca3af" />
          <circle cx={CX} cy={CY} r="7" fill="#d1d5db" />
          <circle cx={CX - 1.5} cy={CY - 1.5} r="2.5" fill="rgba(255,255,255,0.3)" />
        </g>

        <rect
          x={CX - 50} y={CY + 26} width={100} height={62} rx={16}
          fill="url(#gradPanel2)" stroke="rgba(0,0,0,0.05)" strokeWidth="1"
          filter="url(#loadingFrost)"
        />
        <line x1={CX - 32} y1={CY + 59} x2={CX + 32} y2={CY + 59}
          stroke="rgba(0,0,0,0.04)" strokeWidth="0.8" />

        <text x={CX - 14} y={CY + 51} textAnchor="end" dominantBaseline="central"
          fill="#d1d5db" fontSize="30" fontWeight="800"
          fontFamily="'Inter', system-ui, sans-serif" letterSpacing="-1.5">
          --.-</text>
        <text x={CX - 8} y={CY + 42} textAnchor="start" dominantBaseline="central"
          fill="#d1d5db" fontSize="12" fontWeight="600"
          fontFamily="system-ui, sans-serif">
          /10
        </text>
        <text x={CX} y={CY + 72} textAnchor="middle" dominantBaseline="central"
          fill="#d1d5db" fontSize="12" fontWeight="700"
          fontFamily="system-ui, sans-serif" letterSpacing="3"
          style={{ animation: 'gaugePulse 1.8s ease-in-out infinite' }}>
          加 载 中 ...
        </text>
      </svg>
    </div>
  );
}
