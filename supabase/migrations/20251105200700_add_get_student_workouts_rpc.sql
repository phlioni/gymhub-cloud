-- migration to create rpc for fetching student workouts securely
CREATE OR REPLACE FUNCTION public.get_student_workouts(p_student_id UUID)
RETURNS SETOF json -- Retorna um conjunto de objetos JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  student_org_id UUID;
  caller_org_id UUID;
BEGIN
  -- Obter a organização do aluno
  SELECT organization_id INTO student_org_id FROM public.students WHERE id = p_student_id;
  
  -- Obter a organização do chamador (admin/superadmin)
  caller_org_id := public.get_user_organization_id();

  -- Validação de RLS (o chamador deve ser da msm org ou superadmin)
  IF NOT (caller_org_id = student_org_id OR public.is_superadmin()) THEN
    RAISE EXCEPTION 'Acesso negado. Você não pode ver treinos desta organização. (RPC-GSW-001)';
  END IF;

  -- Retorna os dados do treino como JSON
  RETURN QUERY
  SELECT
    json_build_object(
      'id', w.id,
      'name', w.name,
      'description', w.description,
      'frequency', w.frequency,
      'day_of_week', w.day_of_week,
      'created_at', w.created_at,
      'updated_at', w.updated_at,
      'organization_id', w.organization_id,
      'workout_exercises', (
        SELECT COALESCE(json_agg(we.* ORDER BY we.order_index), '[]'::json)
        FROM public.workout_exercises we
        WHERE we.workout_id = w.id
      )
    )
  FROM
    public.workouts w
  JOIN
    public.workout_students ws ON w.id = ws.workout_id
  WHERE
    ws.student_id = p_student_id
  ORDER BY
    w.created_at DESC;
END;
$$;