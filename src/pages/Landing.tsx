/* eslint-disable react/require-default-props */
import React from 'react';
import {
  Box, Stack, Typography,
} from '@mui/joy';
import greeting from 'utils/Greeting';
import planet from 'assets/planet.png';
import robot from 'assets/robot.png';
import { SxProps } from '@mui/joy/styles/types';
import Featured from 'components/Featured';
import Contact from 'components/Contact';
import { Default } from 'components/Responsive';

export function ATypography({
  children,
  href = '#',
  sx = {},
}: {
  children: React.ReactNode;
  href?: string;
  sx?: SxProps;
}) {
  return (
    <Typography
      component="a"
      href={href}
      textColor="inherit"
      sx={{
        textDecoration: 'dotted underline',
        '&:hover': {
          textDecoration: 'underline',
        },
        ...sx,
      }}
    >
      {children}
    </Typography>
  );
}

export default function Flat() {
  return (
    <Box sx={{
      width: '100%',
      height: '100%',
      overflowY: 'auto',
      overflowX: 'hidden',
      display: 'flex',
      justifyContent: 'center',
      position: 'relative',
    }}
    >
      <img
        src={planet}
        alt="planet"
        style={{
          position: 'absolute',
          width: 'min(100vw, 700px)',
          top: '-100px',
          left: '0',
          zIndex: -1,
        }}
      />
      {Array.from({ length: Math.round(Math.random() * 4 + 3) }).map(() => {
        const size = Math.random() * 1.1;
        const blur = Math.abs(size - 0.7) * 10;
        const top = Math.random() * 35;
        const right = Math.random() * 35;
        const rotation = Math.random() * 360;
        return {
          size, blur, top, right, rotation,
        };
      }).sort((a, b) => a.size - b.size).map(({
        size, blur, top, right, rotation,
      }) => (
        <Default>
          <img
            src={robot}
            alt="robot"
            key={`robot-${size}-${top}-${right}-${rotation}`}
            style={{
              position: 'absolute',
              width: '200px',
              height: '200px',
              top: `min(${top}vw, ${top}vh)`,
              right: `${right}%`,
              filter: `blur(${blur}px)`,
              zIndex: -1,
              transform: `rotate(${rotation}deg) scale(${size})`,
              animation: 'float 10s ease-in-out infinite',
              animationDelay: `${Math.random() * 10}s`,
            }}
          />
        </Default>
      ))}
      <Stack
        p={3}
        gap={10}
        sx={{
          width: 'min(100%, 1200px)',
          paddingTop: 'min(100%, 550px)',
        }}
      >
        <Stack
          gap={3}
        >
          <Typography level="display2">
            {greeting()}
            , stranger
          </Typography>
          <Typography level="h4" textColor="text.tertiary">
            The name&apos;s
            {' '}
            <ATypography>
              Elliot Négrel-Jerzy
            </ATypography>
            {' '}
            , but you can call me
            {' '}
            <ATypography>
              BSoDium
            </ATypography>
            . I&apos;m a
            freelance
            {' '}
            <Typography textColor="text.primary">
              3D Software developer
            </Typography>
            , a
            {' '}
            <Typography textColor="text.primary">
              Front-end engineer
            </Typography>
            ,
            and an
            {' '}
            <Typography textColor="text.primary">
              Open-source
            </Typography>
            {' '}
            enthusiast.
          </Typography>
        </Stack>
        <Featured />
        <Contact />
      </Stack>
    </Box>
  );
}
