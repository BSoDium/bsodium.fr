import NavigationBarItem from "@/navigation/NavigationBarItem";
import { NavigationBarProvider } from "@/navigation/NavigationBarContext";
import { navigationBarItems } from "./items";

export default function NavigationBarItems() {
  return (
    <NavigationBarProvider>
      {navigationBarItems.map(({ path, icon: Icon, label }) => (
        <NavigationBarItem key={path} to={path}>
          <Icon style={{ marginRight: "0.5rem" }} />
          {label}
        </NavigationBarItem>
      ))}
    </NavigationBarProvider>
  );
}
