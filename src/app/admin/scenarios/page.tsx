'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { gasFetch, gasPost, uuid } from '@/lib/gas';
import { Plus, Edit2, Trash2, Save, X, ArrowLeft, Users, Briefcase, GraduationCap, Settings } from 'lucide-react';
import { CartoonLoading } from '@/components/CartoonLoading';
import Link from 'next/link';

const ADMIN_EMAILS = ['sealseapep@gmail.com'];

type Scenario = {
  id: string;
  title: string;
  description: string;
  target_group: 'professional' | 'kids';
  characters: any[];
  phase_rules: {
    phases: string[];
    win_condition: string;
    fail_condition: string;
  };
};

export default function AdminScenariosPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Scenario | null>(null);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
        return;
      }
      if (!ADMIN_EMAILS.includes(user.email)) {
        router.push('/scenarios');
        return;
      }
    }

    const fetchScenarios = async () => {
      try {
        const data = await gasFetch('read', 'scenarios');
        if (data.error) throw new Error(data.error);
        setScenarios(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Fetch scenarios error:', err);
      } finally {
        setLoading(false);
      }
    };

    if (user) fetchScenarios();
  }, [user, authLoading, router]);

  const handleCreate = () => {
    const newScenario: Scenario = {
      id: uuid(),
      title: 'สถานการณ์ใหม่',
      description: 'คำอธิบายสถานการณ์...',
      target_group: 'professional',
      characters: [
        { id: 'char_1', name: 'ตัวละคร 1', role: 'บทบาท...', agenda: 'เป้าหมาย...', personality: 'นิสัย...' }
      ],
      phase_rules: {
        phases: ['opening', 'conflict', 'negotiation', 'resolution'],
        win_condition: 'ทั้งสองฝ่ายตกลงกันได้',
        fail_condition: 'turn > 20'
      }
    };
    setEditForm(newScenario);
    setEditingId('new');
  };

  const handleEdit = (scenario: Scenario) => {
    setEditForm({ ...scenario });
    setEditingId(scenario.id);
  };

  const handleSave = async () => {
    if (!editForm) return;
    setLoading(true);
    try {
      const action = editingId === 'new' ? 'create' : 'update';
      const result = await gasPost(action as any, 'scenarios', editForm, { id: editForm.id });
      if (result.error) throw new Error(result.error);
      
      // Refresh list
      const data = await gasFetch('read', 'scenarios');
      setScenarios(Array.isArray(data) ? data : []);
      setEditingId(null);
      setEditForm(null);
    } catch (err) {
      console.error('Save error:', err);
      alert('บันทึกข้อมูลล้มเหลว');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบสถานการณ์นี้?')) return;
    // Note: GAS script doesn't have deleteRow yet, but we can simulate it by updating status or just leave it for now
    // For this demo, let's assume update with status deleted if we wanted to be thorough
    alert('ระบบลบข้อมูลจะพร้อมใช้งานในเร็วๆ นี้ (GAS script จำเป็นต้องได้รับการอัปเดต)');
  };

  const handleAddCharacter = () => {
    if (!editForm) return;
    setEditForm({
      ...editForm,
      characters: [...editForm.characters, { name: '', role: '', agenda: '', personality: '' }]
    });
  };

  const handleCharChange = (index: number, field: string, value: string) => {
    if (!editForm) return;
    const newChars = [...editForm.characters];
    newChars[index] = { ...newChars[index], [field]: value };
    setEditForm({ ...editForm, characters: newChars });
  };

  const handleRemoveCharacter = (index: number) => {
    if (!editForm) return;
    const newChars = editForm.characters.filter((_, i) => i !== index);
    setEditForm({ ...editForm, characters: newChars });
  };

  if (loading && scenarios.length === 0) {
    return <CartoonLoading isOpen={true} message="กำลังเตรียมสมุดจัดการสถานการณ์..." />;
  }

  return (
    <div className="min-h-screen cartoon-bg-blue p-8 relative overflow-x-hidden">
      <CartoonLoading isOpen={loading} message="กำลังอัปเดตข้อมูล..." />

      <div className="max-w-6xl mx-auto relative z-10">
        <header className="flex flex-col md:flex-row justify-between items-center mb-16 gap-6">
          <Link 
            href="/scenarios" 
            prefetch={false}
            className="flex items-center bg-white border-4 border-gray-900 px-6 py-3 rounded-2xl hover:translate-y-1 transition-all shadow-[0_8px_0_rgba(0,0,0,1)] active:shadow-none active:translate-y-2"
          >
            <ArrowLeft size={20} className="mr-2" /> 
            <span className="font-black uppercase tracking-tighter">กลับหน้าภารกิจ</span>
          </Link>

          <div className="bg-white border-[6px] border-gray-900 px-10 py-6 rounded-[3rem] shadow-[0_12px_0_rgba(0,0,0,1)] rotate-1">
            <h1 className="text-4xl font-black text-gray-900 uppercase tracking-tighter">
              จัดการสถานการณ์
            </h1>
          </div>

          <div className="flex space-x-4">
            <button 
              onClick={() => router.push('/admin/settings')}
              className="p-4 bg-white border-4 border-gray-900 rounded-2xl hover:translate-y-1 transition-all shadow-[0_8px_0_rgba(0,0,0,1)] active:shadow-none active:translate-y-2 text-gray-900"
              title="ตั้งค่าระบบ"
            >
              <Settings size={24} />
            </button>
            <button 
              onClick={handleCreate}
              className="flex items-center px-8 py-4 bg-nintendo-red text-white border-4 border-gray-900 rounded-2xl font-black hover:translate-y-1 transition-all shadow-[0_8px_0_rgba(0,0,0,1)] active:shadow-none active:translate-y-2 uppercase tracking-tighter"
            >
              <Plus size={20} className="mr-2" /> เพิ่มสถานการณ์
            </button>
          </div>
        </header>

        {editingId && editForm && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 overflow-y-auto">
            <div className="bg-white border-[8px] border-gray-900 rounded-[3.5rem] w-full max-w-4xl p-10 shadow-[0_30px_0_rgba(0,0,0,1)] my-8 relative">
              {/* Top Stripe Decorative */}
              <div className="absolute top-0 left-0 w-full h-6 bg-nintendo-blue rounded-t-[2.8rem]" />
              
              <div className="flex justify-between items-center mb-10 mt-2">
                <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">
                  {editingId === 'new' ? '✨ สร้างสถานการณ์ใหม่' : '✏️ แก้ไขสถานการณ์'}
                </h2>
                <button 
                  onClick={() => setEditingId(null)} 
                  className="w-12 h-12 flex items-center justify-center bg-gray-100 border-4 border-gray-900 rounded-2xl text-gray-900 hover:bg-nintendo-pink hover:text-white transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3 ml-2">หัวข้อสถานการณ์</label>
                    <input 
                      value={editForm.title}
                      onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                      className="w-full bg-gray-50 border-4 border-gray-900 rounded-2xl px-6 py-4 font-bold text-gray-900 focus:bg-white outline-none transition-all shadow-[inset_0_4px_0_rgba(0,0,0,0.05)]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3 ml-2">กลุ่มเป้าหมาย</label>
                    <select 
                      value={editForm.target_group}
                      onChange={(e) => setEditForm({ ...editForm, target_group: e.target.value as any })}
                      className="w-full bg-gray-50 border-4 border-gray-900 rounded-2xl px-6 py-4 font-bold text-gray-900 focus:bg-white outline-none transition-all shadow-[inset_0_4px_0_rgba(0,0,0,0.05)] appearance-none"
                    >
                      <option value="professional">👔 Professional (โหมดผู้ใหญ่)</option>
                      <option value="kids">🧒 Kids (โหมดเด็ก)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3 ml-2">คำอธิบาย (Description)</label>
                  <textarea 
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    rows={3}
                    className="w-full bg-gray-50 border-4 border-gray-900 rounded-2xl px-6 py-4 font-bold text-gray-900 focus:bg-white outline-none transition-all shadow-[inset_0_4px_0_rgba(0,0,0,0.05)]"
                  />
                </div>

                <div className="bg-nintendo-blue/5 border-4 border-gray-900 p-6 rounded-[2rem]">
                  <h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter mb-4 flex items-center">
                    <Settings size={20} className="mr-2" /> กฎของเฟส (Phase Rules)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">เฟสการเจรจา (คั่นด้วยเครื่องหมายจุลภาค)</label>
                      <input 
                        value={editForm.phase_rules?.phases?.join(', ') || ''}
                        onChange={(e) => setEditForm({ 
                          ...editForm, 
                          phase_rules: { 
                            ...editForm.phase_rules, 
                            phases: e.target.value.split(',').map(s => s.trim()).filter(s => s) 
                          } 
                        })}
                        placeholder="เช่น opening, conflict, negotiation, resolution"
                        className="w-full bg-white border-4 border-gray-900 rounded-xl px-4 py-3 font-bold text-gray-900 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">เงื่อนไขชนะ (Win Condition)</label>
                      <input 
                        value={editForm.phase_rules?.win_condition || ''}
                        onChange={(e) => setEditForm({ 
                          ...editForm, 
                          phase_rules: { ...editForm.phase_rules, win_condition: e.target.value } 
                        })}
                        className="w-full bg-white border-4 border-gray-900 rounded-xl px-4 py-3 font-bold text-gray-900 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">เงื่อนไขแพ้ (Fail Condition)</label>
                      <input 
                        value={editForm.phase_rules?.fail_condition || ''}
                        onChange={(e) => setEditForm({ 
                          ...editForm, 
                          phase_rules: { ...editForm.phase_rules, fail_condition: e.target.value } 
                        })}
                        placeholder="เช่น turn > 20"
                        className="w-full bg-white border-4 border-gray-900 rounded-xl px-4 py-3 font-bold text-gray-900 outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t-4 border-dashed border-gray-100">
                  <div className="flex justify-between items-center mb-8">
                    <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tighter flex items-center">
                      <div className="w-10 h-10 bg-nintendo-yellow border-4 border-gray-900 rounded-xl flex items-center justify-center mr-3">
                        <Users size={20} />
                      </div>
                      ตัวละครในสถานการณ์
                    </h3>
                    <button 
                      onClick={handleAddCharacter}
                      className="bg-nintendo-green text-white border-4 border-gray-900 px-6 py-2 rounded-xl font-black uppercase tracking-tighter text-sm hover:translate-y-1 transition-all shadow-[0_5px_0_rgba(0,0,0,1)] active:shadow-none active:translate-y-2 flex items-center"
                    >
                      <Plus size={16} className="mr-2" /> เพิ่มตัวละคร
                    </button>
                  </div>

                  <div className="space-y-6 max-h-[35vh] overflow-y-auto pr-4 custom-scrollbar">
                    {editForm.characters.map((char, index) => (
                      <div key={index} className="bg-gray-50 border-4 border-gray-900 p-8 rounded-[2rem] relative group shadow-[0_8px_0_rgba(0,0,0,0.05)]">
                        <button 
                          onClick={() => handleRemoveCharacter(index)}
                          className="absolute -top-4 -right-4 w-10 h-10 bg-white border-4 border-gray-900 rounded-xl text-gray-400 hover:text-nintendo-pink hover:border-nintendo-pink flex items-center justify-center transition-all shadow-lg z-10"
                        >
                          <Trash2 size={18} />
                        </button>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                             <label className="text-[10px] font-black uppercase text-gray-400 px-2">ID ตัวละคร (เช่น char_alex)</label>
                             <input 
                              placeholder="ID ตัวละคร"
                              value={char.id || ''}
                              onChange={(e) => handleCharChange(index, 'id', e.target.value)}
                              className="w-full bg-white border-4 border-gray-900 rounded-xl px-4 py-3 font-bold text-gray-900 outline-none focus:border-nintendo-blue"
                            />
                          </div>
                          <div className="space-y-2">
                             <label className="text-[10px] font-black uppercase text-gray-400 px-2">ชื่อตัวละคร</label>
                             <input 
                              placeholder="ชื่อตัวละคร"
                              value={char.name}
                              onChange={(e) => handleCharChange(index, 'name', e.target.value)}
                              className="w-full bg-white border-4 border-gray-900 rounded-xl px-4 py-3 font-bold text-gray-900 outline-none focus:border-nintendo-blue"
                            />
                          </div>
                          <div className="space-y-2">
                             <label className="text-[10px] font-black uppercase text-gray-400 px-2">บทบาท (Role)</label>
                             <input 
                              placeholder="บทบาท (Role)"
                              value={char.role}
                              onChange={(e) => handleCharChange(index, 'role', e.target.value)}
                              className="w-full bg-white border-4 border-gray-900 rounded-xl px-4 py-3 font-bold text-gray-900 outline-none focus:border-nintendo-blue"
                            />
                          </div>
                          <div className="md:col-span-2 space-y-2">
                             <label className="text-[10px] font-black uppercase text-gray-400 px-2">เป้าหมาย (Agenda)</label>
                             <textarea 
                              placeholder="เป้าหมาย (Agenda)"
                              value={char.agenda}
                              onChange={(e) => handleCharChange(index, 'agenda', e.target.value)}
                              rows={2}
                              className="w-full bg-white border-4 border-gray-900 rounded-xl px-4 py-3 font-bold text-gray-900 outline-none focus:border-nintendo-blue"
                            />
                          </div>
                          <div className="md:col-span-2 space-y-2">
                             <label className="text-[10px] font-black uppercase text-gray-400 px-2">นิสัย (Personality)</label>
                             <input 
                              placeholder="นิสัย (Personality)"
                              value={char.personality}
                              onChange={(e) => handleCharChange(index, 'personality', e.target.value)}
                              className="w-full bg-white border-4 border-gray-900 rounded-xl px-4 py-3 font-bold text-gray-900 outline-none focus:border-nintendo-blue"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-10 flex space-x-6">
                  <button 
                    onClick={handleSave}
                    disabled={loading}
                    className="flex-1 bg-nintendo-blue text-white py-5 rounded-[2rem] font-black text-2xl uppercase tracking-tighter border-4 border-gray-900 shadow-[0_10px_0_rgba(0,0,0,1)] hover:translate-y-1 active:shadow-none active:translate-y-2 transition-all flex items-center justify-center disabled:opacity-50"
                  >
                    <Save size={24} className="mr-3" /> บันทึกข้อมูล
                  </button>
                  <button 
                    onClick={() => setEditingId(null)}
                    className="px-10 py-5 bg-white border-4 border-gray-900 rounded-[2rem] font-black text-xl uppercase tracking-tighter text-gray-900 hover:bg-gray-50 transition-all"
                  >
                    ยกเลิก
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-8">
          {scenarios.map((scenario) => (
            <div 
              key={scenario.id}
              className="bg-white border-[6px] border-gray-900 rounded-[3rem] p-10 flex flex-col md:flex-row justify-between items-start md:items-center hover:translate-y-1 transition-all shadow-[0_12px_0_rgba(0,0,0,1)] hover:shadow-[0_8px_0_rgba(0,0,0,1)] group"
            >
              <div className="flex-1 mr-8">
                <div className="flex flex-wrap items-center gap-4 mb-4">
                  <div className={`w-12 h-12 rounded-2xl border-4 border-gray-900 flex items-center justify-center text-white shadow-[0_4px_0_rgba(0,0,0,0.2)] ${scenario.target_group === 'professional' ? 'bg-nintendo-blue' : 'bg-nintendo-green'}`}>
                    {scenario.target_group === 'professional' ? <Briefcase size={24} /> : <GraduationCap size={24} />}
                  </div>
                  <h3 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">{scenario.title}</h3>
                  <span className={`text-[10px] font-black px-3 py-1 rounded-full border-2 border-gray-900 uppercase tracking-widest ${scenario.target_group === 'professional' ? 'bg-nintendo-blue/10 text-nintendo-blue' : 'bg-nintendo-green/10 text-nintendo-green'}`}>
                    {scenario.target_group}
                  </span>
                </div>
                <p className="text-gray-500 font-bold text-lg leading-snug line-clamp-2 italic mb-6">"{scenario.description}"</p>
                <div className="flex flex-wrap gap-2">
                  {scenario.characters?.map((c: any, i: number) => (
                    <span key={i} className="text-xs font-black bg-gray-100 text-gray-400 border-2 border-gray-200 px-3 py-1 rounded-xl uppercase tracking-tighter">
                      👤 {c.name}
                    </span>
                  ))}
                </div>
              </div>
              
              <div className="flex space-x-4 mt-8 md:mt-0">
                <button 
                  onClick={() => handleEdit(scenario)}
                  className="w-16 h-16 bg-nintendo-yellow text-gray-900 border-4 border-gray-900 rounded-2xl shadow-[0_6px_0_rgba(0,0,0,1)] hover:translate-y-1 active:shadow-none active:translate-y-2 transition-all flex items-center justify-center"
                  title="แก้ไข"
                >
                  <Edit2 size={28} />
                </button>
                <button 
                  onClick={() => handleDelete(scenario.id)}
                  className="w-16 h-16 bg-white text-gray-400 hover:text-nintendo-pink hover:border-nintendo-pink border-4 border-gray-900 rounded-2xl shadow-[0_6px_0_rgba(0,0,0,1)] hover:translate-y-1 active:shadow-none active:translate-y-2 transition-all flex items-center justify-center"
                  title="ลบ"
                >
                  <Trash2 size={28} />
                </button>
              </div>
            </div>
          ))}

          {scenarios.length === 0 && !loading && (
            <div className="py-24 text-center border-[8px] border-dashed border-gray-200 rounded-[4rem]">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-300">
                <Briefcase size={48} />
              </div>
              <p className="text-gray-400 font-black text-2xl uppercase tracking-widest italic">ยังไม่มีสถานการณ์ในสมุดเล่มนี้</p>
              <button 
                onClick={handleCreate}
                className="mt-8 text-nintendo-blue font-black underline underline-offset-8 decoration-4 hover:text-nintendo-red transition-colors"
              >
                สร้างสถานการณ์แรกของคุณที่นี่!
              </button>
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
}
