import ReactDOM from "react-dom/client";
import ReactGA from "react-ga4";
import Providers from "@/Providers";
import { RouterProvider } from "react-router-dom";
import router from "@/router";
import "@/app.global.scss";

if (process.env.REACT_APP_GA_MEASUREMENT_ID) {
  ReactGA.initialize(process.env.REACT_APP_GA_MEASUREMENT_ID as string);
}

const root = document.getElementById("root");
if (!root) throw new Error("No root element found");

ReactDOM.createRoot(root).render(
  <Providers>
    <RouterProvider router={router} />
  </Providers>
);
