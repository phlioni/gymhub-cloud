import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, ShoppingCart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SellProductDialog } from "./SellProductDialog";

interface Product {
  id: string;
  name: string;
  brand: string | null;
  price: number;
  quantity: number;
}

interface ProductsTableProps {
  products: Product[];
  loading: boolean;
  onRefresh: () => void;
  organizationId: string | null;
}

export const ProductsTable = ({ products, loading, onRefresh, organizationId }: ProductsTableProps) => {
  const [sellProduct, setSellProduct] = useState<Product | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success("Product deleted successfully");
      onRefresh();
    } catch (error: any) {
      toast.error("Failed to delete product");
      console.error(error);
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-muted animate-pulse rounded" />
          ))}
        </div>
      </Card>
    );
  }

  if (products.length === 0) {
    return (
      <Card className="p-12 text-center">
        <p className="text-muted-foreground">No products yet. Add your first product to get started!</p>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Brand</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => (
              <TableRow key={product.id}>
                <TableCell className="font-medium">{product.name}</TableCell>
                <TableCell>{product.brand || "N/A"}</TableCell>
                <TableCell>R$ {Number(product.price).toFixed(2)}</TableCell>
                <TableCell>
                  <span className={product.quantity < 10 ? "text-destructive font-medium" : ""}>
                    {product.quantity}
                  </span>
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setSellProduct(product)}
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Sell
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleDelete(product.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {sellProduct && (
        <SellProductDialog
          product={sellProduct}
          open={!!sellProduct}
          onOpenChange={(open) => !open && setSellProduct(null)}
          organizationId={organizationId}
          onSuccess={onRefresh}
        />
      )}
    </>
  );
};
