'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.push('/scenarios');
      } else {
        router.push('/login');
      }
    }
  }, [user, loading, router]);

  return (
    <div className="min-h-screen bg-nintendo-blue/10 flex items-center justify-center">
      <div className="w-16 h-16 border-8 border-nintendo-red border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
}
