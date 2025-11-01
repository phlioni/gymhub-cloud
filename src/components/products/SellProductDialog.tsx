import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// --- TIPO ATUALIZADO ---
interface Product {
  id: string;
  name: string;
  price: number;
  quantity: number;
  product_type: string; // Adicionado
}
// --- FIM DA ATUALIZAÇÃO ---

interface SellProductDialogProps {
  product: Product;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string | null;
  onSuccess: () => void;
}

export const SellProductDialog = ({ product, open, onOpenChange, organizationId, onSuccess }: SellProductDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    quantitySold: "1",
    studentId: "none", // CORREÇÃO: Usar 'none' em vez de ""
  });

  useEffect(() => {
    if (open) {
      loadStudents();
      // Garante que o tipo de produto é físico
      if (product.product_type !== 'physical') {
        toast.error("A venda rápida de estoque é apenas para produtos físicos.");
        onOpenChange(false);
      }
    }
  }, [open, product, onOpenChange]);

  const loadStudents = async () => {
    const { data } = await supabase.from('students').select('*').order('name');
    setStudents(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationId) {
      toast.error("Organização não encontrada");
      return;
    }

    const quantitySold = parseInt(formData.quantitySold);
    if (isNaN(quantitySold) || quantitySold <= 0) {
      toast.error("Por favor, insira uma quantidade válida.");
      return;
    }

    if (quantitySold > product.quantity) {
      toast.error("Não há estoque suficiente disponível.");
      return;
    }

    setLoading(true);
    try {
      const { error: saleError } = await supabase
        .from('sales')
        .insert({
          organization_id: organizationId,
          product_id: product.id,
          student_id: formData.studentId === 'none' ? null : formData.studentId, // CORREÇÃO: Tratar 'none' como nulo
          quantity_sold: quantitySold,
          total_price: product.price * quantitySold,
        });

      if (saleError) throw saleError;

      const { error: updateError } = await supabase
        .from('products')
        .update({ quantity: product.quantity - quantitySold })
        .eq('id', product.id);

      if (updateError) throw updateError;

      toast.success("Venda concluída com sucesso");
      onSuccess();
      onOpenChange(false);
      setFormData({ quantitySold: "1", studentId: "none" });
    } catch (error: any) {
      toast.error(error.message || "Falha ao concluir a venda");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Vender Produto (Estoque)</DialogTitle>
          <DialogDescription>
            Processando venda de estoque para {product.name}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Preço Unitário</Label>
              <Input value={`R$ ${Number(product.price).toFixed(2)}`} disabled />
            </div>
            <div className="space-y-2">
              <Label>Estoque Atual</Label>
              <Input value={product.quantity} disabled />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="quantitySold">Quantidade a Vender *</Label>
            <Input
              id="quantitySold"
              type="number"
              min="1"
              max={product.quantity}
              value={formData.quantitySold}
              onChange={(e) => setFormData({ ...formData, quantitySold: e.target.value })}
              required
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label>Preço Total</Label>
            <Input
              value={`R$ ${(product.price * (parseInt(formData.quantitySold) || 0)).toFixed(2)}`}
              disabled
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="student">Atribuir a um Aluno (Opcional)</Label>
            <Select
              value={formData.studentId}
              onValueChange={(value) => setFormData({ ...formData, studentId: value })}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um aluno (opcional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum (venda anônima)</SelectItem>
                {students.map((student) => (
                  <SelectItem key={student.id} value={student.id}>
                    {student.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Processando..." : "Concluir Venda"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};