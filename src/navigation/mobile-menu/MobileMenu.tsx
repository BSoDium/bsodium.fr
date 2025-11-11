import { useState } from "react";
import MobileMenuButton from "./MobileMenuButton";
import MobileMenuPanel from "./MobileMenuPanel";
import { Stack } from "@mui/joy";

export default function MobileMenu() {
  const [open, setOpen] = useState(false);

  return (
    <Stack direction="row" alignItems="center" position="relative">
      <MobileMenuButton open={open} onClick={() => setOpen(!open)} />
      <MobileMenuPanel open={open} onClose={() => setOpen(false)} />
    </Stack>
  );
}
