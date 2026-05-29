'use client';

import { useEffect, useState } from 'react';

/* 模拟播报数据池 */
const MOCK_BROADCASTS: { icon: string; text: string }[] = [
  { icon: '🥊', text: '刚刚有用户对比了 戴森V15 vs 追觅X40' },
  { icon: '🔍', text: '某用户正在查看 Colgate 儿童牙膏的评测报告' },
  { icon: '👀', text: 'iPhone 17 Pro Max 搜索热度持续飙升' },
  { icon: '⚠️', text: '花西子空气蜜粉被标记了 3 个新坑点' },
  { icon: '📉', text: '本周智商税黑榜 TOP1 已更新：SK-II 神仙水' },
  { icon: '🛒', text: '大疆Mini 4 Pro 成为今日对比次数最多的商品' },
  { icon: '💡', text: '实验室新上线：1v1 深度对比功能，快来试试' },
  { icon: '🔥', text: '华为Mate 70 Pro 对比请求暴增 230%' },
];

export default function BroadcastTicker() {
  const [broadcasts, setBroadcasts] = useState<typeof MOCK_BROADCASTS>([]);

  useEffect(() => {
    // 随机打乱并生成足够的播报条目
    const shuffled = [...MOCK_BROADCASTS].sort(() => Math.random() - 0.5);
    setBroadcasts([...shuffled, ...shuffled, ...MOCK_BROADCASTS]);
  }, []);

  return (
    <div className="relative w-full overflow-hidden py-2">
      {/* 渐变遮罩：左右淡出 */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-slate-50 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-r from-transparent to-slate-50" />

      {/* 滚动轨道 */}
      <div className="flex whitespace-nowrap">
        <div className="animate-ticker flex gap-10 pr-10">
          {broadcasts.map((item, i) => (
            <span
              key={i}
              className="inline-flex shrink-0 items-center gap-1.5 text-[11px] font-medium text-slate-400"
            >
              <span>{item.icon}</span>
              <span className="font-medium">{item.text}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
