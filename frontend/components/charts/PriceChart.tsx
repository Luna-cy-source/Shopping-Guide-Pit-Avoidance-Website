'use client';

import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';

// ============================================
// 类型
// ============================================
interface PricePoint {
  date: string;   // 如 '2024-01'
  price: number;  // 价格
}

interface PriceChartProps {
  data?: PricePoint[];
  title?: string;
  basePrice?: number;  // 商品参考价，用于生成模拟走势
}

// ============================================
// 模拟数据：最近 12 个月价格走势（基于实际参考价）
// ============================================
function generateMockData(basePrice: number = 1000): PricePoint[] {
  // 使用固定种子保证同价格每次渲染一致
  const seed = Math.floor(basePrice * 7) % 10000;
  const pseudoRandom = (i: number) => {
    const x = Math.sin(seed + i * 9301 + 49297) * 233280;
    return x - Math.floor(x);
  };

  const now = new Date();
  const points: PricePoint[] = [];

  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    // 模拟波动：基于正弦曲线 + 固定种子噪声，±12%区间波动
    const variance = (Math.sin(i * 0.6 + seed * 0.001) * 0.085 + (pseudoRandom(i) - 0.5) * 0.055) * basePrice;
    points.push({
      date: label,
      price: Math.round(basePrice + variance),
    });
  }

  return points;
}

// ============================================
// ECharts 配置
// ============================================
function buildOption(data: PricePoint[], title: string): EChartsOption {
  return {
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1f2937',
      borderColor: '#374151',
      textStyle: { color: '#f9fafb', fontSize: 12 },
      formatter: (params: unknown) => {
        const arr = params as { data: PricePoint }[];
        const p = arr[0]?.data;
        if (!p || p.date == null || p.price == null) return '';
        return `<strong>${p.date}</strong><br/>价格：<span style="color:#ef4444;font-weight:bold">¥${p.price.toLocaleString()}</span>`;
      },
    },
    grid: {
      left: '3%',
      right: '5%',
      top: 40,
      bottom: 20,
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: data.map((d) => d.date),
      boundaryGap: false,
      axisLine: { lineStyle: { color: '#e5e7eb' } },
      axisTick: { show: false },
      axisLabel: {
        color: '#9ca3af',
        fontSize: 11,
        rotate: 30,
      },
    },
    yAxis: {
      type: 'value',
      name: '价格 (¥)',
      nameTextStyle: { color: '#9ca3af', fontSize: 11 },
      axisLabel: {
        color: '#9ca3af',
        fontSize: 11,
        formatter: (v: number) => `¥${(v / 1000).toFixed(1)}k`,
      },
      splitLine: {
        lineStyle: { color: '#f3f4f6', type: 'dashed' },
      },
      min: (val: { min: number }) => Math.floor(val.min * 0.92),
      max: (val: { max: number }) => Math.ceil(val.max * 1.08),
    },
    series: [
      {
        type: 'line',
        data: data.map((d) => d.price),
        smooth: true,
        lineStyle: {
          color: '#ef4444',
          width: 2.5,
        },
        itemStyle: {
          color: '#ef4444',
        },
        symbol: 'circle',
        symbolSize: 6,
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(239,68,68,0.12)' },
              { offset: 1, color: 'rgba(239,68,68,0.01)' },
            ],
          },
        },
        markLine: {
          silent: true,
          symbol: 'none',
          label: {
            position: 'end',
            color: '#9ca3af',
            fontSize: 11,
            formatter: '均价 ¥{c}',
          },
          lineStyle: { color: '#9ca3af', type: 'dashed', width: 1 },
          data: [
            {
              type: 'average',
              name: '均价',
            },
          ],
        },
      },
    ],
  };
}

// ============================================
// 组件
// ============================================
export function PriceChart({ data, title = '价格走势', basePrice }: PriceChartProps) {
  const chartData = useMemo(() => {
    if (data && data.length > 0) return data;
    // 兜底：基于商品参考价生成模拟数据（无参考价时用默认值）
    return generateMockData(basePrice);
  }, [data, basePrice]);

  // 判断是否为模拟数据
  const isSimulated = (!data || data.length === 0);

  // 空数据占位
  if (chartData.length === 0) {
    return (
      <div className="flex h-[260px] items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50">
        <div className="text-center">
          <svg
            className="mx-auto h-8 w-8 text-gray-300"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
            />
          </svg>
          <p className="mt-2 text-sm text-gray-400">暂无价格数据</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <ReactECharts
        option={buildOption(chartData, title)}
        style={{ height: 280 }}
        opts={{ renderer: 'svg' }}
      />
      {isSimulated && (
        <div className="absolute right-3 top-2 rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] text-amber-600">
          ⚠️ 模拟走势仅供参考
        </div>
      )}
    </div>
  );
}
