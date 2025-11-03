import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import gymhubLogo from "@/assets/gymhub-logo.png";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
// <<< 1. IMPORTADO O ÍCONE DE TELEFONE >>>
import { AlertCircle, ShieldOff, Phone } from "lucide-react";

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [errorTitle, setErrorTitle] = useState("Acesso Suspenso");

  useEffect(() => {
    const status = searchParams.get('status');
    if (status === 'inactive' || status === 'overdue') {
      setErrorTitle("Assinatura Expirada");
      // <<< 2. MENSAGEM DE ERRO ATUALIZADA >>>
      setAuthError("Sua conta foi suspensa por falta de pagamento. Entre em contato com o suporte para reativar sua conta.");
    } else if (status === 'disabled') {
      setErrorTitle("Conta Desativada");
      // <<< 3. MENSAGEM DE ERRO ATUALIZADA >>>
      setAuthError("Seu acesso foi desativado por um administrador. Por favor, entre em contato com o suporte.");
    }

    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Redireciona para o AppLayout que fará a verificação completa
        navigate('/dashboard');
      }
    };
    checkUser();
  }, [navigate, searchParams]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setAuthError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.session) {
        const { data: profile } = await supabase
          // @ts-ignore
          .from('profiles')
          .select('role, is_active, organization_id, organizations(subscription_status)')
          .eq('id', data.session.user.id)
          .single();

        // **NOVA VERIFICAÇÃO DE PERFIL ATIVO**
        if (profile && !profile.is_active) {
          await supabase.auth.signOut();
          setErrorTitle("Conta Desativada");
          // <<< 4. MENSAGEM DE ERRO ATUALIZADA >>>
          setAuthError("Seu acesso foi desativado por um administrador. Por favor, entre em contato com o suporte.");
          setLoading(false);
          return;
        }

        if (profile?.role === 'superadmin') {
          navigate('/super-admin');
          return;
        }

        // @ts-ignore
        const subStatus = profile?.organizations?.subscription_status;
        if (subStatus === 'inactive' || subStatus === 'overdue') {
          await supabase.auth.signOut();
          setErrorTitle("Assinatura Expirada");
          // <<< 5. MENSAGEM DE ERRO ATUALIZADA >>>
          setAuthError("Sua conta foi suspensa por falta de pagamento. Entre em contato com o suporte para reativar sua conta.");
          setLoading(false);
          return;
        }

        if (profile?.organization_id) {
          navigate('/dashboard');
        }
      }
    } catch (error: any) {
      setAuthError(error.message || "E-mail ou senha inválidos.");
      toast.error(error.message || "E-mail ou senha inválidos.");
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
            TreineAI
          </CardTitle>
          <CardDescription className="text-sm md:text-base">
            Acesse sua conta para continuar
          </CardDescription>
        </CardHeader>
        <CardContent>
          {authError && (
            <Alert variant="destructive" className="mb-4">
              {errorTitle === "Conta Desativada" ? <ShieldOff className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              <AlertTitle>{errorTitle}</AlertTitle>
              <AlertDescription>
                {authError}
                {/* <<< 6. BOTÃO DE CONTATO ADICIONADO >>> */}
                <Button variant="link" asChild className="p-0 h-auto mt-2 text-destructive font-semibold">
                  <a href="https://wa.me/5513997977755" target="_blank" rel="noopener noreferrer">
                    <Phone className="h-4 w-4 mr-1.5" />
                    Falar com Suporte via WhatsApp
                  </a>
                </Button>
              </AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="voce@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? "Aguarde..." : "Entrar"}
            </Button>
            <div className="mt-4 text-center text-sm">
              Não tem uma conta?{" "}
              <Link to="/register" className="underline text-primary font-medium hover:text-primary/80">
                Cadastre-se aqui
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;