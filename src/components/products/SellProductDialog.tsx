import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Product {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

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
    studentId: "",
  });

  useEffect(() => {
    if (open) {
      loadStudents();
    }
  }, [open]);

  const loadStudents = async () => {
    const { data } = await supabase
      .from('students')
      .select('*')
      .order('name');
    setStudents(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationId) {
      toast.error("Organization not found");
      return;
    }

    const quantitySold = parseInt(formData.quantitySold);
    if (quantitySold > product.quantity) {
      toast.error("Not enough stock available");
      return;
    }

    setLoading(true);
    try {
      // Create sale record
      const { error: saleError } = await supabase
        .from('sales')
        .insert({
          organization_id: organizationId,
          product_id: product.id,
          student_id: formData.studentId || null,
          quantity_sold: quantitySold,
          total_price: product.price * quantitySold,
        });

      if (saleError) throw saleError;

      // Update product quantity
      const { error: updateError } = await supabase
        .from('products')
        .update({ quantity: product.quantity - quantitySold })
        .eq('id', product.id);

      if (updateError) throw updateError;

      toast.success("Sale completed successfully");
      onSuccess();
      onOpenChange(false);
      setFormData({ quantitySold: "1", studentId: "" });
    } catch (error: any) {
      toast.error(error.message || "Failed to complete sale");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Sell Product</DialogTitle>
          <DialogDescription>
            Processing sale for {product.name}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Product</Label>
            <Input value={product.name} disabled />
          </div>
          <div className="space-y-2">
            <Label>Price per unit</Label>
            <Input value={`R$ ${Number(product.price).toFixed(2)}`} disabled />
          </div>
          <div className="space-y-2">
            <Label>Available Stock</Label>
            <Input value={product.quantity} disabled />
          </div>
          <div className="space-y-2">
            <Label htmlFor="quantitySold">Quantity to Sell *</Label>
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
            <Label>Total Price</Label>
            <Input 
              value={`R$ ${(product.price * parseInt(formData.quantitySold || "0")).toFixed(2)}`} 
              disabled 
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="student">Assign to Student (Optional)</Label>
            <Select
              value={formData.studentId}
              onValueChange={(value) => setFormData({ ...formData, studentId: value })}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a student (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None (Anonymous sale)</SelectItem>
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
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Processing..." : "Complete Sale"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
