import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
// <<< 1. IMPORTAR ÍCONE DE LIXEIRA E DIÁLOGO DE ALERTA >>>
import { ArrowLeft, Phone, Weight, LineChart, TrendingUp, TrendingDown, Camera, CheckCheck, Dumbbell, BarChart3, AlertCircle, Plus, Trash2, Loader2 } from "lucide-react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
// ---
import { ResponsiveContainer, LineChart as RechartsLineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tables } from "@/integrations/supabase/types";
import { useIsMobile } from "@/hooks/use-mobile";
import { AddEditWorkoutDialog } from "@/components/workouts/AddEditWorkoutDialog";

interface StudentDetailPageProps {
    studentId: string;
    organizationId: string;
    onBack: () => void;
    onRefreshStudents: () => void;
}

// Tipos de dados
type StudentData = Tables<'students'>;
type HistoryEvent = Tables<'student_history'>;
type WorkoutData = (Tables<'workouts'> & {
    workout_exercises: Tables<'workout_exercises'>[];
});
type CheckInData = Pick<Tables<'check_ins'>, 'checked_in_at' | 'source'>;
type WeightEntry = {
    date: string;
    peso: number;
};

type SignedUrlMap = Map<string, string>;

// Função para buscar URLs assinadas (movida para o topo)
const getSignedUrl = async (path: string | null | undefined): Promise<string | null> => {
    if (!path) return null;
    try {
        const { data: signedUrlData, error: urlError } = await supabase
            .storage
            .from('student_uploads')
            .createSignedUrl(path, 3600); // 1 hora de expiração

        if (urlError) throw urlError;
        return signedUrlData.signedUrl;
    } catch (error: any) {
        console.error(`Não foi possível obter a URL assinada para: ${path}`, error);
        return null;
    }
};

// --- Componentes Internos ---

// Gráfico de Peso
const WeightChart = ({ data }: { data: WeightEntry[] }) => {
    if (data.length < 2) {
        return <div className="flex h-full min-h-[250px] items-center justify-center"><p className="text-sm text-muted-foreground">Dados insuficientes para gerar o gráfico.</p></div>
    }
    return (
        <ResponsiveContainer width="100%" height={250}>
            <RechartsLineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" fontSize={10} />
                <YAxis domain={['dataMin - 2', 'dataMax + 2']} fontSize={10} tickFormatter={(val) => `${val}kg`} />
                <Tooltip formatter={(value: number) => [`${value.toFixed(1)} kg`, "Peso"]} />
                <Line type="monotone" dataKey="peso" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            </RechartsLineChart>
        </ResponsiveContainer>
    );
};

// Componente da Galeria de Imagens
const ImageGallery = ({ images, signedUrls, onDeleteClick }: { images: HistoryEvent[]; signedUrls: SignedUrlMap; onDeleteClick: (image: HistoryEvent) => void; }) => {
    if (images.length === 0) {
        return <div className="flex h-full min-h-[250px] items-center justify-center"><p className="text-sm text-muted-foreground">Nenhuma imagem enviada pelo aluno.</p></div>
    }

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {images.map(img => {
                const url = signedUrls.get(img.metadata?.url);
                if (!url) return null;
                return (
                    <div key={img.id} className="group relative">
                        <a href={url} target="_blank" rel="noopener noreferrer">
                            <Card className="overflow-hidden transition-all group-hover:shadow-lg">
                                <img
                                    src={url}
                                    alt={img.notes || 'Imagem do aluno'}
                                    className="h-40 w-full object-cover transition-transform group-hover:scale-105"
                                />
                                <CardFooter className="p-2 text-xs text-muted-foreground">
                                    {format(parseISO(img.created_at), "dd/MM/yy 'às' HH:mm")}
                                </CardFooter>
                            </Card>
                        </a>
                        {/* <<< 2. BOTÃO DE EXCLUIR NA GALERIA >>> */}
                        <Button
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDeleteClick(img); }}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                )
            })}
        </div>
    );
};

