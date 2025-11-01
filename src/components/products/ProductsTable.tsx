import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, ShoppingCart, Link as LinkIcon, Box, Sparkles, Copy } from "lucide-react"; // <-- Ícones atualizados
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SellProductDialog } from "./SellProductDialog";
import { EditProductDialog } from "./EditProductDialog";
import { Session } from "@supabase/supabase-js"; // <-- Importar Session
import { Badge } from "@/components/ui/badge"; // <-- Importar Badge

// --- INÍCIO: TIPO ATUALIZADO ---
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
}
// --- FIM: TIPO ATUALIZADO ---

interface ProductsTableProps {
  products: Product[];
  loading: boolean;
  onRefresh: () => void;
  organizationId: string | null;
  session: Session | null; // <-- ADICIONADO PARA ENVIAR TOKEN
}

export const ProductsTable = ({ products, loading, onRefresh, organizationId, session }: ProductsTableProps) => {
  const [productToSell, setProductToSell] = useState<Product | null>(null);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [linkLoading, setLinkLoading] = useState<string | null>(null); // <-- Estado de loading para o link

  const handleDelete = async (id: string) => {
    // (Lógica de delete permanece a mesma)
    if (!confirm("Tem certeza que deseja excluir este produto?")) return;

    try {
      // TODO: Adicionar lógica para deletar o produto/preço no Stripe também
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      toast.success("Produto excluído com sucesso");
      onRefresh();
    } catch (error: any) {
      toast.error("Falha ao excluir produto. Verifique se existem vendas associadas a ele.");
      console.error(error);
    }
  };

  // --- INÍCIO: NOVA FUNÇÃO PARA CRIAR LINK DE PAGAMENTO ---
  const handleCreatePaymentLink = async (product: Product) => {
    if (!product.stripe_price_id || !organizationId || !session) {
      toast.error("Este produto não está sincronizado com o Stripe ou a sessão expirou.");
      return;
    }

    setLinkLoading(product.id);
    try {
      const { data, error } = await supabase.functions.invoke('create-stripe-payment-link', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: {
          stripePriceId: product.stripe_price_id,
          organizationId: organizationId,
          recurring: !!product.recurring_interval,
          studentId: null, // Link genérico, pode ser adaptado para aluno específico
        }
      });

      // @ts-ignore
      if (error) throw error;
      // @ts-ignore
      if (data.error) throw new Error(data.error);

      // @ts-ignore
      const paymentLinkUrl = data.paymentLinkUrl;
      navigator.clipboard.writeText(paymentLinkUrl);
      toast.success("Link de pagamento copiado para a área de transferência!", {
        description: paymentLinkUrl,
        action: {
          label: "Abrir",
          onClick: () => window.open(paymentLinkUrl, '_blank'),
        },
      });

    } catch (error: any) {
      toast.error("Falha ao criar link de pagamento.", { description: error.message });
    } finally {
      setLinkLoading(null);
    }
  };
  // --- FIM: NOVA FUNÇÃO ---

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

  // --- INÍCIO: FUNÇÃO DE FORMATAÇÃO DE PREÇO ---
  const formatPrice = (product: Product) => {
    let price = `R$ ${Number(product.price).toFixed(2)}`;
    if (product.recurring_interval === 'month') return `${price} /mês`;
    if (product.recurring_interval === 'year') return `${price} /ano`;
    if (product.recurring_interval === 'week') return `${price} /semana`;
    return price;
  };
  // --- FIM: FUNÇÃO DE FORMATAÇÃO DE PREÇO ---

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

                  {/* CÉLULA TIPO DE PRODUTO */}
                  <TableCell>
                    {product.product_type === 'physical' ? (
                      <Badge variant="secondary" className="font-normal"><Box className="h-3 w-3 mr-1" />Físico</Badge>
                    ) : (
                      <Badge variant="outline" className="font-normal"><Sparkles className="h-3 w-3 mr-1" />Serviço/Aula</Badge>
                    )}
                  </TableCell>

                  {/* CÉLULA PREÇO */}
                  <TableCell>{formatPrice(product)}</TableCell>

                  <TableCell>
                    <span className={product.quantity < 10 && product.product_type === 'physical' ? "text-destructive font-medium" : ""}>
                      {product.product_type === 'physical' ? product.quantity : 'N/A'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    {/* Botão Vender (Estoque) - Apenas para físicos */}
                    {product.product_type === 'physical' && (
                      <Button variant="outline" size="sm" onClick={() => setProductToSell(product)}>
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        Vender (Estoque)
                      </Button>
                    )}

                    {/* Botão Criar Link (Stripe) - Para todos */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCreatePaymentLink(product)}
                      disabled={linkLoading === product.id || !product.stripe_price_id}
                    >
                      <LinkIcon className="h-4 w-4 mr-2" />
                      {linkLoading === product.id ? "Gerando..." : "Criar Link"}
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

      {/* --- INÍCIO: VIEW MOBILE ATUALIZADA --- */}
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
                  <p className="text-sm font-semibold">{formatPrice(product)}</p>
                  {product.product_type === 'physical' && (
                    <p className={`text-sm ${product.quantity < 10 ? "text-destructive" : ""}`}>
                      Estoque: {product.quantity}
                    </p>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCreatePaymentLink(product)}
                  disabled={linkLoading === product.id || !product.stripe_price_id}
                >
                  <LinkIcon className="h-4 w-4 mr-2" />
                  {linkLoading === product.id ? "Gerando..." : "Criar Link"}
                </Button>
              </div>
              {product.product_type === 'physical' && (
                <Button variant="outline" size="sm" onClick={() => setProductToSell(product)} className="w-full mt-2">
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Vender (Estoque)
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>
      {/* --- FIM: VIEW MOBILE ATUALIZADA --- */}


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
          session={session} // <-- Passar sessão
        />
      )}
    </>
  );
};