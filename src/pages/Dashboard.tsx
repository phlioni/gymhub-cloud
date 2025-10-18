import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Calendar, CakeIcon, TrendingUp } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { toast } from "sonner";

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalStudents: 0,
    expiringEnrollments: 0,
    birthdaysThisMonth: 0,
  });

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/');
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (profile?.role === 'superadmin') {
      navigate('/super-admin');
      return;
    }

    loadDashboardStats();
  };

  const loadDashboardStats = async () => {
    try {
      // Get total students
      const { count: totalStudents } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true });

      // Get expiring enrollments (next 30 days)
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      const { count: expiringEnrollments } = await supabase
        .from('enrollments')
        .select('*', { count: 'exact', head: true })
        .lte('expiry_date', thirtyDaysFromNow.toISOString().split('T')[0])
        .gte('expiry_date', new Date().toISOString().split('T')[0]);

      // Get birthdays this month
      const currentMonth = new Date().getMonth() + 1;
      const { data: students } = await supabase
        .from('students')
        .select('birth_date');

      const birthdaysThisMonth = students?.filter(student => {
        if (!student.birth_date) return false;
        const birthMonth = new Date(student.birth_date).getMonth() + 1;
        return birthMonth === currentMonth;
      }).length || 0;

      setStats({
        totalStudents: totalStudents || 0,
        expiringEnrollments: expiringEnrollments || 0,
        birthdaysThisMonth,
      });
    } catch (error: any) {
      toast.error("Failed to load dashboard stats");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: "Total Active Students",
      value: stats.totalStudents,
      description: "All enrolled students",
      icon: Users,
      gradient: "from-primary to-primary/60",
    },
    {
      title: "Expiring Enrollments",
      value: stats.expiringEnrollments,
      description: "Next 30 days",
      icon: Calendar,
      gradient: "from-accent to-accent/60",
    },
    {
      title: "Birthdays This Month",
      value: stats.birthdaysThisMonth,
      description: "Celebrate with them!",
      icon: CakeIcon,
      gradient: "from-chart-3 to-chart-3/60",
    },
  ];

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8 bg-gradient-to-br from-background via-muted/20 to-background">
        <div className="max-w-7xl mx-auto space-y-8">
          <div>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Dashboard
            </h1>
            <p className="text-muted-foreground">
              Welcome back! Here's your gym's overview.
            </p>
          </div>

          {loading ? (
            <div className="grid gap-6 md:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader className="pb-2">
                    <div className="h-4 bg-muted rounded w-1/2 mb-2" />
                    <div className="h-8 bg-muted rounded w-1/3" />
                  </CardHeader>
                  <CardContent>
                    <div className="h-3 bg-muted rounded w-2/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-3">
              {statCards.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <Card key={index} className="relative overflow-hidden group hover:shadow-lg transition-shadow">
                    <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-5 group-hover:opacity-10 transition-opacity`} />
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardDescription>{stat.title}</CardDescription>
                        <Icon className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <CardTitle className="text-3xl font-bold">{stat.value}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-muted-foreground">{stat.description}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-accent" />
                  Quick Stats
                </CardTitle>
                <CardDescription>Your gym at a glance</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  More detailed analytics coming soon...
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest updates</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Activity feed coming soon...
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
