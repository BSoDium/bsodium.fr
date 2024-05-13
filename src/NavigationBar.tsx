/* eslint-disable no-nested-ternary */
import {
  Button, IconButton, Stack, Typography,
  useColorScheme,
} from '@mui/joy';
import React, { useMemo } from 'react';
import { useLandScapeMode, useNonDesktopMode } from 'components/Responsive';
import {
  FiBookmark, FiHome, FiMail, FiUser,
} from 'react-icons/fi';
import { MdAutoMode } from 'react-icons/md';
import { IoMdMoon, IoMdSunny } from 'react-icons/io';

function NavigationBarItem({
  icon,
  text,
  selected,
  layout = 'vertical',
} : {
  icon: JSX.Element;
  text: string;
  selected?: boolean;
  layout?: 'vertical' | 'horizontal' ;
}) {
  return layout === 'vertical' ? (
    <Stack
      alignItems="center"
      gap={0.5}
      sx={{
        cursor: 'pointer',
        borderRadius: '0.5rem',
        fontSize: '1.3rem',
        paddingX: '1rem',
      }}
    >
      <Button
        color="neutral"
        variant={selected ? 'solid' : 'plain'}
        sx={{
          transition: 'background 0.2s',
          padding: '0.4rem 1.2rem',
          borderRadius: '100vmax',
          minHeight: 'fit-content',
          fontSize: 'inherit',
          '& > svg': {
            transition: 'transform 0.2s',
          },
          '&:hover > svg': {
            transform: 'scale(1.05)',
          },
        }}
      >
        {icon}
      </Button>
      <Typography
        level="body3"
        fontWeight="700"
        textColor="text.primary"
      >
        {text}
      </Typography>
    </Stack>
  ) : (
    <Button
      color="neutral"
      variant={selected ? 'outlined' : 'plain'}
      sx={(theme) => ({
        minHeight: 'fit-content',
        borderRadius: '100vmax',
        padding: '.6rem 1rem',
        transition: 'background 0.2s',
        backgroundColor: selected ? theme.palette.background.body : 'transparent',
        '& > svg': {
          transition: 'transform 0.2s',
        },
        '&:hover > svg': {
          transform: 'scale(1.05)',
        },
      })}
      startDecorator={icon}
    >
      {text}
    </Button>
  );
}

export default function NavigationBar({ children } : {children: JSX.Element | JSX.Element[]}) {
  const bottom = useNonDesktopMode();
  const landscape = useLandScapeMode();

  const horizontal = useMemo(() => !landscape && !bottom, [landscape, bottom]);

  const { mode, setMode } = useColorScheme();

  return (
    <>
      <Stack
        direction={landscape ? 'column' : 'row'}
        sx={(theme) => ({
          position: 'fixed',
          ...(bottom ? {
            bottom: 0,
            borderTop: `1px solid ${theme.palette.divider}`,
          } : {
            top: 0,
            borderBottom: `1px solid ${theme.palette.divider}`,
          }),
          left: 0,
          gap: 4,
          alignItems: 'center',
          backgroundColor: `color-mix(in srgb, ${theme.palette.background.body}, transparent 50%)`,
          backdropFilter: 'blur(10px)',
          webkitBackdropFilter: 'blur(10px)',
          zIndex: 1000,
          ...(landscape ? {
            paddingY: '1.5rem',
            height: '100vh',
            width: 'fit-content',
            borderRight: `1px solid ${theme.palette.divider}`,
          } : {
            padding: '.5rem 2rem ',
            width: '100vw',
            height: 'fit-content',
          }),
        })}
      >
        <Stack
          flex={1}
          justifyContent={bottom ? 'space-evenly' : 'flex-start'}
          direction={landscape ? 'column' : 'row'}
          gap={1}
        >
          <NavigationBarItem
            icon={<FiHome />}
            text="Home"
            layout={horizontal ? 'horizontal' : 'vertical'}
            selected
          />
          <NavigationBarItem
            icon={<FiBookmark />}
            text="Projects"
            layout={horizontal ? 'horizontal' : 'vertical'}
          />
          <NavigationBarItem
            icon={<FiUser />}
            text="Resume"
            layout={horizontal ? 'horizontal' : 'vertical'}
          />
          <NavigationBarItem
            icon={<FiMail />}
            text="Contact"
            layout={horizontal ? 'horizontal' : 'vertical'}
          />
        </Stack>
        {horizontal ? (
          <Button
            variant="plain"
            color="neutral"
            size="lg"
            sx={{
              minHeight: 'fit-content',
              borderRadius: '100vmax',
              padding: '.6rem 1rem',
              transition: 'background 0.2s',
              fontSize: 'var(--joy-fontSize-sm)',
            }}
            onClick={() => {
              setMode(mode === 'light' ? 'dark' : 'light');
            }}
            startDecorator={mode === undefined ? (
              <MdAutoMode />
            ) : mode === 'light' ? (
              <IoMdMoon />
            ) : (
              <IoMdSunny />
            )}
          >
            {mode === undefined ? 'Auto' : mode === 'light' ? 'Dark' : 'Light'}
          </Button>
        ) : (
          <IconButton
            variant="plain"
            color="neutral"
            size="lg"
            sx={{
              display: bottom ? 'none' : undefined,
              borderRadius: '100vmax',
              padding: 2,
            }}
            onClick={() => {
              setMode(mode === 'light' ? 'dark' : 'light');
            }}
          >
            {mode === undefined ? (
              <MdAutoMode />
            ) : mode === 'light' ? (
              <IoMdMoon />
            ) : (
              <IoMdSunny />
            )}
          </IconButton>
        )}
      </Stack>
      {children}
    </>
  );
}
