import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Edit, Trash2 } from "lucide-react";
import { AddAppointmentDialog } from "@/components/scheduling/AddAppointmentDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { startOfMonth, endOfMonth, startOfDay, endOfDay } from "date-fns";
import { ptBR } from 'date-fns/locale';

interface Appointment {
    id: string;
    student_id: string;
    modality_id: string | null;
    start_time: string;
    end_time: string;
    notes: string | null;
    students: { name: string };
    modalities: { name: string } | null;
}

const Scheduling = () => {
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setDialogOpen] = useState(false);
    const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
    const [organizationId, setOrganizationId] = useState<string | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const checkAuthAndFetchData = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                navigate('/');
                return;
            }
            const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', session.user.id).single();
            if (profile?.organization_id) {
                setOrganizationId(profile.organization_id);
                fetchAppointments(currentMonth, profile.organization_id);
            } else {
                setLoading(false);
                toast.error("Organização não encontrada.");
            }
        };
        checkAuthAndFetchData();
    }, [currentMonth, navigate]);

    const fetchAppointments = async (date: Date, orgId: string) => {
        setLoading(true);
        const start = startOfMonth(date);
        const end = endOfMonth(date);

        try {
            const { data, error } = await supabase
                .from('appointments')
                .select('*, students(name), modalities(name)')
                .eq('organization_id', orgId)
                .gte('start_time', start.toISOString())
                .lte('end_time', end.toISOString())
                .order('start_time', { ascending: true });

            if (error) throw error;
            setAppointments(data || []);
        } catch (error: any) {
            toast.error("Falha ao carregar agendamentos.");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (appointmentId: string) => {
        if (!confirm("Tem certeza que deseja excluir este agendamento?")) return;
        try {
            const { error } = await supabase.from('appointments').delete().eq('id', appointmentId);
            if (error) throw error;
            toast.success("Agendamento excluído com sucesso!");
            if (organizationId) {
                fetchAppointments(currentMonth, organizationId);
            }
        } catch (error: any) {
            toast.error("Falha ao excluir agendamento.");
        }
    }

    const handleEdit = (appointment: Appointment) => {
        setEditingAppointment(appointment);
        setDialogOpen(true);
    }

    const handleAddNew = () => {
        setEditingAppointment(null);
        setDialogOpen(true);
    }

    const appointmentsOnSelectedDay = useMemo(() => {
        if (!selectedDate) return [];
        const start = startOfDay(selectedDate);
        const end = endOfDay(selectedDate);
        return appointments.filter(app => {
            const appDate = new Date(app.start_time);
            return appDate >= start && appDate <= end;
        });
    }, [selectedDate, appointments]);

    const daysWithAppointments = useMemo(() => appointments.map(app => new Date(app.start_time)), [appointments]);

    return (
        <>
            <main className="flex-1 p-4 md:p-8">
                <div className="max-w-7xl mx-auto space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                                Agendamentos
                            </h1>
                            <p className="text-muted-foreground text-sm md:text-base">
                                Visualize e gerencie os horários dos seus alunos.
                            </p>
                        </div>
                        <Button onClick={handleAddNew}>
                            <Plus className="h-4 w-4 mr-2" />
                            Novo Agendamento
                        </Button>
                    </div>

                    <Card>
                        <CardContent className="p-2 md:p-4">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <div className="lg:col-span-1 flex justify-center">
                                    <Calendar
                                        mode="single"
                                        selected={selectedDate}
                                        onSelect={setSelectedDate}
                                        onMonthChange={setCurrentMonth}
                                        className="rounded-md border"
                                        locale={ptBR}
                                        modifiers={{ scheduled: daysWithAppointments }}
                                        modifiersStyles={{
                                            scheduled: {
                                                color: 'hsl(var(--primary))',
                                                fontWeight: 'bold',
                                            }
                                        }}
                                    />
                                </div>
                                <div className="lg:col-span-2">
                                    <CardHeader>
                                        <CardTitle>Horários para {selectedDate?.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }) || 'a data selecionada'}</CardTitle>
                                        <CardDescription>Clique em um agendamento para editar ou excluir.</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        {loading ? <Skeleton className="h-40 w-full" /> :
                                            appointmentsOnSelectedDay.length > 0 ? (
                                                <div className="space-y-4">
                                                    {appointmentsOnSelectedDay.map(app => (
                                                        <div key={app.id} className="p-3 border rounded-lg flex items-center justify-between hover:bg-muted/50 transition-colors">
                                                            <div>
                                                                <p className="font-semibold">{new Date(app.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} - {new Date(app.end_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                                                                <p>{app.students.name}</p>
                                                                {app.modalities && <p className="text-sm text-muted-foreground">{app.modalities.name}</p>}
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <Button variant="ghost" size="icon" onClick={() => handleEdit(app)}><Edit className="h-4 w-4" /></Button>
                                                                <Button variant="ghost" size="icon" onClick={() => handleDelete(app.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-muted-foreground text-center py-10">Nenhum agendamento para este dia.</p>
                                            )}
                                    </CardContent>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </main>

            <AddAppointmentDialog
                open={isDialogOpen}
                onOpenChange={setDialogOpen}
                onSuccess={() => {
                    if (organizationId) {
                        fetchAppointments(currentMonth, organizationId);
                    }
                }}
                organizationId={organizationId}
                initialData={editingAppointment}
                selectedDate={selectedDate || new Date()}
            />
        </>
    );
};

export default Scheduling;