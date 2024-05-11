import React from 'react';
import { Stack, Typography } from '@mui/joy';
import { ATypography } from 'App';

export default function Credits() {
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
