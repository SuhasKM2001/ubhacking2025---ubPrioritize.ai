import { callGemini } from "../services/llmServices.js";

const dummySubjects = [
  {
    title: "Machine Learning",
    classes: ["Mon 10:00-11:30", "Wed 14:00-16:00"],
    assignments: [{ title: "HW1 Regression", due: "2025-11-15" }],
    quizzes: [{ title: "Quiz1", due: "2025-11-12" }],
  },
  {
    title: "Computer Security",
    classes: ["Tue 09:00-10:30", "Thu 15:00-16:30"],
    assignments: [{ title: "Exploit Writeup", due: "2025-11-20" }],
    quizzes: [],
  },
  {
    title: "DIC",
    classes: ["Mon 13:00-14:30", "Fri 10:00-12:00"],
    assignments: [{ title: "Data Modeling Project", due: "2025-11-25" }],
    quizzes: [{ title: "Quiz1", due: "2025-11-18" }],
  },
  {
    title: "Algorithms",
    classes: ["Wed 10:00-11:30", "Thu 12:00-13:00"],
    assignments: [{ title: "HW4 Graphs", due: "2025-11-14" }],
    quizzes: [{ title: "Quiz2", due: "2025-11-13" }],
  },
];

export async function askStudyBot(req, res) {
  try {
    const body = req.body ?? {};
    const question = (body.question ?? "").trim();

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
- subjects & upcoming work:
${JSON.stringify(dummySubjects, null, 2)}

USER QUESTION
"${question}"

INSTRUCTIONS
- Answer in plain text only (no JSON, no markdown).
- Be brief and actionable: 3–6 bullet-style lines (use dashes).
- If the question is vague (e.g., "what should I study?"), pick the top 2–3 most urgent/relevant tasks based on due dates and typical difficulty (e.g., quizzes/exams soon, assignments due sooner).
- For each suggestion, include: what to do, approx time (45–60 min blocks), and why (due soon / priority / class alignment).
- If today is packed, suggest the next best time slot to study.
- Avoid inventing new subjects or tasks not listed above.
`.trim();

    const answer = await callGemini(prompt); // returns plain string
    return res.json({ answer: (answer || "").trim() });
  } catch (err) {
    console.error("askStudyBot error:", err);
    return res.status(500).json({ error: err.message || "Internal error" });
  }
}
