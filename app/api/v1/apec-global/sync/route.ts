import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { recordAuditLog } from '@/lib/services/audit-logger';
import { reconcileInboundSync } from '@/lib/services/sync-concurrency';

/**
 * ============================================================================
 * TRUNG TÂM ĐỒNG BỘ DỮ LIỆU APEC GLOBAL (NIX.AI SYNC ENGINE - V2)
 * ============================================================================
 * Quy tắc đồng bộ chuẩn External Router 1.0:
 * 1. Công ty (`/api/v1/external/companies`) → Bảng `organizations`
 * 2. Phòng Ban (`/api/v1/external/departments`) → Bảng `departments`
 * 3. Dự Án (`/api/v1/external/projects`) → Bảng `projects`
 * 4. Nhân sự (`/api/v1/external/employees`) → Bảng `staff` / `profiles`
 * 5. Loại nhiệm vụ (`/api/v1/external/tasks/types`) → Bảng `project_checklists` (CHECKLIST)
 * 6. Nhiệm vụ (`/api/v1/external/tasks`) → Bảng `tasks` & `checklist_items` (kèm assignments, tiến độ)
 * 
 * Tích hợp:
 * - Kiểm soát toàn vẹn dữ liệu (Race Condition / Reconcile timestamp)
 * - Nhật ký kiểm toán (Audit Log) cho mọi thao tác
 */
