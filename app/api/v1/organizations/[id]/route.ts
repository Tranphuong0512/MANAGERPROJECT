import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiRequest } from '@/lib/api-auth'
import { executeBiDirectionalSync } from '@/lib/services/apec-bi-sync'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, supabase, error: authError, organizationId } = await authenticateApiRequest(request)
    const id = (await params).id
    
    if (!authorized) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 })
    }

    // If using API Key, ensure they can only fetch their own organization
    if (organizationId && organizationId !== id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}


export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = (await params).id
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.slice(7)
    
    // Use anon key to verify the user first
    const authClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    
    const { data: { user }, error: authError } = await authClient.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify if user is super admin
    const { data: profile } = await authClient.from('profiles').select('role').eq('id', user.id).single()
    
    if (profile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden. Super admin only.' }, { status: 403 })
    }

    // Use service role key to perform the deletion and bypass RLS
    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { error } = await serviceClient
      .from('organizations')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Đồng bộ 2 chiều lên APEC GLOBAL API (Company Delete)
    await executeBiDirectionalSync({
      entityType: 'company',
      action: 'DELETE',
      data: { id, ids: [id] },
      changedBy: user.id,
    });

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

