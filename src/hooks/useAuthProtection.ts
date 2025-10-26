import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { User } from '@supabase/supabase-js';

export function useAuthProtection() {
    const [loading, setLoading] = useState(true);
    const [organizationId, setOrganizationId] = useState<string | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const navigate = useNavigate();

    const handleSignOut = useCallback(async (message: string, status: string) => {
        toast.error(message);
        await supabase.auth.signOut();
        navigate(`/login?status=${status}`, { replace: true });
    }, [navigate]);

    useEffect(() => {
        const checkStatus = async () => {
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();

            if (sessionError || !session) {
                navigate('/', { replace: true });
                return;
            }

            setUser(session.user);

            try {
                const { data: profile, error: profileError } = await supabase
                    .from("profiles")
                    // @ts-ignore
                    .select("role, organization_id, is_active, organizations(subscription_status)")
                    .eq("id", session.user.id)
                    .single();

                if (profileError) throw new Error("Perfil não encontrado ou erro de permissão.");

                if (!profile.is_active) {
                    await handleSignOut("Sua conta foi desativada por um administrador.", "disabled");
                    return;
                }

                // @ts-ignore
                const subStatus = profile.organizations?.subscription_status;
                if (subStatus === 'inactive' || subStatus === 'overdue') {
                    await handleSignOut("A assinatura da sua organização expirou.", subStatus);
                    return;
                }

                if (profile.role === 'superadmin') {
                    navigate('/super-admin', { replace: true });
                    return;
                }

                if (!profile.organization_id) {
                    await handleSignOut("Organização não encontrada para este perfil.", "error");
                    return;
                }

                setOrganizationId(profile.organization_id);

            } catch (error: any) {
                await handleSignOut(error.message, "error");
            } finally {
                setLoading(false);
            }
        };

        checkStatus();
    }, [navigate, handleSignOut]);

    return { loading, organizationId, user };
}