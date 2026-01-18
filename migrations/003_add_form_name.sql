-- Add name field to forms
-- The 'email' field becomes the notification email, 'name' is the form's display name

ALTER TABLE forms ADD COLUMN name TEXT;

-- Set default names for existing forms based on email
UPDATE forms SET name = 'Form - ' || substr(email, 1, instr(email, '@') - 1) WHERE name IS NULL;
