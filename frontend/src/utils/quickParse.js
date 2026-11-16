// Turns one typed line into a task, in the browser, with no AI:
//   "Pay rent Friday 5pm !high #finance"  ->  title "Pay rent", due Friday 17:00, High, Finance
//   "gym every day 7am 45m"               ->  repeats daily, 07:00, 45 minute estimate
//   "kal shaam 5 baje doctor"             ->  tomorrow 17:00 (a few Roman Urdu words work too)
import { TASK_CATEGORIES } from '../constants/taskOptions.js';

const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

const WEEKDAYS = {
  sunday: 0, monday: 1, mon: 1, tuesday: 2, tue: 2, tues: 2, wednesday: 3, wed: 3,
  thursday: 4, thu: 4, thur: 4, thurs: 4, friday: 5, fri: 5, saturday: 6,
};
const MONTHS = {
  jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2, apr: 3, april: 3, may: 4, jun: 5, june: 5,
  jul: 6, july: 6, aug: 7, august: 7, sep: 8, sept: 8, september: 8, oct: 9, october: 9,
  nov: 10, november: 10, dec: 11, december: 11,
};
const WD = Object.keys(WEEKDAYS).sort((a, b) => b.length - a.length).join('|');
const MO = Object.keys(MONTHS).sort((a, b) => b.length - a.length).join('|');
// words that introduce a date/time and should disappear with it
const LEAD = '(?:(?:on|by|due|until|till|before|at|for|this)\\s+)?';

// A date that already passed this year means next year ("25 dec" typed on 28 dec)
const upcoming = (year, month, day, now, yearGiven) => {
  let d = new Date(year, month, day);
  if (d.getMonth() !== month) return null; // e.g. 31 feb
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (!yearGiven && d < today) d = new Date(year + 1, month, day);
  return d;
};

