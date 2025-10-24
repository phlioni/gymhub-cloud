import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  DollarSign,
  TrendingUp,
  CheckCheck,
  BarChart2,
  ClipboardCheck,
  CalendarClock,
  UserMinus,
  Bot,
  ArrowRight,
  ShoppingBag,
  Award
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ExpiringEnrollmentsDialog } from "@/components/dashboard/ExpiringEnrollmentsDialog";
import { OverdueEnrollmentsDialog } from "@/components/dashboard/OverdueEnrollmentsDialog";
import { AtRiskStudentsDialog } from "@/components/dashboard/AtRiskStudentsDialog";
import { cn } from "@/lib/utils";

// --- Tipagens ---
interface MonthlyRevenue {
  month_br: string;
  total: number;
}
interface ModalityPopularity {
  name: string;
  count: number;
}
interface TopProduct {
  name: string | null;
  total_sold: number;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [showExpiringDialog, setShowExpiringDialog] = useState(false);
  const [showOverdueDialog, setShowOverdueDialog] = useState(false);
  const [showAtRiskDialog, setShowAtRiskDialog] = useState(false);

  const [data, setData] = useState({
    totalRevenueMonth: 0,
    revenueChange: 0,
    activeStudents: 0,
    netStudentGrowth: 0,
    atRiskStudentsCount: 0,
    checkInsToday: 0,
    pendingValidationsCount: 0,
    expiringEnrollmentsCount: 0,
    overdueEnrollmentsCount: 0,
    revenueChartData: [] as MonthlyRevenue[],
    salesChartData: [] as MonthlyRevenue[],
    modalityPopularityData: [] as ModalityPopularity[],
    topProducts: [] as TopProduct[],
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const today = new Date();
      const firstDayOfCurrentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const startOfToday = new Date(today.setHours(0, 0, 0, 0)).toISOString();
      const fifteenDaysAgo = new Date();
      fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

      const [
        { count: totalStudents },
        { data: salesThisMonthData },
        { data: enrollmentRevenueStats, error: rpcErrorEnrollments },
        { data: salesRevenueStats, error: rpcErrorSales },
        { data: modalityPopularity, error: rpcErrorModality },
        { count: checkInsToday },
        { count: expiringIn10Days },
        { count: overduePayments },
        { count: pendingValidationsCount },
        { data: topProductsData, error: rpcErrorTopProducts },
        { data: allStudentsWithCheckins, error: studentsError },
      ] = await Promise.all([
        supabase.from('students').select('*', { count: 'exact', head: true }),
        supabase.from('sales').select('total_price').gte('sale_date', firstDayOfCurrentMonth.toISOString()),
        supabase.rpc('get_enrollment_revenue_stats'),
        supabase.rpc('get_monthly_sales_revenue'),
        supabase.rpc('get_modality_popularity'),
        supabase.from('check_ins').select('*', { count: 'exact', head: true }).gte('checked_in_at', startOfToday),
        supabase.from('enrollments').select('*', { count: 'exact', head: true }).lte('expiry_date', new Date(today.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString()).gte('expiry_date', today.toISOString()),
        supabase.from('enrollments').select('*', { count: 'exact', head: true }).lt('expiry_date', today.toISOString()),
        supabase.from('student_coach_interactions').select('*', { count: 'exact', head: true }).eq('conversation_state', 'awaiting_plan_validation'),
        supabase.rpc('get_top_products_this_month'),
        supabase.from('students').select('id, check_ins(checked_in_at)'),
      ]);

      if (rpcErrorEnrollments) throw rpcErrorEnrollments;
      if (rpcErrorSales) throw rpcErrorSales;
      if (rpcErrorModality) throw rpcErrorModality;
      if (rpcErrorTopProducts) throw rpcErrorTopProducts;
      if (studentsError) throw studentsError;

      const monthlyProductRevenue = salesThisMonthData?.reduce((sum, sale) => sum + sale.total_price, 0) || 0;
      const { current_month_total, previous_month_total, chart_data: enrollmentChartData } = enrollmentRevenueStats as any;
      const totalRevenueMonth = (current_month_total || 0) + monthlyProductRevenue;

      let revenueChange = 0;
      if (previous_month_total > 0) {
        revenueChange = ((current_month_total - previous_month_total) / previous_month_total) * 100;
      } else if (current_month_total > 0) {
        revenueChange = 100;
      }

      const atRiskStudents = allStudentsWithCheckins?.filter(student => {
        if (student.check_ins.length === 0) return true;
        const lastCheckIn = new Date(Math.max(...student.check_ins.map(ci => new Date(ci.checked_in_at).getTime())));
        return lastCheckIn < fifteenDaysAgo;
      }) || [];

      setData({
        totalRevenueMonth,
        revenueChange,
        activeStudents: totalStudents || 0,
        netStudentGrowth: 4, // Simulado
        checkInsToday: checkInsToday || 0,
        pendingValidationsCount: pendingValidationsCount || 0,
        expiringEnrollmentsCount: expiringIn10Days || 0,
        overdueEnrollmentsCount: overduePayments || 0,
        atRiskStudentsCount: atRiskStudents.length,
        revenueChartData: enrollmentChartData || [],
        salesChartData: salesRevenueStats as MonthlyRevenue[] || [],
        modalityPopularityData: modalityPopularity as ModalityPopularity[] || [],
        topProducts: topProductsData || [],
      });

    } catch (error: any) {
      toast.error("Falha ao carregar os dados do painel.", { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => `R$ ${value.toFixed(2).replace('.', ',')}`;

  return (
    <>
      <main className="flex-1 p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">Dashboard</h1>
            <p className="text-muted-foreground text-sm md:text-base">Visão geral e em tempo real do seu negócio.</p>
          </div>

          <div className="grid gap-4 md:gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Receita do Mês</CardTitle></CardHeader><CardContent>{loading ? <Skeleton className="h-10 w-3/4" /> : <><div className="text-3xl font-bold">{formatCurrency(data.totalRevenueMonth)}</div><p className={cn("text-xs", data.revenueChange >= 0 ? "text-green-600" : "text-red-600")}> {data.revenueChange >= 0 ? '+' : ''}{data.revenueChange.toFixed(1)}% em relação ao mês anterior</p></>}</CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Alunos Ativos</CardTitle></CardHeader><CardContent>{loading ? <Skeleton className="h-10 w-1/2" /> : <><div className="text-3xl font-bold">{data.activeStudents}</div><p className={cn("text-xs", data.netStudentGrowth >= 0 ? "text-green-600" : "text-red-600")}> {data.netStudentGrowth >= 0 ? '+' : ''}{data.netStudentGrowth} este mês</p></>}</CardContent></Card>
            <Card className="cursor-pointer hover:border-primary/50" onClick={() => setShowAtRiskDialog(true)}><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Alunos em Risco</CardTitle></CardHeader><CardContent>{loading ? <Skeleton className="h-10 w-1/4" /> : <><div className="text-3xl font-bold">{data.atRiskStudentsCount}</div><p className="text-xs text-muted-foreground">Não treinam há mais de 15 dias</p></>}</CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Check-ins Hoje</CardTitle></CardHeader><CardContent>{loading ? <Skeleton className="h-10 w-1/4" /> : <><div className="text-3xl font-bold">{data.checkInsToday}</div><p className="text-xs text-muted-foreground">Alunos que treinaram hoje</p></>}</CardContent></Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card className="col-span-1 md:col-span-2">
                <CardHeader><CardTitle className="flex items-center gap-2 text-base md:text-lg"><BarChart2 className="h-5 w-5" /> Faturamento Mensal (Matrículas)</CardTitle></CardHeader>
                <CardContent>{loading ? <Skeleton className="h-64 w-full" /> : <ResponsiveContainer width="100%" height={250}><BarChart data={data.revenueChartData}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="month_br" fontSize={12} tickLine={false} axisLine={false} /><YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `R$${value}`} /><Tooltip cursor={{ fill: 'hsl(var(--muted))' }} contentStyle={{ backgroundColor: 'hsl(var(--background))' }} formatter={(value: number) => [formatCurrency(value), "Faturamento"]} /><Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer>}</CardContent>
              </Card>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader><CardTitle className="flex items-center gap-2 text-base md:text-lg"><Award className="h-5 w-5" /> Modalidades Mais Populares</CardTitle></CardHeader>
                  <CardContent className="min-h-[248px] flex items-center justify-center">{loading ? <Skeleton className="h-48 w-full" /> : data.modalityPopularityData.length > 0 ? <ResponsiveContainer width="100%" height={200}><BarChart data={data.modalityPopularityData} layout="vertical"><CartesianGrid strokeDasharray="3 3" horizontal={false} /><XAxis type="number" hide /><YAxis type="category" dataKey="name" fontSize={12} tickLine={false} axisLine={false} width={80} /><Tooltip cursor={{ fill: 'hsl(var(--muted))' }} contentStyle={{ backgroundColor: 'hsl(var(--background))' }} formatter={(value: number) => [value, "Alunos"]} /><Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer> : <p className="text-sm text-muted-foreground text-center">Nenhuma matrícula ativa no momento.</p>}</CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="flex items-center gap-2 text-base md:text-lg"><ShoppingBag className="h-5 w-5" /> Vendas de Produtos (Mês)</CardTitle></CardHeader>
                  <CardContent className="min-h-[248px] flex items-center justify-center">{loading ? <Skeleton className="h-48 w-full" /> : <ResponsiveContainer width="100%" height={200}><BarChart data={data.salesChartData}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="month_br" fontSize={12} tickLine={false} axisLine={false} /><YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `R$${value}`} width={40} /><Tooltip cursor={{ fill: 'hsl(var(--muted))' }} contentStyle={{ backgroundColor: 'hsl(var(--background))' }} formatter={(value: number) => [formatCurrency(value), "Vendas"]} /><Bar dataKey="total" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer>}</CardContent>
                </Card>
              </div>
            </div>
            <div className="lg:col-span-1 space-y-6">
              <Card className="bg-primary/5 border-primary/20">
                <CardHeader><CardTitle className="flex items-center gap-2 text-base md:text-lg"><ClipboardCheck className="h-5 w-5" /> Ações Imediatas</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <ActionItem icon={Bot} title="Validações da ArIA" count={data.pendingValidationsCount} label="planos para aprovar" onClick={() => navigate('/ai-assistant')} loading={loading} />
                  <ActionItem icon={CalendarClock} title="Matrículas Vencendo" count={data.expiringEnrollmentsCount} label="nos próximos 10 dias" onClick={() => setShowExpiringDialog(true)} loading={loading} />
                  <ActionItem icon={UserMinus} title="Pagamentos Atrasados" count={data.overdueEnrollmentsCount} label="alunos para contatar" onClick={() => setShowOverdueDialog(true)} isDestructive loading={loading} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2 text-base md:text-lg"><ShoppingBag className="h-5 w-5" /> Top 5 Produtos (Mês)</CardTitle></CardHeader>
                <CardContent>{loading ? <Skeleton className="h-48 w-full" /> : data.topProducts.length > 0 ? (<ul className="space-y-3">{data.topProducts.map((p, i) => (<li key={i} className="flex justify-between items-center text-sm"><span className="font-medium truncate pr-2">{i + 1}. {p.name}</span><span className="font-semibold text-green-600 whitespace-nowrap">{formatCurrency(p.total_sold)}</span></li>))}</ul>) : <p className="text-sm text-muted-foreground text-center h-full flex items-center justify-center">Nenhuma venda de produto no mês.</p>}</CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      <ExpiringEnrollmentsDialog open={showExpiringDialog} onOpenChange={setShowExpiringDialog} />
      <OverdueEnrollmentsDialog open={showOverdueDialog} onOpenChange={setShowOverdueDialog} />
      <AtRiskStudentsDialog open={showAtRiskDialog} onOpenChange={setShowAtRiskDialog} />
    </>
  );
};

const ActionItem = ({ icon: Icon, title, count, label, onClick, isDestructive, loading }: any) => (
  <div className={cn("flex items-center justify-between p-3 rounded-lg transition-colors", isDestructive ? "bg-destructive/10" : "bg-primary/10")}>
    <div className="flex items-center gap-3">
      <Icon className={cn("h-6 w-6", isDestructive ? "text-destructive" : "text-primary")} />
      <div>
        <p className="font-semibold text-sm">{title}</p>
        {loading ? <Skeleton className="h-5 w-24 mt-1" /> : <p className="text-xs text-muted-foreground"><span className="font-bold text-foreground">{count}</span> {label}</p>}
      </div>
    </div>
    <Button size="sm" variant="ghost" onClick={onClick} disabled={loading || count === 0}>Ver <ArrowRight className="h-4 w-4 ml-1" /></Button>
  </div>
);

export default Dashboard;