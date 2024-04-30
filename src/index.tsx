import React from 'react';
import ReactDOM from 'react-dom/client';
import {
  StyledEngineProvider,
} from '@mui/joy';
import {
  BrowserRouter, Route, Routes,
} from 'react-router-dom';
import { SpeedInsights } from '@vercel/speed-insights/react';
import App from 'App';
import Resume from 'Resume';
import ReactGA from 'react-ga4';
import 'App.global.scss';
import Projects from 'components/projects/Projects';

ReactGA.initialize('G-QETT923XKJ');

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement,
);

root.render(
  <React.StrictMode>
    <SpeedInsights />
    <StyledEngineProvider injectFirst>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/resume" element={<Resume />} />
          <Route path="/projects" element={<Projects />} />
        </Routes>
      </BrowserRouter>
    </StyledEngineProvider>
  </React.StrictMode>,
);
