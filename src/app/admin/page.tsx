'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';

const ADMIN_EMAILS = ['sealseapep@gmail.com'];

export default function AdminLandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
        return;
      }
      if (!ADMIN_EMAILS.includes(user.email)) {
        router.push('/scenarios');
        return;
      }
      // If admin, go to scenarios editor
      router.push('/admin/scenarios');
    }
  }, [user, loading, router]);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
      <div className="animate-pulse flex flex-col items-center">
        <div className="h-12 w-12 border-t-2 border-b-2 border-cyan-500 rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-bold uppercase tracking-widest text-cyan-400">Verifying Admin Access...</p>
      </div>
    </div>
  );
}
