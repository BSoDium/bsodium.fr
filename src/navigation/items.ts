import { LuCode, LuHouse, LuUser } from "react-icons/lu";

export const navigationBarItems = [
  {
    path: "/",
    icon: LuHouse,
    label: "Homepage",
  },
  {
    path: "/projects",
    icon: LuCode,
    label: "Featured projects",
  },
  {
    path: "/resume",
    icon: LuUser,
    label: "Resume",
  },
];
