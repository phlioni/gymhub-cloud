import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import gymhubLogo from "@/assets/gymhub-logo.png";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

const Register = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        orgName: "",
        adminFullName: "",
        adminEmail: "",
        adminPassword: "",
        confirmPassword: "",
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        setFormData((prev) => ({ ...prev, [id]: value }));
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const { orgName, adminFullName, adminEmail, adminPassword, confirmPassword } = formData;

        // Validações do lado do cliente
        if (adminPassword !== confirmPassword) {
            setError("As senhas não coincidem.");
            setLoading(false);
            return;
        }
        if (adminPassword.length < 6) {
            setError("A senha deve ter no mínimo 6 caracteres.");
            setLoading(false);
            return;
        }

        try {
            // 1. Chamar a função 'create-organization'
            // Esta função já cria a organização, o usuário (com email_confirm: true)
            // e define o trial de 60 dias.
            const { data: funcData, error: funcError } = await supabase.functions.invoke('create-organization', {
                body: {
                    orgName,
                    adminEmail,
                    adminFullName,
                    adminPassword,
                }
            });

            if (funcError) throw funcError;
            // @ts-ignore
            if (funcData.error) throw new Error(funcData.error);

            // 2. Se a criação foi bem-sucedida, fazer o login do usuário
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: adminEmail,
                password: adminPassword,
            });

            if (signInError) throw signInError;

            // 3. Redirecionar para o dashboard
            toast.success("Cadastro realizado com sucesso! Bem-vindo(a)!");
            navigate('/dashboard');

        } catch (error: any) {
            const errorMessage = error.message || "Ocorreu um erro no cadastro.";
            if (errorMessage.includes("already registered")) {
                setError("Este e-mail já está cadastrado.");
            } else {
                setError(errorMessage);
            }
            toast.error("Falha no cadastro", { description: errorMessage });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4">
            <Card className="w-full max-w-sm md:max-w-md shadow-2xl border-primary/20">
                <CardHeader className="space-y-4 text-center pb-8">
                    <div className="flex justify-center">
                        <img src={gymhubLogo} alt="TreineAI Logo" className="w-24 h-24" />
                    </div>
                    <CardTitle className="text-3xl md:text-4xl font-bold text-primary">
                        Crie sua Conta
                    </CardTitle>
                    <CardDescription className="text-sm md:text-base">
                        Comece seus 60 dias de teste grátis agora mesmo.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {error && (
                        <Alert variant="destructive" className="mb-4">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Erro no Cadastro</AlertTitle>
                            <AlertDescription>
                                {error}
                            </AlertDescription>
                        </Alert>
                    )}
                    <form onSubmit={handleRegister} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="orgName">Nome da Academia/Estúdio *</Label>
                            <Input
                                id="orgName"
                                placeholder="Ex: CrossFit Downtown"
                                value={formData.orgName}
                                onChange={handleInputChange}
                                required
                                disabled={loading}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="adminFullName">Seu Nome Completo *</Label>
                            <Input
                                id="adminFullName"
                                placeholder="Ex: John Doe"
                                value={formData.adminFullName}
                                onChange={handleInputChange}
                                required
                                disabled={loading}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="adminEmail">Seu Email de Acesso *</Label>
                            <Input
                                id="adminEmail"
                                type="email"
                                placeholder="voce@exemplo.com"
                                value={formData.adminEmail}
                                onChange={handleInputChange}
                                required
                                disabled={loading}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="adminPassword">Sua Senha *</Label>
                            <Input
                                id="adminPassword"
                                type="password"
                                placeholder="•••••••• (mín. 6 caracteres)"
                                value={formData.adminPassword}
                                onChange={handleInputChange}
                                required
                                disabled={loading}
                                minLength={6}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Confirme sua Senha *</Label>
                            <Input
                                id="confirmPassword"
                                type="password"
                                placeholder="••••••••"
                                value={formData.confirmPassword}
                                onChange={handleInputChange}
                                required
                                disabled={loading}
                                minLength={6}
                            />
                        </div>
                        <Button
                            type="submit"
                            className="w-full"
                            disabled={loading}
                        >
                            {loading ? "Criando conta..." : "Criar Conta Grátis"}
                        </Button>
                        <div className="mt-4 text-center text-sm">
                            Já tem uma conta?{" "}
                            <Link to="/login" className="underline text-primary">
                                Faça login aqui
                            </Link>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};

export default Register;