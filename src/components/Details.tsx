import React from 'react';
import { Divider, Stack } from '@mui/joy';
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
          {[
            {
              name: 'University of California, Berkeley',
              date: 'August 2019 - May 2023',
              description: 'B.S. in Electrical Engineering and Computer Science',
            },
            {
              name: 'University of California, Berkeley',
              date: 'August 2019 - May 2023',
              description: 'B.A. in Economics',
            },
          ].map(({
            name,
            date,
            description,
          }, index) => (
            <>
              <Stack
                key={name}
                direction="row"
                justifyContent="space-between"
                alignItems="center"
              >
                <Stack>
                  <Stack direction="row" alignItems="center" gap={0.5}>
                    <Stack direction="row" gap={0.2}>
                      <span>{name}</span>
                    </Stack>
                  </Stack>
                  <Stack direction="row" gap={0.2}>
                    <span>{date}</span>
                  </Stack>
                  <Stack direction="row" gap={0.2}>
                    <span>{description}</span>
                  </Stack>
                </Stack>
              </Stack>
              {index !== 1 && <Divider />}
            </>
          ))}
        </Stack>
      );
    case 'skills':
    case 'experience':
    case 'projects':
    case 'interests':
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
