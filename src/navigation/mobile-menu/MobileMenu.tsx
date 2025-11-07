import { Card } from "@mui/joy";
import { motion, MotionConfig } from "motion/react";
import NavigationBarItem from "../NavigationBarItem";
import { navigationBarItems } from "../items";
import { NavigationBarProvider } from "../NavigationBarContext";

export default function MobileMenu() {
  return (
    <MotionConfig
      transition={{
        // type: "spring", stiffness: 500, damping: 30,
        duration: 10,
      }}
    >
      <Card
        component={motion.div}
        layoutId="mobile-menu"
        variant="outlined"
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          borderRadius: 21,
          originX: "right",
          originY: "top",
          padding: "0.25rem",
          zIndex: 2000,
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
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
    </MotionConfig>
  );
}
