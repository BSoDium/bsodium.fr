import NavigationBarItem from "@/navigation/NavigationBarItem";
import { NavigationBarProvider } from "@/navigation/NavigationBarContext";
import { LayoutGroup } from "motion/react";
import { navigationBarItems } from "./items";

export default function NavigationBarItems() {
  return (
    <NavigationBarProvider>
      <LayoutGroup>
        {navigationBarItems.map(({ path, icon: Icon, label }) => (
          <NavigationBarItem key={path} to={path}>
            <Icon style={{ marginRight: "0.5rem" }} />
            {label}
          </NavigationBarItem>
        ))}
      </LayoutGroup>
    </NavigationBarProvider>
  );
}
