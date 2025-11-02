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
import { Banknote, Percent, Clock, PiggyBank, ArrowDown } from "lucide-react";

interface StripeHelpDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export const StripeHelpDialog = ({ open, onOpenChange }: StripeHelpDialogProps) => {
    const PLATFORM_FEE_PERCENT = 0.05; // 5%
    const PLATFORM_FEE_DISPLAY = "5%";

    // Valores baseados na sua documentação
    const PIX_FEE_PERCENT = 0.0119; // 1.19%
    const CARD_FEE_PERCENT = 0.0399; // 3.99%
    const CARD_FEE_FIXED = 0.39; // R$ 0,39
    const BOLETO_FEE_FIXED = 3.45; // R$ 3,45

    // Exemplo 1: PIX
    const pixSale = 100.00;
    const pixStripeFee = pixSale * PIX_FEE_PERCENT;
    const pixPlatformFee = pixSale * PLATFORM_FEE_PERCENT;
    const pixNet = pixSale - pixStripeFee - pixPlatformFee;

    // Exemplo 2: Cartão
    const cardSale = 100.00;
    const cardStripeFee = (cardSale * CARD_FEE_PERCENT) + CARD_FEE_FIXED;
    const cardPlatformFee = cardSale * PLATFORM_FEE_PERCENT;
    const cardNet = cardSale - cardStripeFee - cardPlatformFee;


    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Entendendo a Integração Financeira (Stripe)</DialogTitle>
                    <DialogDescription>
                        Veja como funcionam as taxas, comissões e prazos de recebimento.
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="flex-1 overflow-y-auto pr-4 pl-2">
                    <div className="space-y-6 py-4">

                        {/* 1. Spread da Plataforma */}
                        <div className="space-y-2">
                            <h3 className="font-semibold flex items-center gap-2"><Percent className="h-5 w-5 text-primary" />Taxa da Plataforma (Spread TreineAI)</h3>
                            <p className="text-sm text-muted-foreground">
                                Para cobrir os custos de manutenção, automação (WhatsApp) e a infraestrutura dos pagamentos, o TreineAI retém uma taxa de <Badge variant="default">{PLATFORM_FEE_DISPLAY}</Badge> sobre cada transação bem-sucedida.
                            </p>
                            <p className="text-sm text-muted-foreground">
                                Esta taxa é calculada sobre o valor total da venda e descontada automaticamente.
                            </p>
                        </div>

                        {/* 2. Taxas do Stripe */}
                        <div className="space-y-2">
                            <h3 className="font-semibold flex items-center gap-2"><Banknote className="h-5 w-5 text-blue-600" />Taxas do Stripe (Seu custo)</h3>
                            <p className="text-sm text-muted-foreground">
                                O Stripe é o nosso parceiro que processa os pagamentos com segurança. Eles cobram taxas próprias, que são descontadas do valor da venda.
                            </p>
                            <p className="text-xs text-muted-foreground">
                                <span className="font-semibold">IMPORTANTE:</span> Estas são as taxas padrão informadas pelo Stripe para o Brasil. Consulte seu painel Stripe para valores exatos, pois podem variar.
                            </p>
                            <ul className="list-disc list-inside space-y-2 pl-4 text-sm">
                                <li><span className="font-semibold">PIX:</span> <Badge variant="outline">1.19%</Badge> por transação.</li>
                                <li><span className="font-semibold">Cartão de Crédito (à vista):</span> <Badge variant="outline">3.99% + R$ 0,39</Badge> por transação.</li>
                                <li><span className="font-semibold">Boleto Bancário:</span> <Badge variant="outline">R$ 3,45</Badge> por boleto pago.</li>
                                <li><span className="font-semibold">Cartões Internacionais:</span> Taxa adicional de <Badge variant="outline" className="border-destructive/50 text-destructive">+ 2%</Badge>.</li>
                            </ul>
                        </div>

                        {/* 3. Prazos de Recebimento */}
                        <div className="space-y-2">
                            <h3 className="font-semibold flex items-center gap-2"><Clock className="h-5 w-5 text-green-600" />Prazos de Recebimento (Payout)</h3>
                            <p className="text-sm text-muted-foreground">
                                O tempo padrão para o dinheiro cair na sua conta bancária (cadastrada no Stripe) depende do método de pagamento:
                            </p>
                            <ul className="list-disc list-inside space-y-2 pl-4 text-sm">
                                <li><span className="font-semibold">PIX:</span> Disponível para saque em <Badge variant="secondary">2 dias úteis (D+2)</Badge>.</li>
                                <li><span className="font-semibold">Boleto:</span> Disponível para saque em <Badge variant="secondary">2 dias úteis (D+2)</Badge> após o pagamento.</li>
                                <li><span className="font-semibold">Cartão de Crédito:</span> Disponível para saque em <Badge variant="secondary">30 dias (D+30)</Badge>.</li>
                            </ul>
                        </div>

                        {/* 4. Exemplos */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-3 rounded-lg border p-4">
                                <h3 className="font-semibold flex items-center gap-2"><PiggyBank className="h-5 w-5 text-primary/80" />Exemplo: Venda de R$ 100,00 no PIX</h3>
                                <div className="flex flex-col space-y-2 text-sm">
                                    <div className="flex justify-between"><span>Valor da Venda:</span> <span className="font-semibold">R$ 100,00</span></div>
                                    <div className="flex justify-between text-destructive"><span>Taxa Stripe (PIX 1.19%):</span> <span className="font-semibold">- R$ {pixStripeFee.toFixed(2)}</span></div>
                                    <div className="flex justify-between text-destructive"><span>Taxa TreineAI (Spread 5%):</span> <span className="font-semibold">- R$ {pixPlatformFee.toFixed(2)}</span></div>
                                    <hr className="my-1 border-dashed" />
                                    <div className="flex justify-between text-green-700">
                                        <span className="font-semibold">Valor Líquido a Receber:</span>
                                        <span className="font-bold text-lg">R$ {pixNet.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-3 rounded-lg border p-4">
                                <h3 className="font-semibold flex items-center gap-2"><PiggyBank className="h-5 w-5 text-primary/80" />Exemplo: Venda de R$ 100,00 no Cartão</h3>
                                <div className="flex flex-col space-y-2 text-sm">
                                    <div className="flex justify-between"><span>Valor da Venda:</span> <span className="font-semibold">R$ 100,00</span></div>
                                    <div className="flex justify-between text-destructive"><span>Taxa Stripe (3.99% + R$0,39):</span> <span className="font-semibold">- R$ {cardStripeFee.toFixed(2)}</span></div>
                                    <div className="flex justify-between text-destructive"><span>Taxa TreineAI (Spread 5%):</span> <span className="font-semibold">- R$ {cardPlatformFee.toFixed(2)}</span></div>
                                    <hr className="my-1 border-dashed" />
                                    <div className="flex justify-between text-green-700">
                                        <span className="font-semibold">Valor Líquido a Receber:</span>
                                        <span className="font-bold text-lg">R$ {cardNet.toFixed(2)}</span>
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