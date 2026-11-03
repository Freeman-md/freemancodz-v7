export type Testimonial = {
  readonly id: string;
  readonly quotation: string;
  readonly author: string;
  readonly role: string;
  readonly initials: string;
  readonly source: string;
};

// Received LinkedIn recommendations, read directly on 19 October 2026.
// Preserve original wording. Proposed corrections belong in the review notes.
export const testimonials: readonly Testimonial[] = [
  {
    id: "emmanuel-nelson",
    quotation:
      "Freeman is a pragmatic developer, pays attains to details and easy to work with. I highly recommend him as a go to person for your next frontend development project. His deliveries are top tier.",
    author: "Emmanuel Nelson",
    initials: "EN",
    role: "Software Engineer — Backend",
    source: "https://www.linkedin.com/in/emmanuel-nelson-7a4b3263/",
  },
  {
    id: "matin-adebayo",
    quotation:
      "I had the pleasure of collaborating with Freeman on the development of TRU, a comprehensive marketplace platform, where I worked as a mobile developer during a contract term. Freeman led the development of TRU, orchestrating a multifaceted team including stakeholders, project managers, backend and mobile app developers, as well as UI/UX designers.\n\nDuring my time working with Freeman, I witnessed a significant improvement in my own skills. Freeman possesses a remarkable intellect, exceptional project management skills, and an ability to transform complex concepts into intuitive designs. Additionally, Freeman demonstrates patience tempered with expertise.\n\nI wholeheartedly recommend Freeman to anyone seeking a highly skilled, motivated, and team-oriented leader who can navigate complex projects with expertise and grace.",
    author: "Matin Adebayo",
    initials: "MA",
    role: "Software Developer at Avrion",
    source: "https://www.linkedin.com/in/matin-adebayo/",
  },
];
