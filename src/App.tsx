/* eslint-disable react/jsx-props-no-spreading */
/* eslint-disable react/require-default-props */
import React from 'react';
import {
  Box, Stack, Typography, TypographyProps,
} from '@mui/joy';
import { SxProps, TextColor } from '@mui/joy/styles/types';
import Featured from 'components/Featured';
import Contact from 'components/Contact';
import Terminal from 'components/Terminal';
import Title from 'components/Title';
import Header from 'components/Header';
import FixedMode from 'components/FixedMode';
import { useMobileMode } from 'components/Responsive';

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

export default function App() {
  const mobile = useMobileMode();

  return (
    <FixedMode>
      <Title text="Elliot Négrel-Jerzy" />
      <Box sx={{
        width: '100vw',
        height: '100vh',
        overflowY: 'auto',
        overflowX: 'hidden',
        display: 'flex',
        justifyContent: 'center',
        position: 'relative',
      }}
      >
        <Stack
          sx={{
            width: 'min(100%, 1200px)',
            height: 'fit-content',
            paddingTop: '420px',
          }}
        >
          <Stack
            p="20px"
            gap={10}
          >
            <Header />
            <Terminal />
          </Stack>
          <Stack
            p="20px"
            gap={10}
            sx={(theme) => ({
              position: 'relative',
              '&::before': mobile ? {} : {
                content: '""',
                position: 'absolute',
                top: '-30%',
                left: '-30px',
                height: '130%',
                width: '1px',
                background: `linear-gradient(to bottom, transparent, ${theme.palette.success[400]}, ${theme.palette.info[400]}, #00000000)`,
              },
            })}
          >
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
            </Box>
          </Stack>
        </Stack>
      </Box>
    </FixedMode>
  );
}
