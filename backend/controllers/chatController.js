import { callGemini } from "../services/llmServices.js";
import { getUserStudyContextByEmail } from '../dataAccess.js';

export async function askStudyBot(req, res) {
  try {
    const body = req.body ?? {};
    const question = (body.question ?? "").trim();
    const email = 'ava@buffalo.edu'
    const ctx = await getUserStudyContextByEmail(email);

    if (!question) {
      return res.status(400).json({ error: "question is required" });
    }

    // Optional: pass today's date/time to help with “today” vs “this week”
    const now = new Date();
    const nowStr = now.toLocaleString("en-US", {
      timeZone: "America/New_York",
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

    const prompt = `
You are a concise, practical study coach.

CONTEXT
- now (America/New_York): ${nowStr}

USER
${JSON.stringify(ctx.user, null, 2)}

CLASS SCHEDULE (fixed busy blocks)
${JSON.stringify(ctx.classSchedule ?? [], null, 2)}

ASSIGNMENTS (with due dates)
${JSON.stringify(ctx.courseAssignments ?? [], null, 2)}

STUDENT PART-TIME SHIFTS (fixed busy blocks)
${JSON.stringify(ctx.studentPartTime ?? [], null, 2)}

UNIVERSITY EVENTS & ORGS (may be busy or optional)
${JSON.stringify(ctx.eventsAndOrgs ?? [], null, 2)}

USER QUESTION
"${question}"

INSTRUCTIONS
- Answer in plain text only (no JSON, no markdown).
- Be brief and actionable: 3–6 bullet-style lines (use dashes).
- Prioritize by urgency (sooner due dates, upcoming quizzes/exams, heavy classes).
- For each bullet: what to do, ~45–60 min focus block(s), and why (due soon / class alignment / prep).
- Avoid inventing subjects or tasks not present in the context.
- If today is already packed (busy blocks overlap), suggest the next best time to study this week.
`.trim();

    const answer = await callGemini(prompt); 
    return res.json({ answer: (answer || "").trim() });
  } catch (err) {
    console.error("askStudyBot error:", err);
    return res.status(500).json({ error: err.message || "Internal error" });
  }
}
