-- Adiciona o campo de URL de vídeo aos exercícios
ALTER TABLE public.workout_exercises
ADD COLUMN IF NOT EXISTS video_url TEXT;