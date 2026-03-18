import { motion } from "motion/react";

const links = [
  { label: "GitHub", url: "https://github.com/bsodium" },
  { label: "LinkedIn", url: "https://linkedin.com/in/" },
  { label: "Email", url: "mailto:hello@catalyst" },
];

export default function Contact() {
  return (
    <motion.section
      id="contact"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.6 }}
      className="scroll-mt-20 space-y-6"
    >
      <h2 className="text-2xl font-semibold tracking-tight">Contact</h2>
      <p className="text-sm leading-relaxed text-gray-400">
        Interested in working together? Reach out through any of these channels.
      </p>
      <div className="flex flex-wrap gap-3">
        {links.map((link) => (
          <a
            key={link.label}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-white/10 px-4 py-2 text-sm text-gray-300 transition hover:border-white/20 hover:text-foreground"
          >
            {link.label}
          </a>
        ))}
      </div>
    </motion.section>
  );
}
