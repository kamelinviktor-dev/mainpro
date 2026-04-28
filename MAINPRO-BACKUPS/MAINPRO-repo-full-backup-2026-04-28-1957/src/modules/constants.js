/**
 * MainPro Calendar — constants and default UI data
 * STABILITY LOCK: recurrence-only changes
 */

// Categories with id (for recurrence/templates compatibility)
export const DEFAULT_CATS = [
  { id: 'maintenance', name: 'Maintenance', color: '#22c55e' },
  { id: 'compliance', name: 'Compliance', color: '#3b82f6' },
  { id: 'safety', name: 'Safety / Fire', color: '#f97316' },
  { id: 'training', name: 'Training', color: '#eab308' },
  { id: 'other', name: 'Other', color: '#a78bfa' }
];

// Categories for settings (name + color only, used in useState fallback)
export const DEFAULT_CATS_SETTINGS = [
  { name: 'Maintenance', color: '#3B82F6' },
  { name: 'Compliance', color: '#10B981' },
  { name: 'Contractor', color: '#F59E0B' },
  { name: 'Inspection', color: '#8B5CF6' },
  { name: 'Other', color: '#6B7280' }
];

export const DEFAULT_TEMPLATES = [
  { id: 'daily_walk', label: 'Daily walk-through', title: 'Daily walk-through', catId: 'maintenance', taskType: 'Internal', priority: 'normal', time: '09:00' },
  { id: 'fire_check', label: 'Fire safety check', title: 'Fire safety check', catId: 'safety', taskType: 'Safety', priority: 'high', time: '09:00' },
  { id: 'contractor_call', label: 'Contractor visit', title: 'Contractor visit', catId: 'maintenance', taskType: 'Contractor', priority: 'normal', time: '09:00' },
  { id: 'compliance_audit', label: 'Compliance audit', title: 'Compliance audit', catId: 'compliance', taskType: 'Compliance', priority: 'normal', time: '09:00' }
];

/** Default folders for Document Manager PRO */
export const DEFAULT_FOLDERS = [
  { id: 1, name: 'General' },
  { id: 2, name: 'RAMS' },
  { id: 3, name: 'Certificates' },
  { id: 4, name: 'Contracts' }
];

/** Recurrence caps (Stability Lock) */
export const RECUR_SAFE_CAP = 800;
export const RECUR_RANGE_BUFFER_DAYS = 7;

/** UI theme defaults */
export const UI_DEFAULTS = {
  primary: '#EAB308'
};
