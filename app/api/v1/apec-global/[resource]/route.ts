import { NextRequest, NextResponse } from 'next/server';
import { getCachedOrFetch, invalidateCache } from '@/lib/services/server-cache';
import { addDeletedItem, isItemDeleted } from '@/lib/services/deleted-items-store';

import {
  getApecCompanies,
  getApecProjects,
  getApecEmployees,
  getApecTasks,
  getApecDepartments,
  getApecTaskTypes,
  getApecAssignments,
  getApecKpiItems,
  ApecQueryParams,
} from '@/lib/services/apec-global-api';
import {
  syncCompanyOutbound,
  syncDepartmentOutbound,
  syncProjectOutbound,
  syncTaskTypeOutbound,
  syncTaskOutbound,
  syncAssignmentOutbound,
  syncTaskApproveOutbound,
} from '@/lib/services/apec-outbound-sync';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ resource: string }> }
) {
  try {
    const { resource } = await params;
    const { searchParams } = new URL(request.url);
    const customSecretKey =
      request.headers.get('x-secret-key') ||
      process.env.APEC_GLOBAL_SECRET_KEY;

    const queryParams: ApecQueryParams = {
      id: searchParams.get('id') || undefined,
      search: searchParams.get('search') || undefined,
    };

    const cacheKey = `apec-global:${resource}:${JSON.stringify(queryParams)}`;
    const result = await getCachedOrFetch(
      cacheKey,
      async () => {
        let res: any;
        switch (resource) {
          case 'companies':
            res = await getApecCompanies(queryParams, customSecretKey);
            break;
          case 'departments':
            res = await getApecDepartments(queryParams, customSecretKey);
            break;
          case 'projects':
            res = await getApecProjects(queryParams, customSecretKey);
            try {
              const allTasksRes = await getApecTasks({ limit: 1000 }, customSecretKey);
              const allTasks = allTasksRes?.items || [];
              const statsMap = new Map<string | number, { total: number; active: number; review: number; done: number }>();

              for (const t of allTasks) {
                const prjId = t.project?.id || t.project_id || 62;
                if (!statsMap.has(prjId)) {
                  statsMap.set(prjId, { total: 0, active: 0, review: 0, done: 0 });
                }
                const st = statsMap.get(prjId)!;
                st.total += 1;

                const taskStatus = t.task_status?.id || (typeof t.status === 'object' && t.status ? t.status?.id : t.status);
                const statusName = typeof t.status === 'object' ? t.status?.name || '' : String(t.status || '');
                const statusLower = statusName.toLowerCase();
                const ea = Array.isArray(t.employee_assignments) ? t.employee_assignments : [];
                const isApprovedByBoss = ea.length > 0 && ea.every((assign: any) => assign.checked === true);
                const isDone = isApprovedByBoss || taskStatus === 4 || t.status === 'done' || t.status === 'completed' || t.status === 'resolved' || statusLower.includes('đã duyệt') || statusLower.includes('hoàn thành') || Boolean(t.is_completed);
                const isReview = !isDone && (taskStatus === 3 || t.status === 'review' || statusLower.includes('chờ') || statusLower.includes('đợi') || statusLower.includes('pending') || Number(t.process ?? t.progress ?? 0) >= 100);

                if (isDone) {
                  st.done += 1;
                } else if (isReview) {
                  st.review += 1;
                  st.active += 1; // Đang thực hiện gom cả Chưa làm, Đang làm & Chờ duyệt!
                } else {
                  st.active += 1;
                }
              }

              if (Array.isArray(res?.items)) {
                res.items = res.items.map((p: any) => {
                  const s = statsMap.get(p.id) || { total: 0, active: 0, review: 0, done: 0 };
                  return {
                    ...p,
                    total_tasks: s.total,
                    task_stats: s
                  };
                });
              }
            } catch (err) {
              console.warn('Lỗi tính task_stats cho projects:', err);
            }
            break;
          case 'employees':
            res = await getApecEmployees(queryParams, customSecretKey);
            break;
          case 'task-types':
          case 'task_types':
          case 'checklists':
            res = await getApecTaskTypes(queryParams, customSecretKey);
            break;
          case 'tasks':
          case 'checklist-items':
          case 'checklist_items':
            res = await getApecTasks(queryParams, customSecretKey);
            if (Array.isArray(res?.items)) {
              res.items = res.items.filter((t: any) => !isItemDeleted(t.id, t.name || t.title));
            }
            break;
          case 'assignments':
          case 'employee_assignments':
          case 'subtasks':
          case 'jobs':
            res = await getApecAssignments(queryParams, customSecretKey);
            break;
          case 'kpi-items':
          case 'kpi_items':
          case 'kpis':
          case 'kpi':
            res = await getApecKpiItems(queryParams, customSecretKey);
            break;
          default:
            res = {
              success: false,
              error: `Tài nguyên '${resource}' không hợp lệ. Sử dụng: companies, departments, projects, employees, task-types, tasks, assignments, kpi-items.`,
              status: 400,
            };
            break;
        }
        return res;
      },
      { staleTimeMs: 15_000, expireTimeMs: 300_000 }
    );

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Lỗi khi gọi API APEC GLOBAL',
          status: result.status,
          items: [],
          detail: null,
        },
        { status: result.status || 500 }
      );
    }

    let finalItems = result.items || [];
    if (resource === 'tasks' || resource === 'checklist-items' || resource === 'checklist_items') {
      finalItems = finalItems.filter((t: any) => !isItemDeleted(t.id, t.name || t.title));
    }

    return NextResponse.json({
      success: true,
      items: finalItems,
      detail: result.detail || null,
      raw: result.data,
      status: result.status,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ resource: string }> }
) {
  try {
    const { resource } = await params;
    const bodyData = await request.json();
    const customSecretKey =
      request.headers.get('x-secret-key') ||
      process.env.APEC_GLOBAL_SECRET_KEY;

    let result;
    switch (resource) {
      case 'checklists':
      case 'task-types':
      case 'task_types':
        result = await syncTaskTypeOutbound('CREATE', bodyData, 'WEB_CLIENT', customSecretKey);
        break;
      case 'tasks':
      case 'checklist-items':
      case 'checklist_items':
        result = await syncTaskOutbound('CREATE', bodyData, 'WEB_CLIENT', customSecretKey);
        break;
      case 'assignments':
      case 'employee_assignments':
      case 'subtasks':
      case 'jobs':
        result = await syncAssignmentOutbound('CREATE', bodyData, 'WEB_CLIENT', customSecretKey);
        break;
      case 'projects':
        result = await syncProjectOutbound('CREATE', bodyData, 'WEB_CLIENT', customSecretKey);
        break;
      case 'departments':
        result = await syncDepartmentOutbound('CREATE', bodyData, 'WEB_CLIENT', customSecretKey);
        break;
      case 'companies':
        result = await syncCompanyOutbound('CREATE', bodyData, 'WEB_CLIENT', customSecretKey);
        break;
      default:
        return NextResponse.json(
          { error: `Tài nguyên '${resource}' không hỗ trợ tạo mới trên APEC GLOBAL.` },
          { status: 400 }
        );
    }
    if (result?.success) {
      invalidateCache('apec-global:');
      invalidateCache('stats:');
      invalidateCache('board-data:');
    }
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ resource: string }> }
) {
  try {
    const { resource } = await params;
    const bodyData = await request.json();
    const customSecretKey =
      request.headers.get('x-secret-key') ||
      process.env.APEC_GLOBAL_SECRET_KEY;

    let result;
    switch (resource) {
      case 'checklists':
      case 'task-types':
      case 'task_types':
        result = await syncTaskTypeOutbound('UPDATE', bodyData, 'WEB_CLIENT', customSecretKey);
        break;
      case 'approve':
      case 'tasks-approve':
      case 'tasks_approve':
        result = await syncTaskApproveOutbound(bodyData.task_assignment_id || bodyData.id, 'WEB_CLIENT', customSecretKey);
        break;
      case 'tasks':
      case 'checklist-items':
      case 'checklist_items':
        if (bodyData.task_assignment_id) {
          result = await syncTaskApproveOutbound(bodyData.task_assignment_id, 'WEB_CLIENT', customSecretKey);
        } else {
          result = await syncTaskOutbound('UPDATE', bodyData, 'WEB_CLIENT', customSecretKey);
        }
        break;
      case 'assignments':
      case 'employee_assignments':
      case 'subtasks':
      case 'jobs':
        result = await syncAssignmentOutbound('UPDATE', bodyData, 'WEB_CLIENT', customSecretKey);
        break;
      case 'projects':
        result = await syncProjectOutbound('UPDATE', bodyData, 'WEB_CLIENT', customSecretKey);
        break;
      case 'departments':
        result = await syncDepartmentOutbound('UPDATE', bodyData, 'WEB_CLIENT', customSecretKey);
        break;
      case 'companies':
        result = await syncCompanyOutbound('UPDATE', bodyData, 'WEB_CLIENT', customSecretKey);
        break;
      default:
        return NextResponse.json(
          { error: `Tài nguyên '${resource}' không hỗ trợ cập nhật trên APEC GLOBAL.` },
          { status: 400 }
        );
    }
    if (result?.success) {
      invalidateCache('apec-global:');
      invalidateCache('stats:');
      invalidateCache('board-data:');
      return NextResponse.json(result, { status: 200 });
    }
    const statusCode = (result as any)?.status || 400;
    return NextResponse.json(
      {
        ...result,
        success: false,
        error: result?.error || result?.message || 'Không thể cập nhật trên APEC GLOBAL',
      },
      { status: statusCode }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ resource: string }> }
) {
  try {
    const { resource } = await params;
    const bodyData = await request.json();
    const customSecretKey =
      request.headers.get('x-secret-key') ||
      process.env.APEC_GLOBAL_SECRET_KEY;

    let result;
    switch (resource) {
      case 'checklists':
      case 'task-types':
      case 'task_types':
        result = await syncTaskTypeOutbound('UPDATE', bodyData, 'WEB_CLIENT', customSecretKey);
        break;
      case 'tasks':
      case 'checklist-items':
      case 'checklist_items':
        result = await syncTaskOutbound('UPDATE', bodyData, 'WEB_CLIENT', customSecretKey);
        break;
      case 'assignments':
      case 'employee_assignments':
      case 'subtasks':
      case 'jobs':
        result = await syncAssignmentOutbound('UPDATE', bodyData, 'WEB_CLIENT', customSecretKey);
        break;
      case 'projects':
        result = await syncProjectOutbound('UPDATE', bodyData, 'WEB_CLIENT', customSecretKey);
        break;
      case 'departments':
        result = await syncDepartmentOutbound('UPDATE', bodyData, 'WEB_CLIENT', customSecretKey);
        break;
      case 'companies':
        result = await syncCompanyOutbound('UPDATE', bodyData, 'WEB_CLIENT', customSecretKey);
        break;
      default:
        return NextResponse.json(
          { error: `Tài nguyên '${resource}' không hỗ trợ cập nhật trên APEC GLOBAL.` },
          { status: 400 }
        );
    }
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ resource: string }> }
) {
  try {
    const { resource } = await params;
    const bodyData = await request.json();
    const customSecretKey =
      request.headers.get('x-secret-key') ||
      process.env.APEC_GLOBAL_SECRET_KEY;

    let result;
    switch (resource) {
      case 'checklists':
      case 'task-types':
      case 'task_types':
        addDeletedItem(bodyData.id || (bodyData.ids && bodyData.ids[0]), bodyData.name || bodyData.title);
        result = await syncTaskTypeOutbound('DELETE', bodyData, 'WEB_CLIENT', customSecretKey);
        break;
      case 'tasks':
      case 'checklist-items':
      case 'checklist_items':
        addDeletedItem(bodyData.id || (bodyData.ids && bodyData.ids[0]), bodyData.name || bodyData.title);
        result = await syncTaskOutbound('DELETE', bodyData, 'WEB_CLIENT', customSecretKey);
        break;
      case 'assignments':
      case 'employee_assignments':
      case 'subtasks':
      case 'jobs':
        addDeletedItem(bodyData.id || (bodyData.ids && bodyData.ids[0]), bodyData.name || bodyData.title);
        result = await syncAssignmentOutbound('DELETE', bodyData, 'WEB_CLIENT', customSecretKey);
        break;
      case 'projects':
        result = await syncProjectOutbound('DELETE', bodyData, 'WEB_CLIENT', customSecretKey);
        break;
      case 'departments':
        result = await syncDepartmentOutbound('DELETE', bodyData, 'WEB_CLIENT', customSecretKey);
        break;
      case 'companies':
        result = await syncCompanyOutbound('DELETE', bodyData, 'WEB_CLIENT', customSecretKey);
        break;
      default:
        return NextResponse.json(
          { error: `Tài nguyên '${resource}' không hỗ trợ xóa trên APEC GLOBAL.` },
          { status: 400 }
        );
    }
    if (result?.success) {
      invalidateCache('apec-global:');
      invalidateCache('stats:');
      invalidateCache('board-data:');
    }
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
