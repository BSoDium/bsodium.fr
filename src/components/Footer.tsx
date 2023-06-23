import { Box, Stack, Typography } from '@mui/joy';
import { ATypography } from 'App';
import React from 'react';

export default function Footer() {
  return (
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
  );
}
