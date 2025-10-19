import { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Sidebar } from '@/components/Sidebar';
import { Skeleton } from '@/components/ui/skeleton';

interface Organization {
    name: string;
    logo_url: string | null;
}

const AppLayout = () => {
    const [organization, setOrganization] = useState<Organization | null>(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchUserAndOrg = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                navigate('/');
                return;
            }

            const { data: profile } = await supabase
                .from('profiles')
                .select('role, organization_id')
                .eq('id', session.user.id)
                .single();

            if (profile?.role === 'superadmin') {
                navigate('/super-admin');
                return;
            }

            if (profile?.organization_id) {
                const { data: orgData, error: orgError } = await supabase
                    .from('organizations')
                    .select('name, logo_url')
                    .eq('id', profile.organization_id)
                    .single();

                if (orgError) {
                    console.error("Erro ao buscar organização:", orgError);
                    setLoading(false);
                    return;
                }
                setOrganization(orgData);
            }
            setLoading(false);
        };

        fetchUserAndOrg();
    }, [navigate]);

    if (loading) {
        return (
            <div className="flex min-h-screen">
                <div className="flex flex-col w-64 bg-sidebar border-r border-sidebar-border h-screen sticky top-0 p-4 space-y-4">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                </div>
                <main className="flex-1 p-8">
                    <Skeleton className="h-full w-full" />
                </main>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-muted/20">
            <Sidebar organizationName={organization?.name} logoUrl={organization?.logo_url} />
            <div className="flex-1">
                <Outlet />
            </div>
        </div>
    );
};

export default AppLayout;