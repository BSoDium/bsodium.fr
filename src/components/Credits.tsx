import React from 'react';
import {
  Box, Stack, Typography, useColorScheme,
} from '@mui/joy';
import { ATypography } from 'App';
import mountainsDark from 'assets/mountains_dark.png';
import mountainsLight from 'assets/mountains_light.png';
import { animated } from '@react-spring/web';

export default function Credits() {
  const { colorScheme } = useColorScheme();
  const dark = colorScheme === 'dark';

  return (
    <>
      {dark ? (
        <animated.div style={{
          opacity: 0.7,
        }}
        >
          <div style={{
            position: 'absolute',
            height: '40rem',
            width: 'calc(100vw + 20rem)',
            bottom: '0',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'linear-gradient(to top, #65798E, #2434458e, #071213, transparent)',
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
              overflow: 'visible',
              transform: 'translate(-50%, 10rem)',
              filter: 'contrast(1.1) hue-rotate(190deg)',
              maskImage: 'linear-gradient(to left, transparent, black 30%, black 70%, transparent)',
            }}
          />
        </animated.div>
      ) : (
        <animated.div style={{
          opacity: 0.7,
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
      )}
      <Stack
        flexWrap="wrap"
        direction="row"
        columnGap={2}
        rowGap={3}
        justifyContent="space-between"
        sx={{
          position: 'relative',
          paddingTop: '20rem',
          '& > *': {
            flex: 1,
            minWidth: '200px',
            textAlign: 'center',
          },
        }}
      >

        <Typography level="body2" textColor="text.primary">
          ©
          {' '}
          {new Date().getFullYear()}
          {' '}
          Elliot Négrel-Jerzy. All rights reserved.
        </Typography>
        <Typography level="body2" textColor="text.primary">
          Illustrations generated with
          {' '}
          <ATypography href="https://www.bing.com/create">
            Bing Image Creator
          </ATypography>
          {' '}
          powered by
          {' '}
          <ATypography href="https://openai.com/product/dall-e-2/">
            DALL·E
          </ATypography>
          .
        </Typography>
      </Stack>
    </>
  );
}
