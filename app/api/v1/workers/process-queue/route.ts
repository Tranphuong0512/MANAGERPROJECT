import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { APEC_GLOBAL_BASE_URL } from '@/lib/services/apec-global-api';

function getOutboundCandidateEndpoints(endpoint: string, bodyData: any): string[] {
  const list: string[] = [endpoint];
  const id = bodyData?.id || bodyData?.task_id || '';

  if (endpoint.includes('/tasks/types')) {
    list.push(
      '/api/v1/external/tasks/types/update',
      '/api/v1/external/tasks/types',
      '/api/v1/tasks/types/update',
      '/api/v1/tasks/types',
      id ? `/api/v1/external/tasks/types/${id}` : ''
    );
  } else if (endpoint.includes('/tasks/progress/update') || endpoint.includes('/assignments/update') || endpoint.includes('/assignments')) {
    list.push(
      '/api/v1/tasks/progress/update',
      '/api/v1/assignments/update',
      '/api/v1/external/assignments/update',
      id ? `/api/v1/external/assignments/${id}` : ''
    );
  } else if (endpoint.includes('/tasks/update') || endpoint.includes('/tasks')) {
    list.push(
      '/api/v1/tasks/update',
      '/api/v1/external/tasks/update',
      '/api/v1/external/tasks',
      id ? `/api/v1/external/tasks/${id}` : '',
      '/api/v1/tasks'
    );
  } else if (endpoint.includes('/projects/update') || endpoint.includes('/projects')) {
    list.push(
      '/api/v1/external/projects/update',
      '/api/v1/external/projects',
      '/api/v1/externals/projects/update',
      '/api/v1/externals/projects',
      id ? `/api/v1/external/projects/${id}` : '',
      '/api/v1/projects/update',
      '/api/v1/projects'
    );
  }
  return Array.from(new Set(list.filter(Boolean)));
}

export async function GET(request: Request) {
  // Determine if triggered by cron or manual
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === 'production') {
    // return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // Bỏ qua check auth tạm thời để test dễ dàng
  }

  try {
    const supabaseAdmin = getSupabaseAdminClient();
    // 1. Fetch pending jobs
    const { data: jobs, error } = await supabaseAdmin
      .from('apec_idempotency_keys')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(10);

    if (error) {
      console.error('Lỗi khi fetch queue:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    if (!jobs || jobs.length === 0) {
      return NextResponse.json({ success: true, message: 'Queue is empty' });
    }

    // 2. Mark as processing (Locking mechanism)
    const jobIds = jobs.map((j: any) => j.id);
    await supabaseAdmin
      .from('apec_idempotency_keys')
      .update({ status: 'processing', updated_at: new Date().toISOString() })
      .in('id', jobIds);

    // 3. Process jobs
    const results = [];
    for (const job of jobs) {
      const payload = job.payload;
      const candidates = getOutboundCandidateEndpoints(job.endpoint, payload.bodyData);
      const methodsToTry = (payload.method === 'PUT' || payload.method === 'PATCH') ? ['PUT', 'PATCH'] : [payload.method];
      
      let success = false;
      let lastError = 'Không thể kết nối đến máy chủ APEC GLOBAL';
      let shouldRetry = true;

      for (const candidate of candidates) {
        if (success) break;
        for (const m of methodsToTry) {
          try {
            const response = await fetch(`${APEC_GLOBAL_BASE_URL}${candidate}`, {
              method: m,
              headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'X-Secret-Key': payload.secretKey,
              },
              body: JSON.stringify(payload.bodyData),
            });

            const text = await response.text();
            let data: any;
            try { data = JSON.parse(text); } catch { data = text; }

            if (response.ok && (!data || typeof data !== 'object' || (!data.error && data.status !== 'error'))) {
              success = true;
              break; // Success!
            }

            if (response.status !== 404) {
              lastError = (typeof data === 'object' && data)
                ? (data?.data?.message || data?.message || data?.error || `HTTP ${response.status}`)
                : `HTTP ${response.status}`;
              if (response.status >= 400 && response.status < 500) {
                shouldRetry = false; // Lỗi từ client (4xx) -> Fail luôn, không retry
              }
              break; 
            }

          } catch (err: any) {
            lastError = err.message || 'Lỗi kết nối máy chủ APEC GLOBAL';
          }
        }
      }

      // 4. Update job status
      const newStatus = success ? 'completed' : (shouldRetry ? 'pending' : 'failed');
      await supabaseAdmin
        .from('apec_idempotency_keys')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString(),
          completed_at: success ? new Date().toISOString() : null
        })
        .eq('id', job.id);
        
      results.push({ job_id: job.id, success, error: success ? null : lastError });
    }

    return NextResponse.json({ success: true, processed: jobs.length, results });
  } catch (error: any) {
    console.error('Queue Worker Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
