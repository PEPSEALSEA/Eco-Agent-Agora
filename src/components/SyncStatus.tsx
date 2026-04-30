'use client';

import React, { useEffect, useState } from 'react';
import { RefreshCw, CheckCircle2 } from 'lucide-react';

export default function SyncStatus({ status }: { status: 'idle' | 'syncing' | 'updated' }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (status !== 'idle') {
      setVisible(true);
      if (status === 'updated') {
        const timer = setTimeout(() => setVisible(false), 3000);
        return () => clearTimeout(timer);
      }
    }
  }, [status]);

  if (!visible) return null;

  return (
    <div className="fixed top-6 right-6 z-[9999] animate-in slide-in-from-right fade-in duration-300">
      <div className={`flex items-center space-x-3 px-4 py-2 rounded-2xl border-4 border-gray-900 shadow-[0_6px_0_rgba(0,0,0,1)] font-black uppercase tracking-tighter text-sm ${
        status === 'syncing' ? 'bg-nintendo-yellow text-gray-900' : 'bg-nintendo-green text-white'
      }`}>
        {status === 'syncing' ? (
          <>
            <RefreshCw className="w-4 h-4 animate-spin" strokeWidth={3} />
            <span>กำลังดึงข้อมูลล่าสุด...</span>
          </>
        ) : (
          <>
            <CheckCircle2 className="w-4 h-4" strokeWidth={3} />
            <span>ข้อมูลอัปเดตแล้ว!</span>
          </>
        )}
      </div>
    </div>
  );
}
