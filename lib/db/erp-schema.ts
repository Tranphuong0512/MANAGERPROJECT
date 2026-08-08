import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  numeric,
  boolean,
  index,
} from 'drizzle-orm/pg-core'

// ============================================================================
// DRIZZLE SCHEMA — CẤU TRÚC BẢNG ERP APEC GLOBAL (NEON POSTGRES)
// ============================================================================
// Ánh xạ các bảng chính của hệ thống ERP gốc.
// Schema này CHỈ dùng cho truy vấn SELECT / Aggregation.
// Cấu trúc được suy ra từ dữ liệu thực tế của API https://api.apecglobal.net
// ============================================================================

// 1. Bảng Công ty (Companies)
export const companies = pgTable('companies', {
  id: uuid('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  code: varchar('code', { length: 50 }),
  description: text('description'),
  status: varchar('status', { length: 50 }).default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
})

// 2. Bảng Dự án (Projects)
export const projects = pgTable(
  'projects',
  {
    id: uuid('id').primaryKey(),
    companyId: uuid('company_id').references(() => companies.id),
    name: varchar('name', { length: 255 }).notNull(),
    code: varchar('code', { length: 50 }),
    description: text('description'),
    status: varchar('status', { length: 50 }).default('active'),
    progressPercentage: numeric('progress_percentage', { precision: 5, scale: 2 }).default('0'),
    startDate: timestamp('start_date', { withTimezone: true }),
    endDate: timestamp('end_date', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true }),
  },
  (table) => [index('idx_erp_projects_company_id').on(table.companyId)]
)

// 3. Bảng Nhân sự (Employees)
export const employees = pgTable('employees', {
  id: uuid('id').primaryKey(),
  fullName: varchar('fullname', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  position: varchar('position', { length: 150 }),
  departmentName: varchar('department_name', { length: 255 }),
  companyId: uuid('company_id').references(() => companies.id),
  createdAt: timestamp('created_at', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
})

// 4. Bảng Công việc / Nhiệm vụ (Jobs/Tasks trong ERP)
export const jobs = pgTable(
  'jobs',
  {
    id: uuid('id').primaryKey(),
    projectId: uuid('project_id').references(() => projects.id),
    assignedTo: uuid('assigned_to').references(() => employees.id),
    title: text('title').notNull(),
    description: text('description'),
    status: varchar('status', { length: 50 }).default('todo'),
    priority: varchar('priority', { length: 20 }).default('medium'),
    progressPercentage: integer('progress_percentage').default(0),
    estimatedHours: numeric('estimated_hours', { precision: 8, scale: 2 }),
    actualHours: numeric('actual_hours', { precision: 8, scale: 2 }),
    startDate: timestamp('start_date', { withTimezone: true }),
    dueDate: timestamp('due_date', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_erp_jobs_assigned_to').on(table.assignedTo),
    index('idx_erp_jobs_project_id').on(table.projectId),
  ]
)
