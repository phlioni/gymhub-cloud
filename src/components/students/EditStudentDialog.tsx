import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Student {
    id: string;
    name: string;
    cpf: string | null;
    birth_date: string | null;
    phone_number: string | null; // Novo campo
}

interface EditStudentDialogProps {
    student: Student | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export const EditStudentDialog = ({ student, open, onOpenChange, onSuccess }: EditStudentDialogProps) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        cpf: "",
        birthDate: "",
        phoneNumber: "", // Novo campo
    });

    useEffect(() => {
        if (student) {
            setFormData({
                name: student.name || "",
                cpf: student.cpf || "",
                birthDate: student.birth_date || "",
                phoneNumber: student.phone_number || "", // Novo campo
            });
        }
    }, [student]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!student) return;

        setLoading(true);
        try {
            const { error } = await supabase
                .from('students')
                .update({
                    name: formData.name,
                    cpf: formData.cpf || null,
                    birth_date: formData.birthDate || null,
                    phone_number: formData.phoneNumber || null, // Novo campo
                })
                .eq('id', student.id);

            if (error) throw error;

            toast.success("Aluno atualizado com sucesso");
            onSuccess();
            onOpenChange(false);
        } catch (error: any) {
            toast.error(error.message || "Falha ao atualizar aluno");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Editar Aluno</DialogTitle>
                    <DialogDescription>
                        Atualize as informações do aluno.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
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
                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancelar</Button>
                        <Button type="submit" disabled={loading}>{loading ? "Salvando..." : "Salvar Alterações"}</Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};