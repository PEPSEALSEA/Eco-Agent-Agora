-- Tables for Eco-Agent Agora

-- Users table (Extends Supabase Auth)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  streak_count INTEGER DEFAULT 0 NOT NULL,
  last_active_date DATE
);

-- Scenarios table
CREATE TABLE public.scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  target_group TEXT, -- kids/professional
  characters JSONB NOT NULL -- Array of {name, role, agenda, personality}
);

-- Sessions table
CREATE TABLE public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id),
  scenario_id UUID REFERENCES public.scenarios(id),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  ended_at TIMESTAMP WITH TIME ZONE,
  outcome_score INTEGER,
  status TEXT DEFAULT 'ongoing' NOT NULL -- ongoing/completed
);

-- Messages table
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.sessions(id),
  sender TEXT NOT NULL, -- user/ai
  character_name TEXT, -- null if user
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Feedback logs table
CREATE TABLE public.feedback_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.sessions(id),
  message_id UUID REFERENCES public.messages(id),
  feedback_text TEXT,
  score INTEGER,
  dimension TEXT, -- length/coverage/logic
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Skill progress table
CREATE TABLE public.skill_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id),
  skill_name TEXT NOT NULL,
  level INTEGER DEFAULT 1 NOT NULL,
  xp INTEGER DEFAULT 0 NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, skill_name)
);

-- Enable RLS (Optional, but recommended)
-- For this prototype, we'll assume the user runs this in the SQL Editor.

-- Seed Data for Scenarios
INSERT INTO public.scenarios (title, description, target_group, characters) VALUES
('ดีลราคากับเกษตรกร', 'เจรจาต่อรองราคารับซื้อผลิตผลกับกลุ่มเกษตรกรที่ต้องการความเป็นธรรม', 'professional', '[
  {"name": "เกษตรกร", "role": "ตัวแทนเกษตรกร", "agenda": "ต้องการราคาสูงที่สุดและไม่ไว้ใจบริษัทใหญ่", "personality": "โผงผาง กล้าหาญ"},
  {"name": "นักลงทุน", "role": "หัวหน้าฝ่ายจัดซื้อ", "agenda": "ต้องการลดต้นทุนในไตรมาสนี้", "personality": "เน้นตัวเลข เยือกเย็น"},
  {"name": "ตัวแทนชุมชน", "role": "ผู้ใหญ่บ้าน", "agenda": "กังวลเรื่องปากท้องของคนในหมู่บ้าน", "personality": "ประนีประนอม สุภาพ"}
]'),
('งานกลุ่มพัง', 'จัดการความขัดแย้งในงานกลุ่มที่เพื่อนบางคนไม่ช่วยงาน', 'kids', '[
  {"name": "เพื่อนที่ไม่ทำงาน", "role": "ผู้ร่วมทีม", "agenda": "มีปัญหาส่วนตัวที่บ้านเลยไม่อยากทำ", "personality": "เก็บตัว ตั้งรับ"},
  {"name": "เพื่อนที่อยากให้จบเร็วๆ", "role": "ผู้ร่วมทีม", "agenda": "อยากให้งานเสร็จๆ ไป จะได้ไปเล่นเกม", "personality": "ใจร้อน เน้นทางลัด"},
  {"name": "ครู", "role": "อาจารย์ที่ปรึกษา", "agenda": "สังเกตการณ์และคอยกระตุ้นให้เด็กแก้ปัญหากันเอง", "personality": "ใจดีแต่เข้มงวด"}
-- Function to increment skill XP
CREATE OR REPLACE FUNCTION increment_skill_xp(p_user_id UUID, p_skill_name TEXT, p_xp INTEGER)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.skill_progress (user_id, skill_name, xp, level)
  VALUES (p_user_id, p_skill_name, p_xp, 1)
  ON CONFLICT (user_id, skill_name)
  DO UPDATE SET 
    xp = public.skill_progress.xp + p_xp,
    level = floor((public.skill_progress.xp + p_xp) / 100) + 1,
    updated_at = now();
END;
$$ LANGUAGE plpgsql;
