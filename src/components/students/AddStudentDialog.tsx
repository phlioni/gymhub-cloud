import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AddStudentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string | null;
  onSuccess: () => void;
}

export const AddStudentDialog = ({ open, onOpenChange, organizationId, onSuccess }: AddStudentDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [modalities, setModalities] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    cpf: "",
    birthDate: "",
    phoneNumber: "", // Novo campo
    modalityId: "",
    expiryDate: "",
  });

  useEffect(() => {
    if (open) {
      loadModalities();
    }
  }, [open]);

  const loadModalities = async () => {
    const { data } = await supabase.from('modalities').select('*').order('name');
    setModalities(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationId) {
      toast.error("Organização não encontrada");
      return;
    }

    setLoading(true);
    try {
      const { data: student, error: studentError } = await supabase
        .from('students')
        .insert({
          organization_id: organizationId,
          name: formData.name,
          cpf: formData.cpf || null,
          birth_date: formData.birthDate || null,
          phone_number: formData.phoneNumber || null, // Novo campo
        })
        .select()
        .single();

      if (studentError) throw studentError;

      if (formData.modalityId && formData.expiryDate) {
        const { error: enrollmentError } = await supabase
          .from('enrollments')
          .insert({
            student_id: student.id,
            modality_id: formData.modalityId,
            expiry_date: formData.expiryDate,
          });
        if (enrollmentError) throw enrollmentError;
      }

      toast.success("Aluno adicionado com sucesso");
      onSuccess();
      onOpenChange(false);
      setFormData({ name: "", cpf: "", birthDate: "", phoneNumber: "", modalityId: "", expiryDate: "" });
    } catch (error: any) {
      toast.error(error.message || "Falha ao adicionar aluno");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Adicionar Novo Aluno</DialogTitle>
          <DialogDescription>
            Insira as informações do aluno e os detalhes da matrícula.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required disabled={loading} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phoneNumber">Telefone (WhatsApp)</Label>
            <Input id="phoneNumber" value={formData.phoneNumber} onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })} placeholder="+5513999998888" disabled={loading} />
            <p className="text-xs text-muted-foreground">Formato internacional: +55 (DDD) (Número)</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cpf">CPF</Label>
            <Input id="cpf" value={formData.cpf} onChange={(e) => setFormData({ ...formData, cpf: e.target.value })} placeholder="000.000.000-00" disabled={loading} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="birthDate">Data de Nascimento</Label>
            <Input id="birthDate" type="date" value={formData.birthDate} onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })} disabled={loading} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="modality">Modalidade Inicial</Label>
            <Select value={formData.modalityId} onValueChange={(value) => setFormData({ ...formData, modalityId: value })} disabled={loading}>
              <SelectTrigger><SelectValue placeholder="Selecione uma modalidade" /></SelectTrigger>
              <SelectContent>
                {modalities.map((modality) => (<SelectItem key={modality.id} value={modality.id}>{modality.name}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="expiryDate">Data de Vencimento da Matrícula</Label>
            <Input id="expiryDate" type="date" value={formData.expiryDate} onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })} disabled={loading || !formData.modalityId} />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancelar</Button>
            <Button type="submit" disabled={loading}>{loading ? "Adicionando..." : "Adicionar Aluno"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};