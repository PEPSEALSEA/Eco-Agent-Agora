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
    <div className="min-h-screen bg-nintendo-blue/10 bg-[radial-gradient(#0087e5_1px,transparent_1px)] [background-size:20px_20px] p-8 relative overflow-x-hidden">
      {/* Visual focus layer to separate content from background points */}
      <div className="fixed inset-0 backdrop-blur-[5px] bg-white/50 pointer-events-none z-0" />

      <div className="max-w-2xl mx-auto relative z-10">
        <header className="flex items-center mb-16">
          <button 
            onClick={() => router.back()} 
            className="mr-6 w-14 h-14 bg-white border-4 border-gray-900 rounded-2xl flex items-center justify-center hover:translate-y-1 transition-all shadow-[0_6px_0_rgba(0,0,0,1)] active:shadow-none active:translate-y-2 text-gray-900"
          >
            <ArrowLeft size={28} />
          </button>
          <div className="bg-white border-[6px] border-gray-900 px-8 py-4 rounded-[2.5rem] shadow-[0_10px_0_rgba(0,0,0,1)] -rotate-1">
            <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">การตั้งค่าระบบ</h1>
          </div>
        </header>

        <div className="space-y-10 bg-white border-[6px] border-gray-900 p-10 rounded-[3.5rem] shadow-[0_20px_0_rgba(0,0,0,1)] relative overflow-hidden">
          {/* Decorative stripe */}
          <div className="absolute top-0 left-0 w-full h-4 bg-nintendo-yellow" />
          
          <section className="space-y-6 mt-4">
            <h2 className="text-2xl font-black flex items-center text-gray-900 uppercase tracking-tighter">
              <div className="w-10 h-10 bg-nintendo-blue rounded-xl border-4 border-gray-900 flex items-center justify-center text-white mr-3">
                <Globe size={20} />
              </div>
              Backend Configuration
            </h2>
            <p className="text-gray-500 font-bold leading-snug">
              หากคุณไม่ได้ตั้งค่า Environment Variables ในตอน Build คุณสามารถตั้งค่า URL ของ Backend ได้ที่นี่ ข้อมูลนี้จะถูกเก็บไว้ใน Browser ของคุณเท่านั้น
            </p>
            
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-black text-gray-400 mb-3 ml-2 uppercase tracking-widest">GAS Web App URL</label>
                <input 
                  type="text"
                  value={gasUrl}
                  onChange={(e) => setGasUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="w-full bg-gray-50 border-4 border-gray-900 rounded-2xl px-6 py-4 font-bold text-gray-900 focus:bg-white outline-none transition-all shadow-[inset_0_4px_0_rgba(0,0,0,0.05)]"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-gray-400 mb-3 ml-2 uppercase tracking-widest">Secret Key</label>
                <input 
                  type="password"
                  value={gasKey}
                  onChange={(e) => setGasKey(e.target.value)}
                  placeholder="รหัสผ่านความปลอดภัยของคุณ"
                  className="w-full bg-gray-50 border-4 border-gray-900 rounded-2xl px-6 py-4 font-bold text-gray-900 focus:bg-white outline-none transition-all shadow-[inset_0_4px_0_rgba(0,0,0,0.05)]"
                />
              </div>
            </div>
          </section>

          <section className="pt-8 border-t-4 border-dashed border-gray-100">
            <h2 className="text-2xl font-black flex items-center text-gray-900 uppercase tracking-tighter mb-4">
              <div className="w-10 h-10 bg-nintendo-pink rounded-xl border-4 border-gray-900 flex items-center justify-center text-white mr-3">
                <Shield size={20} />
              </div>
              Security & Privacy
            </h2>
            <p className="text-gray-500 font-bold leading-snug">
              ระบบ "บันทึกการเข้าสู่ระบบ" ทำงานโดยการเก็บข้อมูลโปรไฟล์ของคุณไว้ใน LocalStorage เพื่อให้คุณไม่ต้อง Login ใหม่ทุกครั้ง
            </p>
          </section>

          <button 
            onClick={handleSave}
            className={`w-full py-5 rounded-[2rem] font-black text-2xl uppercase tracking-tighter border-4 border-gray-900 shadow-[0_10px_0_rgba(0,0,0,1)] hover:translate-y-1 active:shadow-none active:translate-y-2 transition-all flex items-center justify-center ${
              saved ? 'bg-nintendo-green text-white' : 'bg-nintendo-blue text-white'
            }`}
          >
            <Save size={24} className="mr-3" /> {saved ? 'บันทึกสำเร็จแล้ว!' : 'บันทึกการตั้งค่า'}
          </button>
        </div>
      </div>
    </div>
  );
}
