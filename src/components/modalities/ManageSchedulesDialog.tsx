import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Skeleton } from "../ui/skeleton";

interface Modality {
    id: string;
    name: string;
}

interface Schedule {
    id: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
    max_students: number;
}

interface ManageSchedulesDialogProps {
    modality: Modality | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const weekDays = [
    { value: 1, label: 'Segunda-feira' },
    { value: 2, label: 'Terça-feira' },
    { value: 3, label: 'Quarta-feira' },
    { value: 4, label: 'Quinta-feira' },
    { value: 5, label: 'Sexta-feira' },
    { value: 6, label: 'Sábado' },
    { value: 7, label: 'Domingo' },
];

const formatDayOfWeek = (day: number) => weekDays.find(d => d.value === day)?.label || 'Dia inválido';

export const ManageSchedulesDialog = ({ modality, open, onOpenChange }: ManageSchedulesDialogProps) => {
    const [loading, setLoading] = useState(true);
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [newSchedule, setNewSchedule] = useState({ day_of_week: '', start_time: '', end_time: '', max_students: '' });

    useEffect(() => {
        if (open && modality) {
            loadSchedules();
        }
    }, [open, modality]);

    const loadSchedules = async () => {
        if (!modality) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('schedules')
                .select('*')
                .eq('modality_id', modality.id)
                .order('day_of_week')
                .order('start_time');
            if (error) throw error;
            setSchedules(data || []);
        } catch (error: any) {
            toast.error("Falha ao carregar os horários.");
        } finally {
            setLoading(false);
        }
    };

    const handleAddSchedule = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!modality) return;

        try {
            const { error } = await supabase.from('schedules').insert({
                modality_id: modality.id,
                ...newSchedule,
            });
            if (error) throw error;
            toast.success("Horário adicionado com sucesso!");
            setNewSchedule({ day_of_week: '', start_time: '', end_time: '', max_students: '' });
            loadSchedules();
        } catch (error: any) {
            toast.error(error.message || "Falha ao adicionar horário.");
        }
    };

    const handleDeleteSchedule = async (scheduleId: string) => {
        if (!confirm("Tem certeza que deseja excluir este horário?")) return;
        try {
            const { error } = await supabase.from('schedules').delete().eq('id', scheduleId);
            if (error) throw error;
            toast.success("Horário excluído com sucesso!");
            loadSchedules();
        } catch (error: any) {
            toast.error(error.message || "Falha ao excluir horário.");
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Gerenciar Horários de {modality?.name}</DialogTitle>
                    <DialogDescription>
                        Visualize, adicione ou remova horários para esta modalidade.
                    </DialogDescription>
                </DialogHeader>

                <div className="mt-4 border rounded-lg p-4">
                    <h3 className="font-semibold mb-2">Adicionar Novo Horário</h3>
                    <form onSubmit={handleAddSchedule} className="grid grid-cols-2 md:grid-cols-5 gap-4 items-end">
                        <div className="space-y-1">
                            <Label>Dia da Semana</Label>
                            <Select value={newSchedule.day_of_week} onValueChange={(v) => setNewSchedule({ ...newSchedule, day_of_week: v })} required>
                                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                                <SelectContent>
                                    {weekDays.map(day => <SelectItem key={day.value} value={String(day.value)}>{day.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label>Início</Label>
                            <Input type="time" value={newSchedule.start_time} onChange={(e) => setNewSchedule({ ...newSchedule, start_time: e.target.value })} required />
                        </div>
                        <div className="space-y-1">
                            <Label>Fim</Label>
                            <Input type="time" value={newSchedule.end_time} onChange={(e) => setNewSchedule({ ...newSchedule, end_time: e.target.value })} required />
                        </div>
                        <div className="space-y-1">
                            <Label>Vagas</Label>
                            <Input type="number" min="1" value={newSchedule.max_students} onChange={(e) => setNewSchedule({ ...newSchedule, max_students: e.target.value })} required />
                        </div>
                        <Button type="submit">Adicionar</Button>
                    </form>
                </div>

                <div className="mt-6">
                    <h3 className="font-semibold mb-2">Horários Cadastrados</h3>
                    <div className="max-h-64 overflow-y-auto border rounded-lg">
                        {loading ? <Skeleton className="w-full h-24" /> : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Dia</TableHead>
                                        <TableHead>Horário</TableHead>
                                        <TableHead>Vagas</TableHead>
                                        <TableHead className="text-right">Ação</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {schedules.length > 0 ? schedules.map(s => (
                                        <TableRow key={s.id}>
                                            <TableCell>{formatDayOfWeek(s.day_of_week)}</TableCell>
                                            <TableCell>{s.start_time} - {s.end_time}</TableCell>
                                            <TableCell>{s.max_students}</TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="icon" onClick={() => handleDeleteSchedule(s.id)}>
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center text-muted-foreground">Nenhum horário cadastrado.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};