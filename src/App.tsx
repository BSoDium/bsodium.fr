import React, { useEffect } from 'react';

import 'App.global.scss';

import Landing from 'pages/Landing';
import { useColorScheme } from '@mui/joy/styles';

function App(): JSX.Element {
  const { setMode } = useColorScheme();

  useEffect(() => {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (e.matches) {
        setMode('dark');
      } else {
        setMode('light');
      }
    });
  });

  return (
    <Landing />
  );
}

export default App;
