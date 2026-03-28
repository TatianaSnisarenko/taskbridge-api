export const reviewTexts = {
  excellent: [
    'Excellent collaboration end-to-end. Delivery was on time, code quality was high, and communication stayed clear through every iteration.',
    'Outstanding execution. The implementation was production-ready, thoughtfully tested, and easy for our team to maintain.',
    'Fantastic partnership. Requirements were clarified early, edge cases were handled, and final handoff was smooth.',
    'High-quality work with great ownership. We would gladly collaborate again on a larger scope.',
  ],
  good: [
    'Great delivery overall. A few adjustments were needed, but the core implementation was strong and reliable.',
    'Solid work with clear progress updates. Final output met expectations and integrated well with existing services.',
    'Good technical quality and collaborative attitude. Review feedback was addressed quickly.',
  ],
  acceptable: [
    'Work met the minimum scope. Some areas needed refactoring, but the contributor was responsive and constructive.',
    'Reasonable delivery with a few quality gaps that were fixed during review.',
  ],
};

export const platformReviewTemplates = {
  company: [
    {
      rating: 5,
      text: 'The platform helped us move from scattered hiring chats to a structured workflow. Candidate quality was strong and communication tools were straightforward for our team.',
    },
    {
      rating: 5,
      text: 'We filled a critical frontend role faster than expected. The project posting flow, applicant filters, and review process made collaboration with candidates very efficient.',
    },
    {
      rating: 4,
      text: 'Great experience overall. We especially value transparent status tracking for tasks and the ability to keep context in one place from invitation to delivery.',
    },
    {
      rating: 5,
      text: 'The platform is practical for lean teams: clear onboarding, useful notifications, and enough moderation controls for safe collaboration.',
    },
  ],
  developer: [
    {
      rating: 5,
      text: 'Task requirements were clearer than on most freelance platforms. I could estimate effort quickly and communicate progress without unnecessary overhead.',
    },
    {
      rating: 4,
      text: 'I like the quality of project briefs and the review culture. Feedback from companies is specific and useful for growth.',
    },
    {
      rating: 5,
      text: 'Very good developer experience: realistic tasks, clear milestones, and predictable communication with project owners.',
    },
    {
      rating: 4,
      text: 'Useful platform for juniors. It is easier to build portfolio-worthy experience when tasks and expectations are described in detail.',
    },
  ],
};

export const chatMessages = [
  "Hi! I'm interested in this task and can start this week. I reviewed your requirements and have a clear implementation plan.",
  'Thanks for sharing the context. Could we align on the acceptance criteria for authentication edge cases before I finalize the API contract?',
  'I pushed the first implementation milestone. Core flows are working, and I included tests for validation and authorization checks.',
  'Great feedback, thank you. I addressed your review notes and added a short migration guide for the updated schema behavior.',
  'I completed performance cleanup and regression testing. Please review when convenient, especially the updated error handling branch.',
  'Everything is now ready for final verification. If approved, I can prepare a concise handoff note for your internal team.',
];
