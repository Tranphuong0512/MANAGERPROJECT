import { NextRequest, NextResponse } from 'next/server'
import { updateTaskSchema } from '@/lib/schemas'
import { authenticateApiRequest } from '@/lib/api-auth'

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

    const { data, error } = await supabase
      .from('tasks')
      .select(
        `
        *,
        assigned_user:profiles (full_name, avatar_url),
        subtasks:tasks (count),
        history:task_history (count)
      `
      )
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Không tìm thấy công việc' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, supabase, error: authError, userId, organizationId } = await authenticateApiRequest(request)
    const id = (await params).id
    
    if (!authorized) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Validate input
    const validation = updateTaskSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ error: (validation.error as any).errors }, { status: 400 })
    }

    // Get current task for tracking changes
    const { data: currentTask } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .single()

    const { data, error } = await supabase
      .from('tasks')
      .update({
        ...validation.data,
        updated_at: new Date().toISOString(),
        version: (currentTask?.version || 0) + 1,
        change_count: (currentTask?.change_count || 0) + 1,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Record changes in history if user ID exists
    if (userId) {
      for (const [key, value] of Object.entries(validation.data)) {
        if (currentTask && currentTask[key as keyof typeof currentTask] !== value) {
          await supabase.from('task_history').insert([
            {
              task_id: id,
              action: 'updated',
              field_name: key,
              old_value: String(currentTask[key as keyof typeof currentTask] || ''),
              new_value: String(value),
              changed_by: userId,
            },
          ])
        }
      }
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
    const { authorized, supabase, error: authError, organizationId } = await authenticateApiRequest(request)
    const id = (await params).id
    
    if (!authorized) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 })
    }

    const { error } = await supabase
      .from('tasks')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
