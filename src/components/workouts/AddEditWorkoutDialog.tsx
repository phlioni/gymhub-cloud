import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
// <<< 1. IMPORTAR ÍCONE DE LINK >>>
import { PlusCircle, Trash2, GripVertical, Save, X, ChevronsUpDown, Check, Link } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { WorkoutWithDetails } from "@/pages/Workouts";

const weekDays = [
    { value: 1, label: 'Segunda-feira' }, { value: 2, label: 'Terça-feira' }, { value: 3, label: 'Quarta-feira' },
    { value: 4, label: 'Quinta-feira' }, { value: 5, label: 'Sexta-feira' }, { value: 6, label: 'Sábado' }, { value: 7, label: 'Domingo' },
];

// <<< 2. ATUALIZAR TIPO INTERNO PARA INCLUIR VIDEO_URL >>>
type WorkoutExerciseData = Omit<Tables<'workout_exercises'>, 'workout_id' | 'created_at'> & {
    tempId: string;
    video_url?: string | null; // Adicionado
};

// Adicionado student_phone_number para o fluxo da IA
type WorkoutDataForDialog = WorkoutWithDetails & { student_phone_number?: string | null };

interface AddEditWorkoutDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    organizationId: string | null;
    workoutData: WorkoutDataForDialog | null;
    onSuccess: () => void;
}

