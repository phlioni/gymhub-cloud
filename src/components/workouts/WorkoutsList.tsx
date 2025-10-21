import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
// >>> CORREÇÃO: 'CalendarWeek' foi trocado por 'CalendarRange' <<<
import { Edit, Trash2, User, Users, CalendarDays, CalendarRange } from "lucide-react";
import { WorkoutWithDetails } from "@/pages/Workouts";

interface WorkoutsListProps {
    workouts: WorkoutWithDetails[];
    onEdit: (workout: WorkoutWithDetails) => void;
    onDelete: (workoutId: string) => void;
}

// Função auxiliar para obter o nome do dia da semana
const getDayName = (dayNumber: number | null) => {
    if (dayNumber === null || dayNumber < 1 || dayNumber > 7) return null;
    const days = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
    return days[dayNumber - 1];
};

const TargetBadge = ({ workout }: { workout: WorkoutWithDetails }) => {
    const studentCount = workout.workout_students.length;

    if (studentCount === 0) {
        return <Badge variant="secondary" className="text-xs"><Users className="h-3 w-3 mr-1" /> Geral</Badge>;
    }
    if (studentCount === 1) {
        return <Badge variant="outline" className="text-xs"><User className="h-3 w-3 mr-1" /> {workout.workout_students[0].students?.name}</Badge>;
    }
    return <Badge variant="outline" className="text-xs"><Users className="h-3 w-3 mr-1" /> {studentCount} Alunos</Badge>;
};


export const WorkoutsList = ({ workouts, onEdit, onDelete }: WorkoutsListProps) => {

    if (workouts.length === 0) {
        return (
            <Card className="p-12 text-center">
                <p className="text-muted-foreground">Nenhum treino encontrado. Crie o primeiro!</p>
            </Card>
        );
    }

    return (
        <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {workouts.map((workout) => {
                const dayName = getDayName(workout.day_of_week);

                return (
                    <Card key={workout.id} className="flex flex-col justify-between hover:shadow-md transition-shadow">
                        <CardHeader>
                            <div className="flex justify-between items-start gap-2">
                                <div>
                                    <CardTitle className="text-lg mb-1">{workout.name}</CardTitle>
                                    <CardDescription className="text-xs line-clamp-2">{workout.description || "Sem descrição"}</CardDescription>
                                </div>
                                <div className="flex flex-col items-end flex-shrink-0 space-y-1">
                                    {/* Badge de Alvo */}
                                    <TargetBadge workout={workout} />
                                    {/* Badge de Frequência */}
                                    {workout.frequency === 'daily' && dayName && (
                                        <Badge variant="outline" className="text-xs border-blue-500 text-blue-700">
                                            <CalendarDays className="h-3 w-3 mr-1" /> {dayName}
                                        </Badge>
                                    )}
                                    {workout.frequency === 'weekly' && (
                                        <Badge variant="outline" className="text-xs border-green-500 text-green-700">
                                            {/* >>> CORREÇÃO AQUI <<< */}
                                            <CalendarRange className="h-3 w-3 mr-1" /> Semanal
                                        </Badge>
                                    )}
                                    {/* Badge de Exercícios continua igual */}
                                    <Badge variant="default" className="text-xs">
                                        {workout.workout_exercises?.length || 0} exercícios
                                    </Badge>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-0 pb-4 px-4 flex justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => onEdit(workout)}>
                                <Edit className="h-4 w-4 mr-2" /> Editar
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => onDelete(workout.id)} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                                <Trash2 className="h-4 w-4 mr-2" /> Excluir
                            </Button>
                        </CardContent>
                    </Card>
                )
            })}
        </div>
    );
};