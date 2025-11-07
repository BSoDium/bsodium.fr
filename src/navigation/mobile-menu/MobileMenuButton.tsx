import { Button, ButtonProps } from "@mui/joy";
import { AnimatePresence, motion } from "motion/react";
import { useLocation } from "react-router-dom";
import { navigationBarItems } from "../items";
import { LuMenu, LuX } from "react-icons/lu";
import { useEffect, useState } from "react";

export default function MobileMenuButton({
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
      layoutId="mobile-menu"
      variant="plain"
      color="neutral"
      style={{
        position: "relative",
        minHeight: "fit-content",
        borderRadius: "100vmax",
        padding: ".6rem .75rem .6rem .6rem",
        fontSize: "var(--joy-fontSize-sm)",
        fontWeight: `var(--joy-fontWeight-md)`,
        color: "var(--joy-palette-neutral-solidColor)",
        backgroundColor: "var(--joy-palette-neutral-solidBg)",
      }}
      {...props}
    >
      <motion.span
        layoutId="nav-item-active-bg"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          borderRadius: "100vmax",
          padding: ".6rem .75rem .6rem .75rem",
          pointerEvents: "none",
          zIndex: -1,
        }}
      />
      <motion.span
        style={{
          display: "flex",
          alignItems: "center",
          whiteSpace: "nowrap",
          scale: "var(--content-scale)",
          zIndex: 1,
        }}
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
      </motion.span>
    </Button>
  );
}
