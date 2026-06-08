'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { CartoonLoading } from '@/components/CartoonLoading';
import { BarChart3, ListTodo, Settings, Edit2, ArrowLeft } from 'lucide-react';

const ADMIN_EMAILS = ['sealseapep@gmail.com', 'sealseapep2@gmail.com'];

const ADMIN_LINKS = [
  {
    href: '/admin/scenarios',
    title: 'จัดการสถานการณ์',
    desc: 'สร้าง/แก้ campaign & freeplay',
    icon: Edit2,
    color: 'bg-nintendo-red text-white',
  },
  {
    href: '/admin/progress',
    title: 'Dev Progress',
    desc: 'แผนงาน solo · วางวันละงาน · kanban',
    icon: ListTodo,
    color: 'bg-nintendo-yellow text-gray-900',
  },
  {
    href: '/admin/campaign-analytics',
    title: 'Campaign Analytics',
    desc: 'สถิติการเล่น campaign',
    icon: BarChart3,
    color: 'bg-nintendo-blue text-white',
  },
  {
    href: '/admin/settings',
    title: 'ตั้งค่าระบบ',
    desc: 'Backend URL & schema sync',
    icon: Settings,
    color: 'bg-nintendo-green text-white',
  },
];

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
      }
    }
  }, [user, loading, router]);

  if (loading || !user || !ADMIN_EMAILS.includes(user.email)) {
    return (
      <div className="min-h-screen bg-nintendo-blue/10 flex items-center justify-center">
        <CartoonLoading isOpen message="กำลังตรวจสอบสิทธิ์ผู้ดูแล..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen cartoon-bg-blue p-8">
      <div className="max-w-4xl mx-auto">
        <Link
          href="/scenarios"
          prefetch={false}
          className="inline-flex items-center bg-white border-4 border-gray-900 px-5 py-2.5 rounded-2xl font-black text-sm shadow-[0_6px_0_#2b221a] mb-10 hover:translate-y-0.5"
        >
          <ArrowLeft size={18} className="mr-2" />
          กลับหน้าภารกิจ
        </Link>

        <div className="bg-white border-[6px] border-gray-900 rounded-[3rem] p-10 shadow-[0_12px_0_#2b221a] mb-10 text-center -rotate-1">
          <h1 className="text-4xl font-black uppercase tracking-tighter text-gray-900">Admin Hub</h1>
          <p className="font-bold text-gray-400 mt-2 uppercase tracking-widest text-sm">WongJraJa · ผู้ดูแลระบบ</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          {ADMIN_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              prefetch={false}
              className="group bg-white border-[5px] border-gray-900 rounded-[2rem] p-8 shadow-[0_10px_0_#2b221a] hover:translate-y-1 hover:shadow-[0_6px_0_#2b221a] transition-all"
            >
              <div className={`w-14 h-14 rounded-2xl border-4 border-gray-900 flex items-center justify-center mb-4 ${item.color}`}>
                <item.icon size={28} />
              </div>
              <h2 className="text-xl font-black uppercase tracking-tighter text-gray-900 group-hover:text-nintendo-blue transition-colors">
                {item.title}
              </h2>
              <p className="text-sm font-bold text-gray-500 mt-2">{item.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
