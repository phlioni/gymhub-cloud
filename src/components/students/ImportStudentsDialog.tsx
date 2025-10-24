import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Download, Upload, FileCheck2, AlertCircle, Loader } from "lucide-react";
import * as XLSX from 'xlsx';

interface ImportStudentsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    organizationId: string | null;
    onSuccess: () => void;
}

type StudentData = {
    nome: string;
    cpf?: string;
    data_nascimento?: string;
    telefone?: string;
    token_gympass?: string;
    token_totalpass?: string;
};

const formatPhoneNumber = (phone: string | null | undefined): string | null => {
    if (!phone) return null;
    let cleanedNumber = String(phone).trim().replace(/[^\d+]/g, '');
    if (!cleanedNumber) return null;
    if (cleanedNumber.startsWith('+')) return cleanedNumber;
    const digitsOnly = cleanedNumber.replace(/\D/g, '');
    if (!digitsOnly) return null;
    return `+55${digitsOnly}`;
};


export const ImportStudentsDialog = ({ open, onOpenChange, organizationId, onSuccess }: ImportStudentsDialogProps) => {
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [statusMessage, setStatusMessage] = useState("Aguardando arquivo...");
    const [errorMessages, setErrorMessages] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const resetState = () => {
        setFile(null);
        setIsProcessing(false);
        setProgress(0);
        setStatusMessage("Aguardando arquivo...");
        setErrorMessages([]);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0];
        if (selectedFile) {
            if (selectedFile.type !== 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
                toast.error("Formato de arquivo inválido. Por favor, envie um arquivo .xlsx");
                return;
            }
            setFile(selectedFile);
            setStatusMessage(`Arquivo selecionado: ${selectedFile.name}`);
            setErrorMessages([]);
        }
    };

    const handleDownloadTemplate = () => {
        const worksheet = XLSX.utils.json_to_sheet([
            { nome: "Ex: João Silva", cpf: "123.456.789-00", data_nascimento: "1990-01-30", telefone: "+5511999998888", token_gympass: "GYM123", token_totalpass: "TOTAL456" },
        ]);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Alunos");
        XLSX.writeFile(workbook, "modelo_importacao_alunos.xlsx");
    };

    const handleImport = async () => {
        if (!file || !organizationId) {
            toast.warning("Por favor, selecione um arquivo para importar.");
            return;
        }

        setIsProcessing(true);
        setErrorMessages([]);
        setProgress(10);
        setStatusMessage("Lendo o arquivo...");

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json: StudentData[] = XLSX.utils.sheet_to_json(worksheet);

                setProgress(30);
                setStatusMessage("Validando os dados...");

                const validationErrors: string[] = [];
                const validStudents = json.filter((student, index) => {
                    if (!student.nome || typeof student.nome !== 'string' || student.nome.trim() === '') {
                        validationErrors.push(`Linha ${index + 2}: O campo 'nome' é obrigatório.`);
                        return false;
                    }
                    return true;
                });

                if (validationErrors.length > 0) {
                    setErrorMessages(validationErrors);
                    throw new Error("Erros de validação encontrados na planilha.");
                }

                if (validStudents.length === 0) {
                    throw new Error("Nenhum aluno válido encontrado na planilha.");
                }

                setProgress(50);
                setStatusMessage(`Importando ${validStudents.length} alunos...`);

                const studentsToInsert = validStudents.map(s => ({
                    organization_id: organizationId,
                    name: s.nome.trim(),
                    cpf: s.cpf ? String(s.cpf).trim() : null,
                    birth_date: s.data_nascimento ? new Date(s.data_nascimento).toISOString().split('T')[0] : null,
                    phone_number: formatPhoneNumber(s.telefone),
                    gympass_user_token: s.token_gympass ? String(s.token_gympass).trim() : null,
                    totalpass_user_token: s.token_totalpass ? String(s.token_totalpass).trim() : null,
                }));

                const { error: insertError } = await supabase.from('students').insert(studentsToInsert);

                if (insertError) {
                    throw insertError;
                }

                setProgress(100);
                setStatusMessage("Importação concluída com sucesso!");
                toast.success(`${validStudents.length} alunos importados com sucesso!`);
                onSuccess();
                setTimeout(() => { onOpenChange(false); resetState(); }, 1500);

            } catch (error: any) {
                const errorMessage = error.message || "Ocorreu um erro desconhecido durante a importação.";
                setStatusMessage("Falha na importação.");
                setErrorMessages(prev => [...prev, `Erro: ${errorMessage}`]);
                toast.error("Falha na importação. Verifique os erros abaixo.");
                setIsProcessing(false);
                setProgress(0);
            }
        };
        reader.readAsArrayBuffer(file);
    };


    return (
        <Dialog open={open} onOpenChange={(isOpen) => { onOpenChange(isOpen); if (!isOpen) resetState(); }}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Importar Alunos em Massa</DialogTitle>
                    <DialogDescription>
                        Faça o upload de uma planilha (.xlsx) para cadastrar múltiplos alunos de uma só vez.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-4">
                    {/* Passo 1: Download */}
                    <div className="space-y-2">
                        <Label>1. Baixe o Modelo</Label>
                        <p className="text-sm text-muted-foreground">
                            Use nossa planilha modelo para garantir que os dados estejam no formato correto. O campo 'nome' é obrigatório.
                        </p>
                        <Button variant="outline" onClick={handleDownloadTemplate} disabled={isProcessing}>
                            <Download className="mr-2 h-4 w-4" />
                            Baixar Modelo
                        </Button>
                    </div>

                    {/* Passo 2: Upload */}
                    <div className="space-y-2">
                        <Label htmlFor="file-upload">2. Envie o Arquivo Preenchido</Label>
                        <Input
                            id="file-upload"
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept=".xlsx"
                            disabled={isProcessing}
                        />
                    </div>

                    {/* Progresso e Status */}
                    {isProcessing && (
                        <div className="space-y-2 pt-4">
                            <Label>Progresso da Importação</Label>
                            <Progress value={progress} className="w-full" />
                            <div className="flex items-center text-sm text-muted-foreground">
                                {progress < 100 && !errorMessages.length && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                                {progress === 100 && <FileCheck2 className="mr-2 h-4 w-4 text-green-500" />}
                                {errorMessages.length > 0 && <AlertCircle className="mr-2 h-4 w-4 text-destructive" />}
                                <span>{statusMessage}</span>
                            </div>
                        </div>
                    )}

                    {/* Erros */}
                    {errorMessages.length > 0 && (
                        <div className="mt-4 space-y-2 rounded-md border border-destructive/50 bg-destructive/10 p-4">
                            <h4 className="font-semibold text-destructive">Erros Encontrados:</h4>
                            <ul className="list-disc list-inside text-sm text-destructive">
                                {errorMessages.map((msg, i) => (
                                    <li key={i}>{msg}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => { onOpenChange(false); resetState(); }} disabled={isProcessing}>
                        Fechar
                    </Button>
                    <Button onClick={handleImport} disabled={!file || isProcessing}>
                        <Upload className="mr-2 h-4 w-4" />
                        {isProcessing ? "Processando..." : "Importar Alunos"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};