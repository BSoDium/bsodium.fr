import { Button, ColorPaletteProp, Stack } from '@mui/joy';
import React from 'react';

export default function LinkCarousel({
  links,
} : {
  links: {
    url: string,
    icon: React.ReactNode,
    title: string,
    color: ColorPaletteProp,
  }[]
}) {
  return (
    <Stack
      direction="row"
      gap={1}
      justifyContent="center"
      flexWrap="wrap"
      sx={{
        marginTop: '1rem',
        width: '100%',
        '& > *': {
          transition: 'transform 0.2s ease-in-out',
          '&:hover': {
            transform: 'scaleX(1.05) scaleY(1.1)',
          },
        },
      }}
    >
      {links.map((link) => (
        <Button
          component="a"
          href={link.url}
          target="_blank"
          size="lg"
          color={link.color}
          variant="soft"
          startDecorator={
              link.icon
            }
        >
          {link.title}
        </Button>
      ))}
    </Stack>
  );
}
