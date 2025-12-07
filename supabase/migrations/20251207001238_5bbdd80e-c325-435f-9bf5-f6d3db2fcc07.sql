-- Create company type enum
CREATE TYPE public.company_type AS ENUM ('alarm_company', 'tow_company', 'other');

-- Create job status enum for field updates
CREATE TYPE public.job_status AS ENUM ('assigned', 'en_route', 'on_site', 'working', 'completed', 'cancelled');

-- Companies table (alarm companies, tow companies, etc.)
CREATE TABLE public.companies (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    type company_type NOT NULL DEFAULT 'alarm_company',
    address TEXT,
    phone TEXT,
    email TEXT NOT NULL UNIQUE,
    owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    logo_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Company members linking users to companies with their role
CREATE TABLE public.company_members (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role app_role NOT NULL DEFAULT 'user',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(company_id, user_id)
);

-- Enable RLS
ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;

-- Agents/Employees table (field workers)
CREATE TABLE public.agents (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    phone TEXT,
    vehicle_info TEXT,
    current_location_lat DECIMAL(10, 8),
    current_location_lng DECIMAL(11, 8),
    is_available BOOLEAN NOT NULL DEFAULT true,
    is_online BOOLEAN NOT NULL DEFAULT false,
    last_location_update TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(company_id, user_id)
);

-- Enable RLS
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;

-- Add company_id to tickets table
ALTER TABLE public.tickets 
ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
ADD COLUMN assigned_agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
ADD COLUMN priority TEXT DEFAULT 'normal',
ADD COLUMN call_started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN call_ended_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN total_time_minutes INTEGER,
ADD COLUMN call_type TEXT;

-- Job updates table (real-time status updates from field)
CREATE TABLE public.job_updates (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
    status job_status NOT NULL,
    notes TEXT,
    location_lat DECIMAL(10, 8),
    location_lng DECIMAL(11, 8),
    photo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.job_updates ENABLE ROW LEVEL SECURITY;

-- Notifications table for dispatcher notifications
CREATE TABLE public.notifications (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    ticket_id UUID REFERENCES public.tickets(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info',
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Enable realtime for job updates and notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.job_updates;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.agents;

-- RLS Policies for companies
CREATE POLICY "Company members can view their company"
ON public.companies FOR SELECT
USING (
    id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid())
    OR owner_id = auth.uid()
);

CREATE POLICY "Owners can update their company"
ON public.companies FOR UPDATE
USING (owner_id = auth.uid());

CREATE POLICY "Authenticated users can create companies"
ON public.companies FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- RLS Policies for company_members
CREATE POLICY "Company members can view members of their company"
ON public.company_members FOR SELECT
USING (
    company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid())
);

CREATE POLICY "Company admins can manage members"
ON public.company_members FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.company_members cm 
        WHERE cm.company_id = company_members.company_id 
        AND cm.user_id = auth.uid() 
        AND cm.role = 'admin'
    )
);

-- RLS Policies for agents
CREATE POLICY "Company members can view agents"
ON public.agents FOR SELECT
USING (
    company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid())
);

CREATE POLICY "Dispatchers and admins can manage agents"
ON public.agents FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.company_members cm 
        WHERE cm.company_id = agents.company_id 
        AND cm.user_id = auth.uid() 
        AND cm.role IN ('admin', 'staff')
    )
);

CREATE POLICY "Agents can update their own record"
ON public.agents FOR UPDATE
USING (user_id = auth.uid());

-- RLS Policies for job_updates
CREATE POLICY "Company members can view job updates"
ON public.job_updates FOR SELECT
USING (
    ticket_id IN (
        SELECT t.id FROM public.tickets t
        WHERE t.company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid())
    )
);

CREATE POLICY "Agents can create job updates"
ON public.job_updates FOR INSERT
WITH CHECK (
    agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid())
);

-- RLS Policies for notifications
CREATE POLICY "Users can view their notifications"
ON public.notifications FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Company staff can create notifications"
ON public.notifications FOR INSERT
WITH CHECK (
    company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid())
);

CREATE POLICY "Users can update their notifications"
ON public.notifications FOR UPDATE
USING (user_id = auth.uid());

-- Create trigger for updating timestamps
CREATE TRIGGER update_companies_updated_at
BEFORE UPDATE ON public.companies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_company_members_updated_at
BEFORE UPDATE ON public.company_members
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_agents_updated_at
BEFORE UPDATE ON public.agents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();