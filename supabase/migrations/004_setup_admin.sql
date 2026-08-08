-- Function to handle new user signup and set admin if email matches
CREATE OR REPLACE FUNCTION public.handle_new_user_admin()
RETURNS TRIGGER AS $$
DECLARE
  org_id UUID;
  owner_role_id UUID;
BEGIN
  -- We only care about this specific email
  IF NEW.email = 'tranphuong0512@gmail.com' THEN
    -- Get owner role id
    SELECT id INTO owner_role_id FROM public.user_roles WHERE name = 'owner' LIMIT 1;
    
    IF owner_role_id IS NOT NULL THEN
      -- Create a default organization for the admin
      INSERT INTO public.organizations (name, slug, description)
      VALUES ('Admin Organization', 'admin-org-' || extract(epoch from now())::text, 'Default Admin Organization')
      RETURNING id INTO org_id;

      -- Assign the user as owner of the organization
      INSERT INTO public.organization_members (organization_id, user_id, role_id)
      VALUES (org_id, NEW.id, owner_role_id);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created_admin ON auth.users;
CREATE TRIGGER on_auth_user_created_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user_admin();

-- Check if user already exists and setup
DO $$
DECLARE
  target_user_id UUID;
  org_id UUID;
  owner_role_id UUID;
BEGIN
  SELECT id INTO target_user_id FROM auth.users WHERE email = 'tranphuong0512@gmail.com' LIMIT 1;
  
  IF target_user_id IS NOT NULL THEN
    -- Check if they are already in an organization as owner
    SELECT id INTO owner_role_id FROM public.user_roles WHERE name = 'owner' LIMIT 1;
    
    IF NOT EXISTS (
      SELECT 1 FROM public.organization_members 
      WHERE user_id = target_user_id AND role_id = owner_role_id
    ) THEN
      -- Create admin organization
      INSERT INTO public.organizations (name, slug, description)
      VALUES ('Admin Organization', 'admin-org-' || extract(epoch from now())::text, 'Default Admin Organization')
      RETURNING id INTO org_id;
      
      -- Assign owner
      INSERT INTO public.organization_members (organization_id, user_id, role_id)
      VALUES (org_id, target_user_id, owner_role_id)
      ON CONFLICT (organization_id, user_id) DO UPDATE SET role_id = EXCLUDED.role_id;
    END IF;
  END IF;
END $$;
