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
      // CORREÇÃO: Removido o aninhamento "body"
      const { data, error } = await supabase.functions.invoke('create-organization', {
        body: {
          orgName: formData.orgName,
          adminEmail: formData.adminEmail,
          adminFullName: formData.adminFullName,
          adminPassword: formData.adminPassword,
        }
      });

      if (error) throw error;
      // A resposta da função pode não ter um campo 'success', 
      // então verificamos diretamente por 'data' ou 'error' na resposta.
      if (data.error) throw new Error(data.error);

      toast.success("Organization created successfully");
      onSuccess();
      onOpenChange(false);
      setFormData({ orgName: "", adminEmail: "", adminFullName: "", adminPassword: "" });
    } catch (error: any) {
      toast.error(error.message || "Failed to create organization");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Organization</DialogTitle>
          <DialogDescription>
            Create a new gym client with an admin account.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="orgName">Organization Name *</Label>
            <Input
              id="orgName"
              value={formData.orgName}
              onChange={(e) => setFormData({ ...formData, orgName: e.target.value })}
              placeholder="e.g., CrossFit Downtown"
              required
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="adminEmail">Admin Email *</Label>
            <Input
              id="adminEmail"
              type="email"
              value={formData.adminEmail}
              onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
              placeholder="admin@example.com"
              required
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="adminFullName">Admin Full Name *</Label>
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
            <Label htmlFor="adminPassword">Temporary Password *</Label>
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
              Minimum 6 characters. The admin can change this later.
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Organization"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};