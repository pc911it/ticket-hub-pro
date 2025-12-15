-- Add admin approval fields to tickets table
ALTER TABLE public.tickets 
ADD COLUMN IF NOT EXISTS admin_approval_status text DEFAULT 'pending_approval',
ADD COLUMN IF NOT EXISTS admin_approved_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS admin_approved_by uuid,
ADD COLUMN IF NOT EXISTS admin_rejection_reason text;

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_tickets_admin_approval_status ON public.tickets(admin_approval_status);

-- Update existing tickets to be approved (so they don't show as pending)
UPDATE public.tickets SET admin_approval_status = 'approved' WHERE admin_approval_status IS NULL OR admin_approval_status = 'pending_approval';