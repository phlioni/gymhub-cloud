import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Student { id: string; name: string; }
interface Modality { id: string; name: string; }
interface Appointment {
    id?: string;
    student_id: string;
    modality_id: string | null;
    start_time: string;
    end_time: string;
    notes: string | null;
}

interface AddAppointmentDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
    organizationId: string | null;
    initialData?: Appointment | null;
    selectedDate: Date;
}

export const AddAppointmentDialog = ({ open, onOpenChange, onSuccess, organizationId, initialData, selectedDate }: AddAppointmentDialogProps) => {
    const [loading, setLoading] = useState(false);
    const [students, setStudents] = useState<Student[]>([]);
    const [modalities, setModalities] = useState<Modality[]>([]);
    const [formData, setFormData] = useState<Appointment>({
        student_id: '',
        modality_id: null,
        start_time: '08:00',
        end_time: '09:00',
        notes: ''
    });

    useEffect(() => {
        if (open) {
            loadStudentsAndModalities();
            if (initialData) {
                setFormData({
                    ...initialData,
                    start_time: new Date(initialData.start_time).toTimeString().slice(0, 5),
                    end_time: new Date(initialData.end_time).toTimeString().slice(0, 5),
                });
            } else {
                // Reset para um novo agendamento
                setFormData({
                    student_id: '',
                    modality_id: null,
                    start_time: '08:00',
                    end_time: '09:00',
                    notes: ''
                });
            }
        }
    }, [open, initialData]);

    const loadStudentsAndModalities = async () => {
        const { data: studentsData } = await supabase.from('students').select('id, name').order('name');
        const { data: modalitiesData } = await supabase.from('modalities').select('id, name').order('name');
        setStudents(studentsData || []);
        setModalities(modalitiesData || []);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!organizationId || !formData.student_id) {
            toast.error("Selecione um aluno para agendar.");
            return;
        }

        setLoading(true);
        try {
            const startDateTime = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), ...formData.start_time.split(':').map(Number));
            const endDateTime = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), ...formData.end_time.split(':').map(Number));

            const payload = {
                organization_id: organizationId,
                student_id: formData.student_id,
                modality_id: formData.modality_id,
                start_time: startDateTime.toISOString(),
                end_time: endDateTime.toISOString(),
                notes: formData.notes,
            }

            let error;
            if (initialData?.id) {
                // Edição
                const { error: updateError } = await supabase.from('appointments').update(payload).eq('id', initialData.id);
                error = updateError;
            } else {
                // Criação
                const { error: insertError } = await supabase.from('appointments').insert(payload);
                error = insertError;
            }

            if (error) throw error;

            toast.success(`Agendamento ${initialData?.id ? 'atualizado' : 'criado'} com sucesso!`);
            onSuccess();
            onOpenChange(false);
        } catch (error: any) {
            toast.error(error.message || `Falha ao ${initialData?.id ? 'atualizar' : 'criar'} agendamento.`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md p-0">
                <DialogHeader className="p-6 pb-4">
                    <DialogTitle>{initialData?.id ? 'Editar' : 'Novo'} Agendamento</DialogTitle>
                    <DialogDescription>
                        Para a data de {selectedDate.toLocaleDateString('pt-BR')}.
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[80vh] overflow-y-auto">
                    <form onSubmit={handleSubmit} className="space-y-4 px-6 pb-6">
                        <div className="space-y-2">
                            <Label>Aluno *</Label>
                            <Select value={formData.student_id} onValueChange={(v) => setFormData({ ...formData, student_id: v })} required disabled={loading}>
                                <SelectTrigger><SelectValue placeholder="Selecione um aluno" /></SelectTrigger>
                                <SelectContent>
                                    {students.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Modalidade (Opcional)</Label>
                            <Select
                                value={formData.modality_id || "none"}
                                onValueChange={(v) => setFormData({ ...formData, modality_id: v === "none" ? null : v })}
                                disabled={loading}
                            >
                                <SelectTrigger><SelectValue placeholder="Selecione uma modalidade" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Nenhuma</SelectItem>
                                    {modalities.map((m) => (<SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>))}
                                </SelectContent>
                            </Select>
                        </div>
                        {/* OTIMIZAÇÃO MOBILE APLICADA AQUI */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="start_time">Início *</Label>
                                <Input id="start_time" type="time" value={formData.start_time} onChange={(e) => setFormData({ ...formData, start_time: e.target.value })} required disabled={loading} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="end_time">Fim *</Label>
                                <Input id="end_time" type="time" value={formData.end_time} onChange={(e) => setFormData({ ...formData, end_time: e.target.value })} required disabled={loading} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="notes">Observações</Label>
                            <Textarea id="notes" value={formData.notes || ''} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} disabled={loading} placeholder="Alguma observação sobre este agendamento?" />
                        </div>
                        <div className="flex justify-end gap-2 pt-4">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancelar</Button>
                            <Button type="submit" disabled={loading}>{loading ? "Salvando..." : "Salvar"}</Button>
                        </div>
                    </form>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
};