import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ArrowLeft, Phone, Weight, LineChart, TrendingUp, TrendingDown, Camera, CheckCheck, Dumbbell, BarChart3, AlertCircle } from "lucide-react";
import { ResponsiveContainer, LineChart as RechartsLineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tables } from "@/integrations/supabase/types";

interface StudentDetailPageProps {
    studentId: string;
    onBack: () => void;
}

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

// Componente de Gráfico
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
const ImageGallery = ({ images }: { images: HistoryEvent[] }) => {
    const getPublicUrl = (path: string) => {
        const { data } = supabase.storage.from('student_uploads').getPublicUrl(path);
        return data.publicUrl;
    };

    if (images.length === 0) {
        return <div className="flex h-full min-h-[250px] items-center justify-center"><p className="text-sm text-muted-foreground">Nenhuma imagem enviada pelo aluno.</p></div>
    }

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {images.map(img => (
                <a key={img.id} href={getPublicUrl(img.metadata?.url)} target="_blank" rel="noopener noreferrer" className="group">
                    <Card className="overflow-hidden transition-all group-hover:shadow-lg">
                        <img
                            src={getPublicUrl(img.metadata?.url)}
                            alt={img.notes || 'Imagem do aluno'}
                            className="h-40 w-full object-cover transition-transform group-hover:scale-105"
                        />
                        <CardFooter className="p-2 text-xs text-muted-foreground">
                            {format(parseISO(img.created_at), "dd/MM/yy 'às' HH:mm")}
                        </CardFooter>
                    </Card>
                </a>
            ))}
        </div>
    );
};

// Componente de Estatísticas (Insights)
const StudentInsights = ({ workouts, checkins, weightData }: { workouts: WorkoutData[], checkins: CheckInData[], weightData: WeightEntry[] }) => {
    const totalCheckins = checkins.length;
    const firstCheckin = totalCheckins > 0 ? parseISO(checkins[checkins.length - 1].checked_in_at) : null;
    const weeksSinceFirstCheckin = firstCheckin ? Math.max(1, Math.ceil((new Date().getTime() - firstCheckin.getTime()) / (1000 * 60 * 60 * 24 * 7))) : 1;
    const avgCheckinsPerWeek = (totalCheckins / weeksSinceFirstCheckin).toFixed(1);

    const firstWeight = weightData.length > 0 ? weightData[0].peso : 0;
    const lastWeight = weightData.length > 0 ? weightData[weightData.length - 1].peso : 0;
    const weightChange = lastWeight - firstWeight;

    return (
        <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
            <Card>
                <CardHeader className="pb-2">
                    <CardDescription className="flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Frequência (Check-ins)</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-bold">{totalCheckins}</div>
                    <p className="text-xs text-muted-foreground">Total de treinos registrados</p>
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
                    <ul className="text-sm mt-2 space-y-1">
                        {workouts.slice(0, 3).map(w => (
                            <li key={w.id} className="truncate">· {w.name}</li>
                        ))}
                    </ul>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="pb-2">
                    <CardDescription className="flex items-center gap-2"><Weight className="h-4 w-4" /> Evolução de Peso</CardDescription>
                </CardHeader>
                <CardContent>
                    {weightData.length > 0 ? (
                        <>
                            <div className={`text-3xl font-bold flex items-center gap-1 ${weightChange > 0 ? 'text-red-500' : 'text-green-600'}`}>
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

export const StudentDetailPage = ({ studentId, onBack }: StudentDetailPageProps) => {
    const [loading, setLoading] = useState(true);
    const [student, setStudent] = useState<StudentData | null>(null);
    const [history, setHistory] = useState<HistoryEvent[]>([]);
    const [workouts, setWorkouts] = useState<WorkoutData[]>([]);
    const [checkins, setCheckins] = useState<CheckInData[]>([]);

    useEffect(() => {
        const loadStudentData = async () => {
            setLoading(true);
            try {
                const [studentRes, historyRes, workoutsRes, checkinsRes] = await Promise.all([
                    supabase.from('students').select('*').eq('id', studentId).single(),
                    supabase.from('student_history').select('*').eq('student_id', studentId).order('created_at', { ascending: false }),
                    supabase.rpc('get_student_workouts', { p_student_id: studentId }),
                    supabase.from('check_ins').select('checked_in_at, source').eq('student_id', studentId).order('checked_in_at', { ascending: false })
                ]);

                if (studentRes.error) throw studentRes.error;
                setStudent(studentRes.data);

                if (historyRes.error) throw historyRes.error;
                setHistory(historyRes.data || []);

                // @ts-ignore (RPCs podem não ser tipadas automaticamente)
                if (workoutsRes.error) throw workoutsRes.error;
                // @ts-ignore
                setWorkouts(workoutsRes.data || []);

                if (checkinsRes.error) throw checkinsRes.error;
                setCheckins(checkinsRes.data || []);

            } catch (error: any) {
                toast.error("Falha ao carregar dados do aluno.", { description: error.message });
            } finally {
                setLoading(false);
            }
        };

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
        history.filter(item => item.event_type.startsWith('photo_'))
        , [history]);

    return (
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

                {/* Conteúdo Principal */}
                {loading ? (
                    <div className="grid lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-6"><Skeleton className="h-64 w-full" /><Skeleton className="h-64 w-full" /></div>
                        <div className="lg:col-span-1 space-y-6"><Skeleton className="h-96 w-full" /></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                        {/* Coluna Esquerda (Gráficos e Infos) */}
                        <div className="lg:col-span-1 space-y-6 lg:sticky lg:top-8">
                            <StudentInsights workouts={workouts} checkins={checkins} weightData={weightData} />
                        </div>

                        {/* Coluna Direita (Histórico e Fotos) */}
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
                                                <div className="space-y-6">
                                                    {history.length > 0 ? history.map(item => (
                                                        <div key={item.id} className="flex items-start gap-3">
                                                            <span className="p-2 bg-muted rounded-full mt-1">
                                                                {item.event_type.startsWith('photo') ? <Camera className="h-4 w-4" /> :
                                                                    item.event_type === 'weight_log' ? <Weight className="h-4 w-4" /> :
                                                                        item.event_type === 'check_in' ? <CheckCheck className="h-4 w-4" /> :
                                                                            <AlertCircle className="h-4 w-4" />}
                                                            </span>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="font-medium text-sm break-words">{item.notes}</p>
                                                                <p className="text-xs text-muted-foreground">{format(parseISO(item.created_at), "dd/MM/yy 'às' HH:mm")}</p>
                                                            </div>
                                                        </div>
                                                    )) : <p className="text-sm text-muted-foreground text-center py-10">Nenhum evento no histórico.</p>}
                                                </div>
                                            </ScrollArea>
                                        </TabsContent>
                                        <TabsContent value="gallery" className="mt-4">
                                            <ScrollArea className="h-96 pr-4">
                                                <ImageGallery images={imageGallery} />
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
    );
};