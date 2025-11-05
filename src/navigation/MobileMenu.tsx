import { useState } from "react";
import MenuButton from "./menu/MenuButton";
import FullscreenMenu from "./menu/FullscreenMenu";
import { AnimatePresence } from "motion/react";

export default function MobileMenu() {
  const [open, setOpen] = useState(false);

  return (
    <AnimatePresence>
      {!open && (
        <MenuButton key="button" onClick={() => setOpen(true)} open={open} />
      )}
      {open && <FullscreenMenu key="menu" onClose={() => setOpen(false)} />}
    </AnimatePresence>
  );
}
