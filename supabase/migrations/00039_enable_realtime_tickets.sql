-- Enable Realtime for support ticket tables
-- This allows clients to receive live updates for ticket messages

-- Add tables to the realtime publication
-- This is idempotent - won't fail if already added
DO $$
BEGIN
  -- Check if support_ticket_messages is already in the publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'support_ticket_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE support_ticket_messages;
  END IF;
  
  -- Check if support_tickets is already in the publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'support_tickets'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE support_tickets;
  END IF;
END $$;
