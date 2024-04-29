import {
  Button, IconButton, Stack, Typography,
} from '@mui/joy';
import FixedMode from 'components/FixedMode';
import React from 'react';
import { IoIosReturnLeft } from 'react-icons/io';
import { LuDices } from 'react-icons/lu';
import { Link } from 'react-router-dom';

export default function Projects() {
  return (
    <FixedMode mode="system" style={{ overflow: 'hidden' }}>
      <Stack padding="min(5rem, 5%)" gap={2} alignItems="start">
        <Stack>
          <Typography
            level="display1"
            fontSize="10rem"
            fontWeight={500}
            lineHeight={1}
            sx={{ position: 'relative', marginLeft: '2.72rem' }}
          >
            <Typography
              level="h2"
              fontSize="2,25rem"
              sx={{
                position: 'absolute',
                left: '-1.3rem',
                bottom: '66px',
                transform: 'translateX(-50%) rotate(-90deg)',
              }}
            >
              Featured
            </Typography>
            Projects
          </Typography>
          <Typography
            level="display1"
            fontSize="10rem"
            fontWeight={300}
            lineHeight={0.6}
            marginBottom="3rem"
          >
            Experiments
          </Typography>

        </Stack>
        <Stack direction="row" gap={1}>
          <Button
            size="lg"
            component={Link}
            to="/"
            variant="outlined"
            color="neutral"
            endDecorator={(
              <IoIosReturnLeft size="1.3em" />
          )}
            sx={(theme) => ({
              transition: 'all ease .2s',
              position: 'relative',
              borderRadius: '0',
              width: 'fit-content',
              flexShrink: 0,
              padding: '1 2',

              '&:hover': {
                background: theme.palette.text.primary,
                color: theme.palette.background.level1,
                borderColor: theme.palette.text.primary,
                '& > span > svg': {
                  transform: 'translate(.6rem, .3rem) scale(1.2)',
                  filter: `drop-shadow(-.3rem -.3rem 0 ${theme.palette.text.tertiary}) drop-shadow(-.3rem -.3rem 0 ${theme.palette.text.secondary})`,
                },
              },
              '&:active': {
                transform: 'scale(.98)',
                '& > span > svg': {
                  transform: 'translate(.6rem, .3rem) scale(1.1)',
                  filter: `drop-shadow(-.3rem -.3rem 0 ${theme.palette.background.level1}) drop-shadow(-.3rem -.3rem 0 ${theme.palette.background.level1})`,
                },
              },
              '& > span > svg': {
                transition: 'all ease .2s',
              },
            })}
          >
            Back to homepage
          </Button>
          <IconButton
            variant="outlined"
            color="neutral"
            size="lg"
            sx={(theme) => ({
              transition: 'all ease .2s',
              position: 'relative',
              borderRadius: '0',
              width: 'fit-content',
              flexShrink: 0,
              padding: '1 2',

              '&:hover': {
                background: theme.palette.text.primary,
                color: theme.palette.background.level1,
                borderColor: theme.palette.text.primary,
              },
              '&:active': {
                transform: 'scale(.98)',
              },
              '& > span > svg': {
                transition: 'all ease .2s',
              },
            })}
          >
            <LuDices />
          </IconButton>
        </Stack>
      </Stack>
    </FixedMode>
  );
}
