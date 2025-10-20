-- Tabela para armazenar os registros de check-in
CREATE TABLE public.check_ins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    checked_in_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT check_ins_student_organization_unique UNIQUE (student_id, organization_id, checked_in_at)
);

-- Habilita RLS
ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para a tabela de check-ins
CREATE POLICY "Admins can view their organization's check-ins"
  ON public.check_ins FOR SELECT
  USING (organization_id = public.get_user_organization_id() OR public.is_superadmin());

CREATE POLICY "Users can insert their own check-ins (service role)"
  ON public.check_ins FOR INSERT
  WITH CHECK (true); -- A lógica de segurança será na function

-- Função para contagem de check-ins (opcional, mas otimiza a consulta)
CREATE OR REPLACE FUNCTION public.get_checkin_count(student_id_param UUID)
RETURNS INT
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM public.check_ins
    WHERE student_id = student_id_param
  );
END;
$$;