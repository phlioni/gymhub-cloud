-- Adiciona a coluna 'is_active' à tabela de perfis para controlar o status do usuário.
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Adiciona a coluna 'last_sign_in_at' que será sincronizada com a tabela de autenticação.
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS last_sign_in_at TIMESTAMPTZ;

-- Função para buscar dados agregados de todas as organizações para o painel do super admin.
CREATE OR REPLACE FUNCTION public.get_all_organization_stats()
RETURNS TABLE(
  org_id UUID,
  org_name TEXT,
  org_created_at TIMESTAMPTZ,
  owner_id UUID,
  owner_name TEXT,
  owner_email TEXT,
  owner_last_sign_in_at TIMESTAMPTZ,
  owner_is_active BOOLEAN,
  student_count BIGINT,
  total_enrollment_revenue NUMERIC,
  total_product_revenue NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER -- Importante para permitir que a função acesse tabelas com RLS.
AS $$
BEGIN
  -- Garante que apenas superadmins possam executar esta função
  IF NOT public.is_superadmin() THEN
    RAISE EXCEPTION 'Acesso negado. Apenas super administradores podem executar esta função.';
  END IF;

  RETURN QUERY
  SELECT
    o.id AS org_id,
    o.name AS org_name,
    o.created_at AS org_created_at,
    p.id AS owner_id,
    p.full_name AS owner_name,
    u.email::TEXT AS owner_email, -- CORREÇÃO: Converte o tipo da coluna email para TEXT
    u.last_sign_in_at AS owner_last_sign_in_at,
    p.is_active,
    (SELECT COUNT(*) FROM public.students s WHERE s.organization_id = o.id) AS student_count,
    COALESCE((SELECT SUM(e.price) FROM public.enrollments e JOIN public.students s ON e.student_id = s.id WHERE s.organization_id = o.id), 0) AS total_enrollment_revenue,
    COALESCE((SELECT SUM(sa.total_price) FROM public.sales sa WHERE sa.organization_id = o.id), 0) AS total_product_revenue
  FROM
    public.organizations o
  LEFT JOIN
    public.profiles p ON o.id = p.organization_id
  LEFT JOIN
    auth.users u ON p.id = u.id
  WHERE
    p.role = 'admin' -- Garante que estamos pegando o perfil do admin da organização
  ORDER BY
    o.name;
END;
$$;