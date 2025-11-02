import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// As imagens da pasta 'public' são referenciadas diretamente pelo caminho
const dashboardImg = "/image.png";
const whatsappScreenshot1 = "/w01.jpeg";
const whatsappScreenshot2 = "/w02.jpeg";
const newLogo = "/transparent-Photoroom.png";

// --- ÍCONES ---
import {
    AlertTriangle,
    Clock,
    TrendingDown,
    Zap,
    Bot,
    Users,
    DollarSign,
    CheckCircle,
    Building,
    Target,
    UserCheck,
    Star
} from "lucide-react";

// --- CAMINHOS DE IMAGENS LOCAIS ATUALIZADOS (CORRIGIDOS) ---
const heroImg = "/photo-1517836357463-d25dfeac3438.png";
const gymImg = "/photo-1534438327276-14e5300c3a48.avif"; // Corrigido: Removido /public/
const studioImg = "/photo-1571902943202-507ec2618e8f.avif"; // Corrigido: Removido /public/
const personalImg = "/photo-1554284126-aa88f22d8b74.avif"; // Corrigido: Removido /public/
// --- FIM DA ATUALIZAÇÃO ---


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
                {/* --- SEÇÃO HERÓI CORRIGIDA (COM CSS BACKGROUND E OVERLAY MAIS FORTE) --- */}
                <section
                    className="relative w-full h-[80vh] md:h-[90vh] flex items-center justify-center text-center text-white overflow-hidden"
                    style={{
                        backgroundImage: `url(${heroImg})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backgroundColor: '#1a1a1a' // Fundo escuro de fallback
                    }}
                >
                    {/* Overlay Escuro (AGORA MAIS FORTE: bg-black/80) */}
                    <div className="absolute inset-0 bg-black/80 -z-10"></div>

                    <div className="container mx-auto px-4 z-10 animate-in fade-in-50 duration-1000">
                        {/* --- TÍTULO COM SOMBRA MAIS FORTE --- */}
                        <h1
                            className="text-4xl md:text-6xl font-bold tracking-tighter text-white mb-6 [text-shadow:_0_3px_6px_rgba(0,0,0,0.9)]"
                        >
                            Menos tempo gerenciando, <br className="md:hidden" />
                            <span className="text-primary">mais tempo transformando vidas.</span>
                        </h1>
                        <p className="max-w-3xl mx-auto text-base md:text-xl text-white/90 mb-4 [text-shadow:_0_2px_4px_rgba(0,0,0,0.8)]">
                            O TreineAI automatiza a gestão da sua academia, CT ou consultoria com uma plataforma inteligente e uma assistente virtual no WhatsApp que seus alunos vão amar.
                        </p>
                        {/* --- TEXTO ROXO COM SOMBRA --- */}
                        <p className="max-w-3xl mx-auto text-lg md:text-xl text-primary font-semibold mb-8 [text-shadow:_0_2px_4px_rgba(0,0,0,0.8)]">
                            Agora com recebimento online via PIX, Cartão e Boleto e repasse em 2 dias úteis!
                        </p>
                        <p className="max-w-3xl mx-auto text-lg md:text-xl text-white font-bold mb-8 [text-shadow:_0_2px_4px_rgba(0,0,0,0.8)]">
                            Experimente 2 meses GRÁTIS! Sem cartão de crédito e cancele quando quiser.
                        </p>
                        {/* --- FIM DAS CORREÇÕES --- */}
                        <Button asChild size="lg" className="h-12 px-6 text-base md:text-lg font-semibold shadow-glow">
                            <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
                                Quero Meus 2 Meses GRÁTIS Agora!
                            </a>
                        </Button>
                        <p className="mt-4 text-sm text-neutral-300 [text-shadow:_0_2px_4px_rgba(0,0,0,0.8)]">
                            Aprovado por negócios fitness que buscam inovação.
                        </p>
                    </div>
                </section>
                {/* --- FIM DA SEÇÃO HERÓI --- */}

                {/* Seção de Dor */}
                <section className="py-16 md:py-24 bg-muted/20">
                    <div className="container mx-auto px-4">
                        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
                            Sua rotina parece uma corrida sem fim?
                        </h2>
                        <div className="grid md:grid-cols-3 gap-6 md:gap-8">
                            <Card className="text-center transition-transform hover:scale-105 hover:shadow-lg">
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
                            <Card className="text-center transition-transform hover:scale-105 hover:shadow-lg">
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
                            <Card className="text-center transition-transform hover:scale-105 hover:shadow-lg">
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

                {/* --- SEÇÃO: PARA QUEM É? --- */}
                <section className="py-16 md:py-24">
                    <div className="container mx-auto px-4">
                        <h2 className="text-3xl md:text-4xl font-bold text-center mb-6">
                            Perfeito para o seu <span className="text-primary">tipo de negócio</span>.
                        </h2>
                        <p className="text-lg text-muted-foreground text-center max-w-2xl mx-auto mb-12">
                            Seja você dono de uma grande academia, um estúdio boutique ou um personal trainer individual, o TreineAI se adapta a você.
                        </p>
                        <div className="grid md:grid-cols-3 gap-6 md:gap-8">
                            {/* Card Academias */}
                            <Card className="overflow-hidden shadow-lg transition-shadow hover:shadow-primary/20">
                                <img src={gymImg} alt="Interior de uma academia moderna" className="w-full h-48 object-cover" loading="lazy" />
                                <CardHeader>
                                    <Building className="h-8 w-8 text-primary mb-2" />
                                    <CardTitle>Academias e Box</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-muted-foreground">
                                        Gestão completa de alunos, matrículas, pagamentos em lote e integração com Gympass/TotalPass. Tenha controle total do seu faturamento e reduza a inadimplência.
                                    </p>
                                </CardContent>
                            </Card>
                            {/* Card Estúdios/CTs */}
                            <Card className="overflow-hidden shadow-lg transition-shadow hover:shadow-primary/20">
                                <img src={studioImg} alt="Pessoas treinando em um estúdio de crossfit" className="w-full h-48 object-cover" loading="lazy" />
                                <CardHeader>
                                    <Target className="h-8 w-8 text-primary mb-2" />
                                    <CardTitle>Estúdios e CTs</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-muted-foreground">
                                        Agendamento de aulas, controle de check-ins via WhatsApp e um canal de comunicação direto com seus alunos. Crie uma comunidade engajada e profissional.
                                    </p>
                                </CardContent>
                            </Card>
                            {/* Card Personais */}
                            <Card className="overflow-hidden shadow-lg transition-shadow hover:shadow-primary/20">
                                <img src={personalImg} alt="Personal trainer ajudando um aluno" className="w-full h-48 object-cover" loading="lazy" />
                                <CardHeader>
                                    <UserCheck className="h-8 w-8 text-primary mb-2" />
                                    <CardTitle>Personal Trainers</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-muted-foreground">
                                        Criação e envio de treinos, cobrança automática de planos e acompanhamento via IA. Ofereça um serviço premium e escale sua consultoria online.
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </section>
                {/* --- FIM DA SEÇÃO --- */}

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
                                <Card className="overflow-hidden shadow-xl">
                                    <div className="grid md:grid-cols-2 items-center">
                                        <img src={dashboardImg} alt="Dashboard TreineAI" className="w-full h-auto object-cover" loading="lazy" />
                                        <div className="p-6 md:p-8">
                                            <h3 className="text-xl md:text-2xl font-bold mb-4">Painel de Controle Total</h3>
                                            <ul className="space-y-3 text-muted-foreground">
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
                                <Card className="overflow-hidden shadow-xl">
                                    <div className="flex flex-col md:grid md:grid-cols-2 items-center">
                                        <div className="order-2 md:order-1 p-6 md:p-8">
                                            <h3 className="text-xl md:text-2xl font-bold mb-4">Sua Academia no WhatsApp do Aluno</h3>
                                            <ul className="space-y-3 text-muted-foreground">
                                                <li className="flex items-start gap-3"><CheckCircle className="h-5 w-5 text-primary shrink-0 mt-1" /><span>Check-in Automático via WhatsApp, integrado com Gympass e TotalPass.</span></li>
                                                <li className="flex items-start gap-3"><CheckCircle className="h-5 w-5 text-primary shrink-0 mt-1" /><span>Lembretes de Renovação automáticos com o link de pagamento exclusivo do TreineAI (PIX, Cartão ou Boleto).</span></li>
                                                <li className="flex items-start gap-3"><CheckCircle className="h-5 w-5 text-primary shrink-0 mt-1" /><span>Treinador Virtual que sugere treinos para sua aprovação.</span></li>
                                                <li className="flex items-start gap-3"><CheckCircle className="h-5 w-5 text-primary shrink-0 mt-1" /><span>Interação e Engajamento para consulta de treinos, agendamentos e mais.</span></li>
                                            </ul>
                                        </div>
                                        <div className="order-1 md:order-2 flex flex-row items-center justify-center gap-2 md:gap-4 p-6 pt-0 md:p-8">
                                            <img src={whatsappScreenshot1} alt="Assistente ArIA no WhatsApp - Conversa 1" className="w-1/2 max-w-[150px] md:max-w-[200px] h-auto object-contain rounded-xl shadow-lg transform transition-transform hover:scale-105" loading="lazy" />
                                            <img src={whatsappScreenshot2} alt="Assistente ArIA no WhatsApp - Conversa 2" className="w-1/2 max-w-[150px] md:max-w-[200px] h-auto object-contain rounded-xl shadow-lg transform transition-transform hover:scale-105" loading="lazy" />
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
                            <Card className="hover:shadow-glow transition-shadow border-primary/20 bg-primary/5">
                                <CardHeader><DollarSign className="h-8 w-8 text-primary mb-2" /><CardTitle>Receba Pagamentos Online</CardTitle></CardHeader>
                                <CardContent><p className="text-muted-foreground">Ative os pagamentos do TreineAI em minutos e aceite <span className="font-semibold text-foreground">PIX, Cartão e Boleto</span>. Receba seus repasses direto na sua conta em <span className="font-semibold text-foreground">2 dias úteis</span>.</p></CardContent>
                            </Card>
                        </div>
                    </div>
                </section>

                {/* --- SEÇÃO DE PROVA SOCIAL --- */}
                <section className="py-16 md:py-24 bg-muted/20">
                    <div className="container mx-auto px-4">
                        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
                            O que nossos <span className="text-primary">parceiros</span> dizem
                        </h2>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                            <Card className="flex flex-col">
                                <CardContent className="pt-6 flex-1 flex flex-col justify-between">
                                    <div>
                                        <div className="flex gap-0.5 mb-3">
                                            <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                                            <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                                            <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                                            <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                                            <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                                        </div>
                                        <p className="text-muted-foreground mb-4 italic">"O TreineAI tirou 80% do meu trabalho administrativo. A cobrança automática e o check-in pelo WhatsApp são revolucionários. Meus alunos amam!"</p>
                                    </div>
                                    <div className="flex items-center gap-3 mt-4">
                                        <Avatar>
                                            <AvatarImage src="https://xsgames.co/randomusers/assets/avatars/male/74.jpg" alt="Ricardo G." />
                                            <AvatarFallback>RG</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-semibold">Ricardo G.</p>
                                            <p className="text-sm text-muted-foreground">Dono, Box Alpha</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="flex flex-col">
                                <CardContent className="pt-6 flex-1 flex flex-col justify-between">
                                    <div>
                                        <div className="flex gap-0.5 mb-3">
                                            <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                                            <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                                            <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                                            <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                                            <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                                        </div>
                                        <p className="text-muted-foreground mb-4 italic">"Como personal, eu perdia horas montando planilhas e cobrando alunos. Hoje, envio treinos e links de pagamento em segundos pelo TreineAI. Consegui dobrar minha cartela de alunos."</p>
                                    </div>
                                    <div className="flex items-center gap-3 mt-4">
                                        <Avatar>
                                            <AvatarImage src="https://xsgames.co/randomusers/assets/avatars/female/74.jpg" alt="Juliana P." />
                                            <AvatarFallback>JP</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-semibold">Juliana P.</p>
                                            <p className="text-sm text-muted-foreground">Personal Trainer</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="flex flex-col">
                                <CardContent className="pt-6 flex-1 flex flex-col justify-between">
                                    <div>
                                        <div className="flex gap-0.5 mb-3">
                                            <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                                            <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                                            <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                                            <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                                            <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                                        </div>
                                        <p className="text-muted-foreground mb-4 italic">"A integração com Gympass e TotalPass é perfeita. A ArIA faz o check-in sozinha e eu só me preocupo em dar a aula. Recomendo 100%!"</p>
                                    </div>
                                    <div className="flex items-center gap-3 mt-4">
                                        <Avatar>
                                            <AvatarImage src="https://xsgames.co/randomusers/assets/avatars/male/76.jpg" alt="Marcos B." />
                                            <AvatarFallback>MB</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-semibold">Marcos B.</p>
                                            <p className="text-sm text-muted-foreground">Gestor, Estúdio Flow</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </section>
                {/* --- FIM DA SEÇÃO DE PROVA SOCIAL --- */}


                {/* Seção Final de CTA */}
                <section className="py-20 bg-primary/90 text-primary-foreground">
                    <div className="container mx-auto text-center px-4">
                        <h2 className="text-3xl md:text-4xl font-bold mb-6">Pronto para levar seu negócio para o próximo nível?</h2>
                        <p className="text-base md:text-xl font-medium mb-4">
                            Comece com 2 meses GRÁTIS, sem cartão de crédito e sem compromisso!
                        </p>
                        <p className="text-lg md:text-2xl font-bold mb-8">
                            Após o teste, apenas <span className="text-secondary underline">R$14,99/mês</span>.
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
                        {/* --- CORREÇÃO DO ERRO NewDate --- */}
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