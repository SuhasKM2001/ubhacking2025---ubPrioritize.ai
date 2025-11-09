import { getUserStudyContextByEmail } from '../dataAccess.js';

const fmtFromISO = (iso, tz = 'America/New_York') => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString('en-US', {
    timeZone: tz,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

export async function getUserSchedules(req, res) {
  try {
    const email = (req.params.email || '').trim();
    if (!email) return res.status(400).json({ error: 'Email parameter is required' });

    const tz = 'America/New_York';
    const ctx = await getUserStudyContextByEmail(email);

    const classes = (ctx.classSchedule || []).map(c => ({
      title: c.title || 'Class',
      startISO: c.startISO,
      endISO: c.endISO,
      startRaw: c.startRaw, endRaw: c.endRaw,
      kind: 'class',
    }));

    const partTime = (ctx.studentPartTime || []).map(p => ({
      title: 'Part-time shift',
      startISO: p.startISO,
      endISO: p.endISO,
      startRaw: p.startRaw, endRaw: p.endRaw,
      kind: 'partTime',
    }));

    const events = (ctx.eventsAndOrgs || []).map(e => ({
      title: e.description ? `Event (${e.type || 'event'}): ${e.description}` : `Event (${e.type || 'event'})`,
      startISO: e.startISO,
      endISO: e.endISO,
      startRaw: e.startRaw, endRaw: e.endRaw,
      kind: 'event',
    }));

    const all = [...classes, ...partTime, ...events];

    const sortable = all.filter(e => e.startISO);
    const unsortable = all.filter(e => !e.startISO);

    sortable.sort((a, b) => new Date(a.startISO) - new Date(b.startISO));

    const toOut = (e) => ({
      title: e.title,
      start: fmtFromISO(e.startISO, tz) || String(e.startRaw || '').trim() || null,
      end: fmtFromISO(e.endISO, tz) || String(e.endRaw || '').trim() || null,
    });

    const out = [...sortable, ...unsortable].map(toOut);

    const cleaned = out.filter(ev => ev.start && ev.end);

    return res.json(cleaned);
  } catch (err) {
    console.error('getUserSchedules error:', err);
    return res.status(err.status || 500).json({ error: err.message || 'Internal error' });
  }
}
