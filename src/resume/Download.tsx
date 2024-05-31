import {
  Button, Card, Stack, Typography,
} from '@mui/joy';
import details from 'assets/Details';
import React, { useState } from 'react';

export default function Download() {
  const [fileName] = useState(`Resume_${details.name.first}_${details.name.last}.pdf`);
  return (
    <Stack
      id="container"
      direction="row"
      justifyContent="center"
      alignItems="center"
      sx={{
        position: 'fixed',
        bottom: 'var(--nav-safe-area-inset-bottom, 0)',
        width: '100%',
        paddingLeft: 'var(--nav-safe-area-inset-left, 0)',
        borderRadius: 0,
        zIndex: 2,
      }}
    >
      <Card
        variant="outlined"
        sx={(theme) => ({
          width: 'min(100%, 30em)',
          backgroundColor: `color-mix(in srgb, ${theme.palette.background.body}, transparent 50%)`,
          backdropFilter: 'blur(10px)',
          webkitBackdropFilter: 'blur(10px)',
          padding: '.5rem',
          marginY: '.5rem',
        })}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography>
            {fileName}
          </Typography>
          <Button>
            Download
          </Button>
        </Stack>
      </Card>
    </Stack>
  );
}
