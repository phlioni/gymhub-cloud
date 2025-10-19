import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Trash2, PlusCircle } from "lucide-react";

interface Student {
    id: string;
    name: string;
    cpf: string | null;
    birth_date: string | null;
    phone_number: string | null;
    enrollments: any[];
}

interface EditStudentDialogProps {
    student: Student | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

interface Modality {
    id: string;
    name: string;
    price: number | null;
}

export const EditStudentDialog = ({ student, open, onOpenChange, onSuccess }: EditStudentDialogProps) => {
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [allModalities, setAllModalities] = useState<Modality[]>([]);
    const [studentEnrollments, setStudentEnrollments] = useState<any[]>([]);
    const [formData, setFormData] = useState({ name: "", cpf: "", birthDate: "", phoneNumber: "" });
    const [newEnrollment, setNewEnrollment] = useState({ modalityId: "", price: "", expiryDate: "" });
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [enrollmentToDelete, setEnrollmentToDelete] = useState<string | null>(null);

    useEffect(() => {
        // Popula os dados apenas quando o modal é aberto para um aluno específico.
        // A dependência `student?.id` evita que o estado seja resetado por re-renderizações do componente pai.
        if (open && student) {
            setFormData({
                name: student.name || "",
                cpf: student.cpf || "",
                birthDate: student.birth_date || "",
                phoneNumber: student.phone_number || "",
            });
            setStudentEnrollments(student.enrollments || []);
            loadModalities();
        }
    }, [open, student?.id]);

    const loadModalities = async () => {
        const { data } = await supabase.from('modalities').select('id, name, price').order('name');
        setAllModalities(data as Modality[] || []);
    };

    const handleUpdateAndClose = async () => {
        if (!student) return;
        setLoading(true);
        try {
            const { error } = await supabase
                .from('students')
                .update({ name: formData.name, cpf: formData.cpf || null, birth_date: formData.birthDate || null, phone_number: formData.phoneNumber || null })
                .eq('id', student.id);
            if (error) throw error;
            toast.success("Dados do aluno atualizados com sucesso!");
            onSuccess();
            onOpenChange(false); // Fecha o modal após salvar
        } catch (error: any) {
            toast.error(error.message || "Falha ao atualizar dados do aluno");
        } finally {
            setLoading(false);
        }
    };

    const handleAddEnrollment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!student || !newEnrollment.modalityId || !newEnrollment.expiryDate) {
            toast.warning("Selecione a modalidade e a data de vencimento.");
            return;
        }

