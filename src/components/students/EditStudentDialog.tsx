import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription // Adicionado DialogDescription
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription as AlertDialogDesc, // Renomeado para evitar conflito
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle as AlertDialogAlertTitle, // Renomeado para evitar conflito
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
import { ScrollArea } from "@/components/ui/scroll-area"; // Importar ScrollArea

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
        return cleanedNumber;
    }
    // Se não começa com '+', remove todos os não-dígitos restantes e adiciona +55
    const digitsOnly = cleanedNumber.replace(/\D/g, '');
    if (!digitsOnly) { return null; }
    return `+55${digitsOnly}`;
};
// >>> FIM: Função para formatar o número de telefone <<<


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
        if (open && student) {
            setFormData({
                name: student.name || "",
                cpf: student.cpf || "",
                birthDate: student.birth_date || "",
                phoneNumber: student.phone_number || "",
            });
            setStudentEnrollments(student.enrollments || []);
            loadModalities();
        } else if (!open) {
            // Limpa o estado quando o modal é fechado
            setFormData({ name: "", cpf: "", birthDate: "", phoneNumber: "" });
            setStudentEnrollments([]);
            setNewEnrollment({ modalityId: "", price: "", expiryDate: "" });
            setAllModalities([]);
            setEnrollmentToDelete(null);
        }
    }, [open, student]); // Depende de 'student' para atualizar quando ele muda

    const loadModalities = async () => {
        const { data } = await supabase.from('modalities').select('id, name, price').order('name');
        setAllModalities(data as Modality[] || []);
    };

    const handleUpdateStudentData = async (e: React.FormEvent) => { // Renomeado para clareza
        e.preventDefault(); // Prevenir submit padrão se for chamado por um form
        if (!student) return;
        setLoading(true);
        try {
            // >>> MODIFICAÇÃO AQUI: Formata o número antes de atualizar <<<
            const formattedPhone = formatPhoneNumber(formData.phoneNumber);
            // >>> FIM DA MODIFICAÇÃO <<<

            const { error } = await supabase
                .from('students')
                .update({
                    name: formData.name,
                    cpf: formData.cpf || null,
                    birth_date: formData.birthDate || null,
                    // >>> MODIFICAÇÃO AQUI: Usa o número formatado <<<
                    phone_number: formattedPhone
                    // >>> FIM DA MODIFICAÇÃO <<<
                })
                .eq('id', student.id);
            if (error) throw error;
            toast.success("Dados do aluno atualizados com sucesso!");
            onSuccess(); // Chama onSuccess para atualizar a lista principal
            // Não fecha o modal aqui, permite continuar editando matrículas
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
        // Validar se já existe matrícula para essa modalidade (opcional, mas bom)
        if (studentEnrollments.some(en => en.modality_id === newEnrollment.modalityId)) {
            toast.error("O aluno já possui matrícula nesta modalidade.");
            return;
        }

        setActionLoading(true);
        try {
            // Tenta pegar o preço padrão da modalidade se o campo estiver vazio
            const priceToInsert = newEnrollment.price
                ? parseFloat(newEnrollment.price)
                : allModalities.find(m => m.id === newEnrollment.modalityId)?.price ?? null;


            const { data, error } = await supabase.from('enrollments').insert({
                student_id: student.id,
                modality_id: newEnrollment.modalityId,
                price: priceToInsert,
                expiry_date: newEnrollment.expiryDate
            }).select('*, modalities(name)').single(); // Puxa o nome da modalidade

            if (error) throw error;

            setStudentEnrollments(prev => [...prev, data]);
            setNewEnrollment({ modalityId: "", price: "", expiryDate: "" }); // Limpa o formulário de nova matrícula
            toast.success("Modalidade adicionada ao aluno.");
            onSuccess(); // Atualiza a lista principal
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
            onSuccess();
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

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                {/* Aumentado max-w e removido padding p-0 */}
                <DialogContent className="sm:max-w-3xl">
                    <DialogHeader className="p-6 pb-4">
                        <DialogTitle>Editar Aluno: {student?.name}</DialogTitle>
                        {/* Adicionado Descrição */}
                        <DialogDescription>Atualize os dados pessoais e gerencie as matrículas do aluno.</DialogDescription>
                    </DialogHeader>
                    {/* Adicionado ScrollArea para conteúdo longo */}
                    <ScrollArea className="max-h-[70vh] px-6 pb-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                            {/* Coluna de Dados Pessoais */}
                            <form onSubmit={handleUpdateStudentData} className="space-y-4">
                                <h3 className="font-semibold text-lg border-b pb-2 mb-4">Dados Pessoais</h3>
                                <div className="space-y-2">
                                    <Label htmlFor="name">Nome *</Label>
                                    <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required disabled={loading} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="phoneNumber">Telefone (WhatsApp)</Label>
                                    <Input id="phoneNumber" value={formData.phoneNumber} onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })} disabled={loading} placeholder="+5513999998888" />
                                    <p className="text-xs text-muted-foreground">Formato: +55 (DDD) (Número)</p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="cpf">CPF</Label>
                                    <Input id="cpf" value={formData.cpf} onChange={(e) => setFormData({ ...formData, cpf: e.target.value })} disabled={loading} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="birthDate">Data de Nascimento</Label>
                                    <Input id="birthDate" type="date" value={formData.birthDate} onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })} disabled={loading} />
                                </div>
                                <Button type="submit" disabled={loading}>{loading ? "Salvando..." : "Salvar Dados Pessoais"}</Button>
                            </form>

                            {/* Coluna de Matrículas */}
                            <div className="space-y-4">
                                <h3 className="font-semibold text-lg border-b pb-2 mb-4">Matrículas</h3>
                                <div className="space-y-2 max-h-48 overflow-y-auto pr-2 border rounded-md p-2 bg-background"> {/* Melhorado estilo e scroll */}
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
                                        onValueChange={(id) => setNewEnrollment({ ...newEnrollment, modalityId: id, price: String(allModalities.find(m => m.id === id)?.price ?? "") })}
                                        disabled={actionLoading}
                                    >
                                        <SelectTrigger><SelectValue placeholder="Selecione a modalidade" /></SelectTrigger>
                                        <SelectContent>
                                            {availableModalities.length > 0 ? availableModalities.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>) : <div className="p-2 text-sm text-muted-foreground text-center">Nenhuma outra modalidade disponível</div>}
                                        </SelectContent>
                                    </Select>
                                    <div className="grid grid-cols-2 gap-2">
                                        {/* Adicionado step e min */}
                                        <Input type="number" step="0.01" min="0" placeholder="Valor (R$)" value={newEnrollment.price} onChange={e => setNewEnrollment({ ...newEnrollment, price: e.target.value })} disabled={actionLoading || !newEnrollment.modalityId} />
                                        <Input type="date" value={newEnrollment.expiryDate} onChange={e => setNewEnrollment({ ...newEnrollment, expiryDate: e.target.value })} disabled={actionLoading || !newEnrollment.modalityId} />
                                    </div>
                                    <Button type="submit" className="w-full" disabled={actionLoading || !newEnrollment.modalityId}><PlusCircle className="mr-2 h-4 w-4" />{actionLoading ? 'Adicionando...' : 'Adicionar Matrícula'}</Button>
                                </form>
                            </div>
                        </div>
                    </ScrollArea>
                    {/* Botão Fechar movido para fora do ScrollArea */}
                    <div className="flex justify-end pt-4 px-6">
                        <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
                    </div>
                </DialogContent>
            </Dialog>

            <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        {/* Renomeado para usar AlertDialogAlertTitle */}
                        <AlertDialogAlertTitle>Você tem certeza?</AlertDialogAlertTitle>
                        {/* Renomeado para usar AlertDialogDesc */}
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