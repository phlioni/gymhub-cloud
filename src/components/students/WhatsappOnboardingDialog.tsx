import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Copy, MessageCircle } from "lucide-react";

interface WhatsappOnboardingDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    studentName: string | null;
    organizationPhoneNumber: string | null;
}

export const WhatsappOnboardingDialog = ({ open, onOpenChange, studentName, organizationPhoneNumber }: WhatsappOnboardingDialogProps) => {
    if (!studentName || !organizationPhoneNumber) return null;

    const message = encodeURIComponent("Olá");
    const whatsappLink = `https://wa.me/${organizationPhoneNumber.replace(/\D/g, '')}?text=${message}`;

    const handleCopy = () => {
        navigator.clipboard.writeText(whatsappLink);
        toast.success("Link copiado para a área de transferência!");
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Conecte-se com {studentName} no WhatsApp</DialogTitle>
                    <DialogDescription>
                        Envie este link para o aluno para que ele possa iniciar a conversa com o bot de atendimento e receber lembretes.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="whatsapp-link">Link de Iniciação</Label>
                        <div className="flex gap-2">
                            <Input id="whatsapp-link" value={whatsappLink} readOnly />
                            <Button size="icon" onClick={handleCopy}>
                                <Copy className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        O aluno precisa enviar a primeira mensagem ("Olá") para ativar o recebimento de notificações e acesso aos serviços do bot.
                    </p>
                </div>
                <div className="flex justify-end gap-2">
                    <Button asChild>
                        <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
                            <MessageCircle className="mr-2 h-4 w-4" />
                            Abrir no WhatsApp
                        </a>
                    </Button>
                    <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
                        Fechar
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};