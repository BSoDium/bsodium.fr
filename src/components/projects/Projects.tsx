import {
  Box,
  Button, IconButton, Stack, Typography,
  useColorScheme,
} from '@mui/joy';
import FixedMode from 'components/FixedMode';
import React, { useEffect } from 'react';
import { GoMoon, GoSun } from 'react-icons/go';
import { IoIosReturnLeft } from 'react-icons/io';
import { Link } from 'react-router-dom';
import architectureLight from 'assets/architecture-light.jpg';
import architectureDark from 'assets/architecture-dark.jpg';
import Title from 'components/Title';
import { animated, useSpringRef, useTransition } from '@react-spring/web';
import Directory from './Directory';

function ThemeSwitcherButton() {
  const { mode, systemMode, setMode } = useColorScheme();

  return (
    <IconButton
      variant="outlined"
      color="neutral"
      size="lg"
      onClick={() => {
        setMode((mode || systemMode) === 'light' ? 'dark' : 'light');
      }}
      sx={(theme) => ({
        transition: 'all ease .2s',
        position: 'relative',
        borderRadius: '0',
        width: 'fit-content',
        flexShrink: 0,
        padding: '1 2',

        '&:hover': {
          background: theme.palette.text.primary,
          color: theme.palette.background.level1,
          borderColor: theme.palette.text.primary,
        },
        '&:active': {
          transform: 'scale(.98)',
        },
      })}
    >
      {(mode || systemMode) === 'light' ? <GoSun /> : <GoMoon />}
    </IconButton>
  );
}

function ThemeAwareIllustration() {
  const { mode, systemMode } = useColorScheme();
  const transRef = useSpringRef();

  const transitions = useTransition((mode || systemMode), {
    ref: transRef,
    keys: null,
    from: { opacity: 0 },
    enter: { opacity: 1 },
    leave: { opacity: 0, filter: 'blur(10px)', position: 'absolute' },
  });

  useEffect(() => {
    transRef.start();
  }, [mode, systemMode]);

  return (
    <Stack sx={{
      position: 'absolute',
      right: 'min(0rem, calc(100vw - 100rem))',
      width: '100rem',
      height: 'min(100%, 30rem)',
      overflow: 'hidden',
      '&:after': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backdropFilter: 'blur(20px)',
        mask: 'linear-gradient(to left, transparent, black 60%)',
      },
    }}
    >
      {transitions((style, item) => {
        switch (item) {
          case 'light':
            return (
              <animated.div style={style}>
                <Box
                  component="img"
                  src={architectureLight}
                  alt="Brutalist building by Arthur Swiffen"
                  sx={{
                    position: 'relative',
                    marginTop: '-23rem',
                    width: '100%',
                    WebkitMaskImage: 'linear-gradient(to left,black 10%,transparent 80%)',
                    maskImage: 'linear-gradient(to left,black 10%,transparent 80%)',
                    filter: 'grayscale(1)',
                  }}
                />
              </animated.div>
            );
          case 'dark':
            return (
              <animated.div style={style}>
                <Box
                  component="img"
                  src={architectureDark}
                  alt="High Rise Building during Nighttime by Harsh limbachiya"
                  sx={{
                    position: 'relative',
                    marginTop: '-23rem',
                    width: '100%',
                    WebkitMaskImage: 'linear-gradient(to left,black 10%,transparent 80%)',
                    maskImage: 'linear-gradient(to left,black 10%,transparent 80%)',
                    filter: 'grayscale(1)',
                  }}
                />
              </animated.div>
            );
          default:
            return null;
        }
      })}
    </Stack>
  );
}

export default function Projects() {
  return (
    <FixedMode mode="system" style={{ overflow: 'hidden', position: 'relative' }}>
      <Title text="Projects and experiments - Elliot Négrel-Jerzy" />
      <ThemeAwareIllustration />
      <Stack padding="5rem" gap={2} alignItems="start">
        <Stack>
          <Typography
            level="display1"
            fontSize="10rem"
            fontWeight={200}
            lineHeight={1}
            sx={{ position: 'relative', marginLeft: '2.72rem' }}
          >
            <Typography
              level="h2"
              fontSize="2,25rem"
              sx={{
                position: 'absolute',
                left: '-1.3rem',
                bottom: '66px',
                transform: 'translateX(-50%) rotate(-90deg)',
              }}
            >
              Featured
            </Typography>
            Projects &
          </Typography>
          <Typography
            level="display1"
            fontSize="10rem"
            fontWeight={300}
            lineHeight={0.6}
            marginBottom="3rem"
            zIndex={1}
            fontFamily={'"Righteous", sans-serif'}
          >
            Experiments
          </Typography>
        </Stack>
        <Stack direction="row" gap={1}>
          <Button
            size="lg"
            component={Link}
            to="/"
            variant="outlined"
            color="neutral"
            endDecorator={(
              <IoIosReturnLeft size="1.3em" />
          )}
            sx={(theme) => ({
              transition: 'all ease .2s',
              position: 'relative',
              borderRadius: '0',
              width: 'fit-content',
              flexShrink: 0,
              padding: '1 2',

              '&:hover': {
                background: theme.palette.text.primary,
                color: theme.palette.background.level1,
                borderColor: theme.palette.text.primary,
                '& > span > svg': {
                  transform: 'translate(.6rem, .3rem) scale(1.2)',
                  filter: `drop-shadow(-.3rem -.3rem 0 ${theme.palette.text.tertiary}) drop-shadow(-.3rem -.3rem 0 ${theme.palette.text.secondary})`,
                },
              },
              '&:active': {
                transform: 'scale(.98)',
                '& > span > svg': {
                  transform: 'translate(.6rem, .3rem) scale(1.1)',
                  filter: `drop-shadow(-.3rem -.3rem 0 ${theme.palette.background.level1}) drop-shadow(-.3rem -.3rem 0 ${theme.palette.background.level1})`,
                },
              },
              '& > span > svg': {
                transition: 'all ease .2s',
              },
            })}
          >
            Back to homepage
          </Button>
          <ThemeSwitcherButton />
        </Stack>
        <Directory />
      </Stack>
    </FixedMode>
  );
}
