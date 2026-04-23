'use client';

import React, { useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import { useGoogleLogin } from '@react-oauth/google';
import { gasPost } from '@/lib/gas';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login } = useAuth();
  const router = useRouter();

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-black p-4">
      <div className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-2xl shadow-2xl">
        <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 mb-2 text-center">
          Eco-Agent Agora
        </h1>
        <p className="text-gray-300 text-center mb-8">เชี่ยวชาญศิลปะการเจรจาต่อรอง</p>
        
        <div className="space-y-4">
          <div className="text-center py-4">
            <p className="text-gray-400 text-sm mb-6">ยินดีต้อนรับ! โปรดลงชื่อเข้าใช้เพื่อดำเนินการต่อ</p>
          </div>

          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          
          <button
            onClick={() => googleLogin()}
            disabled={loading}
            className="w-full bg-white text-gray-900 font-bold py-3 rounded-lg transition-all flex items-center justify-center space-x-2 hover:bg-gray-100 disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z"
              />
            </svg>
            <span>{loading ? 'กำลังลงชื่อเข้าใช้...' : 'ลงชื่อเข้าใช้ด้วย Google'}</span>
          </button>
          
          <div className="mt-8 pt-8 border-t border-white/10 text-center">
            <p className="text-xs text-gray-500">
              การลงชื่อเข้าใช้แสดงว่าคุณยอมรับข้อตกลงการให้บริการและนโยบายความเป็นส่วนตัวของเรา
              ข้อมูลของคุณจะถูกเก็บไว้ใน Google Sheet ส่วนตัวของคุณ
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
