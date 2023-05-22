import React, { useEffect, useState } from 'react';

import planet from 'assets/planet.png';
import robot1 from 'assets/robot_flying_1.png';
import robot2 from 'assets/robot_flying_2.png';
import sky from 'assets/sky.png';
import {
  Avatar, Button, Stack, Typography,
} from '@mui/joy';
import TextTransition, { presets } from 'react-text-transition';
import greeting from 'utils/Greeting';
import { ATypography } from 'App';
import { RiArrowRightSLine } from 'react-icons/ri';
import { IoReaderOutline } from 'react-icons/io5';
import { Link } from 'react-router-dom';
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
          animation: 'float 20s ease-in-out infinite',
          animationDelay: '5s',
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
          animation: 'float 20s ease-in-out infinite',
          animationDelay: '10s',
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
          animation: 'float 20s ease-in-out infinite',
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
          animation: 'float 20s ease-in-out infinite',
          animationDelay: '13s',
        }}
      />
      <Stack
        gap={3}
      >
        <Button
          size="lg"
          component={Link}
          variant="outlined"
          to="/resume"
          startDecorator={(
            <Avatar size="lg" color="primary">
              <IoReaderOutline />
            </Avatar>
          )}
          endDecorator={(
            <RiArrowRightSLine size="1.3em" />
          )}
          sx={{
            '&:not(:hover)': {
              backgroundColor: '#0000008c',
            },
            borderRadius: '100px',
            width: 'fit-content',
            padding: 1,
            paddingRight: 2,
          }}
        >
          <Stack alignItems="flex-start" sx={{ textAlign: 'left' }}>
            <Typography level="h6" textColor="inherit" fontWeight="lg" lineHeight="1.2em">
              Access online resume
            </Typography>
            <Typography level="body1" textColor="inherit" fontWeight="sm" sx={{ opacity: 0.8 }}>
              Never out of date, never out of paper
            </Typography>
          </Stack>
        </Button>
        <Typography level={mobile ? 'h1' : 'display2'} fontWeight="lg" display="flex" flexWrap="wrap" marginBottom={mobile ? '1em' : 0}>
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
