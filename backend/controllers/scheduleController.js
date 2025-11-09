import { callGemini, extractJson } from "../services/llmServices.js";
export async function buildWeekSchedule(req, res) {
  try {
    const { priorities, priorityScope } = req.body;

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

    const prompt = `
You are a university study planner.
The user has priorities task:
${JSON.stringify(priorities, null, 2)}

Here is their subject data:
${JSON.stringify(dummySubjects, null, 2)}

- Priority Scope: "${priorityScope}"  (can be "today" or "week")

Create a one-week schedule (Mon–Sun) that:
- Includes the provided class blocks.
- Adds focused study blocks for assignments and quiz/exam preparation.
- If priorityScope is "today", prioritize and schedule the user's priority tasks for the current day. For the rest of the week, schedule normally without special priority task.
- If priorityScope is "week", prioritize and schedule the user's priority tasks across the entire week.
- Allocates time according to the user's prioritiesText by creating a new task.

Strictly return JSON in the below format:
{ "title": 'title_name', "start": 'Nov 8, 2025, 10:00 AM', end: 'Nov 8, 2025, 11:30 AM' }
    `;

    const result = await callGemini(prompt);
    console.log("Gemini response:", result);
    const plan = extractJson(result);
    res.json({plan });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
