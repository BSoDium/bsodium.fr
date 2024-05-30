import {
  Button, IconButton, Stack, Typography,
  useColorScheme,
} from '@mui/joy';
import { animated, useSpringRef, useTransition } from '@react-spring/web';
import architectureDarkMin from 'assets/architecture_dark.min.webp';
import architectureDark from 'assets/architecture_dark.webp';
import architectureLightMin from 'assets/architecture_light.min.webp';
import architectureLight from 'assets/architecture_light.webp';
import ProgressiveImage from 'components/ProgressiveImage';
import {
  useMobileMode,
} from 'components/Responsive';
import Meta from 'components/Meta';
import React, { useEffect, useState } from 'react';
import { GoMoon, GoSun } from 'react-icons/go';
import { IoIosReturnLeft } from 'react-icons/io';
import { Link } from 'react-router-dom';
import details from 'assets/Details';
import Directory from './Directory';

function ThemeSwitcherButton() {
  const { colorScheme, setMode } = useColorScheme();

  return (
    <IconButton
      variant="outlined"
      color="neutral"
      size="lg"
      className={`state-${colorScheme}`}
      onClick={() => {
        setMode((colorScheme) === 'light' ? 'dark' : 'light');
      }}
      sx={(theme) => ({
        transition: 'all ease .2s',
        position: 'relative',
        borderRadius: '0',
        width: 'fit-content',
        flexShrink: 0,
        padding: '1 2',
        overflow: 'hidden',
        background: theme.palette.background.body,

        '& > svg': {
          transition: 'all ease .2s',
        },

        '&:hover': {
          background: theme.palette.text.primary,
          color: theme.palette.background.level1,
          borderColor: theme.palette.text.primary,
          '& > svg': {
            transform: 'rotate(-45deg)',
          },
        },
        '&:active': {
          transform: 'scale(.98)',
        },

        '& > div': {
          transition: 'all ease .2s',
        },

        '&.state-light > div': {
          transform: 'translate(-50%, calc(-50% - 21px))',
        },

        '&.state-dark > div': {
          transform: 'translate(-50%, calc(-50% + 21px))',
        },

        '&:hover > div': {
          transform: 'translate(-50%, -50%)',
        },
      })}
    >
      <Stack
        direction="column"
        gap={3}
        sx={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        }}
      >
        <GoMoon />
        <GoSun />
      </Stack>
    </IconButton>
  );
}

function ThemeAwareIllustration() {
  const { colorScheme } = useColorScheme();
  const [loaded, setLoaded] = useState(false);

  const transRef = useSpringRef();

  const transitions = useTransition((colorScheme), {
    ref: transRef,
    keys: null,
    from: { opacity: 0 },
    enter: { opacity: 1 },
    leave: { opacity: 0, filter: 'blur(10px)', position: 'absolute' },
  });

  useEffect(() => {
    if (loaded) { transRef.start(); }
  }, [colorScheme, loaded]);

  const imgSx = {
    position: 'relative',
    marginTop: '-23rem',
    width: '100%',
    WebkitMaskImage: 'linear-gradient(to left,black 10%,transparent 80%)',
    maskImage: 'linear-gradient(to left,black 10%,transparent 80%)',
    filter: 'grayscale(1)',
  } as React.CSSProperties;

  return (
    <Stack sx={{
      position: 'absolute',
      right: 'min(0rem, calc(100vw - 100rem))',
      width: '100rem',
      height: 'min(100%, 31rem)',
      overflow: 'hidden',
      paddingTop: 'var(--nav-safe-area-inset-top)',
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
                <ProgressiveImage
                  src={architectureLight}
                  placeholder={architectureLightMin}
                  alt="Brutalist building by Arthur Swiffen"
                  onLoad={() => setLoaded(true)}
                  style={imgSx}
                />
              </animated.div>
            );
          case 'dark':
            return (
              <animated.div style={style}>
                <ProgressiveImage
                  src={architectureDark}
                  placeholder={architectureDarkMin}
                  alt="Red lamps in Subway in Hamburg by Travel with Lenses"
                  onLoad={() => setLoaded(true)}
                  style={imgSx}
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
  const mobile = useMobileMode();
  return (
    <Stack
      width="100vw"
      position="relative"
      overflow="hidden"
      sx={{
        paddingLeft: 'var(--nav-safe-area-inset-left)',
        paddingBottom: 'var(--nav-safe-area-inset-bottom)',
      }}
    >
      <Meta title={`Projects and experiments - ${details.name.first} ${details.name.last}`} />
      <ThemeAwareIllustration />
      <Stack
        padding={mobile ? '1rem' : '5rem'}
        gap={2}
        alignItems="start"
      >
        <Stack marginBottom="min(10vw, 3rem)" marginTop={mobile ? '10vw' : 0}>
          <Typography
            level="display1"
            fontSize="clamp(3rem, 15vw, 10rem)"
            fontWeight={200}
            lineHeight={1}
            sx={{ position: 'relative', marginLeft: '.25em', marginBottom: '.05em' }}
          >
            <Typography
              level="h2"
              sx={{
                position: 'absolute',
                left: '-.6em',
                bottom: '1.7em',
                transform: 'translateX(-50%) rotate(-90deg)',
                fontSize: 'clamp(.5rem, 3vw, 2rem)',
              }}
            >
              Featured
            </Typography>
            Projects &
          </Typography>
          <Typography
            level="display1"
            fontSize="clamp(3rem, 15vw, 10rem)"
            fontWeight={300}
            lineHeight={0.6}
            zIndex={1}
            fontFamily={'"Righteous", sans-serif'}
          >
            Experiments
          </Typography>
        </Stack>
        <Stack
          direction="row"
          gap={1}
          sx={mobile ? {
            width: '100%',
            '& > *:first-child': {
              flex: 1,
            },
          } : {}}
        >
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
              background: theme.palette.background.body,

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
    </Stack>
  );
}
