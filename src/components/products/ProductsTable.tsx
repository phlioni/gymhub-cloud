import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, ShoppingCart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SellProductDialog } from "./SellProductDialog";
import { EditProductDialog } from "./EditProductDialog";

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
  const [productToSell, setProductToSell] = useState<Product | null>(null);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este produto?")) return;

    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      toast.success("Produto excluído com sucesso");
      onRefresh();
    } catch (error: any) {
      toast.error("Falha ao excluir produto. Verifique se existem vendas associadas a ele.");
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
        <p className="text-muted-foreground">Nenhum produto encontrado.</p>
      </Card>
    );
  }

  return (
    <>
      <div className="hidden md:block">
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Marca</TableHead>
                <TableHead>Preço</TableHead>
                <TableHead>Estoque</TableHead>
                <TableHead className="text-right">Ações</TableHead>
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
                  <TableCell className="text-right space-x-1">
                    <Button variant="outline" size="sm" onClick={() => setProductToSell(product)}>
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Vender
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setProductToEdit(product)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(product.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>

      <div className="md:hidden space-y-4">
        {products.map((product) => (
          <Card key={product.id} className="w-full">
            <div className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold">{product.name}</h3>
                  <p className="text-sm text-muted-foreground">{product.brand || 'N/A'}</p>
                </div>
                <div className="flex space-x-2">
                  <Button variant="ghost" size="icon" onClick={() => setProductToEdit(product)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(product.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
              <div className="flex justify-between items-center mt-4">
                <div>
                  <p className="text-sm">Preço: R$ {Number(product.price).toFixed(2)}</p>
                  <p className={`text-sm ${product.quantity < 10 ? "text-destructive" : ""}`}>
                    Estoque: {product.quantity}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setProductToSell(product)}>
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Vender
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>


      {productToSell && (
        <SellProductDialog
          product={productToSell}
          open={!!productToSell}
          onOpenChange={(open) => !open && setProductToSell(null)}
          organizationId={organizationId}
          onSuccess={onRefresh}
        />
      )}

      {productToEdit && (
        <EditProductDialog
          product={productToEdit}
          open={!!productToEdit}
          onOpenChange={(open) => !open && setProductToEdit(null)}
          onSuccess={onRefresh}
        />
      )}
    </>
  );
};