// Componente de Estatísticas (Insights)
const StudentInsights = ({ workouts, checkins, weightData, onCreateWorkout }: { workouts: WorkoutData[], checkins: CheckInData[], weightData: WeightEntry[], onCreateWorkout: () => void }) => {
    const totalCheckins = checkins.length;
    const firstCheckin = totalCheckins > 0 ? parseISO(checkins[checkins.length - 1].checked_in_at) : null;
    const weeksSinceFirstCheckin = firstCheckin ? Math.max(1, Math.ceil((new Date().getTime() - firstCheckin.getTime()) / (1000 * 60 * 60 * 24 * 7))) : 1;
    const avgCheckinsPerWeek = (totalCheckins / weeksSinceFirstCheckin).toFixed(1);
    const lastCheckinDate = totalCheckins > 0 ? parseISO(checkins[0].checked_in_at) : null;

    const firstWeight = weightData.length > 0 ? weightData[0].peso : 0;
    const lastWeight = weightData.length > 0 ? weightData[weightData.length - 1].peso : 0;
    const weightChange = lastWeight - firstWeight;

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
            <Card>
                <CardHeader className="pb-2">
                    <CardDescription className="flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Frequência (Check-ins)</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-bold">{totalCheckins}</div>
                    <p className="text-xs text-muted-foreground">Total de treinos registrados</p>
                    {lastCheckinDate && (
                        <p className="text-xs text-muted-foreground mt-1">
                            Último: {formatDistanceToNow(lastCheckinDate, { locale: ptBR, addSuffix: true })}
                        </p>
                    )}
                    <div className="text-lg font-bold mt-2">{avgCheckinsPerWeek}</div>
                    <p className="text-xs text-muted-foreground">Média de treinos/semana</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="pb-2">
                    <CardDescription className="flex items-center gap-2"><Dumbbell className="h-4 w-4" /> Treinos Ativos</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-bold">{workouts.length}</div>
                    <p className="text-xs text-muted-foreground">Planos de treino associados</p>
                    <Button size="sm" variant="outline" className="mt-4 w-full" onClick={onCreateWorkout}>
                        <Plus className="h-4 w-4 mr-1" /> Criar Novo Treino
                    </Button>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="pb-2">
                    <CardDescription className="flex items-center gap-2"><Weight className="h-4 w-4" /> Evolução de Peso</CardDescription>
                </CardHeader>
                <CardContent>
                    {weightData.length > 0 ? (
                        <>
                            <div className={`text-3xl font-bold flex items-center gap-1 ${weightChange === 0 ? '' : weightChange > 0 ? 'text-red-500' : 'text-green-600'}`}>
                                {weightChange > 0 ? <TrendingUp /> : <TrendingDown />}
                                {Math.abs(weightChange).toFixed(1)} kg
                            </div>
                            <p className="text-xs text-muted-foreground">Balanço total ({firstWeight.toFixed(1)}kg {'->'} {lastWeight.toFixed(1)}kg)</p>
                        </>
                    ) : (
                        <p className="text-sm text-muted-foreground">Sem registros de peso.</p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

// --- Componente Principal ---
export const StudentDetailPage = ({ studentId, organizationId, onBack, onRefreshStudents }: StudentDetailPageProps) => {
    const [loading, setLoading] = useState(true);
    const [student, setStudent] = useState<StudentData | null>(null);
    const [history, setHistory] = useState<HistoryEvent[]>([]);
    const [workouts, setWorkouts] = useState<WorkoutData[]>([]);
    const [checkins, setCheckins] = useState<CheckInData[]>([]);
    const [isWorkoutModalOpen, setWorkoutModalOpen] = useState(false);
    const [workoutToEdit, setWorkoutToEdit] = useState<any | null>(null);
    const isMobile = useIsMobile();
    const [signedImageUrls, setSignedImageUrls] = useState<SignedUrlMap>(new Map());

    // <<< 3. ESTADOS PARA O MODAL DE EXCLUSÃO >>>
    const [imageToDelete, setImageToDelete] = useState<HistoryEvent | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const loadStudentData = async () => {
        setLoading(true);
        try {
            const [studentRes, historyRes, workoutsRes, checkinsRes] = await Promise.all([
                supabase.from('students').select('*').eq('id', studentId).single(),
                supabase.from('student_history').select('*').eq('student_id', studentId).order('created_at', { ascending: false }),
                supabase
                    .from('workout_students')
                    .select(`
                        workouts (
                            *,
                            workout_exercises ( * )
                        )
                    `)
                    .eq('student_id', studentId),
                supabase.from('check_ins').select('checked_in_at, source').eq('student_id', studentId).order('checked_in_at', { ascending: false })
            ]);

            if (studentRes.error) throw studentRes.error;
            setStudent(studentRes.data);

            if (historyRes.error) throw historyRes.error;
            const historyData = historyRes.data || [];
            setHistory(historyData);

            if (workoutsRes.error) throw workoutsRes.error;
            // @ts-ignore
            const fetchedWorkouts = workoutsRes.data?.map(item => item.workouts).filter(Boolean) as WorkoutData[] || [];
            setWorkouts(fetchedWorkouts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));

            if (checkinsRes.error) throw checkinsRes.error;
            setCheckins(checkinsRes.data || []);

            // Gerar URLs assinadas para as imagens
            const imageEvents = historyData.filter(item => item.event_type.startsWith('photo_') && item.metadata?.url);
            const newSignedUrls = new Map<string, string>();
            for (const item of imageEvents) {
                const path = item.metadata.url;
                if (path) {
                    const url = await getSignedUrl(path); // Usa a nova função async
                    if (url) {
                        newSignedUrls.set(path, url);
                    }
                }
            }
            setSignedImageUrls(newSignedUrls);

        } catch (error: any) {
            toast.error("Falha ao carregar dados do aluno.", { description: error.message });
            onBack(); // Volta se não conseguir carregar
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (studentId) {
            loadStudentData();
        }
    }, [studentId]);

    // Processa dados para os gráficos e galerias
    const weightData = useMemo(() =>
        history
            .filter(item => item.event_type === 'weight_log' && item.metadata?.weight)
            .map(item => ({
                date: format(parseISO(item.created_at), 'dd/MM/yy'),
                peso: parseFloat(item.metadata.weight)
            }))
            .reverse() // Gráfico precisa da ordem cronológica
        , [history]);

    const imageGallery = useMemo(() =>
        history.filter(item => item.event_type.startsWith('photo_') && item.metadata?.url)
        , [history]);

    const handleCreateWorkout = () => {
        if (!student) return;
        setWorkoutToEdit({
            name: `Novo Treino - ${student.name}`,
            description: `Treino personalizado para ${student.name}.`,
            frequency: 'weekly',
            workout_exercises: [],
            workout_students: [{ students: { id: student.id, name: student.name } }],
        });
        setWorkoutModalOpen(true);
    };

    // <<< 4. FUNÇÃO PARA DELETAR A IMAGEM >>>
    const handleDeleteImage = async () => {
        if (!imageToDelete || !imageToDelete.metadata?.url) return;
        setIsDeleting(true);
        try {
            const path = imageToDelete.metadata.url;

            // 1. Deletar do Storage
            const { error: storageError } = await supabase.storage.from('student_uploads').remove([path]);
            if (storageError) throw storageError;

            // 2. Deletar do Banco de Dados
            const { error: dbError } = await supabase.from('student_history').delete().eq('id', imageToDelete.id);
            if (dbError) throw dbError;

            toast.success("Imagem excluída com sucesso!");
            setImageToDelete(null);

            // 3. Atualizar estado local para remover a imagem da UI
            setHistory(prev => prev.filter(h => h.id !== imageToDelete.id));
            setSignedImageUrls(prev => {
                const newMap = new Map(prev);
                newMap.delete(path);
                return newMap;
            });

        } catch (error: any) {
            toast.error("Falha ao excluir imagem.", { description: error.message });
        } finally {
            setIsDeleting(false);
        }
    };

    const timelineContent = (
        loading ? <Skeleton className="h-full w-full min-h-[200px]" /> :
            history.length === 0 ? <p className="text-sm text-muted-foreground text-center py-10">Nenhum evento no histórico.</p> :
                <div className="space-y-6">
                    {history.map(item => {
                        const imageUrl = item.event_type.startsWith('photo_') ? signedImageUrls.get(item.metadata?.url) : null;

                        return (
                            <div key={item.id} className="flex items-start gap-3">
                                <span className="p-2 bg-muted rounded-full mt-1 shrink-0">
                                    {item.event_type.startsWith('photo') ? <Camera className="h-4 w-4 text-blue-500" /> :
                                        item.event_type === 'weight_log' ? <Weight className="h-4 w-4 text-purple-500" /> :
                                            item.event_type === 'check_in' ? <CheckCheck className="h-4 w-4 text-green-500" /> :
                                                <AlertCircle className="h-4 w-4" />}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm break-words">{item.notes}</p>

                                    {imageUrl && (
                                        // <<< 5. ADICIONADO 'relative group' E BOTÃO DE EXCLUIR >>>
                                        <div className="relative group mt-2">
                                            <a href={imageUrl} target="_blank" rel="noopener noreferrer" className="block">
                                                <img
                                                    src={imageUrl}
                                                    alt={item.notes || 'Imagem do aluno'}
                                                    className="rounded-lg border max-h-48 cursor-pointer transition-all hover:shadow-md"
                                                />
                                            </a>
                                            <Button
                                                variant="destructive"
                                                size="icon"
                                                className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={() => setImageToDelete(item)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    )}

                                    <p className="text-xs text-muted-foreground mt-1">{format(parseISO(item.created_at), "dd/MM/yy 'às' HH:mm")}</p>
                                </div>
                            </div>
                        )
                    })}
                </div>
    );

    const evolutionContent = (
        loading ? <Skeleton className="h-full w-full min-h-[250px]" /> :
            <div className="space-y-6">
                <StudentInsights workouts={workouts} checkins={checkins} weightData={weightData} onCreateWorkout={handleCreateWorkout} />
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><LineChart className="h-5 w-5" /> Evolução do Peso</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <WeightChart data={weightData} />
                    </CardContent>
                </Card>
            </div>
    );

    return (
        <>
            <main className="flex-1 p-4 md:p-8 animate-in fade-in-25">
                <div className="max-w-7xl mx-auto space-y-6">
                    {/* Cabeçalho */}
                    <div className="flex items-center gap-4">
                        <Button variant="outline" size="icon" onClick={onBack} className="h-11 w-11">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        {loading ? (
                            <Skeleton className="h-12 w-64" />
                        ) : (
                            <div>
                                <h1 className="text-2xl md:text-3xl font-bold">{student?.name}</h1>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Phone className="h-4 w-4" />
                                    {student?.phone_number || "Sem telefone"}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Conteúdo (Mobile vs Desktop) */}
                    {isMobile ? (
                        <Tabs defaultValue="timeline">
                            <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="timeline">Linha do Tempo</TabsTrigger>
                                <TabsTrigger value="evolution">Evolução</TabsTrigger>
                                <TabsTrigger value="gallery">Fotos ({imageGallery.length})</TabsTrigger>
                            </TabsList>
                            <TabsContent value="timeline" className="mt-4">
                                <ScrollArea className="h-[calc(100vh-200px)] pr-2">
                                    {timelineContent}
                                </ScrollArea>
                            </TabsContent>
                            <TabsContent value="evolution" className="mt-4">
                                <ScrollArea className="h-[calc(100vh-200px)] pr-2">
                                    {evolutionContent}
                                </ScrollArea>
                            </TabsContent>
                            <TabsContent value="gallery" className="mt-4">
                                <ScrollArea className="h-[calc(100vh-200px)] pr-2">
                                    <ImageGallery images={imageGallery} signedUrls={signedImageUrls} onDeleteClick={setImageToDelete} />
                                </ScrollArea>
                            </TabsContent>
                        </Tabs>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                            {/* Coluna Esquerda (Insights) */}
                            <div className="lg:col-span-1 space-y-6 lg:sticky lg:top-8">
                                {loading ? (
                                    <Skeleton className="h-96 w-full" />
                                ) : (
                                    <StudentInsights workouts={workouts} checkins={checkins} weightData={weightData} onCreateWorkout={handleCreateWorkout} />
                                )}
                            </div>

                            {/* Coluna Direita (Gráficos e Infos) */}
                            <div className="lg:col-span-2 space-y-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2"><LineChart className="h-5 w-5" /> Evolução do Peso</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <WeightChart data={weightData} />
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle>Histórico e Mídia</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <Tabs defaultValue="history">
                                            <TabsList className="grid w-full grid-cols-2">
                                                <TabsTrigger value="history">Linha do Tempo</TabsTrigger>
                                                <TabsTrigger value="gallery">Galeria de Fotos ({imageGallery.length})</TabsTrigger>
                                            </TabsList>
                                            <TabsContent value="history" className="mt-4">
                                                <ScrollArea className="h-96 pr-4">
                                                    {timelineContent}
                                                </ScrollArea>
                                            </TabsContent>
                                            <TabsContent value="gallery" className="mt-4">
                                                <ScrollArea className="h-96 pr-4">
                                                    <ImageGallery images={imageGallery} signedUrls={signedImageUrls} onDeleteClick={setImageToDelete} />
                                                </ScrollArea>
                                            </TabsContent>
                                        </Tabs>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* Modal de Criar/Editar Treino */}
            {isWorkoutModalOpen && organizationId && (
                <AddEditWorkoutDialog
                    open={isWorkoutModalOpen}
                    onOpenChange={setWorkoutModalOpen}
                    workoutData={workoutToEdit} // Passa os dados pré-preenchidos
                    organizationId={organizationId}
                    onSuccess={() => {
                        loadStudentData(); // Recarrega os dados do aluno (incluindo treinos)
                        onRefreshStudents(); // Recarrega a lista principal de alunos (para contagens)
                        setWorkoutModalOpen(false);
                        setWorkoutToEdit(null);
                    }}
                />
            )}

            {/* <<< 6. DIÁLOGO DE CONFIRMAÇÃO DE EXCLUSÃO >>> */}
            <AlertDialog open={!!imageToDelete} onOpenChange={(open) => !open && setImageToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem certeza que deseja excluir esta imagem? Esta ação não pode ser desfeita. O arquivo será removido permanentemente.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteImage} disabled={isDeleting} variant="destructive">
                            {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                            {isDeleting ? "Excluindo..." : "Excluir"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};