'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { CartoonLoading } from '@/components/CartoonLoading';

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
    <div className="min-h-screen bg-nintendo-blue/10 bg-[radial-gradient(#0087e5_1px,transparent_1px)] [background-size:20px_20px] flex items-center justify-center">
      <CartoonLoading isOpen={loading || !!user} message="กำลังตรวจสอบสิทธิ์ผู้ดูแล..." />
    </div>
  );
}
