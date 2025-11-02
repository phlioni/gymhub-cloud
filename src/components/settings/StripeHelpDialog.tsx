import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Banknote, Percent, Clock, PiggyBank, ArrowDown, Rocket } from "lucide-react";

interface StripeHelpDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export const StripeHelpDialog = ({ open, onOpenChange }: StripeHelpDialogProps) => {
    // Taxa da plataforma
    const PLATFORM_FEE_PERCENT = 0.05; // 5%
    const PLATFORM_FEE_DISPLAY = "5%";

    // Taxas do Stripe (custo do usuário)
    const PIX_FEE_PERCENT = 0.0119; // 1.19%
    const CARD_FEE_PERCENT = 0.0399; // 3.99%
    const CARD_FEE_FIXED = 0.39; // R$ 0,39
    const BOLETO_FEE_FIXED = 3.45; // R$ 3,45

    // Exemplos de cálculo
    const saleAmount = 100.00;

    // PIX
    const pixStripeFee = saleAmount * PIX_FEE_PERCENT;
    const pixPlatformFee = saleAmount * PLATFORM_FEE_PERCENT;
    const pixNet = saleAmount - pixStripeFee - pixPlatformFee;

    // Cartão
    const cardStripeFee = (saleAmount * CARD_FEE_PERCENT) + CARD_FEE_FIXED;
    const cardPlatformFee = saleAmount * PLATFORM_FEE_PERCENT;
    const cardNet = saleAmount - cardStripeFee - cardPlatformFee;

    // Boleto
    const boletoStripeFee = BOLETO_FEE_FIXED;
    const boletoPlatformFee = saleAmount * PLATFORM_FEE_PERCENT;
    const boletoNet = saleAmount - boletoStripeFee - boletoPlatformFee;


    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Entendendo a Integração Financeira (Stripe)</DialogTitle>
                    <DialogDescription>
                        Veja como funciona para você receber pagamentos e os detalhes sobre taxas e prazos.
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="flex-1 overflow-y-auto pr-4 pl-2">
                    <div className="space-y-6 py-4">

                        {/* 1. Por que Conectar? */}
                        <div className="space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
                            <h3 className="font-semibold flex items-center gap-2 text-base text-primary"><Rocket className="h-5 w-5" />Por que conectar sua conta Stripe?</h3>
                            <p className="text-sm text-muted-foreground">
                                Ao conectar sua conta gratuita do Stripe, você automatiza todo o seu processo financeiro. O TreineAI poderá:
                            </p>
                            <ul className="list-disc list-inside space-y-2 pl-4 text-sm">
                                <li>Gerar links de pagamento para <Badge variant="default">PIX</Badge>, <Badge variant="default">Cartão de Crédito</Badge> e <Badge variant="default">Boleto</Badge>.</li>
                                <li>Enviar links de pagamento para seus alunos via WhatsApp, junto com os lembretes de renovação.</li>
                                <li>Receber o dinheiro das vendas de produtos e serviços diretamente na sua conta bancária.</li>
                                <li>Automatizar a baixa de pagamentos e a renovação de matrículas (em breve).</li>
                            </ul>
                        </div>

                        {/* 2. Prazos de Recebimento (Payout) - ATUALIZADO */}
                        <div className="space-y-2">
                            <h3 className="font-semibold flex items-center gap-2"><Clock className="h-5 w-5 text-green-600" />Prazos de Recebimento (Payout)</h3>
                            <p className="text-sm text-muted-foreground">
                                O tempo para o dinheiro ficar disponível na sua conta Stripe e ser transferido para seu banco.
                            </p>
                            <ul className="list-disc list-inside space-y-2 pl-4 text-sm">
                                <li><span className="font-semibold">Primeiro Pagamento:</span> Pode demorar de <Badge variant="secondary">7 a 14 dias úteis</Badge> para verificação de segurança do Stripe.</li>
                                <li><span className="font-semibold">Pagamentos (Cartão e PIX):</span> Após o primeiro, ficam disponíveis em <Badge variant="secondary">D+2 dias úteis</Badge>. (Ex: Venda na segunda, disponível na quarta).</li>
                                <li><span className="font-semibold">Boleto Bancário:</span> Disponível em <Badge variant="secondary">D+2 dias úteis</Badge> *após* a confirmação de pagamento do boleto (que leva ~1 dia útil).</li>
                            </ul>
                            <p className="text-xs text-muted-foreground pt-1">
                                <strong>Importante:</strong> Contas novas ou com atividades consideradas de maior risco pelo Stripe podem ter retenções temporárias. Os prazos são definidos pelo Stripe no Brasil.
                            </p>
                        </div>

