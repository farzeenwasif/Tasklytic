// Keep these in sync with backend/src/models/tasksSchema.js

export const TASK_STATUSES = ['To do', 'Doing', 'Done'];

export const TASK_REPEATS = [
  { value: 'none', label: 'Does not repeat' },
  { value: 'daily', label: 'Every day' },
  { value: 'weekdays', label: 'Every weekday' },
  { value: 'weekly', label: 'Every week' },
  { value: 'monthly', label: 'Every month' },
];
export const REPEAT_LABEL = Object.fromEntries(TASK_REPEATS.map((r) => [r.value, r.label]));

export const TASK_PRIORITIES = ['Low', 'Medium', 'High'];

// General-purpose categories first; the technical ones stay for software work
export const TASK_CATEGORIES = [
  'Work',
  'Personal',
  'Study',
  'Meeting',
  'Health',
  'Finance',
  'Home',
  'Shopping',
  'Travel',
  'Development',
  'Design',
  'Testing',
  'Maintenance',
  'Other',
];

export const DEFAULT_CATEGORY = 'Personal';