export function quickParse(input, now = new Date()) {
  let text = ` ${String(input || '')} `;
  const out = { title: '', dueDate: '', dueTime: '', priority: '', category: '', repeat: '', estimatedHours: 0 };

  // Run `regex` on what is left of the text; on a match let `handle` read it, then cut it out
  const take = (regex, handle) => {
    const m = regex.exec(text);
    if (!m) return false;
    if (handle(m) === false) return false;
    text = `${text.slice(0, m.index)} ${text.slice(m.index + m[0].length)}`;
    return true;
  };

  // priority: !high !low !med, !!, p1 p2 p3
  take(/\s(?:!(high|h|urgent|low|l|medium|med|m)|(!!+)|p([123]))(?=\s)/i, (m) => {
    const word = (m[1] || '').toLowerCase();
    if (m[2] || m[3] === '1' || ['high', 'h', 'urgent'].includes(word)) out.priority = 'High';
    else if (m[3] === '3' || ['low', 'l'].includes(word)) out.priority = 'Low';
    else out.priority = 'Medium';
  });

  // category: #work #home ...
  take(/\s#([a-z]+)(?=\s)/i, (m) => {
    const found = TASK_CATEGORIES.find((c) => c.toLowerCase().startsWith(m[1].toLowerCase()));
    if (!found) return false;
    out.category = found;
  });

  // repeat
  let repeatWeekday = null;
  const ALL_DAYS = { sunday: 0, saturday: 6, ...WEEKDAYS };
  take(new RegExp(`\\s(?:every\\s+(${WD}|sunday|saturday)|har\\s+(?:hafte|hafta))(?=\\s)`, 'i'), (m) => {
    out.repeat = 'weekly';
    if (m[1]) repeatWeekday = ALL_DAYS[m[1].toLowerCase()];
  }) ||
    take(/\s(?:every\s+weekday|on\s+weekdays|weekdays)(?=\s)/i, () => { out.repeat = 'weekdays'; }) ||
    take(/\s(?:every\s*day|daily|rozana|har\s+roz|roz)(?=\s)/i, () => { out.repeat = 'daily'; }) ||
    take(/\s(?:every\s+week|weekly)(?=\s)/i, () => { out.repeat = 'weekly'; }) ||
    take(/\s(?:every\s+month|monthly|har\s+mahine)(?=\s)/i, () => { out.repeat = 'monthly'; });

  // estimate: 2h, 1.5 hours, 45m, 30 min
  take(/\s(?:for\s+|~)?(\d+(?:\.\d+)?)\s?(h|hr|hrs|hour|hours|ghante|ghanta)(?=\s)/i, (m) => {
    out.estimatedHours = Math.round(parseFloat(m[1]) * 100) / 100;
  });
  take(/\s(?:for\s+|~)?(\d+)\s?(m|min|mins|minute|minutes)(?=\s)/i, (m) => {
    out.estimatedHours = Math.round((out.estimatedHours + parseInt(m[1], 10) / 60) * 100) / 100;
  });

  // time: 5pm, 5:30 pm, at 17:30, noon, shaam 5 baje
  const setTime = (h, min = 0) => {
    if (h > 23 || min > 59) return false;
    out.dueTime = `${pad(h)}:${pad(min)}`;
    return true;
  };
  take(new RegExp(`\\s${LEAD}(\\d{1,2})(?::(\\d{2}))?\\s?(am|pm)(?=\\s)`, 'i'), (m) => {
    let h = +m[1];
    if (h < 1 || h > 12) return false;
    if (m[3].toLowerCase() === 'pm' && h < 12) h += 12;
    if (m[3].toLowerCase() === 'am' && h === 12) h = 0;
    return setTime(h, +(m[2] || 0));
  }) ||
    take(/\s(?:(subah|dopahar|dopeher|shaam|sham|raat)\s+)?(\d{1,2})(?::(\d{2}))?\s+baje(?=\s)/i, (m) => {
      let h = +m[2];
      if (h < 1 || h > 12) return false;
      const part = (m[1] || '').toLowerCase();
      const pm = part ? part !== 'subah' : h <= 6 || h === 12; // "5 baje" = evening, "9 baje" = morning
      if (pm && h < 12) h += 12;
      if (!pm && h === 12) h = 0;
      if (part === 'raat' && +m[2] <= 4) h = +m[2]; // raat 2 baje = 02:00
      return setTime(h, +(m[3] || 0));
    }) ||
    take(/\s(?:at\s+)?([01]?\d|2[0-3]):([0-5]\d)(?=\s)/i, (m) => setTime(+m[1], +m[2])) ||
    take(/\s(?:at\s+)?(noon|midnight)(?=\s)/i, (m) => setTime(m[1].toLowerCase() === 'noon' ? 12 : 0));

  // date
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const setDate = (d) => {
    if (!d) return false;
    out.dueDate = ymd(d);
    return true;
  };
  const nextWeekday = (target, skipThisWeek) => {
    let diff = (target - today.getDay() + 7) % 7;
    if (diff === 0) diff = 7;
    return addDays(today, diff + (skipThisWeek && diff < 7 ? 7 : 0));
  };
  take(/\s(?:day\s+after\s+tomorrow|parson|parso)(?=\s)/i, () => setDate(addDays(today, 2))) ||
    take(new RegExp(`\\s${LEAD}(?:today|aaj|aj)(?=\\s)`, 'i'), () => setDate(today)) ||
    take(/\stonight(?=\s)/i, () => {
      if (!out.dueTime) out.dueTime = '21:00';
      return setDate(today);
    }) ||
    take(new RegExp(`\\s${LEAD}(?:tomorrow|tmrw|tmr|kal)(?=\\s)`, 'i'), () => setDate(addDays(today, 1))) ||
    // "in 3 days", "2 weeks later", "3 din baad" ("3 days" alone could just be part of the title)
    take(/\s(?:in\s+(\d{1,3})\s+(day|days|din|week|weeks|hafte|hafta)|(\d{1,3})\s+(day|days|din|week|weeks|hafte|hafta)\s+(?:baad|bad|later))(?=\s)/i, (m) => {
      const n = +(m[1] || m[3]);
      const unit = m[2] || m[4];
      return setDate(addDays(today, n * (/^(w|h)/i.test(unit) ? 7 : 1)));
    }) ||
    take(/\s(?:by\s+|due\s+)?next\s+week(?=\s)/i, () => setDate(addDays(today, 7))) ||
    take(/\s(?:by\s+|due\s+)?next\s+month(?=\s)/i, () =>
      setDate(new Date(today.getFullYear(), today.getMonth() + 1, today.getDate()))
    ) ||
    take(new RegExp(`\\s(?:(?:on|by|due|until|till|before|this)\\s+)?(next\\s+)?(${WD}|sunday|saturday)(?=\\s)`, 'i'), (m) =>
      setDate(nextWeekday(ALL_DAYS[m[2].toLowerCase()], Boolean(m[1])))
    ) ||
    // 2026-12-25
    take(new RegExp(`\\s${LEAD}(\\d{4})-(\\d{1,2})-(\\d{1,2})(?=\\s)`, 'i'), (m) =>
      setDate(upcoming(+m[1], +m[2] - 1, +m[3], now, true))
    ) ||
    // 25 dec, 25th december 2026
    take(new RegExp(`\\s${LEAD}(\\d{1,2})(?:st|nd|rd|th)?\\s+(${MO})\\.?(?:\\s+(\\d{4}))?(?=\\s)`, 'i'), (m) =>
      setDate(upcoming(+(m[3] || now.getFullYear()), MONTHS[m[2].toLowerCase()], +m[1], now, Boolean(m[3])))
    ) ||
    // dec 25, december 25th 2026
    take(new RegExp(`\\s${LEAD}(${MO})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(\\d{4}))?(?=\\s)`, 'i'), (m) =>
      setDate(upcoming(+(m[3] || now.getFullYear()), MONTHS[m[1].toLowerCase()], +m[2], now, Boolean(m[3])))
    ) ||
    // 25/12 or 25/12/2026 (day first)
    take(new RegExp(`\\s${LEAD}(\\d{1,2})[/.](\\d{1,2})(?:[/.](\\d{2,4}))?(?=\\s)`, 'i'), (m) => {
      if (+m[2] < 1 || +m[2] > 12 || +m[1] < 1 || +m[1] > 31) return false;
      const year = m[3] ? (+m[3] < 100 ? 2000 + +m[3] : +m[3]) : now.getFullYear();
      return setDate(upcoming(year, +m[2] - 1, +m[1], now, Boolean(m[3])));
    });

  // "every friday" with no other date: the first occurrence
  if (!out.dueDate && repeatWeekday !== null) setDate(today.getDay() === repeatWeekday ? today : nextWeekday(repeatWeekday));
  // a time without a date: today, or tomorrow if that time has already passed
  if (!out.dueDate && out.dueTime) {
    const [h, min] = out.dueTime.split(':').map(Number);
    const passed = h * 60 + min <= now.getHours() * 60 + now.getMinutes();
    setDate(passed ? addDays(today, 1) : today);
  }
  // a repeating task needs a start: today
  if (!out.dueDate && out.repeat) setDate(today);

  out.title = text
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\s+(?:on|by|at|due|until|till|before|for|ko|par|tak)$/i, '')
    .replace(/[\s,;:-]+$/, '')
    .trim();
  return out;
}
