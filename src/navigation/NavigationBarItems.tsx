import NavigationBarItem from "@/navigation/NavigationBarItem";
import { navigationBarItems } from "./items";

export default function NavigationBarItems() {
  return (
    <>
      {navigationBarItems.map(({ path, icon: Icon, label }) => (
        <NavigationBarItem key={path} to={path}>
          <Icon style={{ marginRight: "0.5rem" }} />
          {label}
        </NavigationBarItem>
      ))}
    </>
  );
}
