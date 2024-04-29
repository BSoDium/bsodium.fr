import {
  Input, Select, Option, Stack,
  IconButton,
} from '@mui/joy';
import React, { useState } from 'react';
import { IoIosClose, IoIosSearch } from 'react-icons/io';

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
            backgroundColor: 'transparent',
            '--Input-focusedHighlight': theme.palette.background.level2,
          })}
        />
        <Select
          placeholder="Filter by platform"
          variant="outlined"
          sx={{
            borderRadius: '0',
            backgroundColor: 'transparent',
          }}
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
        >
          <Option value="GitHub">GitHub projects</Option>
          <Option value="GitLab">GitLab projects</Option>
          <Option value="Figma">Figma projects</Option>
          <Option value="Deviantart">Deviantart projects</Option>
        </Select>
      </Stack>
    </Stack>
  );
}
