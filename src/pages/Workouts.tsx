import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Dumbbell } from "lucide-react";
import { toast } from "sonner";
import { FloatingActionButton } from "@/components/ui/FloatingActionButton";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { WorkoutsList } from "@/components/workouts/WorkoutsList";
import { AddEditWorkoutDialog } from "@/components/workouts/AddEditWorkoutDialog";
import { Tables } from "@/integrations/supabase/types";

// Tipo atualizado para refletir a nova estrutura
export type WorkoutWithDetails = Tables<'workouts'> & {
    workout_exercises: Tables<'workout_exercises'>[];
    workout_students: {
        students: Pick<Tables<'students'>, 'id' | 'name'> | null;
    }[];
};

const Workouts = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [showAddEditDialog, setShowAddEditDialog] = useState(false);
    const [editingWorkout, setEditingWorkout] = useState<WorkoutWithDetails | null>(null);
    const [workouts, setWorkouts] = useState<WorkoutWithDetails[]>([]);
    const [organizationId, setOrganizationId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            navigate('/');
            return;
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('organization_id, role')
            .eq('id', session.user.id)
            .single();

        if (profile?.role === 'superadmin') {
            navigate('/super-admin');
            return;
        }

        if (profile?.organization_id) {
            setOrganizationId(profile.organization_id);
            loadWorkouts(profile.organization_id);
        } else {
            toast.error("Organização não encontrada.");
            setLoading(false);
        }
    };

    const loadWorkouts = async (orgId: string) => {
        setLoading(true);
        try {
            // Query atualizada para buscar da tabela de junção
            const { data, error } = await supabase
                .from('workouts')
                .select(`
                    *,
                    workout_exercises ( * ),
                    workout_students (
                        students ( id, name )
                    )
                `)
                .eq('organization_id', orgId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setWorkouts(data as WorkoutWithDetails[] || []);
        } catch (error: any) {
            toast.error("Falha ao carregar os treinos");
            console.error("Erro ao carregar treinos:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddNew = () => {
        setEditingWorkout(null);
        setShowAddEditDialog(true);
    };

    const handleEdit = (workout: WorkoutWithDetails) => {
        setEditingWorkout(workout);
        setShowAddEditDialog(true);
    };

    const handleDelete = async (workoutId: string) => {
        if (!confirm("Tem certeza que deseja excluir este treino e todos os seus exercícios?")) return;
        try {
            // A exclusão em workout_students e workout_exercises é feita automaticamente pelo ON DELETE CASCADE
            const { error } = await supabase.from('workouts').delete().eq('id', workoutId);
            if (error) throw error;
            toast.success("Treino excluído com sucesso!");
            if (organizationId) loadWorkouts(organizationId); // Recarrega a lista
        } catch (error: any) {
            toast.error("Falha ao excluir o treino.");
            console.error("Erro ao excluir treino:", error);
        }
    };

    const filteredWorkouts = useMemo(() => {
        if (!searchTerm) {
            return workouts;
        }
        return workouts.filter(workout =>
            workout.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            workout.workout_students.some(ws => ws.students?.name.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [workouts, searchTerm]);

    return (
        <div className="flex min-h-screen bg-gradient-to-br from-primary/[0.02] via-background to-accent/[0.02]">
            <main className="flex-1 p-4 md:p-8">
                <div className="max-w-7xl mx-auto space-y-8">
                    {/* Cabeçalho */}
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                        <div className="space-y-2">
                            <h1 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent tracking-tight flex items-center gap-2">
                                <Dumbbell className="h-8 w-8 inline-block text-primary" /> Treinos
                            </h1>
                            <p className="text-sm md:text-base text-muted-foreground">
                                Crie e gerencie os planos de treino dos seus alunos.
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="relative w-full md:w-72">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar por nome do treino ou aluno..."
                                    className="pl-10 h-11 bg-background/50 backdrop-blur-sm border-border/50 focus:border-primary/50 shadow-sm transition-all"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <Button onClick={handleAddNew} size="lg" className="h-11 px-6 shadow-md hover:shadow-lg transition-all hidden md:inline-flex">
                                <Plus className="h-5 w-5 md:mr-2" />
                                <span className="hidden md:inline font-medium">Criar Treino</span>
                            </Button>
                        </div>
                    </div>

                    {/* Conteúdo (Lista de Treinos) */}
                    {loading ? (
                        <Card className="p-6">
                            <div className="space-y-4">
                                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 bg-muted rounded" />)}
                            </div>
                        </Card>
                    ) : (
                        <WorkoutsList
                            workouts={filteredWorkouts}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                        />
                    )}

                    {/* Dialog para Adicionar/Editar */}
                    <AddEditWorkoutDialog
                        open={showAddEditDialog}
                        onOpenChange={setShowAddEditDialog}
                        organizationId={organizationId}
                        workoutData={editingWorkout}
                        onSuccess={() => {
                            if (organizationId) loadWorkouts(organizationId);
                        }}
                    />
                </div>
                {/* Botão Flutuante Mobile */}
                <FloatingActionButton onClick={handleAddNew} />
            </main>
        </div>
    );
};

export default Workouts;