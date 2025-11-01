import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Session } from "@supabase/supabase-js";

interface AddProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string | null;
  onSuccess: () => void;
  session: Session | null; // <-- ADICIONADO PARA ENVIAR TOKEN
}

export const AddProductDialog = ({ open, onOpenChange, organizationId, onSuccess, session }: AddProductDialogProps) => {
  const [loading, setLoading] = useState(false);

  // --- INÍCIO: ESTADOS DO FORMULÁRIO ATUALIZADOS ---
  const [formData, setFormData] = useState({
    name: "",
    brand: "",
    price: "",
    quantity: "0",
    product_type: "physical", // 'physical' or 'service'
    pricing_model: "one_time", // 'one_time' or 'recurring'
    recurring_interval: "month", // 'month', '3-month', 'year'
  });

  // Reseta o formulário ao abrir/fechar
  useEffect(() => {
    if (open) {
      setFormData({
        name: "",
        brand: "",
        price: "",
        quantity: "0",
        product_type: "physical",
        pricing_model: "one_time",
        recurring_interval: "month",
      });
    }
  }, [open]);

  // Ajusta a quantidade com base no tipo de produto
  useEffect(() => {
    if (formData.product_type === 'service') {
      setFormData(prev => ({ ...prev, quantity: "0" }));
    }
  }, [formData.product_type]);
  // --- FIM: ESTADOS DO FORMULÁRIO ATUALIZADOS ---

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationId || !session) {
      toast.error("Organização ou sessão não encontrada. Recarregue a página.");
      return;
    }

    if (parseFloat(formData.price) <= 0) {
      toast.error("O preço deve ser maior que zero.");
      return;
    }

    setLoading(true);
    try {
      // 1. Chama a Edge Function para criar o produto no Stripe
      const recurringInterval = formData.pricing_model === 'recurring' ? formData.recurring_interval : null;

      const { data: stripeData, error: stripeError } = await supabase.functions.invoke('create-stripe-product', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: {
          name: formData.name,
          description: formData.brand || null, // Usando marca como descrição
          product_type: formData.product_type,
          price: formData.price,
          recurring_interval: recurringInterval,
        }
      });

      // @ts-ignore
      if (stripeError) throw stripeError;
      // @ts-ignore
      if (stripeData.error) throw new Error(stripeData.error);

      const { stripe_product_id, stripe_price_id } = stripeData;

      if (!stripe_product_id || !stripe_price_id) {
        throw new Error("Falha ao obter IDs do Stripe.");
      }

      // 2. Salva o produto no banco de dados do Supabase
      const { error } = await supabase
        .from('products')
        .insert({
          organization_id: organizationId,
          name: formData.name,
          brand: formData.brand || null,
          price: parseFloat(formData.price),
          quantity: parseInt(formData.quantity) || 0,
          product_type: formData.product_type,
          recurring_interval: recurringInterval,
          stripe_product_id: stripe_product_id,
          stripe_price_id: stripe_price_id,
        });

      if (error) throw error;

      toast.success("Produto adicionado e sincronizado com o Stripe!");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Falha ao adicionar produto");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar Novo Produto</DialogTitle>
          <DialogDescription>
            Adicione um produto físico ou serviço (aula) ao seu inventário e catálogo de pagamentos.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">

          <div className="space-y-2">
            <Label>Tipo de Produto *</Label>
            <RadioGroup
              value={formData.product_type}
              onValueChange={(v) => setFormData({ ...formData, product_type: v })}
              className="flex gap-4"
              disabled={loading}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="physical" id="r-physical" />
                <Label htmlFor="r-physical" className="font-normal">Produto Físico</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="service" id="r-service" />
                <Label htmlFor="r-service" className="font-normal">Serviço / Aula</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required disabled={loading} placeholder={formData.product_type === 'physical' ? 'Ex: Whey Protein 900g' : 'Ex: Plano Mensal - CrossFit'} />
          </div>

          {formData.product_type === 'physical' && (
            <div className="space-y-2">
              <Label htmlFor="brand">Marca</Label>
              <Input id="brand" value={formData.brand} onChange={(e) => setFormData({ ...formData, brand: e.target.value })} disabled={loading} />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Preço (R$) *</Label>
              <Input id="price" type="number" step="0.01" min="0.01" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} required disabled={loading} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity">Estoque Inicial *</Label>
              <Input
                id="quantity"
                type="number"
                min="0"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                required
                disabled={loading || formData.product_type === 'service'} // Desabilitado para serviços
              />
            </div>
          </div>

          {formData.product_type === 'service' && (
            <div className="space-y-2">
              <Label>Modelo de Cobrança *</Label>
              <RadioGroup
                value={formData.pricing_model}
                onValueChange={(v) => setFormData({ ...formData, pricing_model: v })}
                className="flex gap-4"
                disabled={loading}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="one_time" id="r-one_time" />
                  <Label htmlFor="r-one_time" className="font-normal">Pagamento Único</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="recurring" id="r-recurring" />
                  <Label htmlFor="r-recurring" className="font-normal">Recorrente (Assinatura)</Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {formData.product_type === 'service' && formData.pricing_model === 'recurring' && (
            <div className="space-y-2">
              <Label htmlFor="recurring_interval">Intervalo da Recorrência *</Label>
              <Select
                value={formData.recurring_interval}
                onValueChange={(v) => setFormData({ ...formData, recurring_interval: v })}
                disabled={loading}
              >
                <SelectTrigger id="recurring_interval">
                  <SelectValue placeholder="Selecione o intervalo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">Mensal</SelectItem>
                  <SelectItem value="week">Semanal</SelectItem>
                  <SelectItem value="year">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Adicionando..." : "Adicionar Produto"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};