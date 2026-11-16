// Small helpers shared by the task screens

const pad = (n) => String(n).padStart(2, '0');

// YYYY-MM-DD in the user's local time, `days` from today
export const dateFromToday = (days = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
export const localToday = () => dateFromToday(0);

// Due dates are stored as YYYY-MM-DD; read them as local dates so they don't shift a day
export const parseDueDate = (value) => {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  const d = m ? new Date(+m[1], m[2] - 1, +m[3]) : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

// "17:30" -> "5:30 PM"
export const formatTime = (hhmm) => {
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm || '');
  if (!m) return '';
  const h = +m[1];
  return `${h % 12 || 12}${m[2] === '00' ? '' : `:${m[2]}`} ${h < 12 ? 'AM' : 'PM'}`;
};

// 1.5 (hours) -> "1h 30m"
export const formatDuration = (hours) => {
  const minutes = Math.round((Number(hours) || 0) * 60);
  if (minutes <= 0) return '0m';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return [h ? `${h}h` : '', m ? `${m}m` : ''].filter(Boolean).join(' ');
};

// seconds -> "1:05:09" / "05:09" for the running timer
export const formatClock = (seconds) => {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const rest = `${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
  return h ? `${h}:${rest}` : rest;
};

export const isDone = (task) => task.status === 'Done';

// Days from today to the due date (negative = overdue); null when there is no due date
export const daysUntilDue = (task) => {
  const due = parseDueDate(task.dueDate);
  if (!due) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((due - today) / 86400000);
};

export function dueInfo(task) {
  const days = daysUntilDue(task);
  if (days === null) return { label: 'No date', tone: 'text-gray-500' };
  const due = parseDueDate(task.dueDate);
  const sameYear = due.getFullYear() === new Date().getFullYear();
  const date = due.toLocaleDateString('en-US', { month: 'short', day: 'numeric', ...(sameYear ? {} : { year: 'numeric' }) });
  const time = task.dueTime ? `, ${formatTime(task.dueTime)}` : '';
  if (isDone(task)) return { label: date, tone: 'text-gray-500' };
  if (days < 0) return { label: `${date} · overdue`, tone: 'text-red-400' };
  if (days === 0) return { label: `Today${time}`, tone: 'text-amber-300' };
  if (days === 1) return { label: `Tomorrow${time}`, tone: 'text-amber-300' };
  if (days < 7) return { label: `${due.toLocaleDateString('en-US', { weekday: 'long' })}${time}`, tone: 'text-gray-300' };
  return { label: `${date}${time}`, tone: 'text-gray-300' };
}

const PRIORITY_RANK = { High: 0, Medium: 1, Low: 2 };

// Open tasks: soonest due first (undated last), then priority. Done tasks: latest first.
export const sortTasks = (tasks) =>
  [...tasks].sort((a, b) => {
    if (isDone(a) !== isDone(b)) return isDone(a) ? 1 : -1;
    if (isDone(a)) return String(b.completedAt || b.updatedAt || '').localeCompare(String(a.completedAt || a.updatedAt || ''));
    const da = a.dueDate ? `${a.dueDate} ${a.dueTime || '99:99'}` : '9999';
    const db = b.dueDate ? `${b.dueDate} ${b.dueTime || '99:99'}` : '9999';
    if (da !== db) return da.localeCompare(db);
    return (PRIORITY_RANK[a.priority] ?? 1) - (PRIORITY_RANK[b.priority] ?? 1);
  });

// The "Today" list: due today or overdue, plus whatever is being worked on right now
export const isForToday = (task) => {
  if (isDone(task)) return false;
  const days = daysUntilDue(task);
  return (days !== null && days <= 0) || task.status === 'Doing' || Boolean(task.timerStartedAt);
};
