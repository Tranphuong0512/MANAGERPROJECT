import { NextRequest, NextResponse } from 'next/server'
import { createProjectSchema } from '@/lib/schemas'
import { authenticateApiRequest } from '@/lib/api-auth'
import { executeBiDirectionalSync } from '@/lib/services/apec-bi-sync'

export async function GET(request: NextRequest) {
  try {
    const { authorized, supabase, error: authError, organizationId } = await authenticateApiRequest(request)
    
    if (!authorized) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 })
    }

    let orgId = request.nextUrl.searchParams.get('orgId')
    
    // If authenticated via API Key, we can enforce or default to the key's organization
    if (organizationId) {
      orgId = organizationId
    }

    if (!orgId) {
      return NextResponse.json({ error: 'Organization ID required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        project_members (count),
        tasks (count)
      `)
      .eq('organization_id', orgId)
      .is('deleted_at', null)
      .order('updated_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { authorized, supabase, error: authError, userId, organizationId } = await authenticateApiRequest(request)
    
    if (!authorized) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Validate input
    const validation = createProjectSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.issues }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('projects')
      .insert([
        {
          ...validation.data,
          organization_id: organizationId || validation.data.organization_id,
          created_by: userId || null, // API keys might not have a specific user
        },
      ])
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Add creator as project member with owner role
    const { data: ownerRole } = await supabase
      .from('user_roles')
      .select('id')
      .eq('name', 'owner')
      .single()

    if (ownerRole && userId) {
      await supabase.from('project_members').insert([
        {
          project_id: data.id,
          user_id: userId,
          role_id: ownerRole.id,
        },
      ])
    }

    // Đồng bộ 2 chiều lên APEC GLOBAL API (Project)
    await executeBiDirectionalSync({
      entityType: 'project',
      action: 'CREATE',
      data,
      organizationId: data.organization_id,
      changedBy: userId,
    });

    return NextResponse.json(data, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

