import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CreateOrganizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const CreateOrganizationDialog = ({ open, onOpenChange, onSuccess }: CreateOrganizationDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    orgName: "",
    adminEmail: "",
    adminFullName: "",
    adminPassword: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-organization', {
        body: {
          orgName: formData.orgName,
          adminEmail: formData.adminEmail,
          adminFullName: formData.adminFullName,
          adminPassword: formData.adminPassword,
        }
      });

      if (error) throw new Error(error.message);

      const responseData = data;
      if (responseData.error) throw new Error(responseData.error);

      toast.success("Organização criada com sucesso!");
      onSuccess();
      onOpenChange(false);
      setFormData({ orgName: "", adminEmail: "", adminFullName: "", adminPassword: "" });
    } catch (error: any) {
      toast.error("Falha ao criar organização", { description: error.message });
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Criar Nova Organização</DialogTitle>
          <DialogDescription>
            Crie um novo cliente com uma conta de administrador.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="orgName">Nome da Organização *</Label>
            <Input
              id="orgName"
              value={formData.orgName}
              onChange={(e) => setFormData({ ...formData, orgName: e.target.value })}
              placeholder="Ex: CrossFit Downtown"
              required
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="adminEmail">Email do Admin *</Label>
            <Input
              id="adminEmail"
              type="email"
              value={formData.adminEmail}
              onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
              placeholder="admin@exemplo.com"
              required
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="adminFullName">Nome Completo do Admin *</Label>
            <Input
              id="adminFullName"
              value={formData.adminFullName}
              onChange={(e) => setFormData({ ...formData, adminFullName: e.target.value })}
              placeholder="John Doe"
              required
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="adminPassword">Senha Temporária *</Label>
            <Input
              id="adminPassword"
              type="password"
              value={formData.adminPassword}
              onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
              placeholder="••••••••"
              required
              disabled={loading}
              minLength={6}
            />
            <p className="text-xs text-muted-foreground">
              Mínimo de 6 caracteres. O admin poderá alterar depois.
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Criando..." : "Criar Organização"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};