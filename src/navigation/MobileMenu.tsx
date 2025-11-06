import { useState } from "react";
import MenuButton from "./menu/MenuButton";
import FullscreenMenu from "./menu/FullscreenMenu";
import { AnimatePresence } from "motion/react";

export default function MobileMenu() {
  const [open, setOpen] = useState(false);

  return (
    <AnimatePresence>
      {open ? (
        <FullscreenMenu key="menu" onClose={() => setOpen(false)} />
      ) : (
        <MenuButton key="button" onClick={() => setOpen(true)} open={open} />
      )}
    </AnimatePresence>
  );
}
