import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import { ProductsTable } from "@/components/products/ProductsTable";
import { AddProductDialog } from "@/components/products/AddProductDialog";
import { toast } from "sonner";
import { FloatingActionButton } from "@/components/ui/FloatingActionButton";
import { useAuthProtection } from "@/hooks/useAuthProtection";
import { Session } from "@supabase/supabase-js"; // <-- 1. IMPORTAR SESSION

const Products = () => {
  const { organizationId, loading: authLoading } = useAuthProtection();
  const [productsLoading, setProductsLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [session, setSession] = useState<Session | null>(null); // <-- 2. ADICIONAR ESTADO DA SESSÃO

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

  const filteredProducts = useMemo(() => {
    if (!searchTerm) {
      return products;
    }
    return products.filter(product =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [products, searchTerm]);

  const isLoading = authLoading || productsLoading;

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
              <Button onClick={() => setShowAddDialog(true)} size="lg" className="h-11 px-6 shadow-md hover:shadow-lg transition-all hidden md:inline-flex">
                <Plus className="h-5 w-5 md:mr-2" />
                <span className="hidden md:inline font-medium">Adicionar Produto</span>
              </Button>
            </div>
          </div>

          <ProductsTable
            products={filteredProducts}
            loading={isLoading}
            onRefresh={loadProducts}
            organizationId={organizationId}
            session={session} // <-- 4. PASSAR SESSÃO PARA A TABELA
          />

          <AddProductDialog
            open={showAddDialog}
            onOpenChange={setShowAddDialog}
            organizationId={organizationId}
            onSuccess={loadProducts}
            session={session} // <-- 5. PASSAR SESSÃO PARA O DIÁLOGO
          />
        </div>
        <FloatingActionButton onClick={() => setShowAddDialog(true)} />
      </main>
    </div>
  );
};

export default Products;