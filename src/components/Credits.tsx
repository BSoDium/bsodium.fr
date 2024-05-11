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
    <Stack
      flexWrap="wrap"
      direction="row"
      gap={2}
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
      {dark ? (
        <animated.div style={{
          opacity: 0.7,
        }}
        >
          <div style={{
            position: 'absolute',
            height: '40rem',
            width: '200vw',
            bottom: '0',
            left: '0',
            transform: 'translate(-50vw, 5rem)',
            background: 'linear-gradient(to top, #07090E, #0C1823 45%, transparent)',
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
              transform: 'translate(-50%, 15rem)',
              filter: 'brightness(0.7) contrast(1.5)',
              background: 'radial-gradient(ellipse, #aec7d286, transparent 65%)',
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
            width: '200vw',
            bottom: '0',
            left: '0',
            transform: 'translate(-50vw, 5rem)',
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
              transform: 'translate(-50%, 10rem)',
              filter: 'hue-rotate(25deg)',
              maskImage: 'linear-gradient(to left, transparent, black 30%, black 70%, transparent)',
            }}
          />
        </animated.div>
      )}

      <Typography level="body2" textColor="text.tertiary">
        ©
        {' '}
        {new Date().getFullYear()}
        {' '}
        Elliot Négrel-Jerzy. All rights reserved.
      </Typography>
      <Typography level="body2" textColor="text.tertiary">
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
  );
}
