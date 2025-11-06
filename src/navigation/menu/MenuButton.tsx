import { Button, ButtonProps } from "@mui/joy";
import { AnimatePresence, motion } from "motion/react";
import { useLocation } from "react-router-dom";
import { navigationBarItems } from "../items";
import { LuMenu, LuX } from "react-icons/lu";
import { useEffect, useState } from "react";

export default function MenuButton({
  open,
  ...props
}: ButtonProps & { open?: boolean }) {
  const { pathname } = useLocation();
  const currentItem = navigationBarItems.find((item) => item.path === pathname);

  const [displayItemIcon, setDisplayItemIcon] = useState(true);

  // Display the icon for 3 seconds after pathname changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setDisplayItemIcon(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, [pathname]);

  if (!currentItem) {
    return null;
  }

  const { icon: Icon, label } = currentItem;
  const ButtonIcon = open ? LuX : displayItemIcon ? Icon : LuMenu;

  return (
    <Button
      component={motion.button}
      layoutId={`${pathname}-nav-item-button`}
      variant="plain"
      color="neutral"
      style={{
        position: "relative",
        minHeight: "fit-content",
        borderRadius: "100vmax",
        padding: ".6rem .75rem .6rem .6rem",
        fontSize: "var(--joy-fontSize-sm)",
        fontWeight: `var(--joy-fontWeight-md)`,
        color: "var(--joy-palette-text-primary)",
        backgroundColor:
          "color-mix(in srgb, var(--joy-palette-neutral-softBg), transparent 100%)",
      }}
      whileHover={{
        backgroundColor:
          "color-mix(in srgb, var(--joy-palette-neutral-softBg), transparent 50%)",
      }}
      whileTap={{
        backgroundColor:
          "color-mix(in srgb, var(--joy-palette-neutral-softBg), transparent 0%)",
      }}
      {...props}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          layout
          initial={{ opacity: 0, rotate: -90 }}
          animate={{ opacity: 1, rotate: 0 }}
          exit={{ opacity: 0, rotate: 90 }}
          style={{ marginRight: "0.5rem", lineHeight: 0 }}
          key={`icon-${displayItemIcon}-${open}`}
        >
          <ButtonIcon />
        </motion.span>
        <motion.span
          layout
          style={{
            display: "flex",
            alignItems: "center",
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </motion.span>
      </AnimatePresence>
    </Button>
  );
}
