'use client';

import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';

// ============================================
// Props
// ============================================
interface FlawRadarProps {
  data?: Record<string, number>;
}

// ============================================
// ECharts 配置构建
// ============================================
function buildOption(data: Record<string, number>): EChartsOption {
  const dimensions = Object.keys(data);
  const values = dimensions.map((k) => data[k]);
  const maxVal = Math.max(10, ...values);

  return {
    tooltip: {
      trigger: 'item',
      backgroundColor: '#1f2937',
      borderColor: '#374151',
      textStyle: { color: '#f9fafb', fontSize: 12 },
      formatter: (params: unknown) => {
        const p = params as { name: string; value: number };
        const indicator = p.name;
        const val = data[indicator];
        return `<strong>${indicator}</strong><br/>槽点指数：<span style="color:#ef4444;font-weight:bold">${val}</span> / 10`;
      },
    },
    radar: {
      indicator: dimensions.map((d) => ({ name: d, max: maxVal })),
      shape: 'polygon',
      radius: '62%',
      center: ['50%', '52%'],
      axisName: {
        color: '#6b7280',
        fontSize: 11,
        fontWeight: 600,
      },
      splitArea: {
        areaStyle: {
          color: [
            'rgba(243,244,246,0.6)',
            'rgba(249,250,251,0.6)',
            'rgba(243,244,246,0.6)',
            'rgba(249,250,251,0.6)',
          ],
        },
      },
      splitLine: {
        lineStyle: {
          color: '#e5e7eb',
        },
      },
      axisLine: {
        lineStyle: {
          color: '#e5e7eb',
        },
      },
    },
    series: [
      {
        type: 'radar',
        data: [
          {
            value: values,
            name: '槽点分布',
            areaStyle: {
              color: {
                type: 'radial',
                x: 0.5,
                y: 0.5,
                r: 0.5,
                colorStops: [
                  { offset: 0, color: 'rgba(239,68,68,0.25)' },
                  { offset: 1, color: 'rgba(239,68,68,0.08)' },
                ],
              },
            },
            lineStyle: {
              color: '#ef4444',
              width: 2,
            },
            itemStyle: {
              color: '#ef4444',
              borderColor: '#fff',
              borderWidth: 2,
            },
            symbol: 'circle',
            symbolSize: 6,
          },
        ],
      },
    ],
  };
}

// ============================================
// 组件
// ============================================
export function FlawRadar({ data }: FlawRadarProps) {
  const option = useMemo(() => {
    if (!data || Object.keys(data).length === 0) return null;
    return buildOption(data);
  }, [data]);

  if (!option) {
    return (
      <div className="flex h-[220px] items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50">
        <div className="text-center">
          <svg
            className="mx-auto h-8 w-8 text-gray-300"
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
          <p className="mt-2 text-xs text-gray-400">暂无槽点分布数据</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
        <svg
          className="h-3.5 w-3.5 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
          />
        </svg>
        槽点分布图
      </h4>
      <ReactECharts
        option={option}
        style={{ height: 260 }}
        opts={{ renderer: 'svg' }}
      />
    </div>
  );
}