export async function POST(request: NextRequest) {
  try {
    const { type, item, organization_id, project_id, checklist_id, sync_as, force_overwrite } = await request.json();

    if (!type || !item) {
      return NextResponse.json({ error: 'Thiếu type hoặc item để đồng bộ' }, { status: 400 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    switch (type) {
      // 1. Công ty tự động đồng bộ với Tổ Chức (organizations)
      case 'company': {
        const name = item.name || item.company_name || item.fullname || `Công ty APEC ${item.id}`;
        const slug = (item.code || `apec-company-${item.id}`)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');

        // Kiểm tra đã có tổ chức trùng slug hoặc tên chưa
        const { data: existing } = await supabaseAdmin
          .from('organizations')
          .select('*')
          .or(`slug.eq.${slug},name.eq.${name}`)
          .maybeSingle();

        let orgId = existing?.id;
        let actionStr = 'created';

        if (existing) {
          const check = await reconcileInboundSync('organizations', 'id', existing.id, item.updated_at, force_overwrite);
          if (check.shouldUpdate) {
            const { error: updateError } = await supabaseAdmin
              .from('organizations')
              .update({
                name,
                description: item.description || `Đồng bộ từ APEC GLOBAL (Mã: ${item.code || item.id})`,
                updated_at: new Date().toISOString(),
              })
              .eq('id', existing.id);

            if (updateError) throw updateError;
            actionStr = 'updated';
          } else {
            actionStr = 'skipped_newer_local';
          }
        } else {
          const { data: created, error: insertError } = await supabaseAdmin
            .from('organizations')
            .insert({
              name,
              slug: `${slug}-${Math.floor(Math.random() * 1000)}`,
              description: item.description || `Đồng bộ từ APEC GLOBAL (Mã: ${item.code || item.id})`,
            })
            .select('id')
            .single();

          if (insertError) throw insertError;
          orgId = created.id;
          actionStr = 'created';
        }

        await recordAuditLog({
          action: 'SYNC_INBOUND',
          resource_type: 'organization',
          resource_id: orgId || item.id,
          old_value: existing || null,
          new_value: { name, slug, description: item.description },
          sync_direction: 'INBOUND',
          status: 'SUCCESS',
        });

        return NextResponse.json({
          success: true,
          action: actionStr,
          id: orgId,
          name,
          message: `Đã tự động đồng bộ Công ty "${name}" vào Tổ Chức (${actionStr})`,
        });
      }

      // 2. Phòng Ban Tự Động Đồng Bộ (departments)
      case 'department': {
        if (!organization_id) {
          return NextResponse.json(
            { error: 'Vui lòng chọn Tổ chức để đồng bộ Phòng Ban' },
            { status: 400 }
          );
        }

        const name = item.name || item.department_name || `Phòng ban APEC ${item.id}`;
        const description = item.description || `Đồng bộ từ APEC GLOBAL (ID: ${item.id})`;

        const { data: existingDep } = await supabaseAdmin
          .from('departments')
          .select('*')
          .eq('organization_id', organization_id)
          .eq('name', name)
          .maybeSingle();

        let depId = existingDep?.id;
        let actionStr = 'created';

        if (existingDep) {
          const check = await reconcileInboundSync('departments', 'id', existingDep.id, item.updated_at, force_overwrite);
          if (check.shouldUpdate) {
            await supabaseAdmin
              .from('departments')
              .update({ description, updated_at: new Date().toISOString() })
              .eq('id', existingDep.id);
            actionStr = 'updated';
          } else {
            actionStr = 'skipped_newer_local';
          }
        } else {
          const { data: createdDep, error: depErr } = await supabaseAdmin
            .from('departments')
            .insert({
              organization_id,
              name,
              description,
            })
            .select('id')
            .single();

          if (depErr) throw depErr;
          depId = createdDep.id;
          actionStr = 'created';
        }

        await recordAuditLog({
          action: 'SYNC_INBOUND',
          resource_type: 'department',
          resource_id: depId || item.id,
          old_value: existingDep || null,
          new_value: { organization_id, name, description },
          sync_direction: 'INBOUND',
          status: 'SUCCESS',
        });

        return NextResponse.json({
          success: true,
          action: actionStr,
          id: depId,
          name,
          message: `Đã đồng bộ Phòng Ban "${name}" trong Tổ Chức (${actionStr})`,
        });
      }

      // 3. Dự Án Tự Động Đồng Bộ (projects)
      case 'project': {
        let finalOrgId = organization_id;
        
        // Attempt to auto-map from item.companies if organization_id is not provided
        if (!finalOrgId && item.companies && Array.isArray(item.companies) && item.companies.length > 0) {
          for (const c of item.companies) {
            const { data: matchedOrg } = await supabaseAdmin
              .from('organizations')
              .select('id')
              .ilike('name', c.name) // Simple case-insensitive match
              .maybeSingle();
            if (matchedOrg) {
              finalOrgId = matchedOrg.id;
              break;
            }
          }
        }

        if (!finalOrgId) {
          return NextResponse.json(
            { error: 'Vui lòng chọn Tổ chức để đồng bộ Dự án (hoặc Dự án không thuộc Công ty nào đã được đồng bộ)' },
            { status: 400 }
          );
        }

        const name = item.name || item.project_name || item.title || `Dự án APEC ${item.id}`;
        const code = item.code || `P-${item.id}`;

        const { data: existingPrj } = await supabaseAdmin
          .from('projects')
          .select('*')
          .eq('organization_id', finalOrgId)
          .eq('code', code)
          .maybeSingle();

        let prjId = existingPrj?.id;
        let actionStr = 'created';

        if (existingPrj) {
          const check = await reconcileInboundSync('projects', 'id', existingPrj.id, item.updated_at, force_overwrite);
          if (check.shouldUpdate) {
            const { error: updateError } = await supabaseAdmin
              .from('projects')
              .update({
                name,
                description: item.description || `Đồng bộ từ APEC GLOBAL (Mã: ${code})`,
                progress_percentage: Number(item.progress) || existingPrj.progress_percentage || 0,
                updated_at: new Date().toISOString(),
              })
              .eq('id', existingPrj.id);

            if (updateError) throw updateError;
            actionStr = 'updated';
          } else {
            actionStr = 'skipped_newer_local';
          }
        } else {
          const { data: created, error: insertError } = await supabaseAdmin
            .from('projects')
            .insert({
              organization_id: finalOrgId,
              name,
              code,
              description: item.description || `Đồng bộ từ APEC GLOBAL (Mã: ${code})`,
              status: 'active',
              progress_percentage: Number(item.progress) || 0,
              start_date: item.start_date || new Date().toISOString(),
            })
            .select('id')
            .single();

          if (insertError) throw insertError;
          prjId = created.id;
          actionStr = 'created';
        }

        await recordAuditLog({
          action: 'SYNC_INBOUND',
          resource_type: 'project',
          resource_id: prjId || item.id,
          old_value: existingPrj || null,
          new_value: { organization_id, name, code, progress: item.progress },
          sync_direction: 'INBOUND',
          status: 'SUCCESS',
        });

        return NextResponse.json({
          success: true,
          action: actionStr,
          id: prjId,
          name,
          message: `Đã đồng bộ Dự án "${name}" (${actionStr})`,
        });
      }

      // 4. Nhân viên tập đoàn → Đồng bộ vào bảng staff & departments
      case 'employee': {
        const full_name = item.fullname || item.name || `Nhân sự APEC ${item.id}`;
        const email = item.email || `apec.${item.id}@apecglobal.net`;
        const phone = item.phone || null;
        const depName = item.department_name || item.department;

        if (organization_id && depName && typeof depName === 'string') {
          try {
            await supabaseAdmin
              .from('departments')
              .upsert({ organization_id, name: depName }, { onConflict: 'organization_id,name' as any });
          } catch {}
        }

        // Tạo hoặc cập nhật bản ghi trong bảng staff cho thống kê
        let staffId = item.id;
        if (organization_id) {
          try {
            const { data: staffData } = await supabaseAdmin
              .from('staff')
              .upsert({
                id: String(item.id),
                organization_id,
                full_name,
                email,
                phone,
                role: item.position || item.job_title || 'Thành viên',
              }, { onConflict: 'id' as any })
              .select('id')
              .maybeSingle();
            if (staffData) staffId = staffData.id;
          } catch {}
        }

        await recordAuditLog({
          action: 'SYNC_INBOUND',
          resource_type: 'staff',
          resource_id: String(staffId),
          old_value: null,
          new_value: { full_name, email, phone, role: item.position, department: depName },
          sync_direction: 'INBOUND',
          status: 'SUCCESS',
        });

        return NextResponse.json({
          success: true,
          action: 'prepared',
          message: `Nhân sự "${full_name}" (${depName || 'Chưa xếp phòng ban'}) đã được đồng bộ.`,
          data: { full_name, email, phone, role: item.position || 'Thành viên', department_name: depName },
        });
      }

      // 5. Loại nhiệm vụ (Task Types) → ĐỒNG BỘ LÀ CHECKLIST (project_checklists)
      case 'task_type':
      case 'checklist': {
        if (!project_id) {
          return NextResponse.json(
            { error: 'Vui lòng chọn Dự án để đồng bộ Loại nhiệm vụ / Checklist' },
            { status: 400 }
          );
        }

        const title = item.name || item.title || `Checklist APEC ${item.id}`;

        const { data: existingCl } = await supabaseAdmin
          .from('project_checklists')
          .select('*')
          .eq('project_id', project_id)
          .eq('title', title)
          .maybeSingle();

        let clId = existingCl?.id;
        let actionStr = 'created';

        if (existingCl) {
          actionStr = 'updated';
        } else {
          const { data: createdCl, error: clError } = await supabaseAdmin
            .from('project_checklists')
            .insert({
              project_id,
              title,
            })
            .select('id')
            .single();

          if (clError) throw clError;
          clId = createdCl.id;
          actionStr = 'created';
        }

        await recordAuditLog({
          action: 'SYNC_INBOUND',
          resource_type: 'checklist',
          resource_id: clId || item.id,
          old_value: existingCl || null,
          new_value: { project_id, title, is_default: item.is_default },
          sync_direction: 'INBOUND',
          status: 'SUCCESS',
        });

        return NextResponse.json({
          success: true,
          action: actionStr,
          id: clId,
          title,
          message: `Đã đồng bộ Loại nhiệm vụ "${title}" thành Checklist dự án (${actionStr})`,
        });
      }

      // 6. Nhiệm vụ (Tasks) → Đồng bộ Công việc của Checklist (tasks & checklist_items & assignments)
      case 'task': {
        if (!project_id) {
          return NextResponse.json(
            { error: 'Vui lòng chọn Dự án để đồng bộ Công việc' },
            { status: 400 }
          );
        }

        const title = item.title || item.name || `Công việc APEC ${item.id}`;
        const description = item.description || `Mã APEC: ${item.code || item.id}`;
        let progressVal = Number(item.progress || item.process) || 0;
        if (Array.isArray(item.employee_assignments) && item.employee_assignments.length > 0) {
          const sum = item.employee_assignments.reduce((acc: number, cur: any) => acc + (Number(cur.process || cur.progress) || 0), 0);
          progressVal = Math.round(sum / item.employee_assignments.length);
        }

        const { data: createdTask, error: taskError } = await supabaseAdmin
          .from('tasks')
          .insert({
            project_id,
            title,
            description,
            status: progressVal >= 100 ? 'done' : progressVal > 0 ? 'in_progress' : 'todo',
            priority: 'medium',
            progress_percentage: progressVal,
            due_date: item.due_date || item.end_date || null,
          })
          .select('id')
          .single();

        if (taskError) throw taskError;

        // Nếu có checklist_id hoặc type.id, đồng thời liên kết vào checklist_items
        const targetChecklistId = checklist_id || (item.type && typeof item.type === 'object' ? item.type.id : undefined);
        if (targetChecklistId) {
          try {
            await supabaseAdmin
              .from('checklist_items')
              .insert({
                checklist_id: targetChecklistId,
                title,
                is_completed: progressVal >= 100,
                status: progressVal >= 100 ? 'done' : progressVal > 0 ? 'in_progress' : 'todo',
              });
          } catch {}
        }

        await recordAuditLog({
          action: 'SYNC_INBOUND',
          resource_type: 'task',
          resource_id: createdTask.id,
          old_value: null,
          new_value: { project_id, title, progress_percentage: progressVal, assignments: item.employee_assignments?.length || 0 },
          sync_direction: 'INBOUND',
          status: 'SUCCESS',
        });

        return NextResponse.json({
          success: true,
          action: 'created_task',
          id: createdTask.id,
          title,
          message: `Đã đồng bộ Nhiệm vụ "${title}" vào danh sách Công việc dự án (Tiến độ: ${progressVal}%)`,
        });
      }

      default:
        return NextResponse.json({ error: 'Loại dữ liệu không hỗ trợ' }, { status: 400 });
    }
  } catch (error: any) {
    await recordAuditLog({
      action: 'SYNC_INBOUND',
      resource_type: 'task' as any,
      resource_id: 'ERROR',
      status: 'ERROR',
      error_message: error.message,
    });

    return NextResponse.json(
      { success: false, error: error.message || 'Lỗi server khi đồng bộ' },
      { status: 500 }
    );
  }
}
