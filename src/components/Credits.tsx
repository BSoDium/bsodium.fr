import React, { useEffect } from 'react';
import {
  Box, Stack, Typography, useColorScheme,
} from '@mui/joy';
import { ATypography } from 'App';
import mountainsDark from 'assets/mountains_dark.webp';
import mountainsLight from 'assets/mountains_light.webp';
import { animated, useSpringRef, useTransition } from '@react-spring/web';
import { transitionConfig } from './Illustrations';
import { useMobileMode } from './Responsive';

export default function Credits() {
  const mountainsTransRef = useSpringRef();

  const { colorScheme } = useColorScheme();
  const mobile = useMobileMode();

  const mountainsTransition = useTransition(colorScheme, {
    ref: mountainsTransRef,
    initial: null,
    keys: null,
    from: { opacity: 0 },
    enter: { opacity: 0.7 },
    config: transitionConfig,
  });

  useEffect(() => {
    mountainsTransRef.start();
  }, [mountainsTransRef, colorScheme]);

  return (
    <>
      {mountainsTransition((style, item) => {
        switch (item) {
          case 'light':
            return (
              <animated.div style={{
                ...style,
                zIndex: -1,
              }}
              >
                <div style={{
                  position: 'absolute',
                  height: '40rem',
                  width: 'calc(100vw + 20rem)',
                  bottom: '0',
                  left: '50%',
                  transform: 'translateX(50%)',
                  background: 'linear-gradient(to top, #577fc0, #C4DEE7, transparent)',
                }}
                />
                <Box
                  component="img"
                  src={mountainsLight}
                  alt="mountains"
                  sx={{
                    position: 'absolute',
                    height: '40rem',
                    left: '50%',
                    bottom: '0',
                    transform: 'translate(-50%, 5rem)',
                    filter: 'hue-rotate(25deg)',
                    maskImage: 'linear-gradient(to left, transparent, black 30%, black 70%, transparent)',
                  }}
                />
              </animated.div>
            );
          case 'dark':
            return (
              <animated.div style={{
                ...style,
                zIndex: -1,
              }}
              >
                <div style={{
                  position: 'absolute',
                  height: '40rem',
                  width: 'calc(100vw + 20rem)',
                  bottom: '0',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'linear-gradient(to top, #1D100D, #1B1C21 35%, #150C0B, transparent)',
                }}
                />
                <Box
                  component="img"
                  src={mountainsDark}
                  alt="mountains"
                  sx={{
                    position: 'absolute',
                    height: '40rem',
                    left: '50%',
                    bottom: '0',
                    transform: 'translate(-50%, 7rem)',
                    filter: 'contrast(1.1) hue-rotate(190deg)',
                    maskImage: 'linear-gradient(to left, transparent, black 30%, black 70%, transparent)',
                  }}
                />
              </animated.div>
            );
          default:
            return null;
        }
      })}

      <Stack
        flexWrap="wrap"
        direction="row"
        columnGap={2}
        rowGap={3}
        justifyContent="space-between"
        sx={(theme) => ({
          position: 'relative',
          paddingTop: mobile ? '10rem' : '18rem',
          '& > *': {
            flex: 1,
            minWidth: '200px',
            textAlign: 'center',
            textShadow: `0 .2rem 1rem ${theme.palette.background.body}, .2rem 0 1rem ${theme.palette.background.body}, -0.2rem 0 1rem ${theme.palette.background.body}, 0 -0.2rem 1rem ${theme.palette.background.body}`,
          },
        })}
      >
        <Typography
          level="body2"
          textColor="text.secondary"
        >
          ©
          {' '}
          {new Date().getFullYear()}
          {' '}
          Elliot Négrel-Jerzy. All rights reserved.
        </Typography>
        <Typography
          level="body2"
          textColor="text.secondary"
        >
          {'Illustrations generated using '}
          <ATypography href="https://www.bing.com/create">
            Bing Image Creator
          </ATypography>
          {' and '}
          <ATypography href="https://openai.com/chatgpt/">
            ChatGPT
          </ATypography>
          {' powered by '}
          <ATypography href="https://openai.com/product/dall-e-2/">
            DALL·E
          </ATypography>
          .
        </Typography>
      </Stack>
    </>
  );
}
