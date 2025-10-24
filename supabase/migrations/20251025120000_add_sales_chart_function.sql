-- Função para obter a receita mensal de vendas de produtos nos últimos 6 meses
CREATE OR REPLACE FUNCTION public.get_monthly_sales_revenue()
RETURNS TABLE(month TEXT, total NUMERIC, month_br TEXT)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH months AS (
    SELECT generate_series(
      date_trunc('month', now() - interval '5 months'),
      date_trunc('month', now()),
      '1 month'::interval
    ) AS month
  )
  SELECT
    to_char(m.month, 'YYYY-MM') AS month,
    COALESCE(SUM(s.total_price), 0)::NUMERIC AS total,
    to_char(m.month, 'TMMon') AS month_br
  FROM months m
  LEFT JOIN public.sales s ON date_trunc('month', s.sale_date) = m.month
    AND s.organization_id = public.get_user_organization_id()
  GROUP BY m.month
  ORDER BY m.month;
END;
$$;