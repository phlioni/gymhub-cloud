import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription as AlertDialogDesc,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle as AlertDialogAlertTitle,
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
import { ScrollArea } from "@/components/ui/scroll-area";

interface Student {
    id: string;
    name: string;
    cpf: string | null;
    birth_date: string | null;
    phone_number: string | null;
    enrollments: any[];
    gympass_user_token: string | null; // <-- NOVO CAMPO
    totalpass_user_token: string | null; // <-- NOVO CAMPO
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

// Função para formatar o número de telefone (mantida)
const formatPhoneNumber = (phone: string | null | undefined): string | null => {
    if (!phone) { return null; }
    let cleanedNumber = phone.trim().replace(/[^\d+]/g, '');
    if (!cleanedNumber) { return null; }
    if (cleanedNumber.startsWith('+')) { return cleanedNumber; }
    const digitsOnly = cleanedNumber.replace(/\D/g, '');
    if (!digitsOnly) { return null; }
    return `+55${digitsOnly}`;
};

export const EditStudentDialog = ({ student, open, onOpenChange, onSuccess }: EditStudentDialogProps) => {
    const [loadingData, setLoadingData] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [allModalities, setAllModalities] = useState<Modality[]>([]);
    const [studentEnrollments, setStudentEnrollments] = useState<any[]>([]);
    const [formData, setFormData] = useState({
        name: "",
        cpf: "",
        birthDate: "",
        phoneNumber: "",
        gympassUserToken: "", // <-- NOVO ESTADO
        totalpassUserToken: "" // <-- NOVO ESTADO
    });
    const [newEnrollment, setNewEnrollment] = useState({ modalityId: "", price: "", expiryDate: "" });
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [enrollmentToDelete, setEnrollmentToDelete] = useState<string | null>(null);
    const [hasChanges, setHasChanges] = useState(false);

    useEffect(() => {
        if (open && student) {
            setFormData({
                name: student.name || "",
                cpf: student.cpf || "",
                birthDate: student.birth_date || "",
                phoneNumber: student.phone_number || "",
                gympassUserToken: student.gympass_user_token || "", // <-- POPULAR ESTADO
                totalpassUserToken: student.totalpass_user_token || "", // <-- POPULAR ESTADO
            });
            // Ordena as matrículas pela data de vencimento mais recente primeiro
            const sortedEnrollments = (student.enrollments || []).sort((a, b) =>
                new Date(b.expiry_date).getTime() - new Date(a.expiry_date).getTime()
            );
            setStudentEnrollments(sortedEnrollments);
            loadModalities();
            setHasChanges(false);
        } else if (!open) {
            setFormData({ name: "", cpf: "", birthDate: "", phoneNumber: "", gympassUserToken: "", totalpassUserToken: "" }); // <-- RESETAR ESTADO
            setStudentEnrollments([]);
            setNewEnrollment({ modalityId: "", price: "", expiryDate: "" });
            setAllModalities([]);
            setEnrollmentToDelete(null);
            setHasChanges(false);
        }
    }, [open, student]);

    const loadModalities = async () => {
        const { data } = await supabase.from('modalities').select('id, name, price').order('name');
        setAllModalities(data as Modality[] || []);
    };

    const handleOpenChange = (isOpen: boolean) => {
        if (!isOpen && hasChanges) {
            onSuccess();
        }
        onOpenChange(isOpen);
    };

    const handleUpdateStudentData = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!student) return;
        setLoadingData(true);
        try {
            const formattedPhone = formatPhoneNumber(formData.phoneNumber);
            const { error } = await supabase
                .from('students')
                .update({
                    name: formData.name,
                    cpf: formData.cpf || null,
                    birth_date: formData.birthDate || null,
                    phone_number: formattedPhone,
                    gympass_user_token: formData.gympassUserToken || null, // <-- SALVAR CAMPO
                    totalpass_user_token: formData.totalpassUserToken || null, // <-- SALVAR CAMPO
                })
                .eq('id', student.id);
            if (error) throw error;
            toast.success("Dados do aluno atualizados com sucesso!");
            setHasChanges(true);
        } catch (error: any) {
            toast.error(error.message || "Falha ao atualizar dados do aluno");
        } finally {
            setLoadingData(false);
        }
    };

    const handleAddEnrollment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!student || !newEnrollment.modalityId || !newEnrollment.expiryDate) {
            toast.warning("Selecione a modalidade e a data de vencimento.");
            return;
        }
        if (studentEnrollments.some(en => en.modality_id === newEnrollment.modalityId)) {
            toast.error("O aluno já possui matrícula nesta modalidade.");
            return;
        }

        setActionLoading(true);
        try {
            const priceToInsert = newEnrollment.price
                ? parseFloat(newEnrollment.price)
                : allModalities.find(m => m.id === newEnrollment.modalityId)?.price ?? null;

            const { data, error } = await supabase.from('enrollments').insert({
                student_id: student.id,
                modality_id: newEnrollment.modalityId,
                price: priceToInsert,
                expiry_date: newEnrollment.expiryDate
            }).select('*, modalities(name)').single();

            if (error) throw error;

            // Adiciona a nova matrícula e reordena
            setStudentEnrollments(prev => [...prev, data].sort((a, b) => new Date(b.expiry_date).getTime() - new Date(a.expiry_date).getTime()));
            setNewEnrollment({ modalityId: "", price: "", expiryDate: "" });
            toast.success("Modalidade adicionada ao aluno.");
            setHasChanges(true);
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
            setStudentEnrollments(prev => prev.filter(e => e.id !== enrollmentToDelete));
            toast.success("Matrícula removida com sucesso.");
            setHasChanges(true);
        } catch (error: any) {
            toast.error(error.message || "Falha ao remover matrícula.");
        } finally {
            setActionLoading(false);
            setEnrollmentToDelete(null);
            setIsConfirmOpen(false);
        }
    }

    const availableModalities = allModalities.filter(
        (modality) => !studentEnrollments.some((enrollment) => enrollment.modality_id === modality.id)
    );

    const handleCloseDialog = () => {
        handleOpenChange(false);
    };

    return (
        <>
            <Dialog open={open} onOpenChange={handleOpenChange}>
                <DialogContent className="sm:max-w-xl md:max-w-3xl lg:max-w-4xl max-h-[90vh] flex flex-col p-0">
                    <DialogHeader className="px-6 pt-6 pb-4 border-b">
                        <DialogTitle>Editar Aluno: {student?.name}</DialogTitle>
                        <DialogDescription>Atualize os dados pessoais e gerencie as matrículas do aluno.</DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="flex-1 overflow-y-auto">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 p-6"> {/* Ajustado gap-y */}
                            {/* Coluna de Dados Pessoais */}
                            <form onSubmit={handleUpdateStudentData} className="space-y-4">
                                <h3 className="font-semibold text-lg border-b pb-2 mb-4">Dados Pessoais</h3>
                                <div className="space-y-2">
                                    <Label htmlFor="name">Nome *</Label>
                                    <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required disabled={loadingData} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="phoneNumber">Telefone (WhatsApp)</Label>
                                    <Input id="phoneNumber" value={formData.phoneNumber} onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })} disabled={loadingData} placeholder="+5513999998888" />
                                    <p className="text-xs text-muted-foreground">Formato: +55 (DDD) (Número)</p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="cpf">CPF</Label>
                                    <Input id="cpf" value={formData.cpf} onChange={(e) => setFormData({ ...formData, cpf: e.target.value })} disabled={loadingData} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="birthDate">Data de Nascimento</Label>
                                    <Input id="birthDate" type="date" value={formData.birthDate} onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })} disabled={loadingData} />
                                </div>

                                <div className="space-y-4 pt-4 border-t">
                                    <h3 className="font-semibold text-lg pb-2">Tokens de Acesso</h3>
                                    <div className="space-y-2">
                                        <Label htmlFor="gympassUserToken" className="text-xs">Token Gympass/Wellhub</Label>
                                        <Input id="gympassUserToken" value={formData.gympassUserToken} onChange={(e) => setFormData({ ...formData, gympassUserToken: e.target.value })} placeholder="ID de Beneficiário" disabled={loadingData} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="totalpassUserToken" className="text-xs">Token TotalPass</Label>
                                        <Input id="totalpassUserToken" value={formData.totalpassUserToken} onChange={(e) => setFormData({ ...formData, totalpassUserToken: e.target.value })} placeholder="ID de Beneficiário" disabled={loadingData} />
                                    </div>
                                </div>

                                <Button type="submit" disabled={loadingData}>
                                    {loadingData ? "Salvando..." : "Salvar Dados Pessoais"}
                                </Button>
                            </form>

                            {/* Coluna de Matrículas */}
                            <div className="space-y-4">
                                <h3 className="font-semibold text-lg border-b pb-2 mb-4">Matrículas</h3>
                                {/* Área de Matrículas Ativas */}
                                <div className="space-y-2 max-h-48 overflow-y-auto pr-2 border rounded-md p-2 bg-background">
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

                                {/* Formulário de Nova Matrícula */}
                                <form onSubmit={handleAddEnrollment} className="space-y-3 pt-4 border-t">
                                    <h4 className="font-semibold">Nova Matrícula</h4>
                                    <Select
                                        value={newEnrollment.modalityId}
                                        onValueChange={(id) => setNewEnrollment({ ...newEnrollment, modalityId: id, price: String(allModalities.find(m => m.id === id)?.price ?? ""), expiryDate: newEnrollment.expiryDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] })} // Auto preenche data
                                        disabled={actionLoading}
                                    >
                                        <SelectTrigger><SelectValue placeholder="Selecione a modalidade" /></SelectTrigger>
                                        <SelectContent>
                                            {availableModalities.length > 0 ? availableModalities.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>) : <div className="p-2 text-sm text-muted-foreground text-center">Nenhuma outra modalidade disponível</div>}
                                        </SelectContent>
                                    </Select>
                                    {/* >>> CORREÇÃO DE LAYOUT AQUI <<< */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-2 gap-y-3"> {/* Alterado gap-y */}
                                        <div className="space-y-1"> {/* Agrupado com Label */}
                                            <Label htmlFor="newEnrollmentPrice" className="text-xs">Valor (R$)</Label>
                                            <Input id="newEnrollmentPrice" type="number" step="0.01" min="0" placeholder="Valor" value={newEnrollment.price} onChange={e => setNewEnrollment({ ...newEnrollment, price: e.target.value })} disabled={actionLoading || !newEnrollment.modalityId} />
                                        </div>
                                        <div className="space-y-1"> {/* Agrupado com Label */}
                                            <Label htmlFor="newExpiryDate" className="text-xs">Vencimento</Label>
                                            <Input id="newExpiryDate" type="date" value={newEnrollment.expiryDate} onChange={e => setNewEnrollment({ ...newEnrollment, expiryDate: e.target.value })} disabled={actionLoading || !newEnrollment.modalityId} required />
                                        </div>
                                        {/* >>> FIM DA CORREÇÃO DE LAYOUT <<< */}
                                    </div>
                                    <Button type="submit" className="w-full" disabled={actionLoading || !newEnrollment.modalityId}><PlusCircle className="mr-2 h-4 w-4" />{actionLoading ? 'Adicionando...' : 'Adicionar Matrícula'}</Button>
                                </form>
                            </div>
                        </div>
                    </ScrollArea>
                    <DialogFooter className="px-6 py-4 border-t">
                        <Button variant="outline" onClick={handleCloseDialog}>Fechar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* AlertDialog para confirmar exclusão */}
            <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogAlertTitle>Você tem certeza?</AlertDialogAlertTitle>
                        <AlertDialogDesc>
                            Esta ação não pode ser desfeita. Isso irá remover permanentemente a matrícula do aluno nesta modalidade.
                        </AlertDialogDesc>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setEnrollmentToDelete(null)}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDeleteEnrollment} disabled={actionLoading}>
                            {actionLoading ? "Removendo..." : "Remover"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};