import {
  Button, Stack, VariantProp,
} from '@mui/joy';
import { useSpringValue } from '@react-spring/web';
import Color from 'color';
import React, { useMemo } from 'react';

function getContrastColor(backgroundColor: string): string {
  const color = Color(backgroundColor);
  const hsl = color.hsl();

  if (hsl.lightness() < 50) {
    return hsl.lightness(hsl.lightness() + 50).hex();
  }
  return hsl.lightness(hsl.lightness() - 50).hex();
}

export default function LinkCarousel({
  links,
  repeat = 2,
} : {
  links: {
    url: string,
    icon: React.ReactNode,
    title: string,
    color?: string,
    variant?: VariantProp,
  }[]
  repeat?: number,
}) {
  const repeatedLinks = useMemo(() => (
    Array.from({ length: repeat }, () => links).flat()
  ), [links, repeat]);

  const animationDurations = useMemo(() => ([
    Math.random() * 10 + 15,
    Math.random() * 10 + 15,
  ]), []);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const scale = useSpringValue(1, {
    config: {
      mass: 0.1,
      tension: 320,
    },
  });

  return (
    <Stack
      gap={1}
      sx={{
        position: 'relative',
        py: 1,
        overflow: 'hidden',
        marginX: -5,
        '&::before': {
          position: 'absolute',
          content: '""',
          height: '100%',
          width: '25%',
          zIndex: 2,
          pointerEvents: 'none',
          backgroundImage: 'linear-gradient(to right, var(--joy-palette-background-body), transparent)',
        },
        '&::after': {
          position: 'absolute',
          content: '""',
          height: '100%',
          width: '25%',
          right: 0,
          zIndex: 2,
          pointerEvents: 'none',
          backgroundImage: 'linear-gradient(to left, var(--joy-palette-background-body), transparent)',
        },
        '& > *': {
          '@keyframes slide': {
            '0%': {
              transform: 'translateX(0)',
            },
            '100%': {
              transform: `translateX(-${(repeat - 1) * (100 / repeat)}%)`,
            },
          },
        },
      }}
    >
      <Stack
        direction="row"
        gap={1}
        sx={{
          width: '100%',
          animation: `slide ${animationDurations[0]}s linear infinite`,
          '& > *': {
            transition: 'transform 0.2s ease-in-out',
            '&:hover': {
              transform: 'scaleX(1.05) scaleY(1.1)',
            },
          },
        }}
      >
        {repeatedLinks.map((link) => (
          <Button
            component="a"
            href={link.url}
            target="_blank"
            size="lg"
            color="neutral"
            variant={link.variant || 'outlined'}
            startDecorator={
              link.icon
            }
          >
            {link.title}
          </Button>
        ))}
      </Stack>
      <Stack
        direction="row"
        gap={1}
        sx={{
          width: '100%',
          animation: `slide ${animationDurations[1]}s linear infinite`,
          '& > *': {
            transition: 'transform 0.2s ease-in-out',
            '&:hover': {
              transform: 'scaleX(1.05) scaleY(1.1)',
            },
          },
        }}
      >
        {repeatedLinks.reverse().map((link) => (
          <Button
            component="a"
            href={link.url}
            target="_blank"
            size="lg"
            color="neutral"
            variant={link.variant || 'outlined'}
            startDecorator={
              link.icon
            }
            sx={{
              ...(link.color && {
                transition: 'background-color 0.2s ease-in-out, color 0.2s ease-in-out',
                '&:hover': {
                  backgroundColor: getContrastColor(link.color),
                  color: link.color,
                },
              }),
            }}
          >
            {link.title}
          </Button>
        ))}
      </Stack>
    </Stack>
  );
}
