-- Rename account_details to customer_details
ALTER TABLE IF EXISTS account_details RENAME TO customer_details;

-- Rename tailor_profiles to tailor_details
ALTER TABLE IF EXISTS tailor_profiles RENAME TO tailor_details;

-- Update any foreign key references if needed
-- Uncomment and modify these if you have foreign keys pointing to these tables
-- ALTER TABLE some_table RENAME CONSTRAINT fk_account_details TO fk_customer_details;
-- ALTER TABLE some_table RENAME CONSTRAINT fk_tailor_profiles TO fk_tailor_details;

-- If you have any views or functions that reference these tables, you'll need to update those too 