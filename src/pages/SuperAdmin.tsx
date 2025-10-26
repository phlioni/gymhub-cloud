import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Plus, LogOut, Dumbbell, Search } from "lucide-react";
import { OrganizationsTable } from "@/components/super-admin/OrganizationsTable";
import { CreateOrganizationDialog } from "@/components/super-admin/CreateOrganizationDialog";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

// Define a interface para os dados agregados da organização
export interface OrganizationStats {
  org_id: string;
  org_name: string;
  org_created_at: string;
  owner_id: string;
  owner_name: string;
  owner_email: string;
  owner_last_sign_in_at: string | null;
  owner_is_active: boolean;
  student_count: number;
  total_enrollment_revenue: number;
  total_product_revenue: number;
  subscription_status: 'trial' | 'active' | 'inactive' | 'overdue';
  trial_expires_at: string | null;
}

const SuperAdmin = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [organizations, setOrganizations] = useState<OrganizationStats[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

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

    if (profile?.role !== 'superadmin') {
      navigate('/dashboard');
      return;
    }

    loadOrganizations();
  };

  const loadOrganizations = async () => {
    setLoading(true);
    try {
      // Chama a nova função RPC para obter dados agregados
      const { data, error } = await supabase.rpc('get_all_organization_stats');

      if (error) throw error;
      setOrganizations(data || []);
    } catch (error: any) {
      toast.error("Falha ao carregar as organizações", { description: error.message });
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Falha ao sair");
    } else {
      navigate('/');
    }
  };

  const filteredOrganizations = useMemo(() => {
    if (!searchTerm) {
      return organizations;
    }
    return organizations.filter(org =>
      org.org_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [organizations, searchTerm]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Dumbbell className="h-6 w-6 text-primary" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              TreineAI
            </span>
            <span className="ml-2 text-sm text-muted-foreground">Super Admin</span>
          </div>
          <Button variant="ghost" onClick={handleSignOut}>
            <LogOut className="h-5 w-5 mr-2" />
            Sair
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-8 space-y-8">
        <div>
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Painel Super Admin
          </h1>
          <p className="text-muted-foreground">
            Gerencie todas as organizações e contas de clientes
          </p>
        </div>

        <Card className="relative overflow-hidden group hover:shadow-lg transition-shadow">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 opacity-50" />
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription>Total de Organizações</CardDescription>
              <Building2 className="h-5 w-5 text-muted-foreground" />
            </div>
            <CardTitle className="text-3xl font-bold">{organizations.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Clientes de academias registrados</p>
          </CardContent>
        </Card>

        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <h2 className="text-2xl font-bold">Organizações</h2>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome..."
                className="pl-10 h-11"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button onClick={() => setShowCreateDialog(true)} size="lg" className="h-11">
              <Plus className="h-5 w-5 mr-2" />
              Criar Organização
            </Button>
          </div>
        </div>

        <OrganizationsTable
          organizations={filteredOrganizations}
          loading={loading}
          onRefresh={loadOrganizations}
        />

        <CreateOrganizationDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          onSuccess={loadOrganizations}
        />
      </main>
    </div>
  );
};

export default SuperAdmin;