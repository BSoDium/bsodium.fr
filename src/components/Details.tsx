import React from 'react';
import { Stack, Typography } from '@mui/joy';
import { Category } from './Terminal';

export default function Details({
  category,
}: {
  category: Category
}) {
  switch (category) {
    case 'education':
      return (
        <Stack gap={1}>
          <Typography>
            Woops! Sorry... This page is still under construction.
          </Typography>
          <Typography level="body2">
            But you can still check out my education history on
            {' '}
            <Typography component="a" href="https://www.linkedin.com/in/bsodium/#education" target="_blank" rel="noreferrer" textColor="inherit">
              LinkedIn
            </Typography>
          </Typography>
        </Stack>
      );
    case 'skills':
      return (
        <Stack alignItems="start">
          <img src="https://github-readme-stats.vercel.app/api/top-langs/?username=BSoDium&layout=compact&bg_color=00000000&hide_border=true&langs_count=10&theme=github_dark" alt="Top Languages" style={{ height: '200px' }} />
          <Typography level="body2">
            For more details, check out my
            {' '}
            <Typography component="a" href="https://www.linkedin.com/in/bsodium/#skills" target="_blank" rel="noreferrer" textColor="inherit">
              LinkedIn
            </Typography>
          </Typography>
        </Stack>
      );
    case 'experience':
      return (
        <Stack gap={1}>
          <Typography>
            Woops! Sorry... This page is still under construction.
          </Typography>
          <Typography level="body2">
            But you can still check out my education history on
            {' '}
            <Typography component="a" href="https://www.linkedin.com/in/bsodium/#experience" target="_blank" rel="noreferrer" textColor="inherit">
              LinkedIn
            </Typography>
          </Typography>
        </Stack>
      );
    default:
      return (
        <Stack>
          The currently selected category is
          {' '}
          {category}
          {' '}
          but there is no content for it yet.
        </Stack>
      );
  }
}
