import React from 'react';

import app from 'assets/app.svg';
import { SiGithubsponsors } from 'react-icons/si';

export default function DefaultPage() {
  return (
    <div className="default-app">
      <img src={app} className="profile-pic" alt="app icon" />
      <p>
        <h1>Hello there</h1>
        {' '}
        <h3 className="text-secondary">
          Edit
          {' '}
          <code>src/App.tsx</code>
          {' '}
          and save to reload.
        </h3>
      </p>
      <a
        className="default-app-link standard-btn href soft"
        href="https://github.com/sponsors/BSoDium"
        target="_blank"
        rel="noopener noreferrer"
      >
        <SiGithubsponsors size="1.3em" />
        Sponsor creator
      </a>
    </div>
  );
}
