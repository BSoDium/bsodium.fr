import { motion } from "motion/react";

const projects = [
  {
    title: "catalyst",
    description:
      "This portfolio — focused on clean UX and modern React architecture.",
    tags: ["React", "Motion", "React Router", "Tailwind CSS"],
    url: "https://catalyst",
  },
  {
    title: "klode",
    description:
      "An LLM-powered event recommender that surfaces relevant local events.",
    tags: ["TypeScript", "LLM", "Node.js"],
    url: "https://github.com/bsodium/klode",
  },
  {
    title: "Homelab",
    description:
      "Self-hosted infrastructure for development, media, and automation services.",
    tags: ["Docker", "Linux", "Networking"],
  },
  {
    title: "Open Source",
    description:
      "Contributions to various open-source projects and developer tools.",
    tags: ["GitHub", "TypeScript", "Python"],
    url: "https://github.com/bsodium",
  },
];

export default function Projects() {
  return (
    <motion.section
      id="projects"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.6 }}
      className="scroll-mt-20 space-y-8"
    >
      <h2 className="text-2xl font-semibold tracking-tight">Projects</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {projects.map((project) => (
          <div
            key={project.title}
            className="rounded-lg border border-white/10 p-5 transition hover:border-white/20"
          >
            <div className="flex items-start justify-between">
              <h3 className="font-medium">{project.title}</h3>
              {project.url && (
                <a
                  href={project.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-gray-500 transition hover:text-foreground"
                  aria-label={`Visit ${project.title}`}
                >
                  ↗
                </a>
              )}
            </div>
            <p className="mt-2 text-sm leading-relaxed text-gray-400">
              {project.description}
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {project.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-white/5 px-2.5 py-0.5 text-xs text-gray-400"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </motion.section>
  );
}
