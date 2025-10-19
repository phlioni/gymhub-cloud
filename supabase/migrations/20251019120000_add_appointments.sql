-- Create appointments table
CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  modality_id UUID REFERENCES public.modalities(id) ON DELETE SET NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status TEXT CHECK (status IN ('scheduled', 'completed', 'canceled')) DEFAULT 'scheduled',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for appointments
CREATE POLICY "Admins can view their organization's appointments"
  ON public.appointments FOR SELECT
  USING (organization_id = public.get_user_organization_id() OR public.is_superadmin());

CREATE POLICY "Admins can insert appointments in their organization"
  ON public.appointments FOR INSERT
  WITH CHECK (organization_id = public.get_user_organization_id() OR public.is_superadmin());

CREATE POLICY "Admins can update their organization's appointments"
  ON public.appointments FOR UPDATE
  USING (organization_id = public.get_user_organization_id() OR public.is_superadmin());

CREATE POLICY "Admins can delete their organization's appointments"
  ON public.appointments FOR DELETE
  USING (organization_id = public.get_user_organization_id() OR public.is_superadmin());