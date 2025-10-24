-- Remove a função se ela já existir para evitar conflitos
DROP FUNCTION IF EXISTS public.get_modality_popularity();

-- Função para obter a contagem de matrículas ativas por modalidade
CREATE OR REPLACE FUNCTION public.get_modality_popularity()
RETURNS TABLE(name TEXT, count BIGINT)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.name,
    COUNT(e.id) AS count
  FROM public.modalities m
  JOIN public.enrollments e ON m.id = e.modality_id
  WHERE m.organization_id = public.get_user_organization_id()
    AND e.expiry_date >= current_date
  GROUP BY m.name
  ORDER BY count DESC
  LIMIT 5;
END;
$$;