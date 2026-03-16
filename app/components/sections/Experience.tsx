import { motion } from "motion/react";

const experiences = [
  {
    company: "Kanop",
    role: "Frontend Engineer",
    period: "2024 – Present",
    bullets: [
      "Building web applications for satellite-based forest monitoring",
      "Developing interactive map visualizations and data dashboards",
      "Working with React, TypeScript, and geospatial technologies",
    ],
  },
  {
    company: "Tauniqo / TalentYou",
    role: "Full-Stack Developer",
    period: "2023 – 2024",
    bullets: [
      "Developed talent management platform features end-to-end",
      "Implemented real-time collaboration and assessment tools",
    ],
  },
  {
    company: "Escape Technologies",
    role: "Software Engineer Intern",
    period: "2022 – 2023",
    bullets: [
      "Contributed to GraphQL and API security testing tools",
      "Developed automated vulnerability detection features",
    ],
  },
];

export default function Experience() {
  return (
    <motion.section
      id="experience"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.6 }}
      className="scroll-mt-20 space-y-8"
    >
      <h2 className="text-2xl font-semibold tracking-tight">Experience</h2>
      <div className="space-y-8">
        {experiences.map((exp) => (
          <div key={exp.company} className="border-l-2 border-white/10 pl-6">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
              <div>
                <h3 className="font-medium">{exp.company}</h3>
                <p className="text-sm text-gray-400">{exp.role}</p>
              </div>
              <span className="shrink-0 text-sm text-gray-500">
                {exp.period}
              </span>
            </div>
            <ul className="mt-3 space-y-1 text-sm leading-relaxed text-gray-300">
              {exp.bullets.map((bullet, i) => (
                <li key={i}>{bullet}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </motion.section>
  );
}
