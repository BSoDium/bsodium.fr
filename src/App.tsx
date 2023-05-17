/* eslint-disable react/require-default-props */
import React from 'react';
import {
  Box, Stack, Typography,
} from '@mui/joy';
import greeting from 'utils/Greeting';
import planet from 'assets/planet.png';
import robot from 'assets/robot.png';
import sky from 'assets/sky.png';
import { SxProps, TextColor } from '@mui/joy/styles/types';
import Featured from 'components/Featured';
import Contact from 'components/Contact';
import { useMobileMode } from 'components/Responsive';

export function ATypography({
  children,
  href = '#',
  target = '_blank',
  textColor = 'inherit',
  sx = {},
}: {
  children: React.ReactNode;
  href?: string;
  target?: string;
  textColor?: TextColor;
  sx?: SxProps;
}) {
  return (
    <Typography
      component="a"
      href={href}
      target={target}
      textColor={textColor}
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

export default function App() {
  const mobile = useMobileMode();

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
      {Array.from({ length: Math.round(Math.random() * 3 + 1) }).map(() => {
        const size = Math.random() * 0.7 + 0.3;
        const blur = Math.abs(size - 0.7) * 10;
        const top = Math.random() * 35;
        const right = Math.random() * (mobile ? 100 : 35);
        const rotation = Math.random() * 40 - 20;
        return {
          size, blur, top, right, rotation,
        };
      }).sort((a, b) => a.size - b.size).map(({
        size, blur, top, right, rotation,
      }) => (
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
      ))}
      <Stack
        p={3}
        gap={10}
        sx={{
          width: 'min(100%, 1200px)',
          paddingTop: '450px',
        }}
      >
        <Stack
          gap={3}
        >
          <Typography level="display2" fontWeight="lg">
            {greeting()}
            , stranger
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
        <Box
          component={Stack}
          direction="row"
          flexWrap="wrap"
          gap={2}
          p={3}
          justifyContent="space-between"
        >
          <Typography level="body2" textColor="text.tertiary">
            © 2023 Elliot Négrel-Jerzy. All rights reserved.
          </Typography>
          <Typography level="body2" textColor="text.tertiary">
            Illustrations generated with Bing Image Creator powered by DALL·E.
          </Typography>
        </Box>
      </Stack>
    </Box>
  );
}
