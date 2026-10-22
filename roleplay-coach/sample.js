// Sample session for the demo (sample data, written for the demo, not a real learner).
export const SAMPLE = {
  scenarioId: "discovery-call",
  learnerName: "Sample learner",
  learnerEmail: "learner@example.com",
  startedAt: "2026-10-22T14:00:00Z",
  endedAt: "2026-10-22T14:11:40Z",
  turns: [
    { role: "persona", text: "Hi, it's Dana. I have about 15 minutes, so what did you want to cover?" },
    { role: "learner", text: "Thanks Dana, I'll keep it to 15. Could I ask a few questions about how scheduling works at your clinics today, and then we decide if a next step makes sense?" },
    { role: "persona", text: "Sure, go ahead." },
    { role: "learner", text: "What happens today when a patient doesn't show up?" },
    { role: "persona", text: "Honestly it's a mess. The slot is just lost, and the front desk spends a lot of time calling people to remind them." },
    { role: "learner", text: "How often does that happen, roughly, across the six clinics?" },
    { role: "persona", text: "We looked at it last quarter. About 15 percent of appointments. Our finance team put it at around nine thousand dollars a month." },
    { role: "learner", text: "So about 15 percent no-shows and roughly nine thousand a month lost, plus reminder calls eating the front desk's day. Did I get that right?" },
    { role: "persona", text: "Yes. Two hours a day on calls, at least. But we tried a scheduling tool last year and dropped it after three months." },
    { role: "learner", text: "Our tool sends automatic SMS reminders and has a waitlist, so it fixes that." },
    { role: "persona", text: "That's what the last vendor said too." },
    { role: "learner", text: "Fair enough. What made your team stop using the old one?" },
    { role: "persona", text: "Too many clicks. The front desk went back to paper within a month." },
    { role: "learner", text: "Would it help if two of your front desk staff tried it for a week before anyone signs anything?" },
    { role: "persona", text: "Maybe. Anything over five hundred a month needs Ravi, our CFO, anyway." },
    { role: "learner", text: "Then let's include Ravi. Could we do 30 minutes next Tuesday with you and Ravi, and I'll bring the no-show numbers you shared?" },
    { role: "persona", text: "Tuesday afternoon could work. Send me an invite and I'll check with Ravi." }
  ],
  judge: {
    criteria: [
      { id: "agenda", score: 5, evidence: "Thanks Dana, I'll keep it to 15. Could I ask a few questions about how scheduling works at your clinics today, and then we decide if a next step makes sense?", tip: "Good start. Keep naming the time limit when the call runs long." },
      { id: "discovery", score: 4, evidence: "How often does that happen, roughly, across the six clinics?", tip: "You got the no-show rate and the cost. Next time also ask who feels the pain most, front desk or dentists." },
      { id: "listening", score: 3, evidence: "So about 15 percent no-shows and roughly nine thousand a month lost, plus reminder calls eating the front desk's day. Did I get that right?", tip: "Strong summary, then you jumped to features. Ask one more question before you pitch." },
      { id: "objection", score: 4, evidence: "Fair enough. What made your team stop using the old one?", tip: "You recovered well. Link the answer back: fewer clicks for the front desk is the reason to try it." },
      { id: "next-step", score: 5, evidence: "Then let's include Ravi. Could we do 30 minutes next Tuesday with you and Ravi, and I'll bring the no-show numbers you shared?", tip: "Dated, includes the CFO, uses her numbers. Send the invite the same day." }
    ],
    strengths: [
      "Set a clear agenda inside the 15 minutes.",
      "Got the no-show rate and the monthly cost in Dana's own words.",
      "Closed on a dated meeting that includes the CFO."
    ],
    next_practice: [
      "Hold the pitch until you have asked at least one question about impact on staff.",
      "When a buyer mentions a failed tool, ask what success would look like this time."
    ],
    summary: "Solid discovery call. The learner uncovered the cost of no-shows and secured a CFO meeting, but pitched features one turn too early."
  }
};
