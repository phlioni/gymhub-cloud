import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";

interface Student {
    id: string;
    name: string;
}

interface Enrollment {
    id: string;
    expiry_date: string;
}

interface RenewEnrollmentDialogProps {
    student: Student | null;
    enrollment: Enrollment | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export const RenewEnrollmentDialog = ({ student, enrollment, open, onOpenChange, onSuccess }: RenewEnrollmentDialogProps) => {
    const [loading, setLoading] = useState(false);
    const [newExpiryDate, setNewExpiryDate] = useState("");
    const [currentExpiryDate, setCurrentExpiryDate] = useState("");

    useEffect(() => {
        if (student && enrollment) {
            // Calcula a nova data de vencimento (hoje + 30 dias)
            const today = new Date();
            today.setDate(today.getDate() + 30);
            const formattedNewDate = today.toISOString().split('T')[0];
            setNewExpiryDate(formattedNewDate);

            // Formata a data de vencimento atual
            const currentDate = new Date(enrollment.expiry_date);
            currentDate.setDate(currentDate.getDate() + 1); // Ajuste de fuso
            setCurrentExpiryDate(currentDate.toLocaleDateString('pt-BR'));
        }
    }, [student, enrollment]);

    const handleSubmit = async () => {
        if (!enrollment) {
            toast.error("Nenhuma matrícula encontrada para renovar.");
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase
                .from('enrollments')
                .update({ expiry_date: newExpiryDate })
                .eq('id', enrollment.id);

            if (error) throw error;

            toast.success(`Matrícula de ${student?.name} renovada com sucesso!`);
            onSuccess();
            onOpenChange(false);
        } catch (error: any) {
            toast.error(error.message || "Falha ao renovar a matrícula.");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (!student) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Renovar Matrícula</DialogTitle>
                    <DialogDescription>
                        Confirme a renovação da matrícula para o aluno.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Aluno</Label>
                        <p className="font-semibold text-lg">{student.name}</p>
                    </div>
                    <Card className="bg-muted/50">
                        <CardContent className="p-4 space-y-2">
                            <div className="flex justify-between items-center">
                                <Label>Vencimento Atual:</Label>
                                <p className="font-mono text-sm">{currentExpiryDate}</p>
                            </div>
                            <div className="flex justify-between items-center text-primary">
                                <Label>Novo Vencimento:</Label>
                                <p className="font-semibold font-mono text-sm">{new Date(newExpiryDate).toLocaleDateString('pt-BR')}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <p className="text-xs text-muted-foreground">
                        Ao confirmar, a data de vencimento será atualizada para 30 dias a partir de hoje.
                    </p>
                </div>
                <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSubmit} disabled={loading}>
                        {loading ? "Renovando..." : "Confirmar Renovação"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};