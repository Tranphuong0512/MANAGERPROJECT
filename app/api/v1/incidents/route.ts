import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiRequest } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  try {
    const { authorized, supabase, error: authError, organizationId } = await authenticateApiRequest(request)
    
    if (!authorized) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 })
    }

    let orgId = request.nextUrl.searchParams.get('orgId')
    
    if (organizationId) {
      orgId = organizationId
    }

    if (!orgId) {
      return NextResponse.json({ error: 'Organization ID required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('incidents')
      .select('*')
      .eq('organization_id', orgId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
