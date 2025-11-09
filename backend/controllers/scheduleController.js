import { callGemini, extractJson } from "../services/llmServices.js";
import { getUserStudyContextByEmail } from '../dataAccess.js';

export async function buildWeekSchedule(req, res) {
  try {
    const { priorities, priorityScope } = req.body;
    const email = 'ava@buffalo.edu'
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
  { "title": "title_name", "start": "Nov 8, 2025, 10:00 AM", "end": "Nov 8, 2025, 11:30 AM" },
  ...
]
    `;

    const result = await callGemini(prompt);
    const plan = extractJson(result);
    res.json({plan});
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
