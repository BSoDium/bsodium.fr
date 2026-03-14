import { Container, Title, Text, Button, Stack } from "@mantine/core";
import { Link } from "react-router";
import { motion } from "motion/react";
import type { Route } from "./+types/home";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "BSoDium" },
    { name: "description", content: "BSoDium's portfolio" },
  ];
}

export default function Home() {
  return (
    <Container size="sm" py={120}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <Stack align="center" gap="lg">
          <Title order={1} ta="center">
            BSoDium
          </Title>
          <Text size="xl" c="dimmed" ta="center">
            Developer &amp; creative tinkerer.
          </Text>
          <Button component={Link} to="/projects" variant="light" size="lg">
            View projects
          </Button>
        </Stack>
      </motion.div>
    </Container>
  );
}
