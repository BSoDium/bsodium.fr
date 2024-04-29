import {
  Input, Select, Option, Stack,
  IconButton,
  Button,
} from '@mui/joy';
import React, { useState } from 'react';
import { IoIosClose, IoIosSearch, IoIosShuffle } from 'react-icons/io';
import { Platform, platformDetails } from 'assets/Projects';

export default function Directory() {
  const [search, setSearch] = useState('');
  const [platform, setPlatform] = useState<string | null>(null);

  return (
    <Stack paddingY={1} width="100%">
      <Stack direction="row" gap={1}>
        <Input
          size="lg"
          placeholder="Search for a project"
          variant="outlined"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          startDecorator={(
            <IoIosSearch />
        )}
          sx={(theme) => ({
            transition: 'all ease .2s',
            width: 'min(100%, 30rem)',
            cursor: 'pointer',
            borderRadius: '0',
            outline: 'none',
            backgroundColor: theme.palette.background.body,
            '--Input-focusedHighlight': theme.palette.text.secondary,
            '&:before': {
              transition: 'all ease .2s',
            },

            '&:has(:focus)': {
              borderRadius: '100vmax 0 0 100vmax',
            },

          })}
        />
        <Select
          placeholder="Filter by platform"
          color="neutral"
          variant="outlined"
          sx={(theme) => ({
            transition: 'all ease .2s',
            borderRadius: '0',
            backgroundColor: theme.palette.background.body,
            width: '12rem',
            '& + ul': {
              borderRadius: '0',
              padding: 0,
            },
          })}
          value={platform}
          onChange={(e, newValue) => setPlatform(newValue)}
          endDecorator={platform !== null && (
            <IconButton
              variant="plain"
              color="neutral"
              sx={{ fontSize: '1.5rem' }}
              onClick={() => setPlatform(null)}
            >
              <IoIosClose />
            </IconButton>
          )}
          indicator={platform !== null ? null : undefined}
          renderValue={(option) => {
            const details = platformDetails[option?.value as Platform];
            return option && details && (
            <Stack direction="row" gap={1} alignItems="center">
              <details.icon />
              {option.label}
            </Stack>
            );
          }}
        >
          {Object.entries(platformDetails).map(([key, item]) => (
            <Option color="neutral" component={Stack} key={key} value={key} direction="row" gap={1}>
              <item.icon />
              {item.label}
            </Option>
          ))}
        </Select>
        <Button
          size="lg"
          variant="outlined"
          color="neutral"
          startDecorator={(
            <IoIosShuffle style={{ fontSize: '1.5rem' }} />
          )}
          sx={(theme) => ({
            transition: 'all ease .2s',
            position: 'relative',
            borderRadius: '0',
            width: 'fit-content',
            flexShrink: 0,
            paddingInline: '1rem',

            background: theme.palette.text.primary,
            color: theme.palette.background.level1,
            '& > span > svg': {
              transition: 'all ease .2s',
            },
            '&:hover': {
              backgroundColor: theme.palette.background.body,
              color: theme.palette.text.primary,
              '& > span > svg': {
                transform: 'rotate3d(1, 0, 0, 540deg) scale(1.2)',
              },
            },
            '&:active': {
              transform: 'scale(.98)',
            },
          })}
        >
          Randomize
        </Button>
      </Stack>
    </Stack>
  );
}
