import { connectToDatabase } from './database.js';

// Try to coerce odd strings like "November 10 2025 , 9:00PM" or "November 3, 2025,15:00 AM"
function normalizeDateString(raw) {
  if (!raw) return null;
  let s = String(raw).trim();

  // collapse multiple spaces
  s = s.replace(/\s+/g, ' ');

  // ensure a comma between day and year: "Nov 10 2025" -> "Nov 10, 2025"
  s = s.replace(
    /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?) (\d{1,2}) (\d{4})/,
    '$1 $2, $3'
  );

  // ensure comma before time if missing: "..., 2025 9:00 PM" -> "..., 2025, 9:00 PM"
  s = s.replace(/(\d{4})(\s+)(\d{1,2}:\d{2})/, '$1, $3');

  // ensure a space before AM/PM: "9:00PM" -> "9:00 PM"
  s = s.replace(/(\d{1,2}:\d{2})([AP]M)\b/, '$1 $2');

  // handle impossible "15:00 AM/PM" -> prefer 24h by dropping AM/PM when hour >= 13
  s = s.replace(/\b(1[3-9]|2[0-3]):(\d{2})\s*(AM|PM)\b/i, (_m, hh, mm) => `${hh}:${mm}`);

  return s;
}

function toISO(raw) {
  const s = normalizeDateString(raw);
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export async function getUserStudyContextByEmail(email) {
  const db = await connectToDatabase();

  const user = await db.collection('UBLinked').findOne(
    { email },
    { projection: { _id: 0, firstName: 1, lastName: 1, email: 1, ubNumber: 1, ubitName: 1 } }
  );
  if (!user) {
    const e = new Error(`User not found for email ${email}`);
    e.status = 404;
    throw e;
  }

  const { ubitName, ubNumber } = user;

  const [partTime, events, assignments, classTT] = await Promise.all([
    db.collection('student_partTime').find({ $or: [{ ubitName }, { ubNumber }] })
      .project({ _id: 0, start: 1, end: 1, ubitName: 1, ubNumber: 1 }).toArray(),
    db.collection('ubevents_orgs').find({ $or: [{ ubitName }, { ubNumber }] })
      .project({ _id: 0, type: 1, description: 1, start: 1, end: 1 }).toArray(),
    db.collection('ublearns_assignment').find({ $or: [{ ubitName }, { ubNumber }] })
      .project({ _id: 0, name: 1, dueAt: 1 }).toArray(),
    db.collection('ublearns_classTT').find({}) // adjust if you can filter further
      .project({ _id: 0, title: 1, start: 1, end: 1, courseCode: 1, section: 1, term: 1 }).toArray(),
  ]);

  console.log('[ctx] email=%s ubit=%s ub#=%s | partTime=%d events=%d assignments=%d classTT=%d',
    email, ubitName, ubNumber, partTime.length, events.length, assignments.length, classTT.length);

  const studentPartTime = partTime.map(p => ({
    name: 'Student part-time',
    startISO: toISO(p.start),
    endISO: toISO(p.end),
    startRaw: p.start, endRaw: p.end,
  }));

  const eventsAndOrgs = events.map(e => ({
    type: e.type,
    description: e.description,
    startISO: toISO(e.start),
    endISO: toISO(e.end),
    startRaw: e.start, endRaw: e.end,
  }));

  const courseAssignments = assignments.map(a => ({
    name: a.name,
    dueISO: toISO(a.dueAt),
    dueRaw: a.dueAt,
  }));

  const classSchedule = classTT.map(c => ({
    title: c.title || c.courseCode || 'Class',
    startISO: toISO(c.start),
    endISO: toISO(c.end),
    startRaw: c.start, endRaw: c.end,
    courseCode: c.courseCode,
    section: c.section,
    term: c.term,
  }));

  return { user, studentPartTime, eventsAndOrgs, courseAssignments, classSchedule };
}
