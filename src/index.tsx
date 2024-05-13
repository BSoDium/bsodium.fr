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

ReactGA.initialize('G-QETT923XKJ');

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement,
);

root.render(
  <React.StrictMode>
    <SpeedInsights />
    <StyledEngineProvider injectFirst>
      <ThemeLoader>
        <BrowserRouter>
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
