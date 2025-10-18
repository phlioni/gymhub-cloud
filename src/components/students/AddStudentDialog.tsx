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
    modalityId: "",
    expiryDate: "",
  });

  useEffect(() => {
    if (open) {
      loadModalities();
    }
  }, [open]);

  const loadModalities = async () => {
    const { data } = await supabase
      .from('modalities')
      .select('*')
      .order('name');
    setModalities(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationId) {
      toast.error("Organization not found");
      return;
    }

    setLoading(true);
    try {
      // Create student
      const { data: student, error: studentError } = await supabase
        .from('students')
        .insert({
          organization_id: organizationId,
          name: formData.name,
          cpf: formData.cpf || null,
          birth_date: formData.birthDate || null,
        })
        .select()
        .single();

      if (studentError) throw studentError;

      // Create enrollment if modality selected
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

      toast.success("Student added successfully");
      onSuccess();
      onOpenChange(false);
      setFormData({ name: "", cpf: "", birthDate: "", modalityId: "", expiryDate: "" });
    } catch (error: any) {
      toast.error(error.message || "Failed to add student");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Student</DialogTitle>
          <DialogDescription>
            Enter the student's information and initial enrollment details.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cpf">CPF</Label>
            <Input
              id="cpf"
              value={formData.cpf}
              onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
              placeholder="000.000.000-00"
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="birthDate">Birth Date</Label>
            <Input
              id="birthDate"
              type="date"
              value={formData.birthDate}
              onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="modality">Initial Modality</Label>
            <Select
              value={formData.modalityId}
              onValueChange={(value) => setFormData({ ...formData, modalityId: value })}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a modality" />
              </SelectTrigger>
              <SelectContent>
                {modalities.map((modality) => (
                  <SelectItem key={modality.id} value={modality.id}>
                    {modality.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="expiryDate">Enrollment Expiry Date</Label>
            <Input
              id="expiryDate"
              type="date"
              value={formData.expiryDate}
              onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
              disabled={loading || !formData.modalityId}
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Add Student"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
