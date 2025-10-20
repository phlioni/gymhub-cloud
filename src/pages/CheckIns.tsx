import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Search } from "lucide-react";

interface CheckIn {
    id: string;
    checked_in_at: string;
    students: {
        name: string;
    } | null;
}

const CheckIns = () => {
    const [loading, setLoading] = useState(true);
    const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));

    useEffect(() => {
        loadCheckIns();
    }, [selectedDate]);

    const loadCheckIns = async () => {
        setLoading(true);
        try {
            // CORREÇÃO: Lógica de data mais robusta para lidar com fusos horários
            const startDate = `${selectedDate}T00:00:00`;
            const endDate = `${selectedDate}T23:59:59`;

            const { data, error } = await supabase
                .from('check_ins')
                .select(`
                    id,
                    checked_in_at,
                    students ( name )
                `)
                .gte('checked_in_at', startDate)
                .lte('checked_in_at', endDate)
                .order('checked_in_at', { ascending: false });

            if (error) throw error;
            setCheckIns(data || []);
        } catch (error: any) {
            console.error("Falha ao carregar check-ins:", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredCheckIns = useMemo(() => {
        if (!searchTerm) return checkIns;
        return checkIns.filter(ci =>
            ci.students?.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [checkIns, searchTerm]);

    return (
        <main className="flex-1 p-4 md:p-8">
            <div className="max-w-4xl mx-auto space-y-8">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                    <div className="space-y-2">
                        <h1 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent tracking-tight">
                            Histórico de Check-ins
                        </h1>
                        <p className="text-sm md:text-base text-muted-foreground">
                            Visualize quem treinou em um dia específico.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="relative w-full md:w-auto">
                            <Input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="h-11 bg-background/50"
                            />
                        </div>
                        <div className="relative w-full md:w-72">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por nome..."
                                className="pl-10 h-11 bg-background/50"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <Card>
                    <CardContent className="p-0">
                        {loading ? (
                            <div className="p-6 space-y-2">
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-10 w-full" />
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Aluno</TableHead>
                                        <TableHead className="text-right">Horário do Check-in</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredCheckIns.length > 0 ? (
                                        filteredCheckIns.map(ci => (
                                            <TableRow key={ci.id}>
                                                <TableCell className="font-medium">{ci.students?.name || "Aluno não identificado"}</TableCell>
                                                <TableCell className="text-right text-muted-foreground">
                                                    {format(new Date(ci.checked_in_at), 'HH:mm:ss', { locale: ptBR })}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={2} className="h-24 text-center">
                                                Nenhum check-in encontrado para esta data.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
        </main>
    );
};

export default CheckIns;