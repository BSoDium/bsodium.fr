import { Container, Title, Text, Anchor, Stack } from "@mantine/core";
import { Link } from "react-router";
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
    <Container size="sm" py={120}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <Stack gap="lg">
          <Title order={1}>Projects</Title>
          <Text size="lg" c="dimmed">
            Coming soon.
          </Text>
          <Anchor component={Link} to="/">
            &larr; Back home
          </Anchor>
        </Stack>
      </motion.div>
    </Container>
  );
}
