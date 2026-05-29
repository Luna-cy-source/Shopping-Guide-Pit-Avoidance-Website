'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SignedIn, SignedOut, SignInButton } from '@clerk/nextjs';
import UserLevelCard from '../../components/UserLevelCard';
import { useSearchHistory } from '../../hooks/useSearchHistory';
import { useBookmarks } from '../../hooks/useBookmarks';
import {
  getUserProgress,
  calcLevel,
  type UserProgress,
} from '../../lib/userLevel';

const COMMUNITIES = [
  { name: '美妆避坑交流群', icon: '💄', qq: '8587123456', bg: 'from-pink-400 to-rose-400', desc: '成分党集结·新品测评·假货识别' },
  { name: '数码二手防坑群', icon: '📱', qq: '8587987654', bg: 'from-blue-400 to-indigo-400', desc: '验机互助·行情参考·骗子曝光' },
  { name: '家电选购参谋群', icon: '🏠', qq: '8587555566', bg: 'from-cyan-400 to-teal-400', desc: '能耗对比·安装避坑·售后维权' },
  { name: '理财智商税避雷', icon: '💰', qq: '8587333222', bg: 'from-amber-400 to-orange-400', desc: '理财陷阱·保险套路·消费贷避坑' },
];

/* ============================================================
   成就徽章配置
   ============================================================ */
const ACHIEVEMENTS = [
  { key: 'first_search', label: '初次探索', desc: '完成第1次搜索', icon: '🔍', xp: 0 },
  { key: 'ten_searches', label: '搜索达人', desc: '累计搜索10次', icon: '🕵️', xp: 0 },
  { key: 'first_report', label: '报告读者', desc: '查看第1份报告', icon: '📄', xp: 0 },
  { key: 'first_compare', label: '对比专家', desc: '完成第1次对比', icon: '⚖️', xp: 0 },
  { key: 'daily_check', label: '签到先锋', desc: '完成首次签到', icon: '📅', xp: 0 },
  { key: 'streak_7', label: '连续7天', desc: '连续签到7天', icon: '🔥', xp: 0 },
  { key: 'level_3', label: '避坑学徒', desc: '等级达到Lv.3', icon: '🛡️', xp: 150 },
  { key: 'level_5', label: '护肤达人', desc: '等级达到Lv.5', icon: '💄', xp: 500 },
];

/* ============================================================
   辅助函数
   ============================================================ */
function formatTime(ts: number) {
  const now = Date.now();
  const diff = now - ts;
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (d > 0) return `${d}天前`;
  if (h > 0) return `${h}小时前`;
  if (m > 0) return `${m}分钟前`;
  return '刚刚';
}

/* ============================================================
   成就徽章墙
   ============================================================ */
