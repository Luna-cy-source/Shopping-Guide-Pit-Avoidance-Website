import { Suspense } from 'react';

export default function ClinicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-purple-500" />
      </div>
    }>
      {children}
    </Suspense>
  );
}
