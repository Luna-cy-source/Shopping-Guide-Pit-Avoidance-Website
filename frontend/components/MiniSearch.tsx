'use client';

import { useSearchHistory } from '../hooks/useSearchHistory';

export default function MiniSearch() {
  const { addHistory } = useSearchHistory();

  return (
    <form
      action="/"
      className="ml-auto flex flex-1 items-center sm:max-w-xs"
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const input = form.querySelector('input[name="q"]') as HTMLInputElement;
        const keyword = input?.value.trim();
        if (keyword) {
          addHistory(keyword);
          window.location.href = `/report?q=${encodeURIComponent(keyword)}`;
        }
      }}
    >
      <input
        type="text"
        name="q"
        defaultValue=""
        placeholder="搜索其他商品..."
        className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition-all focus:border-red-300 focus:bg-white"
      />
    </form>
  );
}
