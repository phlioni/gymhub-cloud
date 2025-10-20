import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, CheckCircle, Calendar as CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from "@/lib/utils";

interface CheckIn {
    id: string;
    checked_in_at: string;
    students: {
        name: string;
        phone_number: string | null;
        enrollments: {
            modalities: {
                name: string;
            } | null;
        }[];
    };
}

const CheckIns = () => {
    const [loading, setLoading] = useState(true);
    const [checkins, setCheckins] = useState<CheckIn[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

    useEffect(() => {
        if (selectedDate) {
            loadCheckins(selectedDate);
        }
    }, [selectedDate]);

    const loadCheckins = async (date: Date) => {
        setLoading(true);
        try {
            const startDate = startOfDay(date).toISOString();
            const endDate = endOfDay(date).toISOString();

            const { data, error } = await supabase
                .from('check_ins')
                .select(`
                    id,
                    checked_in_at,
                    students (
                        name,
                        phone_number,
                        enrollments (
                            modalities ( name )
                        )
                    )
                `)
                .gte('checked_in_at', startDate)
                .lte('checked_in_at', endDate)
                .order('checked_in_at', { ascending: false });

            if (error) throw error;
            setCheckins(data as CheckIn[] || []);
        } catch (error: any) {
            toast.error("Falha ao carregar os check-ins");
        } finally {
            setLoading(false);
        }
    };

    const filteredCheckins = useMemo(() => {
        if (!searchTerm) {
            return checkins;
        }
        return checkins.filter(checkin =>
            checkin.students.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [checkins, searchTerm]);

    const getModalityName = (student: CheckIn['students']) => {
        if (student.enrollments && student.enrollments.length > 0) {
            // Pega a primeira modalidade encontrada na matrícula do aluno
            const firstModality = student.enrollments.find(e => e.modalities)?.modalities;
            return firstModality?.name || 'Não especificada';
        }
        return 'Não matriculado';
    };

    const formatDate = (dateString: string) => format(parseISO(dateString), "dd/MM/yyyy", { locale: ptBR });
    const formatTime = (dateString: string) => format(parseISO(dateString), "HH:mm", { locale: ptBR });

    return (
        <main className="flex-1 p-4 md:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                            Histórico de Check-ins
                        </h1>
                        <p className="text-muted-foreground text-sm md:text-base">
                            Veja os check-ins realizados na sua academia.
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                        <div className="relative w-full md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por nome..."
                                className="pl-10 h-11"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                        "h-11 w-full justify-start text-left font-normal",
                                        !selectedDate && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {selectedDate ? format(selectedDate, "PPP", { locale: ptBR }) : <span>Selecione uma data</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={selectedDate}
                                    onSelect={setSelectedDate}
                                    initialFocus
                                    locale={ptBR}
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>

                {loading ? (
                    <Skeleton className="h-64 w-full" />
                ) : (
                    <>
                        {/* Tabela para Web */}
                        <div className="hidden md:block">
                            <Card>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Aluno</TableHead>
                                            <TableHead>Modalidade</TableHead>
                                            <TableHead>Data</TableHead>
                                            <TableHead>Horário</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredCheckins.length > 0 ? (
                                            filteredCheckins.map((checkin) => (
                                                <TableRow key={checkin.id}>
                                                    <TableCell className="font-medium">{checkin.students.name}</TableCell>
                                                    <TableCell>{getModalityName(checkin.students)}</TableCell>
                                                    <TableCell>{formatDate(checkin.checked_in_at)}</TableCell>
                                                    <TableCell>{formatTime(checkin.checked_in_at)}</TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={4} className="h-24 text-center">
                                                    Nenhum check-in encontrado para esta data.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </Card>
                        </div>

                        {/* Cards para Mobile */}
                        <div className="grid gap-4 md:hidden">
                            {filteredCheckins.length > 0 ? (
                                filteredCheckins.map((checkin) => (
                                    <Card key={checkin.id}>
                                        <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                                            <div className="p-3 bg-primary/10 rounded-full">
                                                <CheckCircle className="h-6 w-6 text-primary" />
                                            </div>
                                            <div>
                                                <CardTitle className="text-lg">{checkin.students.name}</CardTitle>
                                                <CardDescription>
                                                    {formatDate(checkin.checked_in_at)} às {formatTime(checkin.checked_in_at)}
                                                </CardDescription>
                                                <CardDescription>
                                                    Modalidade: {getModalityName(checkin.students)}
                                                </CardDescription>
                                            </div>
                                        </CardHeader>
                                    </Card>
                                ))
                            ) : (
                                <Card className="p-12 text-center">
                                    <p className="text-muted-foreground">Nenhum check-in encontrado para esta data.</p>
                                </Card>
                            )}
                        </div>
                    </>
                )}
            </div>
        </main>
    );
};

export default CheckIns;