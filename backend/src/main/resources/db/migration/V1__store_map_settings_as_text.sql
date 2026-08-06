DO $$
DECLARE
    settings_json_type text;
BEGIN
    SELECT data_type
    INTO settings_json_type
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'user_map_settings'
      AND column_name = 'settings_json';

    IF settings_json_type = 'oid' THEN
        ALTER TABLE user_map_settings
            ALTER COLUMN settings_json TYPE text
            USING convert_from(lo_get(settings_json), 'UTF8');
    END IF;
END
$$;
