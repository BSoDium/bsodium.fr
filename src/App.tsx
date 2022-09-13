import React, { useEffect, useState } from 'react';

import DefaultPage from 'DefaultPage';

import 'App.global.scss';

export enum Theme {
  Light = 'light',
  Dark = 'dark',
  System = 'system',
}

function App(): JSX.Element {
  const [theme, setTheme] = useState<Theme>((window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? Theme.Dark : Theme.Light));

  useEffect(() => {
    document.getElementsByTagName('html')[0].className = theme;
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (e.matches) {
        setTheme(Theme.Dark);
      } else {
        setTheme(Theme.Light);
      }
    });
  });

  return (
    <DefaultPage />
  );
}

export default App;
