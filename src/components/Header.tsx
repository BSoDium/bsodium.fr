import React, { useEffect, useState } from 'react';

import planet from 'assets/planet.png';
import robot1 from 'assets/robot_flying_1.png';
import robot2 from 'assets/robot_flying_2.png';
import sky from 'assets/sky.png';
import { Stack, Typography } from '@mui/joy';
import TextTransition, { presets } from 'react-text-transition';
import greeting from 'utils/Greeting';
import { ATypography } from 'App';
import { useMobileMode } from './Responsive';

export const visitors = [
  'stranger',
  'collaborator',
  'fellow developer',
  'fellow human',
  'friend',
];

export default function Header() {
  const mobile = useMobileMode();
  const [visitor, setVisitor] = useState(visitors[0]);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisitor((prev) => {
        const nextIndex = (visitors.indexOf(prev) + 1) % visitors.length;
        return visitors[nextIndex];
      });
    }, 2000);
    return () => { clearInterval(interval); };
  }, []);

  return (
    <>
      <img
        src={planet}
        alt="planet"
        style={{
          position: 'absolute',
          width: '700px',
          top: '-100px',
          left: mobile ? '50%' : '0',
          transform: mobile ? 'translateX(-50%)' : 'none',
          zIndex: -1,
        }}
      />
      <img
        src={sky}
        alt="sky"
        style={{
          position: 'absolute',
          height: '70vh',
          top: '0',
          left: '0',
          zIndex: -2,
          filter: 'blur(5px)',
        }}
      />
      <img
        src={sky}
        alt="sky"
        style={{
          position: 'absolute',
          height: '70vh',
          top: '50vh',
          left: '0',
          zIndex: -2,
          filter: 'blur(5px) brightness(0.3)',
          transform: 'scaleX(-1)',
        }}
      />
      <img
        src={robot1}
        alt="robot"
        style={{
          position: 'absolute',
          width: '200px',
          height: '200px',
          top: '100px',
          right: '5%',
          zIndex: -1,
          filter: 'blur(5px) brightness(0.8)',
          transform: 'scale(0.5)',
          animation: 'float 10s ease-in-out infinite',
          animationDelay: `${Math.random() * 10}s`,
        }}
      />
      <img
        src={robot2}
        alt="robot"
        style={{
          position: 'absolute',
          width: '200px',
          height: '200px',
          top: '300px',
          right: '30%',
          zIndex: -1,
          filter: 'blur(5px) brightness(0.8)',
          transform: 'scale(0.5)',
          animation: 'float 10s ease-in-out infinite',
          animationDelay: `${Math.random() * 10}s`,
        }}
      />
      <img
        src={robot1}
        alt="robot"
        style={{
          position: 'absolute',
          width: '200px',
          height: '200px',
          top: '100px',
          right: '20%',
          zIndex: -1,
          animation: 'float 10s ease-in-out infinite',
          animationDelay: `${Math.random() * 10}s`,
        }}
      />
      <img
        src={robot2}
        alt="robot"
        style={{
          position: 'absolute',
          width: '200px',
          height: '200px',
          top: '250px',
          right: '10%',
          zIndex: -1,
          animation: 'float 10s ease-in-out infinite',
          animationDelay: `${Math.random() * 10}s`,
        }}
      />
      <Stack
        gap={3}
      >
        <Typography level="display2" fontWeight="lg" display="flex" flexWrap="wrap">
          {greeting()}
          ,&nbsp;
          <TextTransition springConfig={presets.stiff}>
            {visitor}
          </TextTransition>
        </Typography>
        <Typography level="h4" textColor="text.tertiary" fontWeight="md">
          The name&apos;s
          {' '}
          <ATypography textColor="primary.400" href="https://www.linkedin.com/in/bsodium/">
            Elliot Négrel-Jerzy
          </ATypography>
          {' '}
          , but you can call me
          {' '}
          <ATypography href="https://github.com/BSoDium">
            BSoDium
          </ATypography>
          . I&apos;m a
          {' '}
          <Typography textColor="text.primary">
            Software engineer
          </Typography>
          {' '}
          and an
          {' '}
          <Typography textColor="text.primary">
            Open-source
          </Typography>
          {' '}
          enthusiast.
        </Typography>
      </Stack>
    </>
  );
}
