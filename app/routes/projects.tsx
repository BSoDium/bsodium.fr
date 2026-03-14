import { Link as HeroLink } from "@heroui/react";
import { motion } from "motion/react";
import type { Route } from "./+types/projects";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Projects — BSoDium" },
    { name: "description", content: "BSoDium's projects" },
  ];
}

export default function Projects() {
  return (
    <div className="mx-auto max-w-screen-sm py-30">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="flex flex-col gap-6">
          <h1 className="text-4xl font-bold">Projects</h1>
          <p className="text-lg text-gray-500">Coming soon.</p>
          <HeroLink href="/">
            &larr; Back home
          </HeroLink>
        </div>
      </motion.div>
    </div>
  );
}
