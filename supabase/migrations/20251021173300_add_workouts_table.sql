-- Dropar tabelas existentes se elas já foram criadas na ordem inversa para evitar erros de FK
DROP TABLE IF EXISTS public.workout_exercises;
DROP TABLE IF EXISTS public.workout_students; -- Renomeado de workout_assignments
DROP TABLE IF EXISTS public.workouts;

-- Tabela para armazenar os treinos (sem referência direta ao aluno)
CREATE TABLE public.workouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    frequency TEXT NOT NULL DEFAULT 'single' CHECK (frequency IN ('single', 'daily', 'weekly')),
    day_of_week INTEGER NULL CHECK (day_of_week >= 1 AND day_of_week <= 7),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Garante que day_of_week só é preenchido se frequency = 'daily'
    CONSTRAINT check_day_of_week_frequency CHECK ((frequency = 'daily' AND day_of_week IS NOT NULL) OR (frequency != 'daily' AND day_of_week IS NULL))
);

-- Tabela de associação (MUITOS-PARA-MUITOS entre workouts e students)
CREATE TABLE public.workout_students (
    workout_id UUID NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    PRIMARY KEY (workout_id, student_id) -- Chave primária composta
);

-- Tabela para armazenar os exercícios de um treino
CREATE TABLE public.workout_exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workout_id UUID NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
    exercise_name TEXT NOT NULL,
    sets TEXT,
    reps TEXT,
    rest_period TEXT,
    observations TEXT,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habilita RLS
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_exercises ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para workouts
CREATE POLICY "Admins can view their organization's workouts" ON public.workouts FOR SELECT USING (organization_id = public.get_user_organization_id() OR public.is_superadmin());
CREATE POLICY "Admins can insert workouts in their organization" ON public.workouts FOR INSERT WITH CHECK (organization_id = public.get_user_organization_id() OR public.is_superadmin());
CREATE POLICY "Admins can update their organization's workouts" ON public.workouts FOR UPDATE USING (organization_id = public.get_user_organization_id() OR public.is_superadmin());
CREATE POLICY "Admins can delete their organization's workouts" ON public.workouts FOR DELETE USING (organization_id = public.get_user_organization_id() OR public.is_superadmin());

-- Políticas de RLS para a nova tabela workout_students
CREATE POLICY "Admins can manage their org's workout assignments"
  ON public.workout_students FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.workouts w
      WHERE w.id = workout_students.workout_id
      AND (w.organization_id = public.get_user_organization_id() OR public.is_superadmin())
    )
  );

-- Políticas de RLS para workout_exercises
CREATE POLICY "Admins can manage exercises for their org's workouts"
  ON public.workout_exercises FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.workouts w
      WHERE w.id = workout_exercises.workout_id
      AND (w.organization_id = public.get_user_organization_id() OR public.is_superadmin())
    )
  );

-- Trigger para atualizar 'updated_at' na tabela workouts
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_timestamp
BEFORE UPDATE ON public.workouts
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();