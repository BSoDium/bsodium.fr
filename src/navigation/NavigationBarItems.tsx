import NavigationBarItem from "@/navigation/NavigationBarItem";
import { LuCode, LuHouse, LuUser } from "react-icons/lu";

export default function NavigationBarItems() {
  return (
    <>
      <NavigationBarItem to="/">
        <LuHouse style={{ marginRight: "0.5rem" }} />
        Homepage
      </NavigationBarItem>
      <NavigationBarItem to="/projects">
        <LuCode style={{ marginRight: "0.5rem" }} />
        Featured projects
      </NavigationBarItem>
      <NavigationBarItem to="/resume">
        <LuUser style={{ marginRight: "0.5rem" }} />
        Resume
      </NavigationBarItem>
    </>
  );
}
