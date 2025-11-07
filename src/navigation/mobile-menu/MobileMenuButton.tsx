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
      variant="outlined"
      color="neutral"
      style={{
        minHeight: "fit-content",
        borderRadius: 18,
        originX: "right",
        originY: "top",
        padding: ".625rem .775rem .625rem .625rem",
        fontSize: "var(--joy-fontSize-sm)",
        fontWeight: `var(--joy-fontWeight-md)`,
        color: "var(--joy-palette-text-primary)",
        backgroundColor: "var(--joy-palette-background-surface)",
      }}
      {...props}
    >
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
