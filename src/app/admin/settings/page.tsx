'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Shield, Globe } from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const [gasUrl, setGasUrl] = useState('');
  const [gasKey, setGasKey] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const savedUrl = localStorage.getItem('eco-agent-gas-url') || '';
    const savedKey = localStorage.getItem('eco-agent-gas-key') || '';
    setGasUrl(savedUrl);
    setGasKey(savedKey);
  }, []);

  const handleSave = () => {
    localStorage.setItem('eco-agent-gas-url', gasUrl);
    localStorage.setItem('eco-agent-gas-key', gasKey);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-2xl mx-auto">
        <header className="flex items-center mb-12">
          <button onClick={() => router.back()} className="mr-4 p-2 hover:bg-white/5 rounded-full transition-colors">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-3xl font-bold">การตั้งค่าระบบ (System Settings)</h1>
        </header>

        <div className="space-y-8 bg-white/5 border border-white/10 p-8 rounded-[2.5rem]">
          <section className="space-y-4">
            <h2 className="text-lg font-bold flex items-center text-cyan-400">
              <Globe size={20} className="mr-2" /> Google Apps Script Config
            </h2>
            <p className="text-sm text-gray-400">
              หากคุณไม่ได้ตั้งค่า Environment Variables ในตอน Build คุณสามารถตั้งค่า URL ของ Backend ได้ที่นี่ ข้อมูลนี้จะถูกเก็บไว้ใน Browser ของคุณเท่านั้น
            </p>
            
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-widest">GAS Web App URL</label>
              <input 
                type="text"
                value={gasUrl}
                onChange={(e) => setGasUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 focus:border-cyan-500 outline-none transition-all text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-widest">Secret Key</label>
              <input 
                type="password"
                value={gasKey}
                onChange={(e) => setGasKey(e.target.value)}
                placeholder="รหัสผ่านความปลอดภัยของคุณ"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 focus:border-cyan-500 outline-none transition-all text-sm"
              />
            </div>
          </section>

          <section className="pt-6 border-t border-white/10">
            <h2 className="text-lg font-bold flex items-center text-purple-400 mb-4">
              <Shield size={20} className="mr-2" /> ความเป็นส่วนตัวและเซสชัน
            </h2>
            <p className="text-sm text-gray-400">
              ระบบ "บันทึกการเข้าสู่ระบบ" ทำงานโดยการเก็บข้อมูลโปรไฟล์ของคุณไว้ใน LocalStorage ของ Browser เพื่อให้คุณไม่ต้อง Login ใหม่ทุกครั้งที่รีเฟรชหน้าจอ
            </p>
          </section>

          <button 
            onClick={handleSave}
            className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center transition-all ${
              saved ? 'bg-green-600' : 'bg-cyan-600 hover:bg-cyan-500'
            }`}
          >
            <Save size={18} className="mr-2" /> {saved ? 'บันทึกสำเร็จ!' : 'บันทึกการตั้งค่า'}
          </button>
        </div>
      </div>
    </div>
  );
}
