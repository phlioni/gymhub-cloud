-- Adiciona uma coluna para armazenar os links de vídeo do último treino enviado
ALTER TABLE public.student_coach_interactions
ADD COLUMN IF NOT EXISTS last_workout_video_links JSONB;