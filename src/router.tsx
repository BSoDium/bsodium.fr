import { createBrowserRouter, Outlet, RouteObject } from "react-router-dom";
import AnalyticsBanner from "@/components/AnalyticsBanner";
import NavigationBar from "@/navigation/NavigationBar";

/**
 * The architecture of the application routes.
 */
export const architecture: RouteObject[] = [
  {
    element: (
      <>
        <AnalyticsBanner />
        <NavigationBar>
          <Outlet />
        </NavigationBar>
      </>
    ),
    children: [
      {
        async lazy() {
          const { default: Landing } = await import("@/pages/Landing");
          return { Component: Landing };
        },
        index: true,
      },
      {
        async lazy() {
          const { default: Resume } = await import("@/pages/Resume");
          return { Component: Resume };
        },
        path: "resume",
      },
      {
        async lazy() {
          const { default: Projects } = await import(
            "@/components/projects/Projects"
          );
          return { Component: Projects };
        },
        path: "projects",
      },
      {
        async lazy() {
          const { default: NoMatch } = await import("@/pages/NoMatch");
          return { Component: NoMatch };
        },
        path: "*",
      },
    ],
  },
];

/**
 * The router of the application.
 */
const router = createBrowserRouter(architecture);

export default router;
