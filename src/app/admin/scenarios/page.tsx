'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { gasFetch, gasPost, uuid } from '@/lib/gas';
import { Plus, Edit2, Trash2, Save, X, ArrowLeft, Users, Briefcase, GraduationCap } from 'lucide-react';

const ADMIN_EMAILS = ['sealseapep@gmail.com'];

type Scenario = {
  id: string;
  title: string;
  description: string;
  target_group: 'professional' | 'kids';
  characters: any[];
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
        { name: 'ตัวละคร 1', role: 'บทบาท...', agenda: 'เป้าหมาย...', personality: 'นิสัย...' }
      ]
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
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">กำลังโหลด...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-12">
          <button onClick={() => router.push('/scenarios')} className="flex items-center text-gray-400 hover:text-white transition-colors">
            <ArrowLeft size={18} className="mr-2" /> กลับไปหน้าภารกิจ
          </button>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-400">
            จัดการสถานการณ์
          </h1>
          <div className="flex space-x-3">
            <button 
              onClick={() => router.push('/admin/settings')}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-bold border border-white/10 transition-all"
            >
              ตั้งค่าระบบ
            </button>
            <button 
              onClick={handleCreate}
              className="flex items-center px-6 py-3 bg-cyan-600 hover:bg-cyan-500 rounded-xl font-bold transition-all shadow-lg shadow-cyan-500/20"
            >
              <Plus size={18} className="mr-2" /> เพิ่มสถานการณ์
            </button>
          </div>
        </header>

        {editingId && editForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-slate-900 border border-white/20 rounded-[2.5rem] w-full max-w-4xl p-8 shadow-2xl my-8">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-bold text-cyan-400">
                  {editingId === 'new' ? 'สร้างสถานการณ์ใหม่' : 'แก้ไขสถานการณ์'}
                </h2>
                <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-white">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-400 mb-2">หัวข้อสถานการณ์</label>
                    <input 
                      value={editForm.title}
                      onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-cyan-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-400 mb-2">กลุ่มเป้าหมาย</label>
                    <select 
                      value={editForm.target_group}
                      onChange={(e) => setEditForm({ ...editForm, target_group: e.target.value as any })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-cyan-500 outline-none transition-all"
                    >
                      <option value="professional" className="bg-slate-900">Professional (โหมดผู้ใหญ่)</option>
                      <option value="kids" className="bg-slate-900">Kids (โหมดเด็ก)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-400 mb-2">คำอธิบาย (Description)</label>
                  <textarea 
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    rows={3}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-cyan-500 outline-none transition-all"
                  />
                </div>

                <div className="pt-4 border-t border-white/10">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold flex items-center">
                      <Users size={18} className="mr-2 text-purple-400" /> ตัวละครในสถานการณ์
                    </h3>
                    <button 
                      onClick={handleAddCharacter}
                      className="text-sm font-bold text-cyan-400 hover:text-cyan-300 flex items-center"
                    >
                      <Plus size={16} className="mr-1" /> เพิ่มตัวละคร
                    </button>
                  </div>

                  <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                    {editForm.characters.map((char, index) => (
                      <div key={index} className="bg-white/5 border border-white/10 p-6 rounded-2xl relative group">
                        <button 
                          onClick={() => handleRemoveCharacter(index)}
                          className="absolute top-4 right-4 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <input 
                            placeholder="ชื่อตัวละคร"
                            value={char.name}
                            onChange={(e) => handleCharChange(index, 'name', e.target.value)}
                            className="bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-cyan-500"
                          />
                          <input 
                            placeholder="บทบาท (Role)"
                            value={char.role}
                            onChange={(e) => handleCharChange(index, 'role', e.target.value)}
                            className="bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-cyan-500"
                          />
                          <textarea 
                            placeholder="เป้าหมาย (Agenda)"
                            value={char.agenda}
                            onChange={(e) => handleCharChange(index, 'agenda', e.target.value)}
                            className="bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-cyan-500 md:col-span-2"
                          />
                          <input 
                            placeholder="นิสัย (Personality)"
                            value={char.personality}
                            onChange={(e) => handleCharChange(index, 'personality', e.target.value)}
                            className="bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-cyan-500 md:col-span-2"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-8 flex space-x-4">
                  <button 
                    onClick={handleSave}
                    disabled={loading}
                    className="flex-1 bg-cyan-600 hover:bg-cyan-500 py-4 rounded-2xl font-bold flex items-center justify-center transition-all disabled:opacity-50"
                  >
                    <Save size={18} className="mr-2" /> บันทึกการเปลี่ยนแปลง
                  </button>
                  <button 
                    onClick={() => setEditingId(null)}
                    className="px-8 py-4 bg-white/5 hover:bg-white/10 rounded-2xl font-bold transition-all"
                  >
                    ยกเลิก
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6">
          {scenarios.map((scenario) => (
            <div 
              key={scenario.id}
              className="bg-white/5 border border-white/10 rounded-3xl p-8 flex flex-col md:flex-row justify-between items-start md:items-center hover:bg-white/[0.07] transition-all group"
            >
              <div className="flex-1 mr-8">
                <div className="flex items-center space-x-3 mb-3">
                  <div className={`p-2 rounded-lg ${scenario.target_group === 'professional' ? 'bg-nintendo-blue' : 'bg-nintendo-green'}`}>
                    {scenario.target_group === 'professional' ? <Briefcase size={18} /> : <GraduationCap size={18} />}
                  </div>
                  <h3 className="text-xl font-bold">{scenario.title}</h3>
                  <span className="text-[10px] font-black bg-white/10 px-2 py-0.5 rounded-full uppercase tracking-widest text-gray-400">
                    {scenario.target_group}
                  </span>
                </div>
                <p className="text-gray-400 text-sm line-clamp-2 leading-relaxed">{scenario.description}</p>
                <div className="flex mt-4 space-x-2">
                  {scenario.characters?.map((c: any, i: number) => (
                    <span key={i} className="text-[10px] bg-cyan-500/10 text-cyan-400 px-2 py-1 rounded-md border border-cyan-500/20">
                      {c.name}
                    </span>
                  ))}
                </div>
              </div>
              
              <div className="flex space-x-3 mt-6 md:mt-0 opacity-0 group-hover:opacity-100 transition-all">
                <button 
                  onClick={() => handleEdit(scenario)}
                  className="p-3 bg-white/5 hover:bg-cyan-500/20 text-cyan-400 rounded-xl border border-white/10 hover:border-cyan-500/50 transition-all"
                >
                  <Edit2 size={18} />
                </button>
                <button 
                  onClick={() => handleDelete(scenario.id)}
                  className="p-3 bg-white/5 hover:bg-red-500/20 text-red-400 rounded-xl border border-white/10 hover:border-red-500/50 transition-all"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}

          {scenarios.length === 0 && !loading && (
            <div className="py-20 text-center border-4 border-dashed border-white/10 rounded-[3rem]">
              <p className="text-gray-500 font-bold uppercase tracking-widest">ยังไม่มีสถานการณ์ใดๆ</p>
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
