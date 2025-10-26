-- Adiciona a coluna para rastrear o status da assinatura da organização
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'trial'
CHECK (subscription_status IN ('trial', 'active', 'inactive', 'overdue'));

-- Adiciona a coluna para rastrear a data de expiração do trial ou da assinatura paga
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS trial_expires_at TIMESTAMPTZ;

-- Adiciona uma função para estender o período de trial de uma organização.
-- Apenas superadmins podem executar esta função.
CREATE OR REPLACE FUNCTION public.extend_trial(
  org_id UUID,
  days_to_extend INT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Garante que apenas superadmins possam executar esta função
  IF NOT public.is_superadmin() THEN
    RAISE EXCEPTION 'Acesso negado. Apenas super administradores podem executar esta função.';
  END IF;

  UPDATE public.organizations
  SET
    trial_expires_at = trial_expires_at + (days_to_extend || ' days')::interval,
    subscription_status = 'trial' -- Garante que o status seja 'trial' ao estender
  WHERE id = org_id;
END;
$$;