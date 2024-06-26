import React from 'react';
import ReactDOM from 'react-dom/client';
import {
  StyledEngineProvider,
} from '@mui/joy';
import {
  BrowserRouter, Outlet, Route, Routes,
} from 'react-router-dom';
import { SpeedInsights } from '@vercel/speed-insights/react';
import Landing from 'Landing';
import Resume from 'resume/Resume';
import ReactGA from 'react-ga4';
import 'App.global.scss';
import Projects from 'components/projects/Projects';
import ThemeLoader from 'components/ThemeLoader';
import NavigationBar from 'navigation/NavigationBar';
import AnalyticsBanner from 'components/AnalyticsBanner';
import Copyright from 'components/Copyright';
import NotFound from 'NotFound';
import Download from 'resume/Download';

if (process.env.REACT_APP_GA_MEASUREMENT_ID) {
  ReactGA.initialize(process.env.REACT_APP_GA_MEASUREMENT_ID as string);
}

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement,
);

root.render(
  <React.StrictMode>
    <SpeedInsights />
    <StyledEngineProvider injectFirst>
      <ThemeLoader>
        <BrowserRouter>
          <Routes>
            <Route element={(
              <>
                <AnalyticsBanner />
                <Copyright />
                <Outlet />
              </>
            )}
            >
              <Route element={(
                <NavigationBar>
                  <Outlet />
                </NavigationBar>
              )}
              >
                <Route index element={<Landing />} />
                <Route
                  path="/resume"
                  element={(
                    <>
                      <Download />
                      <Resume />
                    </>
              )}
                />
                <Route path="/projects" element={<Projects />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ThemeLoader>
    </StyledEngineProvider>
  </React.StrictMode>,
);
