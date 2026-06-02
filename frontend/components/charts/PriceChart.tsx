'use client';

import { useEffect, useState, useMemo } from 'react';
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
  data?: PricePoint[];      // 如果已有真实数据，直接传入
  title?: string;
  productName?: string;     // 商品名称，用于自动拉取真实历史价
}

// ============================================
// 从后端获取真实价格走势
// ============================================
async function fetchRealPriceHistory(productName: string): Promise<PricePoint[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(
      `/api/price-history?q=${encodeURIComponent(productName)}`,
      { signal: controller.signal }
    );

    clearTimeout(timeoutId);

    if (!res.ok) return [];

    const json = await res.json();
    if (json.success && Array.isArray(json.points) && json.points.length > 0) {
      return json.points.map((p: any) => ({
        date: p.date || '',
        price: typeof p.price === 'number' ? Math.round(p.price) : 0,
      })).filter((p: PricePoint) => p.price > 0 && p.date);
    }
    return [];
  } catch {
    return [];
  }
}

// ============================================
// ECharts 配置
// ============================================
function buildOption(data: PricePoint[], title: string, isRealData: boolean): EChartsOption {
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
        formatter: (v: number) => {
          if (v >= 1000) return `¥${(v / 1000).toFixed(1)}k`;
          return `¥${v}`;
        },
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
          color: isRealData ? '#22c55e' : '#6b7280',  // 真实数据绿色，无数据灰色
          width: 2.5,
        },
        itemStyle: {
          color: isRealData ? '#22c55e' : '#6b7280',
        },
        symbol: 'circle',
        symbolSize: isRealData ? 6 : 4,
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: isRealData ? 'rgba(34,197,94,0.12)' : 'rgba(107,114,128,0.06)' },
              { offset: 1, color: isRealData ? 'rgba(34,197,94,0.01)' : 'rgba(107,114,128,0.0)' },
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
          data: [{ type: 'average', name: '均价' }],
        },
      },
    ],
  };
}

// ============================================
// 组件
// ============================================
export function PriceChart({ data, title = '价格走势', productName }: PriceChartProps) {
  const [realData, setRealData] = useState<PricePoint[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);

  // 如果有外部传入的 data，直接使用
  const hasExternalData = data && data.length > 0;

  useEffect(() => {
    // 外部已有真实数据，不需要再拉
    if (hasExternalData) return;

    // 尝试从后端拉真实价格走势
    if (productName && productName.trim().length > 0) {
      setIsLoading(true);
      setFetchError(false);

      fetchRealPriceHistory(productName)
        .then((points) => {
          setRealData(points.length > 0 ? points : null);
          setFetchError(points.length === 0);
        })
        .catch(() => {
          setRealData(null);
          setFetchError(true);
        })
        .finally(() => setIsLoading(false));
    } else {
      setRealData(null);
      setFetchError(true);
    }
  }, [productName, hasExternalData]);

  // 决定使用的数据
  const chartData = useMemo(() => {
    if (hasExternalData) return data!;
    if (realData && realData.length > 0) return realData;
    return [];
  }, [hasExternalData, realData, data]);

  const isRealData = !!(hasExternalData || (realData && realData.length > 0));

  // 加载中骨架屏
  if (isLoading) {
    return (
      <div className="flex h-[280px] items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50/50">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-green-400 border-t-transparent" />
          <p className="mt-3 text-sm text-gray-400">正在获取真实价格走势...</p>
        </div>
      </div>
    );
  }

  // 无真实数据占位（不再显示模拟数据）
  if (chartData.length === 0) {
    return (
      <div className="flex h-[280px] items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50">
        <div className="text-center max-w-[300px]">
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
          <p className="mt-2 text-sm font-medium text-gray-400">
            暂无{productName ? `「${productName}」的` : ''}真实价格走势数据
          </p>
          <p className="mt-1 text-xs text-gray-300">
            {fetchError
              ? '价格数据源暂时不可用，请稍后刷新'
              : '该商品暂无公开的历史价格记录'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <ReactECharts
        option={buildOption(chartData, title, isRealData)}
        style={{ height: 280 }}
        opts={{ renderer: 'svg' }}
      />
      {isRealData && (
        <div className="absolute right-3 top-2 rounded-md bg-green-50 border border-green-200 px-2 py-0.5 text-[10px] text-green-600">
          ✅ 来自真实平台数据
        </div>
      )}
    </div>
  );
}
