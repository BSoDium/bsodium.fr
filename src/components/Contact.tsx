import {
  Stack, Typography,
} from '@mui/joy';
import React from 'react';

export default function Contact() {
  return (
    <Stack
      gap={3}
    >
      <Typography level="h2" sx={{ position: 'relative' }}>
        Get
        {' '}
        <Typography
          textColor="info.400"
          fontWeight="xl"
        >
          In touch
        </Typography>
      </Typography>
      <Typography textColor="text.secondary">
        Sorry, this page is still under construction.
      </Typography>
    </Stack>
  );
}
