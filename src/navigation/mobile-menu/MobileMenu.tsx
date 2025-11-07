import { Card } from "@mui/joy";
import { motion } from "motion/react";
import NavigationBarItem from "../NavigationBarItem";
import { navigationBarItems } from "../items";
import { NavigationBarProvider } from "../NavigationBarContext";

export default function MobileMenu() {
  return (
    <Card
      component={motion.div}
      layoutId="mobile-menu"
      variant="outlined"
      style={{
        position: "fixed",
        top: "1.5rem",
        right: "1.5rem",
        borderRadius: "25px",
        padding: "0.5rem",
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
  );
}
