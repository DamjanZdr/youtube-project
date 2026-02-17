-- Enforce maximum 6 packaging sets per project at the database level
-- This prevents bypassing frontend limits via DevTools or direct API calls

CREATE OR REPLACE FUNCTION check_packaging_sets_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM packaging_sets WHERE project_id = NEW.project_id) >= 6 THEN
    RAISE EXCEPTION 'Maximum of 6 packaging sets per project allowed';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_packaging_sets_limit ON packaging_sets;

CREATE TRIGGER enforce_packaging_sets_limit
  BEFORE INSERT ON packaging_sets
  FOR EACH ROW
  EXECUTE FUNCTION check_packaging_sets_limit();
