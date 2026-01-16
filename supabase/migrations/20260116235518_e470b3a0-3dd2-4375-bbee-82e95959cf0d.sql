-- ===========================================
-- PRODUCTION SECURITY HARDENING
-- ===========================================

-- 1. Add session tracking for support chats
ALTER TABLE public.support_chats 
ADD COLUMN IF NOT EXISTS session_id text;

CREATE INDEX IF NOT EXISTS idx_support_chats_session ON public.support_chats(session_id);

-- 2. Fix function search_path security issue
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- 3. Fix support_chats RLS - Remove public read access
DROP POLICY IF EXISTS "Visitors can view their own chats" ON public.support_chats;
DROP POLICY IF EXISTS "Anyone can create support chats" ON public.support_chats;

CREATE POLICY "Users can view their own support chats" 
ON public.support_chats 
FOR SELECT 
USING (
    (auth.uid() IS NOT NULL AND (
        visitor_email = (SELECT email FROM auth.users WHERE id = auth.uid())
        OR EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    ))
    OR (auth.uid() IS NULL AND session_id = current_setting('app.session_id', true))
);

CREATE POLICY "Authenticated users can create support chats" 
ON public.support_chats 
FOR INSERT 
WITH CHECK (true);

-- 4. Fix support_chat_messages RLS - Remove public read access
DROP POLICY IF EXISTS "Anyone can view messages" ON public.support_chat_messages;
DROP POLICY IF EXISTS "Anyone can insert messages" ON public.support_chat_messages;

CREATE POLICY "Users can view messages in their chats" 
ON public.support_chat_messages 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.support_chats sc
        WHERE sc.id = support_chat_messages.chat_id
        AND (
            (auth.uid() IS NOT NULL AND (
                sc.visitor_email = (SELECT email FROM auth.users WHERE id = auth.uid())
                OR EXISTS (
                    SELECT 1 FROM user_roles 
                    WHERE user_id = auth.uid() 
                    AND role IN ('admin', 'super_admin')
                )
            ))
            OR (auth.uid() IS NULL AND sc.session_id = current_setting('app.session_id', true))
        )
    )
);

CREATE POLICY "Users can insert messages in their chats" 
ON public.support_chat_messages 
FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.support_chats sc
        WHERE sc.id = support_chat_messages.chat_id
        AND (
            (auth.uid() IS NOT NULL AND (
                sc.visitor_email = (SELECT email FROM auth.users WHERE id = auth.uid())
                OR EXISTS (
                    SELECT 1 FROM user_roles 
                    WHERE user_id = auth.uid() 
                    AND role IN ('admin', 'super_admin')
                )
            ))
            OR (auth.uid() IS NULL AND sc.session_id = current_setting('app.session_id', true))
        )
    )
);

-- 5. Fix check_super_admin_limit function with proper search_path
CREATE OR REPLACE FUNCTION public.check_super_admin_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    super_admin_count INTEGER;
BEGIN
    IF NEW.role = 'super_admin' THEN
        SELECT COUNT(*) INTO super_admin_count
        FROM public.user_roles
        WHERE role = 'super_admin';
        
        IF super_admin_count >= 2 THEN
            RAISE EXCEPTION 'Maximum of 2 super admins allowed';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

-- 6. Fix handle_new_user function with proper search_path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    super_admin_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO super_admin_count
    FROM public.user_roles
    WHERE role = 'super_admin';
    
    IF super_admin_count = 0 THEN
        INSERT INTO public.user_roles (user_id, role)
        VALUES (NEW.id, 'super_admin');
    ELSE
        INSERT INTO public.user_roles (user_id, role)
        VALUES (NEW.id, 'user');
    END IF;
    
    RETURN NEW;
END;
$$;

-- 7. Fix is_company_member function with proper search_path
CREATE OR REPLACE FUNCTION public.is_company_member(company_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.company_members 
        WHERE company_id = company_uuid 
        AND user_id = auth.uid()
        AND is_active = true
    );
END;
$$;

-- 8. Fix is_company_admin function with proper search_path
CREATE OR REPLACE FUNCTION public.is_company_admin(company_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.company_members 
        WHERE company_id = company_uuid 
        AND user_id = auth.uid()
        AND role IN ('admin', 'super_admin')
        AND is_active = true
    );
END;
$$;

-- 9. Create rate limiting table for brute force protection
CREATE TABLE IF NOT EXISTS public.auth_rate_limits (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address text NOT NULL,
    email text,
    attempt_type text NOT NULL,
    attempts_count integer DEFAULT 1,
    first_attempt_at timestamptz DEFAULT now(),
    last_attempt_at timestamptz DEFAULT now(),
    blocked_until timestamptz
);

CREATE INDEX IF NOT EXISTS idx_auth_rate_limits_ip ON public.auth_rate_limits(ip_address, attempt_type);
CREATE INDEX IF NOT EXISTS idx_auth_rate_limits_email ON public.auth_rate_limits(email, attempt_type);

ALTER TABLE public.auth_rate_limits ENABLE ROW LEVEL SECURITY;

-- 10. Create security audit log table
CREATE TABLE IF NOT EXISTS public.security_audit_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type text NOT NULL,
    user_id uuid,
    ip_address text,
    user_agent text,
    details jsonb,
    created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_security_audit_created ON public.security_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_audit_user ON public.security_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_type ON public.security_audit_log(event_type);

ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- 11. Add RLS policies for new tables (using direct checks, not function call to avoid circular deps)
CREATE POLICY "Super admins can view rate limits"
ON public.auth_rate_limits
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role = 'super_admin'
    )
);

CREATE POLICY "Super admins can view security audit logs"
ON public.security_audit_log
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role = 'super_admin'
    )
);

CREATE POLICY "System can insert security audit logs"
ON public.security_audit_log
FOR INSERT
WITH CHECK (true);