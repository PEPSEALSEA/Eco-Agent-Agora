'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import { useGoogleLogin } from '@react-oauth/google';
import { gasPost } from '@/lib/gas';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login, user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Auto-redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      router.push('/scenarios');
    }
  }, [user, authLoading, router]);

  const handleGoogleSuccess = async (tokenResponse: any) => {
    setLoading(true);
    setError(null);
    try {
      // Fetch user profile from Google
      const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
      });
      const googleUser = await res.json();

      const userData = {
        id: googleUser.sub,
        email: googleUser.email,
        name: googleUser.name,
        picture: googleUser.picture,
        created_at: new Date().toISOString(),
      };

      // Save to GAS
      await gasPost('upsert', 'users', userData, { queryField: 'email', queryValue: userData.email });

      // Save to Auth Context
      login(userData);
      
      router.push('/scenarios');
    } catch (err: any) {
      console.error('Login error:', err);
      setError('การลงชื่อเข้าใช้ด้วย Google ล้มเหลว โปรดลองอีกครั้ง');
    } finally {
      setLoading(false);
    }
  };

  const googleLogin = useGoogleLogin({
    onSuccess: handleGoogleSuccess,
    onError: () => setError('การลงชื่อเข้าใช้ Google ล้มเหลว'),
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-nintendo-blue/10 bg-[radial-gradient(#0087e5_1px,transparent_1px)] [background-size:20px_20px] p-4">
      <div className="w-full max-w-md bg-white border-[6px] border-gray-900 p-10 rounded-[3rem] shadow-[0_15px_0_rgba(0,0,0,1)] -rotate-1">
        <h1 className="text-6xl font-black text-gray-900 mb-4 text-center uppercase tracking-tighter leading-none">
          Wongjra Ja
        </h1>
        <p className="text-gray-500 font-bold text-center mb-10 text-xl uppercase tracking-tighter">เชี่ยวชาญศิลปะการเจรจาต่อรอง</p>
        
        <div className="space-y-6">
          <div className="text-center">
            <p className="text-gray-400 font-black uppercase tracking-tighter text-sm mb-6">ยินดีต้อนรับ! โปรดลงชื่อเข้าใช้เพื่อดำเนินการต่อ</p>
          </div>

          {error && (
            <div className="bg-nintendo-pink/20 border-4 border-nintendo-pink p-3 rounded-2xl text-nintendo-pink font-bold text-center text-sm mb-4">
              {error}
            </div>
          )}
          
          <button
            onClick={() => googleLogin()}
            disabled={loading}
            className="w-full bg-nintendo-red text-white font-black py-4 rounded-2xl border-4 border-gray-900 shadow-[0_8px_0_rgba(0,0,0,1)] hover:translate-y-1 active:shadow-none active:translate-y-2 transition-all flex items-center justify-center space-x-3 disabled:opacity-50 uppercase tracking-tighter text-xl"
          >
            <div className="bg-white p-1 rounded-lg">
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z"
                />
              </svg>
            </div>
            <span>{loading ? 'กำลังโหลด...' : 'ลงชื่อเข้าใช้ด้วย Google'}</span>
          </button>
          
          <div className="mt-10 pt-8 border-t-4 border-dashed border-gray-100 text-center">
            <p className="text-xs text-gray-400 font-bold uppercase tracking-tight">
              การลงชื่อเข้าใช้แสดงว่าคุณยอมรับข้อตกลงและนโยบายความเป็นส่วนตัว
              <br/>
              ข้อมูลของคุณจะถูกเก็บไว้ใน Google Sheet ส่วนตัว
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
