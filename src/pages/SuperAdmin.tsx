import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Plus, LogOut, Dumbbell } from "lucide-react";
import { OrganizationsTable } from "@/components/super-admin/OrganizationsTable";
import { CreateOrganizationDialog } from "@/components/super-admin/CreateOrganizationDialog";
import { toast } from "sonner";

const SuperAdmin = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [organizations, setOrganizations] = useState([]);

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
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrganizations(data || []);
    } catch (error: any) {
      toast.error("Falha ao carregar as organizações");
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

        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Organizações</h2>
          <Button onClick={() => setShowCreateDialog(true)} size="lg">
            <Plus className="h-5 w-5 mr-2" />
            Criar Organização
          </Button>
        </div>

        <OrganizationsTable
          organizations={organizations}
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