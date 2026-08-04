ALTER TABLE public.members ADD COLUMN IF NOT EXISTS user_id uuid;

UPDATE public.members m
SET user_id = u.id
FROM auth.users u
WHERE m.user_id IS NULL AND lower(u.email) = lower(m.email);

CREATE INDEX IF NOT EXISTS members_user_id_idx ON public.members (user_id);

DROP POLICY IF EXISTS "Members can view their own membership row" ON public.members;

CREATE POLICY "Members can view their own membership row"
ON public.members
FOR SELECT
TO authenticated
USING (user_id IS NOT NULL AND user_id = auth.uid());