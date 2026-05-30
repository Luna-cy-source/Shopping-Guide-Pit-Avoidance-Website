import { SignUp } from '@clerk/nextjs';

// static export 要求动态路由提供 generateStaticParams
export function generateStaticParams() {
  return [{ 'sign-up': [] }];
}

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-white to-gray-50 p-4">
      <SignUp
        appearance={{
          elements: {
            card: 'shadow-xl border border-gray-100',
            formButtonPrimary: 'bg-red-500 hover:bg-red-600 text-sm',
            headerTitle: 'text-gray-900',
            headerSubtitle: 'text-gray-400',
          },
        }}
      />
    </div>
  );
}
