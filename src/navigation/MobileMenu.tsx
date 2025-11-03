import { useState } from "react";
import FullscreenMenu from "./menu/FullscreenMenu";
import MenuButton from "./menu/MenuButton";

export default function MobileMenu() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <MenuButton onClick={() => setOpen(true)} />
      {open && <FullscreenMenu onClose={() => setOpen(false)} />}
    </>
  );
}
