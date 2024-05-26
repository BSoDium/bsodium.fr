import React from 'react';
import ReactDOM from 'react-dom/client';
import {
  StyledEngineProvider,
} from '@mui/joy';
import {
  BrowserRouter, Route, Routes,
} from 'react-router-dom';
import { SpeedInsights } from '@vercel/speed-insights/react';
import Landing from 'Landing';
import Resume from 'Resume';
import ReactGA from 'react-ga4';
import 'App.global.scss';
import Projects from 'components/projects/Projects';
import ThemeLoader from 'components/ThemeLoader';
import NavigationBar from 'NavigationBar';
import AnalyticsBanner from 'components/AnalyticsBanner';
import Credits from 'components/Credits';

if (process.env.NODE_ENV !== 'development') ReactGA.initialize(process.env.REACT_APP_GA_MEASUREMENT_ID as string);

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement,
);

root.render(
  <React.StrictMode>
    <SpeedInsights />
    <StyledEngineProvider injectFirst>
      <ThemeLoader>
        <BrowserRouter>
          <AnalyticsBanner />
          <Credits />
          <NavigationBar>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/resume" element={<Resume />} />
              <Route path="/projects" element={<Projects />} />
            </Routes>
          </NavigationBar>
        </BrowserRouter>
      </ThemeLoader>
    </StyledEngineProvider>
  </React.StrictMode>,
);
