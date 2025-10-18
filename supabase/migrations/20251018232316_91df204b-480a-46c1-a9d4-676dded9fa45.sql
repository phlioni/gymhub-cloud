-- Create organizations table
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  owner_name TEXT,
  phone_number TEXT,
  business_hours TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Create profiles table (extends auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'superadmin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create students table
CREATE TABLE public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  cpf TEXT,
  birth_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- Create modalities table
CREATE TABLE public.modalities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.modalities ENABLE ROW LEVEL SECURITY;

-- Create enrollments table
CREATE TABLE public.enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  modality_id UUID NOT NULL REFERENCES public.modalities(id) ON DELETE CASCADE,
  expiry_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

-- Create schedules table
CREATE TABLE public.schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modality_id UUID NOT NULL REFERENCES public.modalities(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 1 AND day_of_week <= 7),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  max_students INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;

-- Create products table
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  brand TEXT,
  price NUMERIC(10, 2) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Create sales table
CREATE TABLE public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
  quantity_sold INTEGER NOT NULL,
  total_price NUMERIC(10, 2) NOT NULL,
  sale_date TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

-- Create a security definer function to get user's organization_id
CREATE OR REPLACE FUNCTION public.get_user_organization_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.profiles WHERE id = auth.uid();
$$;

-- Create a security definer function to check if user is superadmin
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'superadmin'
  );
$$;

-- RLS Policies for organizations
CREATE POLICY "Superadmins can view all organizations"
  ON public.organizations FOR SELECT
  USING (public.is_superadmin());

CREATE POLICY "Admins can view their organization"
  ON public.organizations FOR SELECT
  USING (id = public.get_user_organization_id());

CREATE POLICY "Superadmins can insert organizations"
  ON public.organizations FOR INSERT
  WITH CHECK (public.is_superadmin());

CREATE POLICY "Superadmins can update organizations"
  ON public.organizations FOR UPDATE
  USING (public.is_superadmin());

CREATE POLICY "Admins can update their organization"
  ON public.organizations FOR UPDATE
  USING (id = public.get_user_organization_id());

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Superadmins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_superadmin());

CREATE POLICY "Superadmins can insert profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (public.is_superadmin());

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid());

-- RLS Policies for students
CREATE POLICY "Admins can view their organization's students"
  ON public.students FOR SELECT
  USING (organization_id = public.get_user_organization_id() OR public.is_superadmin());

CREATE POLICY "Admins can insert students in their organization"
  ON public.students FOR INSERT
  WITH CHECK (organization_id = public.get_user_organization_id() OR public.is_superadmin());

CREATE POLICY "Admins can update their organization's students"
  ON public.students FOR UPDATE
  USING (organization_id = public.get_user_organization_id() OR public.is_superadmin());

CREATE POLICY "Admins can delete their organization's students"
  ON public.students FOR DELETE
  USING (organization_id = public.get_user_organization_id() OR public.is_superadmin());

-- RLS Policies for modalities
CREATE POLICY "Admins can view their organization's modalities"
  ON public.modalities FOR SELECT
  USING (organization_id = public.get_user_organization_id() OR public.is_superadmin());

CREATE POLICY "Admins can insert modalities in their organization"
  ON public.modalities FOR INSERT
  WITH CHECK (organization_id = public.get_user_organization_id() OR public.is_superadmin());

CREATE POLICY "Admins can update their organization's modalities"
  ON public.modalities FOR UPDATE
  USING (organization_id = public.get_user_organization_id() OR public.is_superadmin());

CREATE POLICY "Admins can delete their organization's modalities"
  ON public.modalities FOR DELETE
  USING (organization_id = public.get_user_organization_id() OR public.is_superadmin());

-- RLS Policies for enrollments
CREATE POLICY "Admins can view enrollments for their organization's students"
  ON public.enrollments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.students 
      WHERE students.id = enrollments.student_id 
      AND (students.organization_id = public.get_user_organization_id() OR public.is_superadmin())
    )
  );

CREATE POLICY "Admins can insert enrollments for their organization's students"
  ON public.enrollments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.students 
      WHERE students.id = enrollments.student_id 
      AND (students.organization_id = public.get_user_organization_id() OR public.is_superadmin())
    )
  );

CREATE POLICY "Admins can update enrollments for their organization's students"
  ON public.enrollments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.students 
      WHERE students.id = enrollments.student_id 
      AND (students.organization_id = public.get_user_organization_id() OR public.is_superadmin())
    )
  );

CREATE POLICY "Admins can delete enrollments for their organization's students"
  ON public.enrollments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.students 
      WHERE students.id = enrollments.student_id 
      AND (students.organization_id = public.get_user_organization_id() OR public.is_superadmin())
    )
  );

-- RLS Policies for schedules
CREATE POLICY "Admins can view schedules for their organization's modalities"
  ON public.schedules FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.modalities 
      WHERE modalities.id = schedules.modality_id 
      AND (modalities.organization_id = public.get_user_organization_id() OR public.is_superadmin())
    )
  );

CREATE POLICY "Admins can insert schedules for their organization's modalities"
  ON public.schedules FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.modalities 
      WHERE modalities.id = schedules.modality_id 
      AND (modalities.organization_id = public.get_user_organization_id() OR public.is_superadmin())
    )
  );

CREATE POLICY "Admins can update schedules for their organization's modalities"
  ON public.schedules FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.modalities 
      WHERE modalities.id = schedules.modality_id 
      AND (modalities.organization_id = public.get_user_organization_id() OR public.is_superadmin())
    )
  );

CREATE POLICY "Admins can delete schedules for their organization's modalities"
  ON public.schedules FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.modalities 
      WHERE modalities.id = schedules.modality_id 
      AND (modalities.organization_id = public.get_user_organization_id() OR public.is_superadmin())
    )
  );

-- RLS Policies for products
CREATE POLICY "Admins can view their organization's products"
  ON public.products FOR SELECT
  USING (organization_id = public.get_user_organization_id() OR public.is_superadmin());

CREATE POLICY "Admins can insert products in their organization"
  ON public.products FOR INSERT
  WITH CHECK (organization_id = public.get_user_organization_id() OR public.is_superadmin());

CREATE POLICY "Admins can update their organization's products"
  ON public.products FOR UPDATE
  USING (organization_id = public.get_user_organization_id() OR public.is_superadmin());

CREATE POLICY "Admins can delete their organization's products"
  ON public.products FOR DELETE
  USING (organization_id = public.get_user_organization_id() OR public.is_superadmin());

-- RLS Policies for sales
CREATE POLICY "Admins can view their organization's sales"
  ON public.sales FOR SELECT
  USING (organization_id = public.get_user_organization_id() OR public.is_superadmin());

CREATE POLICY "Admins can insert sales in their organization"
  ON public.sales FOR INSERT
  WITH CHECK (organization_id = public.get_user_organization_id() OR public.is_superadmin());

-- Create function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, organization_id, full_name, role)
  VALUES (
    new.id,
    (new.raw_user_meta_data->>'organization_id')::uuid,
    new.raw_user_meta_data->>'full_name',
    COALESCE(new.raw_user_meta_data->>'role', 'admin')
  );
  RETURN new;
END;
$$;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();