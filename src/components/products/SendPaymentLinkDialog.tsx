import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Session } from "@supabase/supabase-js";
import { Copy, MessageCircle, Link as LinkIcon, Loader, RefreshCw, AlertCircle } from "lucide-react";

// Tipo para o produto (simplificado)
interface Product {
    id: string;
    name: string;
    price: number;
    recurring_interval: string | null;
    stripe_price_id: string | null;
    modality_id?: string | null;
    stripe_product_id: string | null;
}

// Tipo para o aluno (simplificado)
interface Student {
    id: string;
    name: string;
    phone_number: string | null;
}

interface SendPaymentLinkDialogProps {
    product: Product | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    organizationId: string | null;
    session: Session | null;
    students: Student[];
}

const PLATFORM_FEE_PERCENT = 0.05; // 5%

export const SendPaymentLinkDialog = ({ product, open, onOpenChange, organizationId, session, students }: SendPaymentLinkDialogProps) => {
    const [loading, setLoading] = useState(false);
    const [paymentLink, setPaymentLink] = useState<string | null>(null);
    const [selectedStudentId, setSelectedStudentId] = useState<string>("none");

    // Limpa o estado ao fechar
    useEffect(() => {
        if (!open) {
            setPaymentLink(null);
            setSelectedStudentId("none");
            setLoading(false);
        }
    }, [open]);

    if (!product) return null;

    const price = product.price;
    const platformFee = price * PLATFORM_FEE_PERCENT;
    // Estimativa com base na taxa mais alta (Cartão) para o usuário ter uma ideia
    const estimatedStripeFee = price * 0.0399 + 0.39;
    const estimatedNet = price - platformFee - estimatedStripeFee;

    const handleGenerateLink = async () => {
        if (!product.stripe_price_id || !organizationId || !session) {
            toast.error("Produto não sincronizado ou sessão expirada.");
            return;
        }

        setLoading(true);
        try {
            const { data, error } = await supabase.functions.invoke('create-stripe-payment-link', {
                headers: { Authorization: `Bearer ${session.access_token}` },
                body: {
                    stripePriceId: product.stripe_price_id,
                    organizationId: organizationId,
                    recurring: !!product.recurring_interval,
                    studentId: selectedStudentId === 'none' ? null : selectedStudentId,
                    productId: product.id, // ID do Supabase
                    modalityId: product.modality_id || null
                }
            });

            // @ts-ignore
            if (error) throw error;
            // @ts-ignore
            if (data.error) throw new Error(data.error);

            // @ts-ignore
            setPaymentLink(data.paymentLinkUrl);
            toast.success("Novo link de pagamento gerado!");

        } catch (error: any) {
            toast.error("Falha ao criar link de pagamento.", { description: error.message });
            setPaymentLink(null);
        } finally {
            setLoading(false);
        }
    };

    const handleCopyToClipboard = () => {
        if (!paymentLink) return;
        navigator.clipboard.writeText(paymentLink);
        toast.success("Link copiado para a área de transferência!");
    };

    const handleSendWhatsApp = () => {
        if (!paymentLink || selectedStudentId === 'none') {
            toast.error("Selecione um aluno para enviar.");
            return;
        }
        const student = students.find(s => s.id === selectedStudentId);
        if (!student?.phone_number) {
            toast.error("Este aluno não possui um número de WhatsApp cadastrado.");
            return;
        }

        const message = encodeURIComponent(
            `Olá, ${student.name}! 👋

Segue o link para pagamento referente ao seu plano/produto:
${product.name} - R$ ${price.toFixed(2)}

Pode pagar com segurança clicando aqui:
${paymentLink}

Qualquer dúvida, é só chamar! 💪`
        );
        const whatsappUrl = `https://wa.me/${student.phone_number.replace(/\D/g, '')}?text=${message}`;
        window.open(whatsappUrl, '_blank');
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Gerar Link de Pagamento</DialogTitle>
                    <DialogDescription>
                        Crie e envie um link de pagamento para {product.name}.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    {/* Detalhes Financeiros */}
                    <div className="space-y-2 rounded-lg border p-3">
                        <div className="flex justify-between text-lg">
                            <span className="font-semibold">Valor Total:</span>
                            <span className="font-bold">R$ {price.toFixed(2)}</span>
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1 pt-2">
                            <div className="flex justify-between">
                                <span>Taxa da Plataforma (5%):</span>
                                <span>- R$ {platformFee.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Taxa Stripe (Estimada*):</span>
                                <span>~ - R$ {estimatedStripeFee.toFixed(2)}</span>
                            </div>
                        </div>
                        <hr className="my-2 border-dashed" />
                        <div className="flex justify-between text-green-700">
                            <span className="font-semibold">Valor Líquido Estimado*:</span>
                            <span className="font-semibold">R$ {estimatedNet.toFixed(2)}</span>
                        </div>
                        <p className="text-xs text-muted-foreground pt-2">
                            *Estimativa baseada na taxa de Cartão de Crédito (3.99% + R$0,39). O valor líquido será maior para PIX (1.19%) ou Boleto (R$3,45).
                        </p>
                    </div>

                    {/* Seletor de Aluno */}
                    <div className="space-y-2">
                        <Label htmlFor="student">Enviar para (Opcional)</Label>
                        <Select
                            value={selectedStudentId}
                            onValueChange={setSelectedStudentId}
                            disabled={loading}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione um aluno" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Venda avulsa (sem aluno)</SelectItem>
                                {students.map((student) => (
                                    <SelectItem key={student.id} value={student.id}>
                                        {student.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                            Selecionar um aluno permite enviar via WhatsApp e associar o pagamento à matrícula dele.
                        </p>
                    </div>

                    {/* Botão Gerar Link */}
                    <Button onClick={handleGenerateLink} disabled={loading} className="w-full">
                        {loading && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                        {paymentLink ? <RefreshCw className="mr-2 h-4 w-4" /> : <LinkIcon className="mr-2 h-4 w-4" />}
                        {loading ? "Gerando..." : (paymentLink ? "Gerar Novo Link" : "Gerar Link de Pagamento")}
                    </Button>

                    {/* Link Gerado */}
                    {paymentLink && (
                        <div className="space-y-2 animate-in fade-in-50">
                            <Label htmlFor="payment-link">Link Gerado</Label>
                            <div className="flex gap-2">
                                <Input id="payment-link" value={paymentLink} readOnly />
                                <Button size="icon" variant="outline" onClick={handleCopyToClipboard}>
                                    <Copy className="h-4 w-4" />
                                </Button>
                            </div>
                            <Button
                                onClick={handleSendWhatsApp}
                                disabled={selectedStudentId === 'none'}
                                className="w-full"
                                variant="success" // (Supondo que você tenha uma variante 'success', senão será 'default')
                                style={{ backgroundColor: '#25D366', color: 'white' }} // Estilo WhatsApp
                            >
                                <MessageCircle className="mr-2 h-4 w-4" />
                                Enviar para Aluno via WhatsApp
                            </Button>
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
                        Fechar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};