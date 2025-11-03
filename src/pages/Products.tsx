import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom"; // <<< 1. IMPORTAR useNavigate
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
// <<< 2. IMPORTAR ÍCONES DE ALERTA >>>
import { Plus, Search, Zap, AlertCircle } from "lucide-react";
import { ProductsTable } from "@/components/products/ProductsTable";
import { AddProductDialog } from "@/components/products/AddProductDialog";
import { toast } from "sonner";
import { FloatingActionButton } from "@/components/ui/FloatingActionButton";
import { useAuthProtection } from "@/hooks/useAuthProtection";
import { Session } from "@supabase/supabase-js";
// <<< 3. IMPORTAR COMPONENTES DE ALERTA >>>
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// --- 1. DEFINIR TIPO SIMPLIFICADO DE ALUNO ---
interface Student {
  id: string;
  name: string;
  phone_number: string | null;
}

const Products = () => {
  const { organizationId, loading: authLoading } = useAuthProtection();
  const [productsLoading, setProductsLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [session, setSession] = useState<Session | null>(null);

  // --- 2. ADICIONAR ESTADO PARA ALUNOS ---
  const [students, setStudents] = useState<Student[]>([]);

  // <<< 4. NOVOS ESTADOS PARA O STRIPE >>>
  const [stripeAccountStatus, setStripeAccountStatus] = useState<string | null>(null);
  const [stripeLoading, setStripeLoading] = useState(true);
  const navigate = useNavigate(); // <<< 5. INICIALIZAR useNavigate

  // 3. BUSCAR A SESSÃO DO USUÁRIO
  useEffect(() => {
    const getSession = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
    };
    getSession();
  }, []);

  useEffect(() => {
    if (organizationId) {
      loadProducts();
      // --- 4. CARREGAR ALUNOS QUANDO A ORG ID ESTIVER PRONTA ---
      loadStudents();
      // <<< 6. CARREGAR STATUS DO STRIPE >>>
      loadStripeStatus(organizationId);
    }
  }, [organizationId]);

  const loadProducts = async () => {
    setProductsLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      toast.error("Falha ao carregar os produtos");
    } finally {
      setProductsLoading(false);
    }
  };

  // --- 5. CRIAR FUNÇÃO PARA CARREGAR ALUNOS ---
  const loadStudents = async () => {
    if (!organizationId) return; // Proteção extra
    try {
      const { data, error } = await supabase
        .from('students')
        .select('id, name, phone_number')
        .eq('organization_id', organizationId) // Filtrar por organização
        .order('name');
      if (error) throw error;
      setStudents(data || []);
    } catch (error: any) {
      toast.error("Falha ao carregar alunos para o envio de links.");
    }
  };

  // <<< 7. FUNÇÃO PARA CARREGAR STATUS DO STRIPE >>>
  const loadStripeStatus = async (orgId: string) => {
    setStripeLoading(true);
    try {
      const { data: orgStatus, error: orgStatusError } = await supabase
        .from('organizations')
        .select('stripe_account_status')
        .eq('id', orgId)
        .limit(1)
        .single();

      if (orgStatusError) throw orgStatusError;
      setStripeAccountStatus(orgStatus?.stripe_account_status || null);
    } catch (error: any) {
      toast.error("Falha ao verificar status de pagamento.", { description: error.message });
    } finally {
      setStripeLoading(false);
    }
  };


  const filteredProducts = useMemo(() => {
    if (!searchTerm) {
      return products;
    }
    return products.filter(product =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [products, searchTerm]);

  // <<< 8. ATUALIZAR ESTADO DE LOADING GERAL >>>
  const isLoading = authLoading || productsLoading || stripeLoading;
  const isStripeEnabled = stripeAccountStatus === 'enabled';

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-primary/[0.02] via-background to-accent/[0.02]">
      <main className="flex-1 p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="space-y-2">
              <h1 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent tracking-tight">
                Produtos e Serviços
              </h1>
              <p className="text-sm md:text-base text-muted-foreground">
                Gerencie o inventário e seu catálogo de pagamentos.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative w-full md:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome..."
                  className="pl-10 h-11 bg-background/50 backdrop-blur-sm border-border/50 focus:border-primary/50 shadow-sm transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              {/* <<< 9. ATUALIZAR BOTÃO DESKTOP >>> */}
              <Button
                onClick={() => setShowAddDialog(true)}
                size="lg"
                className="h-11 px-6 shadow-md hover:shadow-lg transition-all hidden md:inline-flex"
                disabled={!isStripeEnabled || isLoading}
                title={!isStripeEnabled ? "Conecte sua conta Stripe para adicionar produtos" : "Adicionar Produto"}
              >
                <Plus className="h-5 w-5 md:mr-2" />
                <span className="hidden md:inline font-medium">Adicionar Produto</span>
              </Button>
            </div>
          </div>

          {/* <<< 10. ADICIONAR ALERTA DE STRIPE INATIVO >>> */}
          {!isLoading && !isStripeEnabled && (
            <Alert variant="default" className="bg-orange-50 border-orange-200 text-orange-800 dark:bg-orange-950 dark:border-orange-800">
              <AlertCircle className="h-4 w-4 !text-orange-600" />
              <AlertTitle className="font-semibold !text-orange-900 dark:!text-orange-200">Ative os Pagamentos para Criar Produtos</AlertTitle>
              <AlertDescription className="text-orange-700 dark:text-orange-300">
                Para adicionar produtos e serviços, você precisa primeiro conectar sua conta de pagamentos Stripe.
                <Button
                  variant="link"
                  className="p-0 h-auto ml-1 text-orange-800 dark:text-orange-200 font-bold"
                  onClick={() => navigate('/settings', { state: { tab: 'integrations' } })}
                >
                  Conectar agora <Zap className="h-4 w-4 ml-1" />
                </Button>
              </AlertDescription>
            </Alert>
          )}

          <ProductsTable
            products={filteredProducts}
            loading={isLoading}
            onRefresh={loadProducts}
            organizationId={organizationId}
            session={session}
            // --- 6. PASSAR ALUNOS PARA A TABELA ---
            students={students}
          />

          <AddProductDialog
            open={showAddDialog}
            onOpenChange={setShowAddDialog}
            organizationId={organizationId}
            onSuccess={loadProducts}
            session={session}
          />
        </div>
        {/* <<< 11. ATUALIZAR BOTÃO MOBILE (FAB) >>> */}
        <FloatingActionButton
          onClick={() => setShowAddDialog(true)}
          disabled={!isStripeEnabled || isLoading}
        />
      </main>
    </div>
  );
};

export default Products;