-- Function to handle new user signup and create a personal organization for everyone
CREATE OR REPLACE FUNCTION public.handle_new_user_admin()
RETURNS TRIGGER AS $$
DECLARE
  org_id UUID;
  owner_role_id UUID;
BEGIN
  -- Get owner role id
  SELECT id INTO owner_role_id FROM public.user_roles WHERE name = 'owner' LIMIT 1;
  
  IF owner_role_id IS NOT NULL THEN
    -- Create a default organization for the user
    INSERT INTO public.organizations (name, slug, description)
    VALUES (
      COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)) || '''s Organization', 
      'org-' || extract(epoch from now())::text || '-' || substr(md5(random()::text), 1, 6), 
      'Personal Organization'
    )
    RETURNING id INTO org_id;

    -- Assign the user as owner of the organization
    INSERT INTO public.organization_members (organization_id, user_id, role_id)
    VALUES (org_id, NEW.id, owner_role_id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created_admin ON auth.users;
CREATE TRIGGER on_auth_user_created_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user_admin();

-- Check if ANY existing user doesn't have an organization and create one
DO $$
DECLARE
  target_user RECORD;
  org_id UUID;
  owner_role_id UUID;
BEGIN
  SELECT id INTO owner_role_id FROM public.user_roles WHERE name = 'owner' LIMIT 1;
  
  IF owner_role_id IS NOT NULL THEN
    FOR target_user IN 
      SELECT u.id, u.email, u.raw_user_meta_data 
      FROM auth.users u
      WHERE NOT EXISTS (
        SELECT 1 FROM public.organization_members om WHERE om.user_id = u.id
      )
    LOOP
      -- Create organization
      INSERT INTO public.organizations (name, slug, description)
      VALUES (
        COALESCE(target_user.raw_user_meta_data->>'full_name', split_part(target_user.email, '@', 1)) || '''s Organization', 
        'org-' || extract(epoch from now())::text || '-' || substr(md5(random()::text), 1, 6), 
        'Personal Organization'
      )
      RETURNING id INTO org_id;
      
      -- Assign owner
      INSERT INTO public.organization_members (organization_id, user_id, role_id)
      VALUES (org_id, target_user.id, owner_role_id);
    END LOOP;
  END IF;
END $$;
