export type ExperienceRecord = {
  readonly id: string;
  readonly company: string;
  readonly role: string;
  readonly dates: string;
};

export const experience: readonly ExperienceRecord[] = [
  {
    id: "freemancodz",
    company: "Freemancodz",
    role: "Product Engineer",
    dates: "Aug 2025 – Present",
  },
  {
    id: "novier-labs",
    company: "Novier Labs",
    role: "Software Engineer",
    dates: "Aug 2023 – Jul 2025",
  },
  {
    id: "pay4me",
    company: "Pay4Me",
    role: "Frontend Developer",
    dates: "Jan 2022 – Feb 2023",
  },
];
