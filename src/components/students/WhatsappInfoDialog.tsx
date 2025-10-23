import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Copy, ListChecks, Calendar, CheckCheck, Bell } from "lucide-react";

interface WhatsappInfoDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const WHATSAPP_LINK = "https://wa.me/15558825828"; // Link único e fixo

export const WhatsappInfoDialog = ({ open, onOpenChange }: WhatsappInfoDialogProps) => {

    const handleCopy = () => {
        navigator.clipboard.writeText(WHATSAPP_LINK);
        toast.success("Link copiado para a área de transferência!");
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Como Funciona o Atendimento via WhatsApp</DialogTitle>
                    <DialogDescription>
                        Envie o link abaixo para seus alunos. Ao iniciar a conversa, eles terão acesso a diversas funcionalidades e receberão lembretes automaticamente.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="whatsapp-link">Link de Contato para Alunos</Label>
                        <div className="flex gap-2">
                            <Input id="whatsapp-link" value={WHATSAPP_LINK} readOnly />
                            <Button size="icon" onClick={handleCopy} variant="outline">
                                <Copy className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    <div>
                        <h4 className="font-semibold mb-3">Funcionalidades para o Aluno:</h4>
                        <ul className="space-y-3 text-sm text-muted-foreground">
                            <li className="flex items-start gap-3">
                                <ListChecks className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                                <span>Consultar as modalidades oferecidas pela academia e seus respectivos preços.</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <Calendar className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                                <span>Visualizar seus próximos agendamentos.</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <CheckCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                                <span>Realizar o check-in de forma rápida antes do treino.</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <Bell className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                                <span>Receber lembretes automáticos sobre o vencimento da matrícula.</span>
                            </li>
                        </ul>
                    </div>
                </div>
                <DialogFooter>
                    <Button type="button" onClick={() => onOpenChange(false)}>
                        Fechar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};