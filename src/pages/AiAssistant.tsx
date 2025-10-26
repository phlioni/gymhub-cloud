import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ThumbsDown, Edit, Bot, User, CheckCircle } from "lucide-react";
import { AddEditWorkoutDialog } from "@/components/workouts/AddEditWorkoutDialog";
import { useAuthProtection } from "@/hooks/useAuthProtection";

interface PlanSuggestion {
    student_phone_number: string;
    student_name: string;
    student_id: string;
    organization_id: string;
    goal_details: any;
    plan_suggestion: any;
}

const AiAssistantPage = () => {
    const { organizationId, loading: authLoading } = useAuthProtection();
    const [suggestionsLoading, setSuggestionsLoading] = useState(true);
    const [suggestions, setSuggestions] = useState<PlanSuggestion[]>([]);
    const [selectedWorkout, setSelectedWorkout] = useState<any | null>(null);
    const [isWorkoutModalOpen, setWorkoutModalOpen] = useState(false);

    const loadSuggestions = useCallback(async (orgId: string) => {
        setSuggestionsLoading(true);
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
            setSuggestionsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (organizationId) {
            loadSuggestions(organizationId);
        }
    }, [organizationId, loadSuggestions]);

    const handleReviewAndApprove = (suggestion: PlanSuggestion) => {
        const workoutForEdit = {
            name: `Plano ArIA - ${suggestion.student_name}`,
            description: `OBJETIVO: ${suggestion.goal_details?.objective_text || 'Não definido'}.\n\n` +
                `DADOS: Peso: ${suggestion.goal_details?.weight || 'N/A'} | Altura: ${suggestion.goal_details?.height || 'N/A'} | Nível: ${suggestion.goal_details?.activity_level || 'N/A'}\n\n` +
                `--- SUGESTÃO DA ArIA ---\n${suggestion.plan_suggestion.generated_plan}`,
            frequency: 'weekly',
            workout_exercises: [],
            workout_students: [{ students: { id: suggestion.student_id, name: suggestion.student_name } }],
            student_phone_number: suggestion.student_phone_number,
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

    const isLoading = authLoading || suggestionsLoading;

    return (
        <main className="flex-1 p-4 md:p-8">
            <div className="max-w-6xl mx-auto space-y-6">
                <div>
                    <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent flex items-center gap-2">
                        <Bot /> Assistente ArIA - Validações Pendentes
                    </h1>
                    <p className="text-muted-foreground text-sm md:text-base">
                        Revise, ajuste e aprove os planos de treino sugeridos pela ArIA para seus alunos.
                    </p>
                </div>

                {isLoading && <Skeleton className="h-48 w-full" />}

                {!isLoading && suggestions.length === 0 && (
                    <Card className="p-12 text-center">
                        <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                        <p className="text-muted-foreground">Nenhuma sugestão da ArIA para validar no momento. Tudo em dia!</p>
                    </Card>
                )}

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {!isLoading && suggestions.map((s, index) => (
                        <Card key={index} className="flex flex-col">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><User /> {s.student_name}</CardTitle>
                                <CardDescription>Objetivo: <Badge variant="outline">{s.goal_details?.objective_text || 'Não informado'}</Badge></CardDescription>
                            </CardHeader>
                            <CardContent className="flex-1 space-y-4">
                                <div>
                                    <h4 className="font-semibold text-sm">Dados Coletados:</h4>
                                    <p className="text-sm text-muted-foreground">
                                        Peso: {s.goal_details?.weight || 'N/A'} | Altura: {s.goal_details?.height || 'N/A'} | Nível: {s.goal_details?.activity_level || 'N/A'}
                                    </p>
                                </div>
                                <div className="p-3 bg-muted/50 rounded-md">
                                    <h4 className="font-semibold text-sm">Sugestão:</h4>
                                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{s.plan_suggestion?.generated_plan || 'Nenhuma sugestão gerada.'}</p>
                                </div>
                            </CardContent>
                            <CardFooter className="flex justify-end gap-2">
                                <Button variant="outline" size="sm" onClick={() => handleReject(s.student_phone_number)}><ThumbsDown className="mr-2 h-4 w-4" /> Rejeitar</Button>
                                <Button size="sm" onClick={() => handleReviewAndApprove(s)}><Edit className="mr-2 h-4 w-4" /> Revisar e Aprovar</Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            </div>
            {isWorkoutModalOpen && organizationId && (
                <AddEditWorkoutDialog
                    open={isWorkoutModalOpen}
                    onOpenChange={setWorkoutModalOpen}
                    workoutData={selectedWorkout}
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