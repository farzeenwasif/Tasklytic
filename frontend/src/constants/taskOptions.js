// Keep these in sync with backend/src/models/tasksSchema.js

export const TASK_STATUSES = ['Ready to Assign', 'In Progress', 'Completed', 'Scheduled'];

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

export const DEFAULT_CATEGORY = 'Work';
