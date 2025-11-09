import { createPortal } from "react-dom";
import { Card } from "@mui/joy";
import { motion, MotionConfig } from "motion/react";
import NavigationBarItem from "../NavigationBarItem";
import { navigationBarItems } from "../items";
import { NavigationBarProvider } from "../NavigationBarContext";

export default function MobileMenuPanel({ open }: { open?: boolean }) {
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
