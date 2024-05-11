/* eslint-disable react/jsx-props-no-spreading */
/* eslint-disable react/require-default-props */
import React from 'react';
import {
  Stack, Typography, TypographyProps,
} from '@mui/joy';
import { SxProps, TextColor } from '@mui/joy/styles/types';
import Featured from 'components/Featured';
import Contact from 'components/Contact';
import Terminal from 'components/Terminal';
import Title from 'components/Title';
import Header from 'components/Header';
import FixedMode from 'components/FixedMode';
import { useMobileMode, Default } from 'components/Responsive';
import OpenSource from 'components/OpenSource';
import Divider from 'components/Divider';
import Goals from 'components/Goals';
import { ParallaxProvider } from 'react-scroll-parallax';
import Illustrations from 'components/Illustrations';

export function ATypography({
  children,
  href = '#',
  target = '_blank',
  textColor = 'inherit',
  sx = {},
  ...props
}: {
  children: React.ReactNode;
  href?: string;
  target?: string;
  textColor?: TextColor;
  sx?: SxProps;
} & TypographyProps) {
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
      {...props}
    >
      {children}
    </Typography>
  );
}

function Credits() {
  return (
    <Stack
      flexWrap="wrap"
      direction="row"
      gap={2}
      justifyContent="space-between"
      sx={{
        '& > *': {
          flex: 1,
          minWidth: '200px',
          textAlign: 'center',
        },
      }}
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
  );
}

export default function App() {
  const mobile = useMobileMode();
  return (
    <FixedMode mode="system" style={{ overflow: 'hidden' }}>
      <ParallaxProvider>
        <Title text="Elliot Négrel-Jerzy" />
        <Illustrations />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            position: 'relative',
            marginTop: `calc(-100vh + ${mobile ? '350px' : '420px'})`,
            width: '100vw',
          }}
        >
          <Stack
            sx={{
              width: 'min(100%, 1200px)',
              height: 'fit-content',
            }}
          >
            <Stack
              gap={mobile ? 3 : 0}
              sx={{
                paddingLeft: mobile ? 0 : '70px',
              }}
            >
              <Stack
                p="20px"
                gap="80px"
              >
                <Header />
                <Terminal />
              </Stack>
              <Stack
                p="20px"
                gap="80px"
                sx={(theme) => ({
                  position: 'relative',
                  '&::before': mobile ? {} : {
                    content: '""',
                    position: 'absolute',
                    top: '-20px',
                    left: '-30px',
                    height: 'calc(100% + 20px)',
                    width: '2px',
                    background: `linear-gradient(to bottom, ${theme.palette.info[500]} 10%, ${theme.palette.warning[500]} 70%)`,
                  },
                })}
              >
                <Featured />
                <Contact />
              </Stack>
            </Stack>
            <Default>
              <Stack sx={{
                paddingX: mobile ? 0 : '70px',
              }}
              >
                <Divider />
              </Stack>
            </Default>
            <Stack sx={{
              paddingRight: mobile ? 0 : '70px',
            }}
            >
              <Stack
                p="20px"
                gap="80px"
                sx={(theme) => ({
                  position: 'relative',
                  '&::before': mobile ? {} : {
                    content: '""',
                    position: 'absolute',
                    top: '0',
                    right: '-30px',
                    height: '100%',
                    width: '2px',
                    background: `linear-gradient(to bottom, ${theme.palette.success[500]} 30%, ${theme.palette.danger[500]})`,
                  },
                })}
              >
                <OpenSource />
              </Stack>
              <Stack
                p="20px"
                gap="80px"
                sx={(theme) => ({
                  position: 'relative',
                  '&::before': mobile ? {} : {
                    content: '""',
                    position: 'absolute',
                    top: '0',
                    right: '-30px',
                    height: '100%',
                    width: '2px',
                    background: `linear-gradient(to bottom, ${theme.palette.danger[500]}, transparent)`,
                  },
                })}
              >
                <Goals />
                <Credits />
              </Stack>
            </Stack>
          </Stack>
        </div>
      </ParallaxProvider>
    </FixedMode>
  );
}
