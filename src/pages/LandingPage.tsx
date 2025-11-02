import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "react-router-dom"; // Importar o Link para navegação interna

// As imagens da pasta 'public' são referenciadas diretamente pelo caminho
const dashboardImg = "/image.png";
const whatsappScreenshot1 = "/w01.jpeg";
const whatsappScreenshot2 = "/w02.jpeg";
const newLogo = "/transparent-Photoroom.png"; // Novo logo

import { AlertTriangle, Clock, TrendingDown, Zap, Bot, Users, DollarSign, CheckCircle } from "lucide-react";

export const LandingPage = () => {
    const whatsappNumber = "5513997977755";
    const whatsappMessage = encodeURIComponent("Olá! Gostaria de solicitar meus 2 meses grátis do TreineAI para otimizar a gestão do meu negócio!");
    const whatsappLink = `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`;

    return (
        <div className="flex flex-col min-h-screen bg-background text-foreground">
            {/* Header */}
            <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur-sm">
                <div className="container mx-auto flex h-20 items-center justify-between px-4 md:px-6">
                    <a href="#" className="flex items-center gap-2">
                        <img src={newLogo} alt="TreineAI Logo" className="h-16 w-16" />
                        <span className="text-2xl md:text-3xl font-bold text-primary">TreineAI</span>
                    </a>
                    <div className="flex items-center gap-2">
                        <Button asChild variant="outline" size="sm" className="px-3 text-xs md:px-4 md:text-sm">
                            <Link to="/login">Acessar Plataforma</Link>
                        </Button>
                    </div>
                </div>
            </header>

            <main className="flex-1">
                {/* Seção Herói */}
                <section className="py-16 md:py-28">
                    <div className="container mx-auto text-center px-4">
                        <h1 className="text-4xl md:text-6xl font-bold tracking-tighter bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent mb-6">
                            Menos tempo gerenciando, mais tempo transformando vidas.
                        </h1>
                        <p className="max-w-3xl mx-auto text-base md:text-xl text-muted-foreground mb-4">
                            O TreineAI automatiza a gestão da sua academia, CT ou consultoria com uma plataforma inteligente e uma assistente virtual no WhatsApp que seus alunos vão amar.
                        </p>
                        {/* --- ATUALIZADO --- */}
                        <p className="max-w-3xl mx-auto text-lg md:text-xl text-muted-foreground font-semibold mb-8">
                            Agora o <span className="text-primary">TreineAI processa seus pagamentos online</span> via PIX, Cartão e Boleto com repasse direto para sua conta em <span className="text-primary">2 dias úteis!</span>
                        </p>
                        <p className="max-w-3xl mx-auto text-lg md:text-xl text-primary font-bold mb-8">
                            Experimente 2 meses GRÁTIS! Sem cartão de crédito e cancele quando quiser.
                        </p>
                        {/* --- FIM DA ATUALIZAÇÃO --- */}
                        <Button asChild size="lg" className="h-12 px-6 text-base md:text-lg font-semibold shadow-glow">
                            <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
                                Quero Meus 2 Meses GRÁTIS Agora!
                            </a>
                        </Button>
                        <p className="mt-4 text-sm text-muted-foreground">
                            Aprovado por negócios fitness que buscam inovação.
                        </p>
                    </div>
                </section>

                {/* Seção de Dor */}
                <section className="py-16 md:py-24 bg-muted/20">
                    <div className="container mx-auto px-4">
                        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
                            Sua rotina parece uma corrida sem fim?
                        </h2>
                        <div className="grid md:grid-cols-3 gap-6 md:gap-8">
                            <Card className="text-center">
                                <CardHeader>
                                    <AlertTriangle className="mx-auto h-10 w-10 text-destructive mb-4" />
                                    <CardTitle>Inadimplência e Evasão</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-muted-foreground">
                                        Alunos com pagamentos atrasados e matrículas vencendo tomam seu tempo com cobranças manuais? A evasão por falta de acompanhamento te preocupa?
                                    </p>
                                </CardContent>
                            </Card>
                            <Card className="text-center">
                                <CardHeader>
                                    <Clock className="mx-auto h-10 w-10 text-destructive mb-4" />
                                    <CardTitle>Comunicação Falha</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-muted-foreground">
                                        Seus alunos se sentem perdidos, sem saber o treino do dia, esquecem agendamentos ou não têm um canal fácil para tirar dúvidas rápidas?
                                    </p>
                                </CardContent>
                            </Card>
                            <Card className="text-center">
                                <CardHeader>
                                    <TrendingDown className="mx-auto h-10 w-10 text-destructive mb-4" />
                                    <CardTitle>Processos Manuais</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-muted-foreground">
                                        Planilhas, múltiplos apps e anotações. Controlar matrículas, vendas e treinos se tornou um trabalho à parte que te impede de focar no que realmente importa: seus alunos.
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </section>

                {/* Seção de Oportunidade */}
                <section className="py-16 md:py-24">
                    <div className="container mx-auto text-center px-4">
                        <h2 className="text-3xl md:text-5xl font-bold mb-6">
                            Imagine ter um <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">braço direito digital</span> que trabalha por você 24/7.
                        </h2>
                        <p className="max-w-3xl mx-auto text-lg text-muted-foreground">
                            E se você pudesse automatizar as tarefas chatas, engajar seus alunos de forma personalizada e ter todos os dados do seu negócio na palma da mão? Com o TreineAI, você transforma a gestão em sua maior aliada para o crescimento.
                        </p>
                    </div>
                </section>

                {/* Seção de Solução */}
                <section className="py-16 md:py-24 bg-muted/20">
                    <div className="container mx-auto px-4">
                        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
                            A plataforma completa para o seu negócio fitness.
                        </h2>
                        <Tabs defaultValue="gestao" className="w-full">
                            <TabsList className="grid w-full grid-cols-2 max-w-lg mx-auto h-auto md:h-12">
                                <TabsTrigger value="gestao" className="h-10 text-sm md:text-base">Gestão Inteligente</TabsTrigger>
                                <TabsTrigger value="aria" className="h-10 text-sm md:text-base">Assistente Virtual ArIA</TabsTrigger>
                            </TabsList>
                            <TabsContent value="gestao" className="mt-8">
                                <Card className="overflow-hidden">
                                    <div className="grid md:grid-cols-2 items-center">
                                        <img src={dashboardImg} alt="Dashboard TreineAI" className="w-full h-auto object-cover" />
                                        <div className="p-6 md:p-8">
                                            <h3 className="text-xl md:text-2xl font-bold mb-4">Painel de Controle Total</h3>
                                            <ul className="space-y-3 text-muted-foreground">
                                                {/* --- ATUALIZADO --- */}
                                                <li className="flex items-start gap-3"><CheckCircle className="h-5 w-5 text-primary shrink-0 mt-1" /><span>Receba pagamentos via PIX, Cartão e Boleto direto pela plataforma, com o dinheiro na sua conta em 2 dias úteis.</span></li>
                                                <li className="flex items-start gap-3"><CheckCircle className="h-5 w-5 text-primary shrink-0 mt-1" /><span>Visualize faturamento, alunos ativos, matrículas vencendo e produtos mais vendidos.</span></li>
                                                <li className="flex items-start gap-3"><CheckCircle className="h-5 w-5 text-primary shrink-0 mt-1" /><span>Gestão de Alunos 360º: Cadastros, matrículas, histórico de pagamentos e check-ins.</span></li>
                                                <li className="flex items-start gap-3"><CheckCircle className="h-5 w-5 text-primary shrink-0 mt-1" /><span>Criação de Treinos Simplificada e associada a um ou vários alunos.</span></li>
                                            </ul>
                                        </div>
                                    </div>
                                </Card>
                            </TabsContent>
                            <TabsContent value="aria" className="mt-8">
                                <Card className="overflow-hidden">
                                    <div className="flex flex-col md:grid md:grid-cols-2 items-center">
                                        <div className="order-2 md:order-1 p-6 md:p-8">
                                            <h3 className="text-xl md:text-2xl font-bold mb-4">Sua Academia no WhatsApp do Aluno</h3>
                                            <ul className="space-y-3 text-muted-foreground">
                                                <li className="flex items-start gap-3"><CheckCircle className="h-5 w-5 text-primary shrink-0 mt-1" /><span>Check-in Automático via WhatsApp, integrado com Gympass e TotalPass.</span></li>
                                                {/* --- ATUALIZADO --- */}
                                                <li className="flex items-start gap-3"><CheckCircle className="h-5 w-5 text-primary shrink-0 mt-1" /><span>Lembretes de Renovação automáticos com o link de pagamento exclusivo do TreineAI (PIX, Cartão ou Boleto).</span></li>
                                                <li className="flex items-start gap-3"><CheckCircle className="h-5 w-5 text-primary shrink-0 mt-1" /><span>Treinador Virtual que sugere treinos para sua aprovação.</span></li>
                                                <li className="flex items-start gap-3"><CheckCircle className="h-5 w-5 text-primary shrink-0 mt-1" /><span>Interação e Engajamento para consulta de treinos, agendamentos e mais.</span></li>
                                            </ul>
                                        </div>
                                        <div className="order-1 md:order-2 flex flex-row items-center justify-center gap-2 md:gap-4 p-6 pt-0 md:p-8">
                                            <img src={whatsappScreenshot1} alt="Assistente ArIA no WhatsApp - Conversa 1" className="w-1/2 max-w-[150px] md:max-w-[200px] h-auto object-contain rounded-xl shadow-lg transform transition-transform hover:scale-105" />
                                            <img src={whatsappScreenshot2} alt="Assistente ArIA no WhatsApp - Conversa 2" className="w-1/2 max-w-[150px] md:max-w-[200px] h-auto object-contain rounded-xl shadow-lg transform transition-transform hover:scale-105" />
                                        </div>
                                    </div>
                                </Card>
                            </TabsContent>
                        </Tabs>
                    </div>
                </section>

                {/* Seção de Diferenciais */}
                <section className="py-16 md:py-24">
                    <div className="container mx-auto px-4">
                        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
                            Muito além de uma simples planilha.
                        </h2>
                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
                            <Card className="hover:shadow-glow transition-shadow">
                                <CardHeader><Zap className="h-8 w-8 text-primary mb-2" /><CardTitle>Foco no que Importa</CardTitle></CardHeader>
                                <CardContent><p className="text-muted-foreground">Deixe que a ArIA cuide das cobranças e check-ins. Use seu tempo para dar atenção aos seus alunos.</p></CardContent>
                            </Card>
                            <Card className="hover:shadow-glow transition-shadow">
                                <CardHeader><Bot className="h-8 w-8 text-primary mb-2" /><CardTitle>Alunos Conectados</CardTitle></CardHeader>
                                <CardContent><p className="text-muted-foreground">Com um assistente virtual no WhatsApp, seus alunos se sentem acompanhados e mais propensos a renovar.</p></CardContent>
                            </Card>
                            <Card className="hover:shadow-glow transition-shadow">
                                <CardHeader><Users className="h-8 w-8 text-primary mb-2" /><CardTitle>Gestão Centralizada</CardTitle></CardHeader>
                                <CardContent><p className="text-muted-foreground">Abandone o caos de múltiplos sistemas. Gestão financeira, de alunos, treinos e vendas em uma única plataforma.</p></CardContent>
                            </Card>
                            {/* --- ATUALIZADO --- */}
                            <Card className="hover:shadow-glow transition-shadow border-primary/20 bg-primary/5">
                                <CardHeader><DollarSign className="h-8 w-8 text-primary mb-2" /><CardTitle>Receba Pagamentos Online</CardTitle></CardHeader>
                                <CardContent><p className="text-muted-foreground">Ative os pagamentos do TreineAI em minutos e aceite <span className="font-semibold text-foreground">PIX, Cartão e Boleto</span>. Receba seus repasses direto na sua conta em <span className="font-semibold text-foreground">2 dias úteis</span>.</p></CardContent>
                            </Card>
                            {/* --- FIM DA ATUALIZAÇÃO --- */}
                        </div>
                    </div>
                </section>

                {/* Seção Final de CTA */}
                <section className="py-20 bg-primary/90 text-primary-foreground">
                    <div className="container mx-auto text-center px-4">
                        <h2 className="text-3xl md:text-4xl font-bold mb-6">Pronto para levar seu negócio para o próximo nível?</h2>
                        <p className="text-base md:text-xl font-medium mb-8">
                            Comece com 2 meses GRÁTIS, sem cartão de crédito e sem compromisso!
                        </p>
                        <Button asChild size="lg" variant="secondary" className="h-12 px-6 text-base md:h-14 md:px-10 md:text-xl">
                            <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
                                Experimente o TreineAI Gratuitamente
                            </a>
                        </Button>
                    </div>
                </section>
            </main>

            {/* Rodapé */}
            <footer className="border-t">
                <div className="container mx-auto flex flex-col md:flex-row items-center justify-between py-6 px-4 md:px-6 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                        <img src={newLogo} alt="TreineAI Logo" className="h-8 w-8" />
                        <span>© {new Date().getFullYear()} TreineAI. Todos os direitos reservados.</span>
                    </div>
                    <div className="flex flex-col md:flex-row gap-2 md:gap-4 mt-4 md:mt-0">
                        <a href="#" className="hover:text-primary">Termos de Serviço</a>
                        <a href="#" className="hover:text-primary">Política de Privacidade</a>
                    </div>
                </div>
            </footer>

        </div>
    );
};

export default LandingPage;