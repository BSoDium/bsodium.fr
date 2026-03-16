import { motion } from "motion/react";

export default function Education() {
  return (
    <motion.section
      id="education"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.6 }}
      className="scroll-mt-20 space-y-8"
    >
      <h2 className="text-2xl font-semibold tracking-tight">Education</h2>
      <div className="border-l-2 border-white/10 pl-6">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
          <div>
            <h3 className="font-medium">ENSEEIHT — Toulouse INP</h3>
            <p className="text-sm text-gray-400">
              Engineering Degree (Bac+5)
            </p>
          </div>
          <span className="shrink-0 text-sm text-gray-500">2019 – 2024</span>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-gray-300">
          Computer Science and Applied Mathematics. Focus on software
          engineering, distributed systems, and machine learning.
        </p>
      </div>
    </motion.section>
  );
}
