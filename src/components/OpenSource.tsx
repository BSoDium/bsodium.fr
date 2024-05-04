/* eslint-disable no-plusplus */
/* eslint-disable react/no-unknown-property */
import {
  Avatar, Stack, Typography,
} from '@mui/joy';
import React, { useMemo } from 'react';
import vader from 'assets/vader.webp';
import { RiOpenSourceLine } from 'react-icons/ri';
import { Parallax } from 'react-scroll-parallax';
import { Default, Mobile, useMobileMode } from './Responsive';

export default function OpenSource() {
  const mobile = useMobileMode();

  const flickerAnimation = useMemo(() => ({
    '@keyframes flicker': Object.fromEntries(
      [...Array(10).keys()].map(() => Math.random() * 100).sort().map((p) => [
        [`${p - 1}%`, { opacity: 1 }],
        [`${p}%`, { opacity: 0 }],
        [`${p + 1}%`, { opacity: 1 }],
      ]).flat(),
    ),
  }), []);

  return (
    <Stack
      p="20px"
      sx={{ position: 'relative', marginTop: mobile ? '3rem' : 0 }}
    >
      <Stack sx={{
        width: '100%',
        height: mobile ? '45rem' : '400px',
        // overflow: 'hidden',
      }}
      >
        <Stack
          sx={{
            position: 'absolute',
            top: '-20px',
            gap: 3,
            textAlign: mobile ? 'center' : 'right',
            ...(mobile ? {
              left: '50%',
              transform: 'translateX(-50%)',
              width: '100%',
              alignItems: 'center',
            } : {
              right: '0',
              alignItems: 'flex-end',
            }),
          }}
        >
          <Mobile>
            <Avatar
              color="success"
              sx={(theme) => ({
                position: 'relative',
                border: 'none',
                outline: `1.5px solid ${theme.palette.success[400]}`,
                boxShadow: `0 0 40px 5px ${theme.palette.success[700]}`,
                overflow: 'visible',
                marginTop: '3rem',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: '-5rem',
                  height: '5rem',
                  width: '1.5px',
                  background: `linear-gradient(to bottom, transparent, ${theme.palette.success[400]})`,
                },
              })}
            >
              <RiOpenSourceLine />
            </Avatar>
          </Mobile>
          <Typography
            level="h2"
            sx={{
              position: 'relative',
            }}
          >
            <Typography
              textColor="success.300"
              fontWeight="xl"
            >
              Open-source.
            </Typography>
            {mobile ? <br /> : ' '}
            Join the
            {' '}
            <Typography sx={{
              ...flickerAnimation,
              textShadow: '0 0 0.5rem #86fff1, 0 0 1rem #03fee9, 0 0 2rem #03fed8',
              color: '#e4fffe',
              animation: 'flicker 5s infinite',
              animationDelay: `${Math.random() * 2}s`,
              fontWeight: '300',
              padding: '3rem',
              margin: '-3rem',
            }}
            >
              light side
            </Typography>
            {' '}
            of the force.
            <Default>
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
            </Default>
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
            Any
            {' '}
            <Typography textColor="text.primary">
              contribution
            </Typography>
            , no matter how small, is and will always be appreciated.
          </Typography>
        </Stack>
        <Parallax
          speed={10}
          opacity={[0.2, 1]}
          easing="ease"
          disabled={mobile}
          style={mobile ? {
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: '25rem',
            zIndex: 1,
            animation: 'float 20s ease-in-out infinite',
          } : {
            position: 'absolute',
            right: 'calc(350px + 20%)',
            top: '2rem',
            zIndex: 1,
            animation: 'float 20s ease-in-out infinite',
          }}
        >
          <img
            src={vader}
            alt="Darth vader"
            style={{
              ...(mobile && {
                height: '350px',
              }),
              filter: 'drop-shadow(0 -20px 20px hsl(185, 94%, 10%)) drop-shadow(0 20px 20px hsl(356, 60%, 11%))',
            }}
          />
        </Parallax>
      </Stack>

    </Stack>
  );
}
