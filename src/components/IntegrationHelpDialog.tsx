import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

interface IntegrationHelpDialogProps {
    platform: "Gympass" | "TotalPass";
    open: boolean;
    onOpenChange: (open: boolean) => void;
    webhookUrl: string; // Passar a URL do webhook para exibir no modal
}

export const IntegrationHelpDialog = ({ platform, open, onOpenChange, webhookUrl }: IntegrationHelpDialogProps) => {

    const handleCopyWebhook = () => {
        navigator.clipboard.writeText(webhookUrl);
        toast.success("URL do Webhook copiada!");
    };

    const gympassSteps = [
        "Acesse o portal de parceiros Gympass/Wellhub.",
        "Navegue até a seção de 'Integrações' ou 'Configurações de API/Webhook'.",
        "Procure pela opção de registrar um novo 'Webhook' ou 'Endpoint de Notificação'.",
        "Cole a URL do Webhook do TreineAI no campo apropriado:",
        // Input para webhookUrl será inserido aqui dinamicamente
        "No mesmo local, gere ou copie a 'Chave Secreta' (Secret Key) para validação da assinatura.",
        "Copie também o 'ID da Academia' (Gym ID) numérico da sua unidade.",
        "Volte para o TreineAI (Configurações > Integrações), cole a 'Chave Secreta' e o 'ID da Academia' nos campos correspondentes e clique em 'Salvar Integrações'.",
        "No portal Gympass/Wellhub, selecione os eventos que deseja receber (no mínimo 'check-in' e/ou 'check-in-booking-occurred') e salve/ative o webhook.",
    ];

    const totalpassSteps = [
        "Acesse o portal de academias TotalPass com sua conta de proprietário.",
        "No menu, vá para 'Integrações' e depois 'Integrações Novas' (ou similar).",
        "Clique em 'Gerenciar Integrações' ou 'Configurar Integrações'.",
        "Selecione a unidade que deseja integrar.",
        "Na lista de sistemas/parceiros, procure e selecione 'TreineAI' (ou o nome que registramos). Se não encontrar, pode ser necessário contatar o suporte TotalPass para adicionar o TreineAI como opção de ERP.",
        "Ative a integração (geralmente um botão 'On' ou 'Habilitar').",
        "Salve as alterações.",
        "Volte à tela de 'Integrações Novas'. Anote o 'Código para Integração' (alfanumérico) da sua unidade.",
        "Clique no botão 'API Key' ou similar para gerar/visualizar sua chave de API.",
        "**Importante:** Copie a 'API Key'. Ela pode ser usada tanto para validação do Webhook (como 'Chave Secreta') quanto para outras chamadas API, dependendo da implementação do TotalPass. Verifique a documentação específica deles para Webhooks.",
        "Volte para o TreineAI (Configurações > Integrações), cole a 'Chave Secreta' (API Key) e o 'Código de Integração' nos campos correspondentes e clique em 'Salvar Integrações'.",
        "No portal TotalPass, configure o endpoint do Webhook (se houver uma seção específica para isso) usando a URL do Webhook do TreineAI:",
        // Input para webhookUrl será inserido aqui dinamicamente
        "Certifique-se de que os eventos de 'Check-in' estejam habilitados para envio ao webhook.",
    ];

    const steps = platform === "Gympass" ? gympassSteps : totalpassSteps;
    const platformName = platform === "Gympass" ? "Gympass (Wellhub)" : "TotalPass";
    const platformUrl = platform === "Gympass" ? "https://partners.wellhub.com/" : "https://totalpass.com/br/academias-estudios/"; // Exemplo, usar URL correta

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Configurar Integração com {platformName}</DialogTitle>
                    <DialogDescription>
                        Siga os passos abaixo para conectar o TreineAI com sua conta {platformName}.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto pr-2 space-y-4 py-4">
                    <ol className="list-decimal list-inside space-y-3 text-sm">
                        {steps.map((step, index) => {
                            // Verifica se o passo atual deve incluir o input da webhook URL
                            const isWebhookStep = step.includes("URL do Webhook");
                            return (
                                <li key={index}>
                                    {isWebhookStep ? step.split(':')[0] + ':' : step}
                                    {isWebhookStep && (
                                        <div className="flex gap-2 mt-1.5 mb-1.5 pl-4">
                                            <Input id={`webhook-url-${platform}`} value={webhookUrl} readOnly className="h-8 text-xs font-mono bg-muted" />
                                            <Button size="icon" onClick={handleCopyWebhook} variant="outline" className="h-8 w-8 shrink-0">
                                                <Copy className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    )}
                                </li>
                            );
                        })}
                    </ol>
                    <p className="text-xs text-muted-foreground pt-2 border-t">
                        Precisa de ajuda? Acesse o portal de parceiros{" "}
                        <a href={platformUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80">
                            {platformName} <ExternalLink className="inline h-3 w-3" />
                        </a>{" "}
                        ou contate o suporte deles.
                    </p>
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