function AchievementWall({ progress }: { progress: UserProgress | null }) {
  const levelInfo = progress ? calcLevel(progress.xp) : calcLevel(0);
  const unlocked = new Set<string>();

  if (progress) {
    if (progress.totalSearches >= 1) unlocked.add('first_search');
    if (progress.totalSearches >= 10) unlocked.add('ten_searches');
    if (progress.totalReports >= 1) unlocked.add('first_report');
    if (progress.totalCompares >= 1) unlocked.add('first_compare');
    if (progress.dailyCheckInDate) unlocked.add('daily_check');
    if (progress.streakDays >= 7) unlocked.add('streak_7');
    if (levelInfo.level >= 3) unlocked.add('level_3');
    if (levelInfo.level >= 5) unlocked.add('level_5');
  }

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_2px_16px_rgba(0,0,0,0.04)]">
      <div className="mb-4 flex items-center gap-2">
        <span className="text-lg">🏆</span>
        <h2 className="text-base font-bold text-slate-800">成就徽章</h2>
        <span className="ml-auto rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-600">
          {unlocked.size}/{ACHIEVEMENTS.length}
        </span>
      </div>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-4">
        {ACHIEVEMENTS.map((ach) => {
          const isUnlocked = unlocked.has(ach.key);
          return (
            <div
              key={ach.key}
              className={`flex flex-col items-center rounded-xl p-2.5 transition-all ${
                isUnlocked
                  ? 'bg-amber-50/60 border border-amber-100'
                  : 'bg-slate-50/60 border border-slate-100 opacity-50 grayscale'
              }`}
              title={ach.desc}
            >
              <span className="text-xl">{ach.icon}</span>
              <span className={`mt-1 text-[10px] font-bold ${isUnlocked ? 'text-amber-700' : 'text-slate-400'}`}>
                {ach.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================
   主页面
   ============================================================ */
export default function ProfilePage() {
  const router = useRouter();
  const { history, hasHistory, clearHistory, removeHistoryItem } = useSearchHistory();
  const { bookmarks, hasBookmarks, removeBookmark } = useBookmarks();
  const [progress, setProgress] = useState<UserProgress | null>(null);

  useEffect(() => {
    setProgress(getUserProgress());
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-10 border-b border-gray-100 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2 text-sm font-bold text-gray-900 transition-opacity hover:opacity-70"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            AI 避坑
          </Link>
          <span className="text-xs font-medium text-slate-400">/ 个人主页</span>
        </div>
      </header>

      {/* 主体内容 */}
      <main className="mx-auto max-w-5xl px-4 py-8">
        {/* 页面标题 */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-slate-900">个人主页</h1>
          <p className="mt-2 text-sm text-slate-400">追踪成长进度，管理你的避坑足迹</p>
          <div className="mx-auto mt-4 w-12 border-t-2 border-red-500" />
        </div>

        {/* 两栏布局 */}
        <div className="flex flex-col gap-6 lg:flex-row">
          {/* ========== 左侧栏 ========== */}
          <div className="flex w-full flex-col gap-6 lg:w-[320px] lg:shrink-0">
            {/* 等级卡片 */}
            <div className="flex justify-center">
              <UserLevelCard />
            </div>

            {/* 成就徽章 */}
            <AchievementWall progress={progress} />
          </div>

          {/* ========== 右侧栏 ========== */}
          <div className="flex flex-1 flex-col gap-6">
            {/* 最近搜索 */}
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_2px_16px_rgba(0,0,0,0.04)]">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🔍</span>
                  <h2 className="text-base font-bold text-slate-800">最近搜索</h2>
                </div>
                {hasHistory && (
                  <button
                    type="button"
                    onClick={clearHistory}
                    className="text-[11px] text-slate-400 transition-colors hover:text-red-500"
                  >
                    清空
                  </button>
                )}
              </div>

              {!hasHistory ? (
                <div className="flex flex-col items-center py-6 text-slate-400">
                  <span className="mb-2 text-2xl">🔎</span>
                  <p className="text-xs">暂无搜索记录</p>
                  <p className="mt-1 text-[10px] text-slate-300">在首页搜索商品，记录会显示在这里</p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {history.map((item) => (
                    <div
                      key={item.query}
                      className="group flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[13px] text-slate-600 transition-all hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                    >
                      <button
                        type="button"
                        onClick={() => router.push(`/report/${encodeURIComponent(item.query)}`)}
                        className="font-medium"
                      >
                        {item.query}
                      </button>
                      <span className="text-[10px] text-slate-300">{formatTime(item.timestamp)}</span>
                      <button
                        type="button"
                        onClick={() => removeHistoryItem(item.query)}
                        className="ml-0.5 rounded-full p-0.5 text-slate-300 opacity-0 transition-all hover:bg-red-100 hover:text-red-500 group-hover:opacity-100"
                        title="删除"
                      >
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 我的收藏 */}
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_2px_16px_rgba(0,0,0,0.04)]">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">⭐</span>
                  <h2 className="text-base font-bold text-slate-800">我的收藏</h2>
                </div>
              </div>

              {!hasBookmarks ? (
                <div className="flex flex-col items-center py-6 text-slate-400">
                  <span className="mb-2 text-2xl">📭</span>
                  <p className="text-xs">暂无收藏</p>
                  <p className="mt-1 text-[10px] text-slate-300">在报告页点击「收藏此报告」即可保存到这里</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {bookmarks.map((item) => (
                    <div
                      key={item.url}
                      className="group flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-3 transition-all hover:border-amber-200 hover:bg-amber-50/30"
                    >
                      <Link
                        href={item.url}
                        className="min-w-0 flex-1 text-[13px] font-medium text-slate-700 transition-colors hover:text-amber-700 truncate"
                      >
                        {item.productName}
                      </Link>
                      <div className="ml-2 flex items-center gap-2 shrink-0">
                        <span className="text-[10px] text-slate-300">{formatTime(item.savedAt)}</span>
                        <button
                          type="button"
                          onClick={() => removeBookmark(item.url)}
                          className="rounded-md p-1 text-slate-300 transition-colors hover:bg-red-100 hover:text-red-500"
                          title="取消收藏"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 社群入口 */}
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_2px_16px_rgba(0,0,0,0.04)]">
              <div className="mb-5 flex items-center gap-2">
                <span className="text-lg">💬</span>
                <h2 className="text-base font-bold text-slate-800">加入避坑交流群</h2>
              </div>
              <p className="mb-5 text-sm text-slate-400">和百万消费者一起交流避坑经验，群内定期分享独家检测报告</p>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {COMMUNITIES.map((community) => (
                  <div
                    key={community.name}
                    className="group flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-3 transition-all hover:shadow-md hover:bg-white hover:-translate-y-0.5"
                  >
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${community.bg} text-lg shadow-sm transition-transform duration-300 group-hover:scale-110`}>
                      {community.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-bold text-slate-800 truncate">{community.name}</p>
                      <p className="mt-0.5 text-[10px] text-slate-400">{community.desc}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(community.qq).then(() => {
                          alert(`群号 ${community.qq} 已复制！请打开QQ搜索加入`);
                        }).catch(() => {
                          alert(`请手动搜索群号：${community.qq}`);
                        });
                      }}
                      className="shrink-0 rounded-lg bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-slate-700"
                    >
                      复制群号
                    </button>
                  </div>
                ))}
              </div>

              {/* 群规提示 */}
              <div className="mt-4 rounded-xl bg-amber-50 px-4 py-2.5">
                <p className="text-[11px] leading-relaxed text-amber-700">
                  📢 群内禁止广告、拉人头。仅用于消费者交流避坑经验，加群时请备注「避坑实验室」。
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 底部导航 */}
        <div className="mt-10 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm font-medium text-slate-400 transition-colors hover:text-red-500"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            返回首页
          </Link>
        </div>
      </main>
    </div>
  );
}