                        {/* 3. Taxas */}
                        <div className="space-y-2">
                            <h3 className="font-semibold flex items-center gap-2"><Percent className="h-5 w-5 text-primary" />Como funcionam as taxas?</h3>
                            <p className="text-sm text-muted-foreground">
                                Existem duas taxas sobre cada transação bem-sucedida. O valor líquido (o que você recebe) é o total da venda menos estas duas taxas:
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2 rounded-lg border border-dashed p-3">
                                    <h4 className="font-semibold flex items-center gap-2 text-sm"><Banknote className="h-4 w-4 text-blue-600" />Taxa do Stripe (Seu custo)</h4>
                                    <p className="text-xs text-muted-foreground">Taxas do processador de pagamento (Stripe) para cada transação. (Valores padrão no Brasil, podem variar):</p>
                                    <ul className="list-disc list-inside space-y-1 pl-4 text-xs">
                                        <li><span className="font-semibold">PIX:</span> <Badge variant="outline">1.19%</Badge></li>
                                        <li><span className="font-semibold">Cartão (à vista):</span> <Badge variant="outline">3.99% + R$ 0,39</Badge></li>
                                        <li><span className="font-semibold">Boleto Pago:</span> <Badge variant="outline">R$ 3,45</Badge></li>
                                    </ul>
                                </div>
                                <div className="space-y-2 rounded-lg border border-dashed p-3">
                                    <h4 className="font-semibold flex items-center gap-2 text-sm"><ArrowDown className="h-4 w-4 text-primary" />Taxa da Plataforma (Spread)</h4>
                                    <p className="text-xs text-muted-foreground">Para cobrir custos de automação (WhatsApp) e infraestrutura, o TreineAI retém uma taxa de <Badge variant="default">{PLATFORM_FEE_DISPLAY}</Badge> sobre o valor total da venda.</p>
                                </div>
                            </div>
                        </div>

                        {/* 4. Exemplos */}
                        <div className="space-y-2">
                            <h3 className="font-semibold flex items-center gap-2"><PiggyBank className="h-5 w-5 text-primary/80" />Exemplos: Venda de R$ 100,00</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* PIX */}
                                <div className="space-y-2 rounded-lg border p-3">
                                    <h4 className="font-semibold text-center text-sm">No PIX</h4>
                                    <div className="flex justify-between text-xs"><span>Venda Total:</span> <span className="font-semibold">R$ 100,00</span></div>
                                    <div className="flex justify-between text-xs text-destructive"><span>Taxa Stripe (1.19%):</span> <span className="font-semibold">- R$ {pixStripeFee.toFixed(2)}</span></div>
                                    <div className="flex justify-between text-xs text-destructive"><span>Taxa TreineAI (5%):</span> <span className="font-semibold">- R$ {pixPlatformFee.toFixed(2)}</span></div>
                                    <hr className="my-1 border-dashed" />
                                    <div className="flex justify-between text-green-700">
                                        <span className="font-semibold text-sm">Você Recebe:</span>
                                        <span className="font-bold text-base">R$ {pixNet.toFixed(2)}</span>
                                    </div>
                                </div>
                                {/* Cartão */}
                                <div className="space-y-2 rounded-lg border p-3">
                                    <h4 className="font-semibold text-center text-sm">No Cartão (à vista)</h4>
                                    <div className="flex justify-between text-xs"><span>Venda Total:</span> <span className="font-semibold">R$ 100,00</span></div>
                                    <div className="flex justify-between text-xs text-destructive"><span>Taxa Stripe (3.99% + R$0,39):</span> <span className="font-semibold">- R$ {cardStripeFee.toFixed(2)}</span></div>
                                    <div className="flex justify-between text-xs text-destructive"><span>Taxa TreineAI (5%):</span> <span className="font-semibold">- R$ {cardPlatformFee.toFixed(2)}</span></div>
                                    <hr className="my-1 border-dashed" />
                                    <div className="flex justify-between text-green-700">
                                        <span className="font-semibold text-sm">Você Recebe:</span>
                                        <span className="font-bold text-base">R$ {cardNet.toFixed(2)}</span>
                                    </div>
                                </div>
                                {/* Boleto */}
                                <div className="space-y-2 rounded-lg border p-3">
                                    <h4 className="font-semibold text-center text-sm">No Boleto</h4>
                                    <div className="flex justify-between text-xs"><span>Venda Total:</span> <span className="font-semibold">R$ 100,00</span></div>
                                    <div className="flex justify-between text-xs text-destructive"><span>Taxa Stripe (Fixa):</span> <span className="font-semibold">- R$ {boletoStripeFee.toFixed(2)}</span></div>
                                    <div className="flex justify-between text-xs text-destructive"><span>Taxa TreineAI (5%):</span> <span className="font-semibold">- R$ {boletoPlatformFee.toFixed(2)}</span></div>
                                    <hr className="my-1 border-dashed" />
                                    <div className="flex justify-between text-green-700">
                                        <span className="font-semibold text-sm">Você Recebe:</span>
                                        <span className="font-bold text-base">R$ {boletoNet.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </ScrollArea>
                <DialogFooter>
                    <Button type="button" onClick={() => onOpenChange(false)}>
                        Entendi
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};