import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Session } from "@supabase/supabase-js";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

// ATUALIZADO: Inclui os novos campos do Stripe
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

interface EditProductDialogProps {
    product: Product | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
    session: Session | null; // <-- ADICIONADO PARA ENVIAR TOKEN
}

export const EditProductDialog = ({ product, open, onOpenChange, onSuccess, session }: EditProductDialogProps) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({ name: "", brand: "", price: "", quantity: "" });

    useEffect(() => {
        if (product) {
            setFormData({
                name: product.name || "",
                brand: product.brand || "",
                price: String(product.price || 0),
                quantity: String(product.quantity || 0),
            });
        }
    }, [product]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!product || !session) {
            toast.error("Produto ou sessão não encontrados.");
            return;
        }

        setLoading(true);
        try {
            // 1. Atualiza o Produto no Stripe (Nome e Descrição)
            // A API do Stripe permite atualizar o nome do produto
            if (product.stripe_product_id) {
                const { error: stripeError } = await supabase.functions.invoke('update-stripe-product', {
                    headers: { Authorization: `Bearer ${session.access_token}` },
                    body: {
                        stripeProductId: product.stripe_product_id,
                        name: formData.name,
                        description: formData.brand || null
                    }
                });
                // @ts-ignore
                if (stripeError) throw stripeError;
                // @ts-ignore
                if (stripeError?.error) throw new Error(stripeError.error);
            }

            // 2. Atualiza no Supabase
            const { error } = await supabase
                .from('products')
                .update({
                    name: formData.name,
                    brand: formData.brand || null,
                    // Preço e recorrência não são editáveis por simplicidade
                    quantity: parseInt(formData.quantity),
                })
                .eq('id', product.id);

            if (error) throw error;

            toast.success("Produto atualizado com sucesso!");
            onSuccess();
            onOpenChange(false);
        } catch (error: any) {
            toast.error(error.message || "Falha ao atualizar o produto.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Editar Produto</DialogTitle>
                    <DialogDescription>
                        Atualize as informações do produto no seu inventário.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-4">

                    <div className="space-y-2">
                        <Label>Tipo de Produto</Label>
                        <RadioGroup
                            value={product?.product_type || 'physical'}
                            className="flex gap-4"
                            disabled
                        >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="physical" id="r-edit-physical" />
                                <Label htmlFor="r-edit-physical" className="font-normal">Produto Físico</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="service" id="r-edit-service" />
                                <Label htmlFor="r-edit-service" className="font-normal">Serviço / Aula</Label>
                            </div>
                        </RadioGroup>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="name">Nome *</Label>
                        <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required disabled={loading} />
                    </div>

                    {product?.product_type === 'physical' && (
                        <div className="space-y-2">
                            <Label htmlFor="brand">Marca</Label>
                            <Input id="brand" value={formData.brand} onChange={(e) => setFormData({ ...formData, brand: e.target.value })} disabled={loading} />
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="price">Preço (R$) *</Label>
                            <Input id="price" type="number" value={formData.price} disabled />
                            <p className="text-xs text-muted-foreground">O preço não pode ser editado.</p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="quantity">Estoque *</Label>
                            <Input
                                id="quantity"
                                type="number"
                                min="0"
                                value={formData.quantity}
                                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                                required
                                disabled={loading || product?.product_type === 'service'}
                            />
                        </div>
                    </div>

                    {product?.product_type === 'service' && (
                        <div className="space-y-2">
                            <Label>Modelo de Cobrança</Label>
                            <Input
                                value={product.recurring_interval ? `Recorrente (${product.recurring_interval})` : "Pagamento Único"}
                                disabled
                            />
                            <p className="text-xs text-muted-foreground">O modelo de cobrança não pode ser editado.</p>
                        </div>
                    )}

                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? "Salvando..." : "Salvar Alterações"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};