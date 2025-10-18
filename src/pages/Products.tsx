import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Sidebar } from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { ProductsTable } from "@/components/products/ProductsTable";
import { AddProductDialog } from "@/components/products/AddProductDialog";
import { toast } from "sonner";

const Products = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [products, setProducts] = useState([]);
  const [organizationId, setOrganizationId] = useState<string | null>(null);

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
      .select('organization_id, role')
      .eq('id', session.user.id)
      .single();

    if (profile?.role === 'superadmin') {
      navigate('/super-admin');
      return;
    }

    setOrganizationId(profile?.organization_id || null);
    loadProducts();
  };

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      toast.error("Failed to load products");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8 bg-gradient-to-br from-background via-muted/20 to-background">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Products
              </h1>
              <p className="text-muted-foreground">
                Manage inventory and sales
              </p>
            </div>
            <Button onClick={() => setShowAddDialog(true)} size="lg">
              <Plus className="h-5 w-5 mr-2" />
              Add Product
            </Button>
          </div>

          <ProductsTable 
            products={products} 
            loading={loading} 
            onRefresh={loadProducts}
            organizationId={organizationId}
          />

          <AddProductDialog
            open={showAddDialog}
            onOpenChange={setShowAddDialog}
            organizationId={organizationId}
            onSuccess={loadProducts}
          />
        </div>
      </main>
    </div>
  );
};

export default Products;
