import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AddStudentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string | null;
  onSuccess: () => void;
}

interface Modality {
  id: string;
  name: string;
  price: number | null;
}

// >>> INÍCIO: Função para formatar o número de telefone <<<
const formatPhoneNumber = (phone: string | null | undefined): string | null => {
  if (!phone) {
    return null; // Retorna null se a entrada for vazia, nula ou indefinida
  }
  // Remove caracteres não numéricos, exceto o '+' inicial se existir
  let cleanedNumber = phone.trim().replace(/[^\d+]/g, '');
  if (!cleanedNumber) { return null; }
  // Se já começa com '+', assume que está formatado (internacional ou +55)
  if (cleanedNumber.startsWith('+')) {
    // Opcional: Validar se é +55 ou outro formato esperado
    // Ex: if (!cleanedNumber.startsWith('+55')) { console.warn("Formato internacional diferente de +55 detectado:", cleanedNumber); }
    return cleanedNumber;
  }
  // Se não começa com '+', remove todos os não-dígitos restantes e adiciona +55
  const digitsOnly = cleanedNumber.replace(/\D/g, '');
  if (!digitsOnly) { return null; } // Caso a limpeza tenha deixado algo inválido
  return `+55${digitsOnly}`;
};
// >>> FIM: Função para formatar o número de telefone <<<

export const AddStudentDialog = ({ open, onOpenChange, organizationId, onSuccess }: AddStudentDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [modalities, setModalities] = useState<Modality[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    cpf: "",
    birthDate: "",
    phoneNumber: "",
    modalityId: "",
    enrollmentPrice: "",
    expiryDate: "",
    gympassUserToken: "", // <-- NOVO CAMPO
    totalpassUserToken: "", // <-- NOVO CAMPO
  });

  useEffect(() => {
    if (open) {
      loadModalities();
      const today = new Date();
      today.setDate(today.getDate() + 30);
      const formattedDefaultDate = today.toISOString().split('T')[0];
      setFormData(prev => ({ ...prev, expiryDate: formattedDefaultDate }));
    } else {
      // Limpa o formulário quando o modal é fechado
      setFormData({ name: "", cpf: "", birthDate: "", phoneNumber: "", modalityId: "", enrollmentPrice: "", expiryDate: "", gympassUserToken: "", totalpassUserToken: "" }); // <-- NOVO CAMPO
    }
  }, [open]);

  const loadModalities = async () => {
    const { data } = await supabase.from('modalities').select('id, name, price').order('name');
    setModalities(data as Modality[] || []);
  };

  const handleModalityChange = (modalityId: string) => {
    const selectedModality = modalities.find(m => m.id === modalityId);
    setFormData({
      ...formData,
      modalityId: modalityId,
      enrollmentPrice: selectedModality?.price ? String(selectedModality.price) : ""
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationId) {
      toast.error("Organização não encontrada");
      return;
    }

    setLoading(true);
    try {
      // >>> MODIFICAÇÃO AQUI: Formata o número antes de inserir <<<
      const formattedPhone = formatPhoneNumber(formData.phoneNumber);
      // >>> FIM DA MODIFICAÇÃO <<<

      const { data: student, error: studentError } = await supabase
        .from('students')
        .insert({
          organization_id: organizationId,
          name: formData.name,
          cpf: formData.cpf || null,
          birth_date: formData.birthDate || null,
          // >>> MODIFICAÇÃO AQUI: Usa o número formatado <<<
          phone_number: formattedPhone,
          gympass_user_token: formData.gympassUserToken || null, // <-- NOVO CAMPO
          totalpass_user_token: formData.totalpassUserToken || null, // <-- NOVO CAMPO
          // >>> FIM DA MODIFICAÇÃO <<<
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
            price: formData.enrollmentPrice ? parseFloat(formData.enrollmentPrice) : null,
          });
        if (enrollmentError) throw enrollmentError;
      }

      toast.success("Aluno adicionado com sucesso");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Falha ao adicionar aluno");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle>Adicionar Novo Aluno</DialogTitle>
          <DialogDescription>
            Insira as informações do aluno e os detalhes da matrícula.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[80vh] overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-4 px-6 pb-6">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required disabled={loading} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Telefone (WhatsApp)</Label>
              <Input id="phoneNumber" value={formData.phoneNumber} onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })} placeholder="+5513999998888" disabled={loading} />
              <p className="text-xs text-muted-foreground">Formato: +55 (DDD) (Número)</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cpf">CPF</Label>
                <Input id="cpf" value={formData.cpf} onChange={(e) => setFormData({ ...formData, cpf: e.target.value })} placeholder="000.000.000-00" disabled={loading} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="birthDate">Nascimento</Label>
                <Input id="birthDate" type="date" value={formData.birthDate} onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })} disabled={loading} />
              </div>
            </div>

            {/* NOVOS CAMPOS DE TOKEN */}
            <div className="space-y-2 pt-4 border-t">
              <Label className="font-semibold">Tokens de Acesso (Opcional)</Label>
              <div className="space-y-2">
                <Label htmlFor="gympassUserToken" className="text-xs">Token Gympass/Wellhub</Label>
                <Input id="gympassUserToken" value={formData.gympassUserToken} onChange={(e) => setFormData({ ...formData, gympassUserToken: e.target.value })} placeholder="ID de Beneficiário" disabled={loading} />
                <p className="text-xs text-muted-foreground">O ID que o aluno deve ter em seu app.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="totalpassUserToken" className="text-xs">Token TotalPass</Label>
                <Input id="totalpassUserToken" value={formData.totalpassUserToken} onChange={(e) => setFormData({ ...formData, totalpassUserToken: e.target.value })} placeholder="ID de Beneficiário" disabled={loading} />
                <p className="text-xs text-muted-foreground">O ID que o aluno deve ter em seu app.</p>
              </div>
            </div>
            {/* FIM NOVOS CAMPOS */}

            <div className="space-y-2 pt-4 border-t">
              <Label className="font-semibold">Matrícula Inicial (Opcional)</Label>
              <Select value={formData.modalityId} onValueChange={handleModalityChange} disabled={loading}>
                <SelectTrigger><SelectValue placeholder="Selecione uma modalidade" /></SelectTrigger>
                <SelectContent>
                  {modalities.map((modality) => (<SelectItem key={modality.id} value={modality.id}>{modality.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="enrollmentPrice">Valor (R$)</Label>
                <Input id="enrollmentPrice" type="number" step="0.01" min="0" placeholder="Ex: 99,90" value={formData.enrollmentPrice} onChange={(e) => setFormData({ ...formData, enrollmentPrice: e.target.value })} disabled={loading || !formData.modalityId} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expiryDate">Vencimento</Label>
                <Input id="expiryDate" type="date" value={formData.expiryDate} onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })} disabled={loading || !formData.modalityId} />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Adicionando..." : "Adicionar Aluno"}
              </Button>
            </div>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};