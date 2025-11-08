import { useState } from "react";
import MobileMenuButton from "./MobileMenuButton";
import MobileMenuPanel from "./MobileMenuPanel";
import { Stack } from "@mui/joy";
import { AnimatePresence } from "motion/react";

export default function MobileMenu() {
  const [open, setOpen] = useState(false);

  return (
    <Stack direction="row" alignItems="center" position="relative">
      <AnimatePresence mode="popLayout">
        <MobileMenuButton open={open} onOpen={() => setOpen(true)} />
        <MobileMenuPanel open={open} />
      </AnimatePresence>
    </Stack>
  );
}
