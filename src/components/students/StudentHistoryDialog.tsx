import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { Camera, Utensils, Dumbbell, Trophy, Weight, TrendingUp, TrendingDown } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile"; // Hook para detectar se é mobile

interface StudentHistoryDialogProps {
    studentId: string | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const EventIcon = ({ type }: { type: string }) => {
    switch (type) {
        case 'photo_food': return <Utensils className="h-5 w-5 text-orange-500" />;
        case 'photo_progress': return <Camera className="h-5 w-5 text-blue-500" />;
        case 'plan_approved': return <Dumbbell className="h-5 w-5 text-green-500" />;
        case 'goal_set': return <Trophy className="h-5 w-5 text-yellow-500" />;
        case 'weight_log': return <Weight className="h-5 w-5 text-purple-500" />;
        default: return null;
    }
};

const WeightEvolutionList = ({ data }: { data: { date: string; peso: number }[] }) => {
    if (data.length === 0) {
        return <div className="flex items-center justify-center h-full"><p className="text-sm text-muted-foreground">Nenhum registro de peso.</p></div>;
    }
    return (
        <ScrollArea className="h-full">
            <div className="space-y-4 pr-4">
                {data.map((entry, index) => {
                    const previousEntry = index > 0 ? data[index - 1] : null;
                    const change = previousEntry ? entry.peso - previousEntry.peso : 0;
                    return (
                        <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                            <div className="flex items-center gap-3">
                                <Weight className="h-5 w-5 text-purple-500" />
                                <div>
                                    <p className="font-bold">{entry.peso.toFixed(1)} kg</p>
                                    <p className="text-xs text-muted-foreground">{entry.date}</p>
                                </div>
                            </div>
                            {change !== 0 && (
                                <div className={`flex items-center text-xs font-semibold ${change > 0 ? 'text-red-500' : 'text-green-500'}`}>
                                    {change > 0 ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
                                    {change.toFixed(1)} kg
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </ScrollArea>
    );
};

export const StudentHistoryDialog = ({ studentId, open, onOpenChange }: StudentHistoryDialogProps) => {
    const [loading, setLoading] = useState(true);
    const [history, setHistory] = useState<any[]>([]);
    const [studentName, setStudentName] = useState("");
    const [weightData, setWeightData] = useState<any[]>([]);
    const isMobile = useIsMobile();

    useEffect(() => {
        const loadHistory = async () => {
            if (!studentId) return;
            setLoading(true);
            try {
                const { data: studentData, error: studentError } = await supabase.from('students').select('name').eq('id', studentId).single();
                if (studentError) throw studentError;
                setStudentName(studentData.name);

                const { data, error } = await supabase.from('student_history').select('*').eq('student_id', studentId).order('created_at', { ascending: false });
                if (error) throw error;
                setHistory(data || []);

                const weights = data
                    .filter(item => item.event_type === 'weight_log' && item.metadata?.weight)
                    .map(item => ({
                        date: format(new Date(item.created_at), 'dd/MM/yy'),
                        peso: parseFloat(item.metadata.weight)
                    }))
                    .reverse();
                setWeightData(weights);

            } catch (error: any) {
                toast.error("Falha ao carregar histórico do aluno: " + error.message);
            } finally {
                setLoading(false);
            }
        };

        if (open) {
            loadHistory();
        }
    }, [open, studentId]);

    const getPublicUrl = (path: string) => {
        const { data } = supabase.storage.from('student_uploads').getPublicUrl(path);
        return data.publicUrl;
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Histórico e Evolução de {studentName}</DialogTitle>
                    <DialogDescription>Acompanhe o progresso e todas as interações do aluno.</DialogDescription>
                </DialogHeader>
                <div className="flex flex-col md:flex-row gap-6 py-4 flex-1 min-h-0">
                    <div className="flex flex-col gap-4 md:w-1/2 h-[40vh] md:h-auto">
                        <h3 className="font-semibold">Linha do Tempo</h3>
                        <ScrollArea className="flex-1 pr-4 -mr-4">
                            {loading && <Skeleton className="h-full w-full" />}
                            {!loading && history.length === 0 && <p className="text-sm text-muted-foreground text-center py-10">Nenhum evento no histórico.</p>}
                            <div className="space-y-6">
                                {history.map(item => (
                                    <div key={item.id} className="flex items-start gap-4">
                                        <div className="flex flex-col items-center">
                                            <span className="p-2 bg-muted rounded-full"><EventIcon type={item.event_type} /></span>
                                            <span className="text-xs text-muted-foreground mt-1">{format(new Date(item.created_at), 'dd/MM')}</span>
                                        </div>
                                        <div className="flex-1 pt-1">
                                            <p className="font-medium text-sm">{item.notes}</p>
                                            {item.event_type.startsWith('photo') && item.metadata?.url && (
                                                <a href={getPublicUrl(item.metadata.url)} target="_blank" rel="noopener noreferrer">
                                                    <img src={getPublicUrl(item.metadata.url)} alt="Upload do aluno" className="mt-2 rounded-lg border max-h-48 cursor-pointer" />
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>
                    <div className="flex flex-col gap-4 md:w-1/2 h-[40vh] md:h-auto">
                        <h3 className="font-semibold">Evolução de Peso</h3>
                        <div className="flex-1 rounded-lg border p-4 flex flex-col">
                            {loading && <Skeleton className="h-full w-full" />}
                            {!loading && isMobile && <WeightEvolutionList data={weightData} />}
                            {!loading && !isMobile && (
                                weightData.length < 2 ? (
                                    <div className="flex items-center justify-center h-full"><p className="text-sm text-muted-foreground">Dados insuficientes para gerar o gráfico.</p></div>
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={weightData}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="date" fontSize={12} />
                                            <YAxis domain={['dataMin - 2', 'dataMax + 2']} fontSize={12} tickFormatter={(value) => `${value}kg`} />
                                            <Tooltip formatter={(value: number) => [`${value.toFixed(1)} kg`, "Peso"]} />
                                            <Line type="monotone" dataKey="peso" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                )
                            )}
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};