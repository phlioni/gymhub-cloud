-- Tabela para armazenar o estado da conversa e as sugestões da IA para cada aluno
CREATE TABLE public.student_coach_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_phone_number TEXT NOT NULL UNIQUE,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    conversation_state TEXT NOT NULL DEFAULT 'idle', -- Ex: idle, gathering_info, awaiting_plan_validation
    goal_details JSONB, -- Armazena informações coletadas (peso, altura, objetivo, etc.)
    plan_suggestion JSONB, -- Armazena o plano de treino/dieta sugerido pela IA
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habilita RLS na nova tabela
ALTER TABLE public.student_coach_interactions ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para a nova tabela
CREATE POLICY "Admins can manage their organization's interactions"
  ON public.student_coach_interactions FOR ALL
  USING (organization_id = public.get_user_organization_id() OR public.is_superadmin());

-- Adiciona um campo de email à tabela de alunos, que pode ser útil
ALTER TABLE public.students ADD COLUMN email TEXT;

-- Trigger para atualizar 'updated_at'
CREATE TRIGGER on_student_coach_interaction_update
  BEFORE UPDATE ON public.student_coach_interactions
  FOR EACH ROW
  EXECUTE PROCEDURE trigger_set_timestamp(); -- Reutiliza a função já criada