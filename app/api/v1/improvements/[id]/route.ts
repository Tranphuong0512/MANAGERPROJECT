import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiRequest } from '@/lib/api-auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, supabase, error: authError } = await authenticateApiRequest(request)
    const id = (await params).id
    
    if (!authorized) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('improvements')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Không tìm thấy cải tiến' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
