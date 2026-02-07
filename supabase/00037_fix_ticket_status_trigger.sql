-- Fix ticket status update trigger
-- When user replies to 'responded' ticket: set to 'awaiting_response'
-- When admin replies to 'new' or 'awaiting_response': set to 'responded'
-- New tickets stay 'new' until admin responds

CREATE OR REPLACE FUNCTION update_ticket_status_on_message()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_admin THEN
    -- Admin replied, set to responded (whether from 'new' or 'awaiting_response')
    UPDATE support_tickets 
    SET status = 'responded', updated_at = NOW() 
    WHERE id = NEW.ticket_id AND status IN ('new', 'awaiting_response');
  ELSE
    -- User replied to a ticket where admin already responded
    -- Only change to awaiting_response if admin has responded before
    UPDATE support_tickets 
    SET status = 'awaiting_response', updated_at = NOW() 
    WHERE id = NEW.ticket_id AND status = 'responded';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS update_ticket_status_trigger ON support_ticket_messages;

CREATE TRIGGER update_ticket_status_trigger
  AFTER INSERT ON support_ticket_messages
  FOR EACH ROW EXECUTE FUNCTION update_ticket_status_on_message();
