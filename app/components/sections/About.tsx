import { motion } from "motion/react";

export default function About() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.6 }}
      className="space-y-6"
    >
      <h1 className="text-4xl font-bold">BSoDium</h1>
      <p className="text-lg text-gray-500 dark:text-gray-400">
        Developer &amp; creative tinkerer.
      </p>
      <p className="leading-relaxed text-gray-700 dark:text-gray-300">
        I build things for the web and beyond. Passionate about clean code,
        interactive experiences, and making software that feels alive.
      </p>
    </motion.section>
  );
}
