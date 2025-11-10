import { createPortal } from "react-dom";
import { Card } from "@mui/joy";
import { motion, MotionConfig } from "motion/react";
import NavigationBarItem from "../NavigationBarItem";
import { navigationBarItems } from "../items";
import { NavigationBarProvider } from "../NavigationBarContext";
import { useEffect, useRef } from "react";

export default function MobileMenuPanel({
  open,
  onClose,
}: {
  open?: boolean;
  onClose?: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !onClose) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    // Add a small delay to prevent immediate closure when opening
    const timeoutId = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open, onClose]);

  return open
    ? createPortal(
        <MotionConfig
          transition={{
            layout: {
              type: "spring",
              stiffness: 500,
              damping: 30,
            },
            x: {
              type: "spring",
              stiffness: 500,
              damping: 30,
            },
          }}
        >
          <Card
            ref={panelRef}
            component={motion.div}
            layoutId="mobile-menu-button"
            style={{
              position: "fixed",
              overflow: "hidden",
              top: 10,
              right: 10,
              borderRadius: 21,
              padding: "0.25rem",
              zIndex: 2000,
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
              backgroundColor:
                "color-mix(in srgb, var(--joy-palette-background-surface), transparent 30%)",
              backdropFilter: "blur(5px)",
            }}
            sx={{
              boxShadow: "lg",
            }}
            animate={{
              y: [0, 10, 0],
            }}
          >
            <NavigationBarProvider>
              {navigationBarItems.map(({ path, icon: Icon, label }) => (
                <NavigationBarItem key={path} to={path}>
                  <Icon style={{ marginRight: "0.5rem" }} />
                  {label}
                </NavigationBarItem>
              ))}
            </NavigationBarProvider>
          </Card>
        </MotionConfig>,
        document.body
      )
    : null;
}
