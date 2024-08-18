import { createBrowserRouter, Outlet, RouteObject } from "react-router-dom";
import AnalyticsBanner from "@/components/AnalyticsBanner";
import Copyright from "@/components/Copyright";
import NavigationBar from "@/navigation/NavigationBar";
import Landing from "@/pages/Landing";
import Resume from "@/pages/Resume";
import Projects from "@/components/projects/Projects";

/**
 * The architecture of the application routes.
 */
export const architecture: RouteObject[] = [
  {
    element: (
      <>
        <AnalyticsBanner />
        <Copyright />
        <NavigationBar>
          <Outlet />
        </NavigationBar>
      </>
    ),
    children: [
      {
        element: <Landing />,
        index: true,
      },
      {
        element: <Resume />,
        path: "resume",
      },
      {
        element: <Projects />,
        path: "projects",
      },
    ],
  },
];

/**
 * The router of the application.
 */
const router = createBrowserRouter(architecture);

export default router;
