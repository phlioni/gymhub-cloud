import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ThumbsUp, ThumbsDown, Edit, Bot, User, CheckCircle } from "lucide-react";
import { AddEditWorkoutDialog } from "@/components/workouts/AddEditWorkoutDialog";

interface PlanSuggestion {
    student_phone_number: string;
    student_name: string;
    student_id: string;
    organization_id: string;
    goal_details: any;
    plan_suggestion: any;
}

const AiAssistantPage = () => {
    const [loading, setLoading] = useState(true);
    const [suggestions, setSuggestions] = useState<PlanSuggestion[]>([]);
    const [selectedWorkout, setSelectedWorkout] = useState<any | null>(null);
    const [isWorkoutModalOpen, setWorkoutModalOpen] = useState(false);
    const [organizationId, setOrganizationId] = useState<string | null>(null);

    const loadSuggestions = useCallback(async (orgId: string) => {
        setLoading(true);
        try {
            const { data: studentsWithPendingPlans, error: studentsError } = await supabase
                .from('students')
                .select(`
                    id, name, phone_number,
                    student_coach_interactions!inner(goal_details, plan_suggestion)
                `)
                .eq('organization_id', orgId)
                .eq('student_coach_interactions.conversation_state', 'awaiting_plan_validation');

            if (studentsError) throw studentsError;

            const formattedData = studentsWithPendingPlans.map(item => ({
                student_phone_number: item.phone_number,
                student_name: item.name,
                student_id: item.id,
                organization_id: orgId,
                goal_details: item.student_coach_interactions[0]?.goal_details,
                plan_suggestion: item.student_coach_interactions[0]?.plan_suggestion,
            }));
            setSuggestions(formattedData as any);

        } catch (err: any) {
            toast.error("Falha ao carregar sugestões da IA: " + err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const getOrgAndLoad = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();
                if (profile?.organization_id) {
                    setOrganizationId(profile.organization_id);
                    loadSuggestions(profile.organization_id);
                }
            }
        };
        getOrgAndLoad();
    }, [loadSuggestions]);

    const handleApprove = async (suggestion: PlanSuggestion) => {
        if (!organizationId) return;
        const workoutName = `Plano IA - ${suggestion.student_name}`;

        try {
            const { data: workout, error: workoutError } = await supabase.from('workouts').insert({
                name: workoutName,
                description: `Gerado pela IA com base no objetivo: ${suggestion.goal_details?.objective || 'Não definido'}.`,
                organization_id: organizationId,
                frequency: suggestion.plan_suggestion?.frequency || 'weekly'
            }).select().single();

            if (workoutError) throw workoutError;

            await supabase.from('workout_students').insert({ workout_id: workout.id, student_id: suggestion.student_id });
            await supabase.from('student_coach_interactions').update({ conversation_state: 'idle', plan_suggestion: null }).eq('student_phone_number', suggestion.student_phone_number);

            toast.success(`Plano para ${suggestion.student_name} aprovado e adicionado aos treinos!`);
            if (organizationId) loadSuggestions(organizationId);
        } catch (err: any) {
            toast.error("Falha ao aprovar o plano: " + err.message);
        }
    };

    const handleEdit = (suggestion: PlanSuggestion) => {
        const workoutForEdit = {
            name: `Plano IA - ${suggestion.student_name}`,
            description: `OBJETIVO: ${suggestion.goal_details?.objective || 'Não definido'}.\n\n` +
                `DADOS: Peso: ${suggestion.goal_details?.weight || 'N/A'} | Altura: ${suggestion.goal_details?.height || 'N/A'} | Nível: ${suggestion.goal_details?.activity_level || 'N/A'}\n\n` +
                `--- SUGESTÃO DA IA ---\n${suggestion.plan_suggestion.generated_plan}`,
            frequency: 'weekly',
            workout_exercises: [],
            students: [{ id: suggestion.student_id, name: suggestion.student_name }]
        };
        setSelectedWorkout(workoutForEdit);
        setWorkoutModalOpen(true);
    };

    const handleReject = async (phone: string) => {
        if (!organizationId) return;
        await supabase.from('student_coach_interactions').update({ conversation_state: 'idle', plan_suggestion: null }).eq('student_phone_number', phone);
        toast.info("Sugestão rejeitada.");
        loadSuggestions(organizationId);
    };

    return (
        <main className="flex-1 p-4 md:p-8">
            <div className="max-w-6xl mx-auto space-y-6">
                <div>
                    <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent flex items-center gap-2">
                        <Bot /> Assistente IA - Validações Pendentes
                    </h1>
                    <p className="text-muted-foreground text-sm md:text-base">
                        Revise, ajuste e aprove os planos de treino e dieta sugeridos pela TreineAI para seus alunos.
                    </p>
                </div>

                {loading && <Skeleton className="h-48 w-full" />}

                {!loading && suggestions.length === 0 && (
                    <Card className="p-12 text-center">
                        <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                        <p className="text-muted-foreground">Nenhuma sugestão da IA para validar no momento. Tudo em dia!</p>
                    </Card>
                )}

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {suggestions.map((s, index) => (
                        <Card key={index} className="flex flex-col">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><User /> {s.student_name}</CardTitle>
                                <CardDescription>Objetivo: <Badge variant="outline">{s.goal_details?.objective || 'Não informado'}</Badge></CardDescription>
                            </CardHeader>
                            <CardContent className="flex-1 space-y-4">
                                <div>
                                    <h4 className="font-semibold text-sm">Dados Coletados:</h4>
                                    <p className="text-sm text-muted-foreground">
                                        Peso: {s.goal_details?.weight || 'N/A'} | Altura: {s.goal_details?.height || 'N/A'} | Nível: {s.goal_details?.activity_level || 'N/A'}
                                    </p>
                                </div>
                                <div className="p-3 bg-muted/50 rounded-md">
                                    <h4 className="font-semibold text-sm">Sugestão da TreineAI:</h4>
                                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{s.plan_suggestion?.generated_plan || 'Nenhuma sugestão gerada.'}</p>
                                </div>
                            </CardContent>
                            <CardFooter className="flex justify-end gap-2">
                                <Button variant="outline" size="sm" onClick={() => handleReject(s.student_phone_number)}><ThumbsDown className="mr-2 h-4 w-4" /> Rejeitar</Button>
                                <Button variant="secondary" size="sm" onClick={() => handleEdit(s)}><Edit className="mr-2 h-4 w-4" /> Editar</Button>
                                <Button size="sm" onClick={() => handleApprove(s)}><ThumbsUp className="mr-2 h-4 w-4" /> Aprovar</Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            </div>
            {isWorkoutModalOpen && organizationId && (
                <AddEditWorkoutDialog
                    open={isWorkoutModalOpen}
                    onOpenChange={setWorkoutModalOpen}
                    workout={selectedWorkout}
                    organizationId={organizationId}
                    onSuccess={() => {
                        if (organizationId) loadSuggestions(organizationId);
                        setWorkoutModalOpen(false);
                    }}
                />
            )}
        </main>
    );
};

export default AiAssistantPage;