CREATE TABLE public.saved_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  item_key text NOT NULL,
  item_type text NOT NULL CHECK (item_type IN ('term', 'prompt')),
  data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, item_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_items TO authenticated;
GRANT ALL ON public.saved_items TO service_role;

ALTER TABLE public.saved_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own saved items"
ON public.saved_items FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can add their own saved items"
ON public.saved_items FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own saved items"
ON public.saved_items FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own saved items"
ON public.saved_items FOR DELETE TO authenticated
USING (user_id = auth.uid());

CREATE INDEX saved_items_user_created_idx
ON public.saved_items (user_id, created_at DESC);

CREATE TRIGGER saved_items_set_updated_at
BEFORE UPDATE ON public.saved_items
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();