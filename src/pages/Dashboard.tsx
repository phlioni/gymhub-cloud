import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Calendar, DollarSign, AlertTriangle, BarChart2, ShoppingBag, UserPlus, ShoppingCart, TrendingDown, TrendingUp, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ExpiringEnrollmentsDialog } from "@/components/dashboard/ExpiringEnrollmentsDialog";
import { OverdueEnrollmentsDialog } from "@/components/dashboard/OverdueEnrollmentsDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from "@/lib/utils";

// --- Tipagens ---
interface TopProduct {
  name: string | null;
  total_sold: number;
}
interface MonthlyRevenue {
  month_br: string;
  total: number;
}
interface RecentActivity {
  type: 'sale' | 'enrollment';
  description: string;
  value: string;
  created_at: string;
}

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalStudents: 0,
    expiringIn10Days: 0,
    monthlyProductRevenue: 0,
    overduePayments: 0,
    monthlyEnrollmentRevenue: 0,
    annualEnrollmentRevenue: 0,
    enrollmentRevenueChange: 0,
    checkInsToday: 0,
  });
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [enrollmentChartData, setEnrollmentChartData] = useState<MonthlyRevenue[]>([]);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [showExpiringDialog, setShowExpiringDialog] = useState(false);
  const [showOverdueDialog, setShowOverdueDialog] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const today = new Date();
      const tenDaysFromNow = new Date(today);
      tenDaysFromNow.setDate(today.getDate() + 10);
      const firstDayOfCurrentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const startOfToday = new Date(today.setHours(0, 0, 0, 0)).toISOString();


      const [
        { count: totalStudents },
        { count: expiringIn10Days },
        { count: overduePayments },
        { data: salesThisMonthData },
        { data: topProductsData, error: rpcErrorTopProducts },
        { data: recentSales },
        { data: recentEnrollments },
        { data: enrollmentRevenueStats, error: rpcErrorEnrollments },
        { count: checkInsToday },
      ] = await Promise.all([
        supabase.from('students').select('*', { count: 'exact', head: true }),
        supabase.from('enrollments').select('*', { count: 'exact', head: true }).lte('expiry_date', tenDaysFromNow.toISOString().split('T')[0]).gte('expiry_date', today.toISOString().split('T')[0]),
        supabase.from('enrollments').select('*', { count: 'exact', head: true }).lt('expiry_date', today.toISOString().split('T')[0]),
        supabase.from('sales').select('total_price').gte('sale_date', firstDayOfCurrentMonth.toISOString()),
        supabase.rpc('get_top_products_this_month'),
        supabase.from('sales').select('students(name), products(name), total_price, sale_date').order('sale_date', { ascending: false }).limit(3),
        supabase.from('enrollments').select('students(name), modalities(name), created_at').order('created_at', { ascending: false }).limit(2),
        supabase.rpc('get_enrollment_revenue_stats'),
        supabase.from('check_ins').select('*', { count: 'exact', head: true }).gte('checked_in_at', startOfToday),
      ]);

      if (rpcErrorTopProducts) throw rpcErrorTopProducts;
      if (rpcErrorEnrollments) throw rpcErrorEnrollments;

      const monthlyProductRevenue = salesThisMonthData?.reduce((sum, sale) => sum + sale.total_price, 0) || 0;

      const { annual_total, current_month_total, previous_month_total, chart_data } = enrollmentRevenueStats as any;

      let enrollmentRevenueChange = 0;
      if (previous_month_total > 0) {
        enrollmentRevenueChange = ((current_month_total - previous_month_total) / previous_month_total) * 100;
      } else if (current_month_total > 0) {
        enrollmentRevenueChange = 100;
      }

      setStats({
        totalStudents: totalStudents || 0,
        expiringIn10Days: expiringIn10Days || 0,
        monthlyProductRevenue,
        overduePayments: overduePayments || 0,
        monthlyEnrollmentRevenue: current_month_total || 0,
        annualEnrollmentRevenue: annual_total || 0,
        enrollmentRevenueChange,
        checkInsToday: checkInsToday || 0,
      });

      setEnrollmentChartData(chart_data || []);
      setTopProducts(topProductsData || []);

      const salesActivities = recentSales?.map(s => ({ type: 'sale' as const, description: `${s.students?.name || 'Venda anônima'} comprou ${s.products?.name}`, value: `+ R$ ${Number(s.total_price).toFixed(2)}`, created_at: s.sale_date })) || [];
      const enrollmentActivities = recentEnrollments?.map(e => ({ type: 'enrollment' as const, description: `${e.students?.name} se matriculou em ${e.modalities?.name}`, value: ``, created_at: e.created_at })) || [];
      const combined = [...salesActivities, ...enrollmentActivities].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);
      setRecentActivities(combined);

    } catch (error: any) {
      toast.error("Falha ao carregar os dados do painel.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const timeAgo = (date: string) => formatDistanceToNow(new Date(date), { addSuffix: true, locale: ptBR });
  const formatCurrency = (value: number) => `R$ ${value.toFixed(2).replace('.', ',')}`;

  return (
    <>
      <main className="flex-1 p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Dashboard
            </h1>
            <p className="text-muted-foreground text-sm md:text-base">
              A visão geral e em tempo real da sua academia.
            </p>
          </div>

          <div className="grid gap-4 md:gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Faturamento Anual (Matrículas)</CardTitle><TrendingUp className="h-5 w-5 text-blue-500" /></CardHeader><CardContent>{loading ? <Skeleton className="h-8 w-3/4" /> : <div className="text-2xl font-bold">{formatCurrency(stats.annualEnrollmentRevenue)}</div>}<p className="text-xs text-muted-foreground">Receita acumulada no ano corrente.</p></CardContent></Card>
            <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Faturamento do Mês (Matrículas)</CardTitle><DollarSign className="h-5 w-5 text-green-500" /></CardHeader><CardContent>{loading ? <Skeleton className="h-8 w-3/4" /> : <> <div className="text-2xl font-bold">{formatCurrency(stats.monthlyEnrollmentRevenue)}</div> <p className={cn("text-xs", stats.enrollmentRevenueChange >= 0 ? "text-green-600" : "text-red-600")}> {stats.enrollmentRevenueChange >= 0 ? '+' : ''}{stats.enrollmentRevenueChange.toFixed(1)}% vs. mês anterior </p> </>}</CardContent></Card>
            <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Faturamento do Mês (Produtos)</CardTitle><ShoppingBag className="h-5 w-5 text-green-500" /></CardHeader><CardContent>{loading ? <Skeleton className="h-8 w-3/4" /> : <div className="text-2xl font-bold">{formatCurrency(stats.monthlyProductRevenue)}</div>}<p className="text-xs text-muted-foreground">Receita total de vendas de produtos.</p></CardContent></Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Check-ins Hoje</CardTitle>
                <CheckCheck className="h-5 w-5 text-purple-500" />
              </CardHeader>
              <CardContent>
                {loading ? <Skeleton className="h-8 w-1/4" /> : <div className="text-2xl font-bold">{stats.checkInsToday}</div>}
                <p className="text-xs text-muted-foreground">Alunos que treinaram hoje.</p>
              </CardContent>
            </Card>
            <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total de Alunos Ativos</CardTitle><Users className="h-5 w-5 text-primary" /></CardHeader><CardContent>{loading ? <Skeleton className="h-8 w-1/4" /> : <div className="text-2xl font-bold">{stats.totalStudents}</div>}<p className="text-xs text-muted-foreground">Alunos com matrícula válida.</p></CardContent></Card>
            <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Matrículas Vencendo</CardTitle><Calendar className="h-5 w-5 text-accent" /></CardHeader><CardContent>{loading ? <Skeleton className="h-8 w-1/4" /> : <div className="text-2xl font-bold">{stats.expiringIn10Days}</div>}<p className="text-xs text-muted-foreground">Nos próximos 10 dias.</p><Button variant="link" size="sm" className="p-0 h-auto" onClick={() => setShowExpiringDialog(true)}>Ver Lista</Button></CardContent></Card>
            <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Pagamentos Atrasados</CardTitle><AlertTriangle className="h-5 w-5 text-destructive" /></CardHeader><CardContent>{loading ? <Skeleton className="h-8 w-1/4" /> : <div className="text-2xl font-bold">{stats.overduePayments}</div>}<p className="text-xs text-muted-foreground">Alunos com mensalidades vencidas.</p><Button variant="link" size="sm" className="p-0 h-auto text-destructive" onClick={() => setShowOverdueDialog(true)}>Ver e Cobrar</Button></CardContent></Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 md:gap-6">
            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base md:text-lg"><BarChart2 className="h-5 w-5 text-primary" /> Faturamento Mensal (Matrículas)</CardTitle>
                <CardDescription className="text-xs md:text-sm">Receita de novas matrículas e renovações nos últimos 6 meses.</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? <Skeleton className="h-64 w-full" /> :
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={enrollmentChartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="month_br" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `R$${value}`} />
                      <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} contentStyle={{ backgroundColor: 'hsl(var(--background))' }} formatter={(value: number) => [formatCurrency(value), "Faturamento"]} />
                      <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                }
              </CardContent>
            </Card>
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base md:text-lg"><ShoppingBag className="h-5 w-5 text-primary" /> Top 5 Produtos Vendidos (Mês)</CardTitle>
                <CardDescription className="text-xs md:text-sm">Produtos que mais geraram receita este mês.</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? <Skeleton className="h-40 w-full" /> :
                  topProducts.length > 0 ? (
                    <ul className="space-y-4">
                      {topProducts.map((p, i) => (
                        <li key={i} className="flex justify-between items-center text-sm">
                          <span className="font-medium">{i + 1}. {p.name}</span>
                          <span className="font-semibold text-green-600">{formatCurrency(p.total_sold)}</span>
                        </li>
                      ))}
                    </ul>
                  ) : <p className="text-sm text-muted-foreground text-center py-10">Nenhuma venda de produto registrada este mês.</p>}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:gap-6 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2 text-base md:text-lg"><TrendingDown className="h-5 w-5 text-destructive" /> Alunos em Risco</CardTitle><CardDescription className="text-xs md:text-sm">Alunos que não frequentam há mais de 20 dias.</CardDescription></CardHeader>
              <CardContent className="flex items-center justify-center h-full text-muted-foreground text-sm min-h-[150px]">
                <p>Funcionalidade em desenvolvimento...</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base md:text-lg">Atividade Recente</CardTitle></CardHeader>
              <CardContent>
                {loading ? (<div className="space-y-3"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>) :
                  recentActivities.length > 0 ? (
                    <ul className="space-y-4">
                      {recentActivities.map((activity, index) => (
                        <li key={index} className="flex items-center gap-4">
                          <div className="p-2 bg-muted rounded-full">
                            {activity.type === 'enrollment' ? <UserPlus className="h-5 w-5 text-primary" /> : <ShoppingCart className="h-5 w-5 text-accent" />}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{activity.description}</p>
                            <p className="text-xs text-muted-foreground">{timeAgo(activity.created_at)}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (<p className="text-sm text-muted-foreground text-center py-4">Nenhuma atividade recente.</p>)}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <ExpiringEnrollmentsDialog open={showExpiringDialog} onOpenChange={setShowExpiringDialog} />
      <OverdueEnrollmentsDialog open={showOverdueDialog} onOpenChange={setShowOverdueDialog} />
    </>
  );
};

export default Dashboard;