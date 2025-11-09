// import { callGemini, extractJson } from "../services/llmServices.js";
// import { getUserStudyContextByEmail } from '../dataAccess.js';
// import { connectToDatabase } from "../database.js"

// export async function buildWeekSchedule(req, res) {
//   try {
//     const { priorities, priorityScope } = req.body;
//     const email = 'ava@buffalo.edu'
//     const ctx = await getUserStudyContextByEmail(email);

// const prompt = `
// You are a university study planner.

// User:
// ${JSON.stringify(ctx.user, null, 2)}

// Student part-time shifts (fixed busy blocks):
// ${JSON.stringify(ctx.studentPartTime, null, 2)}

// University events & orgs (busy or optional blocks; include type and description):
// ${JSON.stringify(ctx.eventsAndOrgs, null, 2)}

// Class schedule (fixed class blocks):
// ${JSON.stringify(ctx.classSchedule, null, 2)}

// Assignments (generate focused study blocks ahead of dueAt):
// ${JSON.stringify(ctx.courseAssignments, null, 2)}

// User priority tasks:
// ${JSON.stringify(priorities, null, 2)}

// - Priority Scope: "${priorityScope}"  (can be "today" or "week")

// Create a one-week schedule (Mon–Sun) that:
// - Includes fixed busy blocks from classSchedule and studentPartTime.
// - Adds study blocks for assignments and quiz/exam preparation before due dates.
// - If priorityScope is "today", schedule user priority tasks today; otherwise spread across the week.
// - Avoid overlaps with fixed busy blocks.
// - Use the user's timezone if provided; otherwise assume America/New_York.

// STRICTLY return a JSON array of events with this shape:
// [
//   { "title": "title_name", "start": "Nov 8, 2025, 10:00 AM", "end": "Nov 8, 2025, 11:30 AM", "source": "class|event|assignment|priority" },
//   ...
// ]
//     `;

//     const result = await callGemini(prompt);
//     const plan = extractJson(result);

//     const priorityItems = plan.filter(
//       (item) => item.source && item.source.toLowerCase() === "priority"
//     );

//     if (priorityItems.length > 0) {
//       const db = await connectToDatabase();
//       await db.collection("priority_task").insertMany(
//         priorityItems.map((item) => ({
//           email,
//           title: item.title,
//           start: item.start,
//           end: item.end,
//           source: "priority", // enforce always
//           createdAt: new Date(),
//         }))
//       );
//     }

//     const response = plan.map(({ title, start, end }) => ({
//       title,
//       start,
//       end,
//     }));

//     res.json({plan: response});
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: err.message });
//   }
// }
// scheduleController.js
import { callGemini, extractJson } from "../services/llmServices.js";
import { getUserStudyContextByEmail } from "../dataAccess.js";
import { connectToDatabase } from "../database.js";

// ---------- helpers: normalize → ISO → dayKey ----------
function normalizeDateString(raw) {
  if (!raw) return null;
  let s = String(raw).trim().replace(/\s+/g, " ");
  // ensure comma after day
  s = s.replace(
    /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?) (\d{1,2}) (\d{4})/,
    "$1 $2, $3"
  );
  // comma before time if missing
  s = s.replace(/(\d{4})(\s+)(\d{1,2}:\d{2})/, "$1, $3");
  // space before AM/PM
  s = s.replace(/(\d{1,2}:\d{2})([AP]M)\b/, "$1 $2");
  // fix impossible "15:00 AM/PM" → 24h w/o AM/PM
  s = s.replace(/\b(1[3-9]|2[0-3]):(\d{2})\s*(AM|PM)\b/i, (_m, hh, mm) => `${hh}:${mm}`);
  return s;
}
function toISO(raw) {
  const s = normalizeDateString(raw);
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
function dayKeyFromISO(iso, tz = "America/New_York") {
  if (!iso) return null;
  const d = new Date(iso);
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(d); // e.g., "2025-11-10"
}

// -------------------------------------------------------

export async function buildWeekSchedule(req, res) {
  try {
    const { priorities, priorityScope } = req.body;
    const email = "ava@buffalo.edu";
    const ctx = await getUserStudyContextByEmail(email);

    const prompt = `
You are a university study planner.

User:
${JSON.stringify(ctx.user, null, 2)}

Student part-time shifts (fixed busy blocks):
${JSON.stringify(ctx.studentPartTime, null, 2)}

University events & orgs (busy or optional blocks; include type and description):
${JSON.stringify(ctx.eventsAndOrgs, null, 2)}

Class schedule (fixed class blocks):
${JSON.stringify(ctx.classSchedule, null, 2)}

Assignments (generate focused study blocks ahead of dueAt):
${JSON.stringify(ctx.courseAssignments, null, 2)}

User priority tasks:
${JSON.stringify(priorities, null, 2)}

- Priority Scope: "${priorityScope}"  (can be "today" or "week")

Create a one-week schedule (Mon–Sun) that:
- Includes fixed busy blocks from classSchedule and studentPartTime.
- Adds study blocks for assignments and quiz/exam preparation before due dates.
- If priorityScope is "today", schedule user priority tasks today; otherwise spread across the week.
- Avoid overlaps with fixed busy blocks.
- Use the user's timezone if provided; otherwise assume America/New_York.

STRICTLY return a JSON array of events with this shape:
[
  { "title": "title_name", "start": "Nov 8, 2025, 10:00 AM", "end": "Nov 8, 2025, 11:30 AM", "source": "class|event|assignment|priority" },
  ...
]
    `;

    const result = await callGemini(prompt);
    const plan = extractJson(result);

    // keep only the priority-generated blocks
    const priorityItems = (Array.isArray(plan) ? plan : []).filter(
      (item) => item?.source && item.source.toLowerCase() === "priority"
    );

    // ---- bulk upserts (Rule #2: once per day per title) ----
    let upserted = 0;
    let matched = 0;
    if (priorityItems.length > 0) {
      const db = await connectToDatabase();
      const tz = "America/New_York";

      const ops = priorityItems.map((p) => {
        const startISO = toISO(p.start);
        const endISO = toISO(p.end);
        const dayKey = dayKeyFromISO(startISO, tz);

        return {
          updateOne: {
            // unique key: user + title + day
            filter: { email, title: p.title, dayKey },
            update: {
              // we only set these if it's a brand-new record
              $setOnInsert: {
                email,
                title: p.title,
                start: p.start,          // keep original strings
                end: p.end,
                startISO,
                endISO,
                dayKey,
                source: "priority",      // enforce always
                createdAt: new Date(),
                timezone: tz,
              },
            },
            upsert: true,
          },
        };
      });

      const result = await db
        .collection("priority_task")
        .bulkWrite(ops, { ordered: false });

      upserted = result.upsertedCount || 0;   // newly inserted
      matched = result.matchedCount || 0;     // already existed (same email+title+dayKey)
    }

    // return only title/start/end to the client (as requested)
    const response = (Array.isArray(plan) ? plan : []).map(({ title, start, end }) => ({
      title,
      start,
      end,
    }));

    res.json({
      plan: response,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
