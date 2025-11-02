import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, ShoppingCart, Link as LinkIcon, Box, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SellProductDialog } from "./SellProductDialog";
import { EditProductDialog } from "./EditProductDialog";
import { Session } from "@supabase/supabase-js";
import { Badge } from "@/components/ui/badge";
// --- 1. IMPORTAR O NOVO DIÁLOGO ---
import { SendPaymentLinkDialog } from "./SendPaymentLinkDialog";

interface Product {
  id: string;
  name: string;
  brand: string | null;
  price: number;
  quantity: number;
  product_type: string;
  recurring_interval: string | null;
  stripe_product_id: string | null;
  stripe_price_id: string | null;
  modality_id?: string | null;
}

// --- 2. TIPO DE ALUNO ADICIONADO ---
interface Student {
  id: string;
  name: string;
  phone_number: string | null;
}

interface ProductsTableProps {
  products: Product[];
  loading: boolean;
  onRefresh: () => void;
  organizationId: string | null;
  session: Session | null;
  // --- 3. RECEBER ALUNOS COMO PROP ---
  students: Student[];
}

export const ProductsTable = ({ products, loading, onRefresh, organizationId, session, students }: ProductsTableProps) => {
  const [productToSell, setProductToSell] = useState<Product | null>(null);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  // --- 4. SUBSTITUIR ESTADO DE LINK PELO ESTADO DO NOVO MODAL ---
  const [productForLink, setProductForLink] = useState<Product | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  const handleDelete = async (product: Product) => {
    if (!session) {
      toast.error("Sessão expirada. Recarregue a página.");
      return;
    }
    if (!confirm(`Tem certeza que deseja excluir "${product.name}"? Esta ação não pode ser desfeita.`)) return;

    setDeleteLoading(product.id);
    try {
      if (product.stripe_product_id && product.stripe_price_id) {
        const { error: stripeError } = await supabase.functions.invoke('archive-stripe-product', {
          headers: { Authorization: `Bearer ${session.access_token}` },
          body: {
            stripeProductId: product.stripe_product_id,
            stripePriceId: product.stripe_price_id
          }
        });
        // @ts-ignore
        if (stripeError) throw stripeError;
        // @ts-ignore
        if (stripeError?.error) throw new Error(stripeError.error);
      }

      const { error: dbError } = await supabase.from('products').delete().eq('id', product.id);
      if (dbError) throw dbError;

      toast.success("Produto excluído com sucesso");
      onRefresh();
    } catch (error: any) {
      toast.error("Falha ao excluir produto.", { description: error.message });
      console.error(error);
    } finally {
      setDeleteLoading(null);
    }
  };

  // --- 5. A função handleCreatePaymentLink foi removida ---

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

  const formatPrice = (product: Product) => {
    let price = `R$ ${Number(product.price).toFixed(2)}`;
    if (product.recurring_interval === 'month') return `${price} /mês`;
    if (product.recurring_interval === 'year') return `${price} /ano`;
    if (product.recurring_interval === 'week') return `${price} /semana`;
    return price;
  };

  return (
    <>
      <div className="hidden md:block">
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Preço</TableHead>
                <TableHead>Estoque</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">
                    <div>{product.name}</div>
                    <div className="text-xs text-muted-foreground">{product.brand || "N/A"}</div>
                  </TableCell>

                  <TableCell>
                    {product.product_type === 'physical' ? (
                      <Badge variant="secondary" className="font-normal"><Box className="h-3 w-3 mr-1" />Físico</Badge>
                    ) : (
                      <Badge variant="outline" className="font-normal"><Sparkles className="h-3 w-3 mr-1" />Serviço/Aula</Badge>
                    )}
                  </TableCell>

                  <TableCell>{formatPrice(product)}</TableCell>

                  <TableCell>
                    <span className={product.quantity < 10 && product.product_type === 'physical' ? "text-destructive font-medium" : ""}>
                      {product.product_type === 'physical' ? product.quantity : 'N/A'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    {product.product_type === 'physical' && (
                      <Button variant="outline" size="sm" onClick={() => setProductToSell(product)} disabled={deleteLoading === product.id}>
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        Vender (Estoque)
                      </Button>
                    )}

                    {/* --- 6. ATUALIZAR BOTÃO "CRIAR LINK" --- */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setProductForLink(product)} // Apenas abre o modal
                      disabled={!product.stripe_price_id || deleteLoading === product.id}
                    >
                      <LinkIcon className="h-4 w-4 mr-2" />
                      Criar Link
                    </Button>
                    {/* --- FIM DA ATUALIZAÇÃO --- */}

                    <Button variant="ghost" size="icon" onClick={() => setProductToEdit(product)} disabled={deleteLoading === product.id}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(product)}
                      disabled={deleteLoading === product.id}
                    >
                      {deleteLoading === product.id ? (
                        <span className="animate-spin h-4 w-4 rounded-full border-2 border-destructive border-t-transparent"></span>
                      ) : (
                        <Trash2 className="h-4 w-4 text-destructive" />
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* View Mobile (sem alterações na lógica, apenas adicionando 'disabled' nos botões) */}
      <div className="md:hidden space-y-4">
        {products.map((product) => (
          <Card key={product.id} className="w-full">
            <div className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold">{product.name}</h3>
                  <p className="text-sm text-muted-foreground">{product.brand || 'N/A'}</p>
                  <div className="mt-1">
                    {product.product_type === 'physical' ? (
                      <Badge variant="secondary" className="font-normal"><Box className="h-3 w-3 mr-1" />Físico</Badge>
                    ) : (
                      <Badge variant="outline" className="font-normal"><Sparkles className="h-3 w-3 mr-1" />Serviço/Aula</Badge>
                    )}
                  </div>
                </div>
                <div className="flex space-x-0">
                  <Button variant="ghost" size="icon" onClick={() => setProductToEdit(product)} disabled={deleteLoading === product.id}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(product)} disabled={deleteLoading === product.id}>
                    {deleteLoading === product.id ? (
                      <span className="animate-spin h-4 w-4 rounded-full border-2 border-destructive border-t-transparent"></span>
                    ) : (
                      <Trash2 className="h-4 w-4 text-destructive" />
                    )}
                  </Button>
                </div>
              </div>
              <div className="flex justify-between items-center mt-4">
                <div>
                  <p className="text-sm font-semibold">{formatPrice(product)}</p>
                  {product.product_type === 'physical' && (
                    <p className={`text-sm ${product.quantity < 10 ? "text-destructive" : ""}`}>
                      Estoque: {product.quantity}
                    </p>
                  )}
                </div>
                {/* --- 7. ATUALIZAR BOTÃO MOBILE "CRIAR LINK" --- */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setProductForLink(product)} // Apenas abre o modal
                  disabled={!product.stripe_price_id || deleteLoading === product.id}
                >
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Criar Link
                </Button>
              </div>
              {product.product_type === 'physical' && (
                <Button variant="outline" size="sm" onClick={() => setProductToSell(product)} className="w-full mt-2" disabled={deleteLoading === product.id}>
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Vender (Estoque)
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Diálogos */}
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
          session={session}
        />
      )}

      {/* --- 8. RENDERIZAR O NOVO DIÁLOGO --- */}
      {productForLink && (
        <SendPaymentLinkDialog
          product={productForLink}
          open={!!productForLink}
          onOpenChange={(open) => !open && setProductForLink(null)}
          organizationId={organizationId}
          session={session}
          students={students}
        />
      )}
    </>
  );
};