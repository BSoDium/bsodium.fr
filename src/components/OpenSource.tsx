/* eslint-disable no-plusplus */
/* eslint-disable react/no-unknown-property */
import {
  Avatar, Stack, Typography,
} from '@mui/joy';
import React, { useMemo } from 'react';
import { ATypography } from 'App';
import vader from 'assets/vader.png';
import { RiOpenSourceLine } from 'react-icons/ri';
import { Default } from './Responsive';

export default function OpenSource() {
  const blinkAnimation = useMemo(() => ({
    '@keyframes blink': Object.fromEntries(
      [...Array(10).keys()].map(() => Math.random() * 100).sort().map((p) => [
        [`${p - 1}%`, { opacity: 1 }],
        [`${p}%`, { opacity: 0 }],
        [`${p + 1}%`, { opacity: 1 }],
      ]).flat(),
    ),
  }), []);

  return (
    <Stack
      gap={15}
      p="20px"
      sx={{ position: 'relative' }}
    >
      <Default>
        <Stack sx={{
          width: '100%',
          height: '400px',
          overflow: 'hidden',
        }}
        >
          <Stack
            sx={{
              position: 'absolute',
              top: '-20px',
              right: '0',
              gap: 3,
              textAlign: 'right',
              alignItems: 'flex-end',
            }}
          >
            <Typography
              level="h2"
              sx={{
                position: 'relative',
              }}
              id="footer"
            >
              <Typography
                textColor="success.300"
                fontWeight="xl"
              >
                Open-source.
              </Typography>
              {' '}
              Join the
              {' '}
              <Typography sx={{
                ...blinkAnimation,
                textShadow: '0 0 0.5rem #86fff1, 0 0 1rem #03fee9, 0 0 2rem #03fed8',
                color: '#e4fffe',
                animation: 'blink 5s infinite',
                animationDelay: `${Math.random() * 2}s`,
                fontFamily: "'Tilt Neon', sans-serif",
                padding: '3rem',
                margin: '-3rem',
              }}
              >
                light side
              </Typography>
              {' '}
              of the force.
              <Avatar
                color="success"
                sx={(theme) => ({
                  position: 'absolute',
                  top: '0',
                  right: '-50px',
                  transform: 'translateX(50%)',
                  border: 'none',
                  outline: `1.5px solid ${theme.palette.success[400]}`,
                  boxShadow: `0 0 40px 5px ${theme.palette.success[700]}`,
                })}
              >
                <RiOpenSourceLine />
              </Avatar>
            </Typography>
            <Typography
              level="h6"
              textColor="text.tertiary"
              sx={{
                maxWidth: '500px',
              }}
            >
              <Typography
                textColor="text.primary"
              >
                Collaboration
              </Typography>
              {' '}
              and
              {' '}
              <Typography
                textColor="text.primary"
              >
                community-maintained projects
              </Typography>
              {' '}
              lay the foundation upon which the digital world we live in is built.
              Any contribution, no matter how small, is and will always be appreciated.
            </Typography>
          </Stack>
          <img
            src={vader}
            alt="Darth vader"
            style={{
              position: 'absolute',
              right: '350px',
              top: '2rem',
              paddingRight: '20%',
              maxWidth: '100%',
              maxHeight: '100%',
              filter: 'drop-shadow(0 -20px 20px hsl(185, 94%, 10%)) drop-shadow(0 20px 20px hsl(356, 60%, 11%))',
              animation: 'float 20s ease-in-out infinite',
            }}
          />
        </Stack>
      </Default>
      <Stack
        flexWrap="wrap"
        direction="row"
        gap={2}
        justifyContent="space-between"
      >
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
    </Stack>
  );
}
