DO $$
DECLARE
    t_name text;
BEGIN
    FOR t_name IN (
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
    ) LOOP
        -- SELECT
        EXECUTE format('DROP POLICY IF EXISTS super_admin_select ON %I;', t_name);
        EXECUTE format('CREATE POLICY super_admin_select ON %I FOR SELECT USING (is_super_admin());', t_name);
        
        -- INSERT
        EXECUTE format('DROP POLICY IF EXISTS super_admin_insert ON %I;', t_name);
        EXECUTE format('CREATE POLICY super_admin_insert ON %I FOR INSERT WITH CHECK (is_super_admin());', t_name);
        
        -- UPDATE
        EXECUTE format('DROP POLICY IF EXISTS super_admin_update ON %I;', t_name);
        EXECUTE format('CREATE POLICY super_admin_update ON %I FOR UPDATE USING (is_super_admin());', t_name);
        
        -- DELETE
        EXECUTE format('DROP POLICY IF EXISTS super_admin_delete ON %I;', t_name);
        EXECUTE format('CREATE POLICY super_admin_delete ON %I FOR DELETE USING (is_super_admin());', t_name);
    END LOOP;
END;
$$;