        setActionLoading(true);
        try {
            const { data, error } = await supabase.from('enrollments').insert({
                student_id: student.id,
                modality_id: newEnrollment.modalityId,
                price: newEnrollment.price ? parseFloat(newEnrollment.price) : null,
                expiry_date: newEnrollment.expiryDate
            }).select('*, modalities(name)').single();

            if (error) throw error;

            // Atualização instantânea do estado local para refletir na UI
            setStudentEnrollments(prev => [...prev, data]);
            setNewEnrollment({ modalityId: "", price: "", expiryDate: "" });
            toast.success("Modalidade adicionada ao aluno.");
            onSuccess(); // Atualiza a lista principal em segundo plano
        } catch (error: any) {
            toast.error(error.message || "Falha ao adicionar modalidade.");
        } finally {
            setActionLoading(false);
        }
    };

    const confirmDeleteEnrollment = async () => {
        if (!enrollmentToDelete) return;

        setActionLoading(true);
        try {
            const { error } = await supabase.from('enrollments').delete().eq('id', enrollmentToDelete);
            if (error) throw error;

            // Atualização instantânea do estado local para refletir na UI
            setStudentEnrollments(prev => prev.filter(e => e.id !== enrollmentToDelete));
            toast.success("Matrícula removida com sucesso.");
            onSuccess(); // Atualiza a lista principal em segundo plano
        } catch (error: any) {
            toast.error(error.message || "Falha ao remover matrícula.");
        } finally {
            setActionLoading(false);
            setEnrollmentToDelete(null);
            setIsConfirmOpen(false);
        }
    }

    // Filtra as modalidades para mostrar apenas as que o aluno ainda não tem
    const availableModalities = allModalities.filter(
        (modality) => !studentEnrollments.some((enrollment) => enrollment.modality_id === modality.id)
    );

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader><DialogTitle>Editar Aluno</DialogTitle></DialogHeader>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-4">
                        {/* Coluna de Dados Pessoais */}
                        <div className="space-y-4">
                            <h3 className="font-semibold text-lg border-b pb-2">Dados Pessoais</h3>
                            <div className="space-y-2">
                                <Label htmlFor="name">Nome *</Label>
                                <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required disabled={loading} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="phoneNumber">Telefone (WhatsApp)</Label>
                                <Input id="phoneNumber" value={formData.phoneNumber} onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })} disabled={loading} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="cpf">CPF</Label>
                                <Input id="cpf" value={formData.cpf} onChange={(e) => setFormData({ ...formData, cpf: e.target.value })} disabled={loading} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="birthDate">Data de Nascimento</Label>
                                <Input id="birthDate" type="date" value={formData.birthDate} onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })} disabled={loading} />
                            </div>
                            <Button onClick={handleUpdateAndClose} disabled={loading}>{loading ? "Salvando..." : "Salvar e Fechar"}</Button>
                        </div>

                        {/* Coluna de Matrículas */}
                        <div className="space-y-4">
                            <h3 className="font-semibold text-lg border-b pb-2">Matrículas</h3>
                            <div className="space-y-2">
                                {studentEnrollments.length > 0 ? (
                                    studentEnrollments.map(enrollment => (
                                        <div key={enrollment.id} className="flex items-center justify-between p-2 rounded-md border bg-muted/50">
                                            <div>
                                                <p className="font-medium">{enrollment.modalities?.name || 'Modalidade Removida'}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {`R$ ${Number(enrollment.price || 0).toFixed(2).replace('.', ',')} - Vence em ${new Date(enrollment.expiry_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}`}
                                                </p>
                                            </div>
                                            <Button variant="ghost" size="icon" onClick={() => {
                                                setEnrollmentToDelete(enrollment.id);
                                                setIsConfirmOpen(true);
                                            }} disabled={actionLoading}>
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-muted-foreground text-center py-4">Nenhuma matrícula ativa.</p>
                                )}
                            </div>

                            <form onSubmit={handleAddEnrollment} className="space-y-3 pt-4 border-t">
                                <h4 className="font-semibold">Nova Matrícula</h4>
                                <Select
                                    value={newEnrollment.modalityId}
                                    onValueChange={(id) => setNewEnrollment({ ...newEnrollment, modalityId: id, price: String(allModalities.find(m => m.id === id)?.price || "") })}
                                    disabled={actionLoading}
                                >
                                    <SelectTrigger><SelectValue placeholder="Selecione a modalidade" /></SelectTrigger>
                                    <SelectContent>
                                        {availableModalities.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <div className="grid grid-cols-2 gap-2">
                                    <Input type="number" placeholder="Valor (R$)" value={newEnrollment.price} onChange={e => setNewEnrollment({ ...newEnrollment, price: e.target.value })} disabled={actionLoading} />
                                    <Input type="date" value={newEnrollment.expiryDate} onChange={e => setNewEnrollment({ ...newEnrollment, expiryDate: e.target.value })} disabled={actionLoading} />
                                </div>
                                <Button type="submit" className="w-full" disabled={actionLoading}><PlusCircle className="mr-2 h-4 w-4" />{actionLoading ? 'Adicionando...' : 'Adicionar'}</Button>
                            </form>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta ação não pode ser desfeita. Isso irá remover permanentemente a matrícula do aluno.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setEnrollmentToDelete(null)}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDeleteEnrollment}>
                            {actionLoading ? "Removendo..." : "Remover"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};