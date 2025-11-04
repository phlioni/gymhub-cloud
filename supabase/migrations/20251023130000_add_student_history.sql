-- Tabela para armazenar o histórico de interações, fotos e progresso do aluno
CREATE TABLE IF NOT EXISTS public.student_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- 'photo_food', 'photo_progress', 'plan_approved', 'goal_set', 'weight_log'
    notes TEXT, -- Análise da IA, comentários do personal, etc.
    metadata JSONB, -- { "url": "...", "calories": 500, "protein": 30 } ou { "weight": 85 }
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habilita RLS
ALTER TABLE public.student_history ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
DROP POLICY IF EXISTS "Admins can view their organization's student history" ON public.student_history;
CREATE POLICY "Admins can view their organization's student history"
  ON public.student_history FOR SELECT
  USING (organization_id = public.get_user_organization_id() OR public.is_superadmin());

DROP POLICY IF EXISTS "Service roles can insert history" ON public.student_history;
CREATE POLICY "Service roles can insert history"
  ON public.student_history FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- >>> INÍCIO: NOVA POLÍTICA DE DELETE (HISTÓRICO) <<<
DROP POLICY IF EXISTS "Admins can delete their organization's history" ON public.student_history;
CREATE POLICY "Admins can delete their organization's history"
  ON public.student_history FOR DELETE
  USING (organization_id = public.get_user_organization_id() OR public.is_superadmin());
-- >>> FIM: NOVA POLÍTICA <<<


-- Storage Bucket for student uploads (food pics, progress pics)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('student_uploads', 'student_uploads', false, 5242880, ARRAY['image/jpeg', 'image/png'])
ON CONFLICT (id) DO NOTHING;

-- Políticas para o bucket 'student_uploads'
DROP POLICY IF EXISTS "Allow service_role full access to student uploads" ON storage.objects;
CREATE POLICY "Allow service_role full access to student uploads"
    ON storage.objects FOR ALL
    USING (bucket_id = 'student_uploads' AND auth.role() = 'service_role');

-- Política de SELECT (Leitura)
DROP POLICY IF EXISTS "Allow admins to view their org's images" ON storage.objects;
CREATE POLICY "Allow admins to view their org's images"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'student_uploads' 
        AND (
            public.is_superadmin()
            OR EXISTS (
                SELECT 1
                FROM public.student_history sh
                WHERE sh.metadata->>'url' = storage.objects.name
                AND sh.organization_id = public.get_user_organization_id()
            )
        )
    );

-- >>> INÍCIO: NOVA POLÍTICA DE DELETE (STORAGE) <<<
DROP POLICY IF EXISTS "Allow admins to delete their org's images" ON storage.objects;
CREATE POLICY "Allow admins to delete their org's images"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'student_uploads'
        AND (
            public.is_superadmin()
            OR public.get_user_organization_id() = (storage.foldername(name))[1]::uuid
        )
    );
-- >>> FIM: NOVA POLÍTICA <<<