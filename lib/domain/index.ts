/**
 * ============================================================================
 * DOMAIN LAYER — Barrel Export
 * ============================================================================
 * Single import point cho toàn bộ domain logic.
 * Usage: import { NormalizedTask, resolveSupabaseTaskStatus, ... } from '@/lib/domain'
 */

// Types
export type {
  DataSource,
  SupabaseTable,
  NormalizedTaskStatus,
  NormalizedProjectStatus,
  NormalizedIncidentStatus,
  TaskPriority,
  TaskType,
  ResolvedAssignee,
  DepartmentInfo,
  NormalizedSubtask,
  NormalizedTask,
  NormalizedProject,
  NormalizedIncident,
  DashboardStats,
  DashboardData,
  WidgetTask,
  LookupMaps,
  RawEmployeeAssignment,
  RawApecEmployee,
  RawApecSubtask,
  RawStaff,
  RawDepartment,
  RawActivity,
} from './types'

// Status resolvers
export {
  resolveSupabaseTaskStatus,
  resolveChecklistItemStatus,
  resolveApecTaskStatus,
  resolveSubtaskStatus,
  resolveIncidentStatus,
  resolveProgress,
  resolveStatusToNumericId,
} from './status-resolver'

// Assignee resolvers
export {
  buildLookupMaps,
  resolveSupabaseAssignee,
  resolveChecklistAssignees,
  resolveApecAssignees,
  resolveDepartment,
  countUniqueStaff,
} from './assignee-resolver'

// Task normalizer
export {
  normalizeSupabaseTasks,
  normalizeChecklistItems,
  normalizeApecTasks,
  mergeAndDeduplicateTasks,
  toWidgetTasks,
} from './task-normalizer'

// Project normalizer
export {
  mergeDepartments,
  mergeProjects,
  computeProjectStats,
} from './project-normalizer'

// Incident normalizer
export {
  mergeIncidents,
  computeIncidentStats,
} from './incident-normalizer'
