-- Adicionar colunas de integração à tabela organizations
ALTER TABLE public.organizations
ADD COLUMN gympass_api_key TEXT,
ADD COLUMN gympass_integration_code TEXT,
ADD COLUMN totalpass_api_key TEXT,
ADD COLUMN totalpass_integration_code TEXT;

-- Adicionar colunas de token de aluno à tabela students
ALTER TABLE public.students
ADD COLUMN gympass_user_token TEXT,
ADD COLUMN totalpass_user_token TEXT;

-- Adicionar campo de origem (source) à tabela check_ins
-- Isso permite saber se o check-in veio do WhatsApp, Gympass, TotalPass ou foi manual.
ALTER TABLE public.check_ins
ADD COLUMN source TEXT DEFAULT 'WhatsApp' CHECK (source IN ('WhatsApp', 'Gympass', 'TotalPass', 'Manual'));

-- Adicionar colunas de mapeamento à tabela modalities (para integrações futuras de agendamento)
ALTER TABLE public.modalities
ADD COLUMN gympass_modality_id TEXT,
ADD COLUMN totalpass_modality_id TEXT;

-- Criação de um índice para otimizar buscas por tokens
CREATE INDEX IF NOT EXISTS idx_students_gympass_token ON public.students (gympass_user_token);
CREATE INDEX IF NOT EXISTS idx_students_totalpass_token ON public.students (totalpass_user_token);