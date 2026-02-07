-- Fix ticket status update trigger to properly handle all states
-- When user replies: should set to 'awaiting_response' (from 'responded' or 'new')
-- When admin replies: should set to 'responded' (from 'new' or 'awaiting_response')

CREATE OR REPLACE FUNCTION update_ticket_status_on_message()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_admin THEN
    -- Admin replied, set to responded (whether from 'new' or 'awaiting_response')
    UPDATE support_tickets 
    SET status = 'responded', updated_at = NOW() 
    WHERE id = NEW.ticket_id AND status IN ('new', 'awaiting_response');
  ELSE
    -- User replied, set to awaiting response (from 'new' or 'responded')
    -- This covers: initial message after ticket creation, or replying after admin responds
    UPDATE support_tickets 
    SET status = 'awaiting_response', updated_at = NOW() 
    WHERE id = NEW.ticket_id AND status IN ('new', 'responded');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS update_ticket_status_trigger ON support_ticket_messages;

CREATE TRIGGER update_ticket_status_trigger
  AFTER INSERT ON support_ticket_messages
  FOR EACH ROW EXECUTE FUNCTION update_ticket_status_on_message();
