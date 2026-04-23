'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function NotFound() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to home if it looks like a refresh on a sub-route
    // This helps with GitHub Pages SPA routing
    router.replace('/');
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
      <div className="text-center">
        <h1 className="text-6xl font-bold mb-4">404</h1>
        <p className="text-gray-400 mb-8">Redirecting to home...</p>
        <div className="h-8 w-8 border-t-2 border-b-2 border-cyan-500 rounded-full animate-spin mx-auto"></div>
      </div>
    </div>
  );
}
