ALTER TABLE public.direct_message_messages
ADD COLUMN IF NOT EXISTS forwarded boolean DEFAULT false;
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS forwarded boolean DEFAULT false;