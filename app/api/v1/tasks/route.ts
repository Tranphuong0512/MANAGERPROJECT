import { NextRequest, NextResponse } from 'next/server'
import { createTaskSchema } from '@/lib/schemas'
import { authenticateApiRequest } from '@/lib/api-auth'
import { executeBiDirectionalSync } from '@/lib/services/apec-bi-sync'

export async function GET(request: NextRequest) {
  try {
    const { authorized, supabase, error: authError, organizationId } = await authenticateApiRequest(request)
    
    if (!authorized) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 })
    }

    const projectId = request.nextUrl.searchParams.get('projectId')
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('tasks')
      .select(
        `
        *,
        assigned_user:profiles (full_name, avatar_url)
      `
      )
      .eq('project_id', projectId)
      .is('deleted_at', null)
      .eq('parent_task_id', null)
      .order('created_at', { ascending: false })

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
    const validation = createTaskSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ error: (validation.error as any).errors }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('tasks')
      .insert([
        {
          ...validation.data,
          created_by: userId || null,
        },
      ])
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Record in history if user ID exists
    if (userId) {
      await supabase.from('task_history').insert([
        {
          task_id: data.id,
          action: 'created',
          changed_by: userId,
        },
      ])
    }

    // Đồng bộ 2 chiều lên APEC GLOBAL API (Task / Nhiệm vụ / Sự Cố & Cải Tiến)
    await executeBiDirectionalSync({
      entityType: 'task',
      action: 'CREATE',
      data,
      organizationId,
      changedBy: userId,
    });

    return NextResponse.json(data, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

