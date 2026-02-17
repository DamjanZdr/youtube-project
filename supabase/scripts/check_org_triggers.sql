-- Check for existing triggers on organizations table
SELECT tgname, tgenabled 
FROM pg_trigger 
WHERE tgrelid = 'organizations'::regclass;