const MultiSelectStudents = ({
    allStudents,
    selected,
    onSelectionChange,
    disabled
}: {
    allStudents: Pick<Tables<'students'>, 'id' | 'name'>[];
    selected: Pick<Tables<'students'>, 'id' | 'name'>[];
    onSelectionChange: (selected: Pick<Tables<'students'>, 'id' | 'name'>[]) => void;
    disabled?: boolean;
}) => {
    const [open, setOpen] = useState(false);

    const handleSelect = (student: Pick<Tables<'students'>, 'id' | 'name'>) => {
        onSelectionChange([...selected, student]);
    };

    const handleDeselect = (studentId: string) => {
        onSelectionChange(selected.filter(s => s.id !== studentId));
    };

    const isSelected = (studentId: string) => selected.some(s => s.id === studentId);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between h-auto min-h-10"
                    disabled={disabled}
                >
                    <div className="flex gap-1 flex-wrap">
                        {selected.length > 0 ? selected.map(student => (
                            <Badge
                                variant="secondary"
                                key={student.id}
                                className="mr-1 mb-1"
                                onClick={(e) => { e.stopPropagation(); handleDeselect(student.id); }}
                            >
                                {student.name}
                                <X className="ml-1 h-3 w-3" />
                            </Badge>
                        )) : "Selecione aluno(s)..."}
                    </div>
                    <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0">
                <Command>
                    <CommandInput placeholder="Buscar aluno..." />
                    <CommandList>
                        <CommandEmpty>Nenhum aluno encontrado.</CommandEmpty>
                        <CommandGroup>
                            {allStudents.map((student) => (
                                <CommandItem
                                    key={student.id}
                                    onSelect={() => {
                                        if (isSelected(student.id)) {
                                            handleDeselect(student.id);
                                        } else {
                                            handleSelect(student);
                                        }
                                    }}
                                >
                                    <div className={cn("mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary", isSelected(student.id) ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible")}>
                                        <Check className={cn("h-4 w-4")} />
                                    </div>
                                    {student.name}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
};


export const AddEditWorkoutDialog = ({ open, onOpenChange, organizationId, workoutData, onSuccess }: AddEditWorkoutDialogProps) => {
    const [loading, setLoading] = useState(false);
    const [students, setStudents] = useState<Pick<Tables<'students'>, 'id' | 'name'>[]>([]);
    const [workoutName, setWorkoutName] = useState("");
    const [workoutDescription, setWorkoutDescription] = useState("");
    const [selectedStudents, setSelectedStudents] = useState<Pick<Tables<'students'>, 'id' | 'name'>[]>([]);
    const [frequency, setFrequency] = useState<"single" | "daily" | "weekly">("single");
    const [selectedDayOfWeek, setSelectedDayOfWeek] = useState<number | null>(null);
    const [exercises, setExercises] = useState<WorkoutExerciseData[]>([]);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

    useEffect(() => {
        if (open) {
            loadStudents();
            if (workoutData) {
                setWorkoutName(workoutData.name);
                setWorkoutDescription(workoutData.description || "");
                setSelectedStudents(workoutData.workout_students.map(ws => ws.students).filter(Boolean) as Pick<Tables<'students'>, 'id' | 'name'>[]);
                setFrequency(workoutData.frequency as "single" | "daily" | "weekly" || "single");
                setSelectedDayOfWeek(workoutData.day_of_week);
                // <<< 3. POPULAR DADOS (incluindo video_url) >>>
                setExercises(workoutData.workout_exercises.sort((a, b) => a.order_index - b.order_index).map(ex => ({
                    ...ex,
                    tempId: ex.id,
                    video_url: ex.video_url || null // Garante que video_url está no estado
                } as WorkoutExerciseData)));
            } else {
                resetForm();
            }
        } else {
            resetForm();
        }
    }, [open, workoutData]);

    const resetForm = () => {
        setWorkoutName("");
        setWorkoutDescription("");
        setSelectedStudents([]);
        setFrequency("single");
        setSelectedDayOfWeek(null);
        setExercises([]);
        setLoading(false);
        setDraggedIndex(null);
    };

    const loadStudents = async () => {
        if (!organizationId) return;
        try {
            const { data, error } = await supabase.from('students').select('id, name').eq('organization_id', organizationId).order('name');
            if (error) throw error;
            setStudents(data || []);
        } catch (error) {
            toast.error("Falha ao carregar lista de alunos.");
        }
    };

    const addExercise = () => {
        setExercises([
            ...exercises,
            {
                tempId: `temp-${exercises.length}-${Date.now()}`,
                exercise_name: "", sets: null, reps: null, rest_period: null, observations: null,
                video_url: null, // <<< 4. ADICIONAR AO NOVO EXERCÍCIO >>>
                order_index: exercises.length, id: '',
            },
        ]);
    };

    // <<< 5. ATUALIZAR 'updateExercise' PARA SUPORTAR 'video_url' >>>
    const updateExercise = (tempId: string, field: keyof Omit<WorkoutExerciseData, 'tempId' | 'id' | 'workout_id' | 'created_at'>, value: string | null) => {
        setExercises(exercises.map(ex => ex.tempId === tempId ? { ...ex, [field]: value || null } : ex));
    };

    const removeExercise = (tempId: string) => {
        setExercises(exercises.filter(ex => ex.tempId !== tempId).map((ex, index) => ({ ...ex, order_index: index })));
    };

    const handleDragStart = (index: number) => setDraggedIndex(index);
    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => e.preventDefault();
    const handleDrop = (index: number) => {
        if (draggedIndex === null || draggedIndex === index) {
            setDraggedIndex(null);
            return;
        }
        const newExercises = [...exercises];
        const [draggedItem] = newExercises.splice(draggedIndex, 1);
        newExercises.splice(index, 0, draggedItem);
        const updatedExercises = newExercises.map((ex, idx) => ({ ...ex, order_index: idx }));
        setExercises(updatedExercises);
        setDraggedIndex(null);
    };

    const handleFrequencyChange = (value: string) => {
        const newFrequency = value as "single" | "daily" | "weekly";
        setFrequency(newFrequency);
        if (newFrequency !== 'daily') {
            setSelectedDayOfWeek(null);
        } else if (!selectedDayOfWeek) {
            setSelectedDayOfWeek(1);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!organizationId || !workoutName) return toast.error("Nome do treino é obrigatório.");
        if (frequency === 'daily' && !selectedDayOfWeek) return toast.error("Selecione o dia da semana.");
        if (exercises.some(ex => !ex.exercise_name?.trim())) return toast.error("Todos os exercícios devem ter um nome.");

        setLoading(true);
        try {
            let workoutId = workoutData?.id;
            const workoutPayload: TablesInsert<'workouts'> | TablesUpdate<'workouts'> = {
                organization_id: organizationId,
                name: workoutName,
                description: workoutDescription || null,
                frequency: frequency,
                day_of_week: frequency === 'daily' ? selectedDayOfWeek : null,
            };

            if (workoutId) {
                const { error } = await supabase.from('workouts').update(workoutPayload).eq('id', workoutId);
                if (error) throw error;
            } else {
                const { data, error } = await supabase.from('workouts').insert(workoutPayload).select('id').single();
                if (error) throw error;
                workoutId = data.id;
            }

            if (!workoutId) throw new Error("Falha ao obter ID do treino.");

            const newStudentIds = selectedStudents.map(s => s.id);
            const oldStudentIds = workoutData?.workout_students.map(ws => ws.students?.id).filter(Boolean) as string[] || [];
            const idsToAdd = newStudentIds.filter(id => !oldStudentIds.includes(id));
            const idsToRemove = oldStudentIds.filter(id => !newStudentIds.includes(id));

            if (idsToAdd.length > 0) {
                const linksToAdd = idsToAdd.map(student_id => ({ workout_id: workoutId!, student_id }));
                const { error } = await supabase.from('workout_students').insert(linksToAdd);
                if (error) throw error;
            }
            if (idsToRemove.length > 0) {
                const { error } = await supabase.from('workout_students').delete().eq('workout_id', workoutId).in('student_id', idsToRemove);
                if (error) throw error;
            }

            if (exercises.length > 0) {
                const exercisesToUpsert = exercises.map(ex => {
                    // <<< 6. ADICIONAR 'video_url' AO PAYLOAD DE UPSERT >>>
                    const payload: any = {
                        workout_id: workoutId,
                        exercise_name: ex.exercise_name,
                        sets: ex.sets || null,
                        reps: ex.reps || null,
                        rest_period: ex.rest_period || null,
                        observations: ex.observations || null,
                        video_url: ex.video_url || null, // Salva o link do vídeo
                        order_index: ex.order_index,
                    };
                    if (ex.id && !ex.tempId.startsWith('temp-')) {
                        payload.id = ex.id;
                    }
                    return payload;
                });
                const { error: upsertError } = await supabase.from('workout_exercises').upsert(exercisesToUpsert, { onConflict: 'id' });
                if (upsertError) throw upsertError;
            }

            const existingExerciseIds = workoutData?.workout_exercises?.map(ex => ex.id) || [];
            const currentExerciseIds = exercises.map(ex => ex.id).filter((id): id is string => !!id && !id.startsWith('temp-'));
            const exerciseIdsToRemove = existingExerciseIds.filter(id => !currentExerciseIds.includes(id));

            if (exerciseIdsToRemove.length > 0) {
                const { error: deleteError } = await supabase.from('workout_exercises').delete().in('id', exerciseIdsToRemove);
                if (deleteError) throw deleteError;
            }

            // >>> NOVO: LÓGICA DE NOTIFICAÇÃO E LIMPEZA <<<
            if (workoutData?.student_phone_number) {
                // Limpa o estado de pendência na tabela de interações
                await supabase
                    .from('student_coach_interactions')
                    .update({ conversation_state: 'idle', plan_suggestion: null })
                    .eq('student_phone_number', workoutData.student_phone_number);

                // Envia a notificação para o aluno
                const message = `Boas notícias! ✨\n\nSeu novo plano de treino "${workoutName}" foi aprovado pelo seu instrutor.\n\nVocê já pode consultá-lo digitando "meu treino" aqui. Vamos com tudo! 💪`;
                await supabase.functions.invoke('notify-student', {
                    body: { to: workoutData.student_phone_number, message: message },
                });
            }
            // >>> FIM DA NOVA LÓGICA <<<

            toast.success(`Treino ${workoutData ? 'atualizado' : 'criado'} com sucesso!`);
            onSuccess();
            onOpenChange(false);

        } catch (error: any) {
            toast.error(error.message || `Falha ao salvar treino.`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl md:max-w-3xl max-h-[90vh] flex flex-col p-0">
                <DialogHeader className="p-6 pb-4 border-b">
                    <DialogTitle>{workoutData ? 'Editar Treino' : 'Criar Novo Treino'}</DialogTitle>
                    <DialogDescription>{workoutData ? 'Modifique os detalhes.' : 'Defina os detalhes e adicione exercícios.'}</DialogDescription>
                </DialogHeader>
                <ScrollArea className="flex-1 overflow-y-auto">
                    <form id="workout-form" onSubmit={handleSubmit} className="space-y-6 p-6">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="workoutName">Nome do Treino *</Label>
                                <Input id="workoutName" value={workoutName} onChange={(e) => setWorkoutName(e.target.value)} required disabled={loading} placeholder="Ex: Treino A - Foco em Peito" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="workoutDescription">Descrição (Opcional)</Label>
                                <Textarea id="workoutDescription" value={workoutDescription} onChange={(e) => setWorkoutDescription(e.target.value)} disabled={loading} placeholder="Ex: Treino para hipertrofia..." rows={2} />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                                <div className="space-y-2">
                                    <Label>Frequência</Label>
                                    <RadioGroup value={frequency} onValueChange={handleFrequencyChange} className="flex space-x-4 pt-2" disabled={loading}>
                                        <div className="flex items-center space-x-2"><RadioGroupItem value="single" id="freq-single" /><Label htmlFor="freq-single" className="font-normal">Único</Label></div>
                                        <div className="flex items-center space-x-2"><RadioGroupItem value="daily" id="freq-daily" /><Label htmlFor="freq-daily" className="font-normal">Diário</Label></div>
                                        <div className="flex items-center space-x-2"><RadioGroupItem value="weekly" id="freq-weekly" /><Label htmlFor="freq-weekly" className="font-normal">Semanal</Label></div>
                                    </RadioGroup>
                                </div>
                                {frequency === 'daily' && (
                                    <div className="space-y-2">
                                        <Label>Dia da Semana</Label>
                                        <Select value={selectedDayOfWeek ? String(selectedDayOfWeek) : ""} onValueChange={(v) => setSelectedDayOfWeek(Number(v))} required={frequency === 'daily'} disabled={loading}>
                                            <SelectTrigger><SelectValue placeholder="Selecione o dia" /></SelectTrigger>
                                            <SelectContent>
                                                {weekDays.map(day => <SelectItem key={day.value} value={String(day.value)}>{day.label}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label>Aplicar Para</Label>
                                <MultiSelectStudents allStudents={students} selected={selectedStudents} onSelectionChange={setSelectedStudents} disabled={loading} />
                                <p className="text-xs text-muted-foreground">Deixe em branco para aplicar a todos os alunos (Geral).</p>
                            </div>
                        </div>
                        <hr />
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold">Exercícios</h3>
                            {exercises.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhum exercício adicionado ainda.</p>}
                            {exercises.map((exercise, index) => (
                                <div key={exercise.tempId} className={`p-4 border rounded-md space-y-3 relative group ${draggedIndex === index ? 'opacity-50 bg-muted/50' : ''}`} draggable onDragStart={() => handleDragStart(index)} onDragOver={handleDragOver} onDrop={() => handleDrop(index)} onDragEnd={() => setDraggedIndex(null)}>
                                    <div className="absolute top-2 left-1 cursor-move text-muted-foreground opacity-30 hover:opacity-100 group-hover:opacity-100 transition-opacity pt-1" title="Arraste para reordenar"><GripVertical size={18} /></div>
                                    <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 h-7 w-7 text-destructive hover:bg-destructive/10 opacity-50 group-hover:opacity-100 transition-opacity" onClick={() => removeExercise(exercise.tempId)} disabled={loading} title="Remover exercício"><Trash2 className="h-4 w-4" /></Button>
                                    <div className="space-y-2 pl-6">
                                        <Label htmlFor={`exName-${exercise.tempId}`}>Exercício *</Label>
                                        <Input id={`exName-${exercise.tempId}`} value={exercise.exercise_name || ''} onChange={(e) => updateExercise(exercise.tempId, 'exercise_name', e.target.value)} required placeholder="Ex: Supino Reto com Barra" disabled={loading} />
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pl-6">
                                        <div className="space-y-2">
                                            <Label htmlFor={`exSets-${exercise.tempId}`}>Séries</Label>
                                            <Input id={`exSets-${exercise.tempId}`} value={exercise.sets || ""} onChange={(e) => updateExercise(exercise.tempId, 'sets', e.target.value)} placeholder="Ex: 3" disabled={loading} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor={`exReps-${exercise.tempId}`}>Repetições</Label>
                                            <Input id={`exReps-${exercise.tempId}`} value={exercise.reps || ""} onChange={(e) => updateExercise(exercise.tempId, 'reps', e.target.value)} placeholder="Ex: 10-12" disabled={loading} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor={`exRest-${exercise.tempId}`}>Descanso</Label>
                                            <Input id={`exRest-${exercise.tempId}`} value={exercise.rest_period || ""} onChange={(e) => updateExercise(exercise.tempId, 'rest_period', e.target.value)} placeholder="Ex: 60s" disabled={loading} />
                                        </div>
                                    </div>
                                    <div className="space-y-2 pl-6">
                                        <Label htmlFor={`exObs-${exercise.tempId}`}>Observações</Label>
                                        <Input id={`exObs-${exercise.tempId}`} value={exercise.observations || ""} onChange={(e) => updateExercise(exercise.tempId, 'observations', e.target.value)} placeholder="Ex: Cadência 2-0-2" disabled={loading} />
                                    </div>
                                    {/* --- INÍCIO: NOVO CAMPO DE VÍDEO --- */}
                                    <div className="space-y-2 pl-6">
                                        <Label htmlFor={`exVideo-${exercise.tempId}`}>Link do Vídeo (Opcional)</Label>
                                        <div className="flex items-center gap-2">
                                            <Link className="h-10 w-10 p-2 text-muted-foreground shrink-0" />
                                            <Input
                                                id={`exVideo-${exercise.tempId}`}
                                                value={exercise.video_url || ""}
                                                onChange={(e) => updateExercise(exercise.tempId, 'video_url', e.target.value)}
                                                placeholder="Ex: https://youtube.com/watch?v=..."
                                                disabled={loading}
                                                type="url"
                                            />
                                        </div>
                                    </div>
                                    {/* --- FIM: NOVO CAMPO DE VÍDEO --- */}
                                </div>
                            ))}
                            <Button type="button" variant="outline" onClick={addExercise} disabled={loading} className="w-full">
                                <PlusCircle className="h-4 w-4 mr-2" /> Adicionar Exercício
                            </Button>
                        </div>
                    </form>
                </ScrollArea>
                <DialogFooter className="p-6 pt-4 border-t">
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancelar</Button>
                    <Button type="submit" form="workout-form" disabled={loading}>
                        <Save className="h-4 w-4 mr-2" /> {loading ? "Salvando..." : (workoutData ? "Salvar Alterações" : "Salvar Treino")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};