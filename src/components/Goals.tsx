/* eslint-disable no-plusplus */
/* eslint-disable react/no-unknown-property */
import {
  Avatar, Stack, Typography,
} from '@mui/joy';
import React from 'react';
import { TbHeartHandshake } from 'react-icons/tb';
import { Default } from './Responsive';

const Spline = React.lazy(() => import('@splinetool/react-spline'));

export default function Goals() {
  return (
    <Default>
      <Stack
        sx={{ width: '100%', height: '400px', position: 'relative' }}
        p="20px"
      >
        <Stack
          sx={{
            position: 'absolute',
            top: '-20px',
            right: '0',
            gap: 1,
            textAlign: 'right',
          }}
        >
          <Typography
            level="h2"
            sx={{
              position: 'relative',
            }}
            id="footer"
          >
            <Typography
              textColor="danger.400"
              fontWeight="xl"
            >
              Software.
            </Typography>
            {' '}
            The way we see it.
            <Avatar
              color="danger"
              sx={(theme) => ({
                position: 'absolute',
                top: '0',
                right: '-50px',
                transform: 'translateX(50%)',
                border: 'none',
                outline: `1.5px solid ${theme.palette.danger[400]}`,
                boxShadow: `0 0 40px 5px ${theme.palette.danger[700]}`,
              })}
            >
              <TbHeartHandshake />
            </Avatar>
          </Typography>
          <Typography
            level="body1"
            textColor="text.secondary"
          >
            Let&apos;s build products that people love. Together.
          </Typography>
        </Stack>
        <Spline
          scene="https://prod.spline.design/D7xRCZ6d7FKAmDLz/scene.splinecode"
          style={{
            width: '100%',
            height: 'calc(100% + 100px)',
            marginTop: '-50px',
            marginLeft: '-50px',
          }}
        />
      </Stack>
    </Default>
  );
}
