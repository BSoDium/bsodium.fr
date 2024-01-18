/* eslint-disable react/no-array-index-key */
/* eslint-disable react/jsx-props-no-spreading */
import {
  Button, Stack, VariantProp,
} from '@mui/joy';
import { useSpringValue } from '@react-spring/web';
import Color from 'color';
import React, { useMemo } from 'react';

function getPalette(primaryColor: string): {
  color: string,
  backgroundColor: string,
  borderColor: string
} {
  const color = Color(primaryColor);
  const hsl = color.hsl();

  return {
    color: hsl.lightness(90).hex(),
    backgroundColor: hsl.lightness(10).hex(),
    borderColor: hsl.lightness(20).hex(),
  };
}

type LinkProps = {
  url: string,
  icon: React.ReactNode,
  title: string,
  color?: string,
  variant?: VariantProp,
};

export function Link({
  url,
  icon,
  title,
  color,
  variant,
}: NonNullable<LinkProps>) {
  return (
    <Button
      component="a"
      href={url}
      target="_blank"
      size="lg"
      color="neutral"
      variant={variant || 'outlined'}
      startDecorator={
              icon
            }
      sx={{
        transition: 'background-color 0.2s ease-in-out, color 0.2s ease-in-out',
        '&:hover': {
          ...(color && getPalette(color)
          ),
        },
      }}
    >
      {title}
    </Button>
  );
}

export default function LinkCarousel({
  links,
  repeat = 2,
} : {
  links: LinkProps[]
  repeat?: number,
}) {
  const repeatedLinks = useMemo(() => (
    Array.from({ length: repeat }, () => links).flat()
  ), [links, repeat]);

  const animationDurations = useMemo(() => ([
    Math.random() * 30 + 40,
    Math.random() * 30 + 40,
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
              transform: `translateX(calc(-${(repeat - 1) * (100 / repeat)}% - 8px))`,
            },
          },
        },
      }}
    >
      {[repeatedLinks, repeatedLinks.slice().reverse()].map((_links, i) => (
        <Stack
          key={i}
          direction="row"
          gap={1}
          sx={{
            width: 'max-content',
            animation: `slide ${animationDurations[i]}s linear infinite`,
            '&:hover': {
              animationPlayState: 'paused',
            },
          }}
        >
          {_links.map((link, index) => (
            <Link {...link} key={index} />
          ))}
        </Stack>
      ))}
    </Stack>
  );
}
