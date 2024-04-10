import React, { useEffect, useMemo, useState } from 'react';

import {
  Avatar, Button, Stack, Typography,
} from '@mui/joy';
import { RiArrowRightSLine } from 'react-icons/ri';
import { IoReaderOutline } from 'react-icons/io5';
import { Link } from 'react-router-dom';
import greeting from 'utils/Greeting';
import { ATypography } from 'App';
import details from 'assets/Details';
import { useMobileMode } from './Responsive';
import TypeWriter from './TypeWriter';

export const visitors = [
  'stranger',
  'collaborator',
  'fellow developer',
  'fellow human',
  'friend',
];

export default function Header() {
  const mobile = useMobileMode();
  const [visitor, setVisitor] = useState(visitors[0]);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisitor((prev) => {
        const nextIndex = (visitors.indexOf(prev) + 1) % visitors.length;
        return visitors[nextIndex];
      });
    }, 3000);
    return () => { clearInterval(interval); };
  }, [mobile]);

  const currentCompany = useMemo(() => details.experience.find((experience) => experience.end === 'Present') || undefined, []);

  return (
    <Stack
      gap="20px"
      height="20rem"
      alignItems={mobile ? 'center' : 'flex-start'}
      sx={(theme) => ({
        position: 'relative',
        '&::before': mobile ? {} : {
          content: '""',
          position: 'absolute',
          top: 'calc(70px + 33px)',
          left: '-50px',
          height: 'calc(100% + 80px - 70px - 33px)',
          width: '1.5px',
          background: `linear-gradient(to bottom, ${theme.palette.primary[700]}, ${theme.palette.primary[400]})`,
        },
      })}
    >
      <Button
        size="lg"
        component={Link}
        variant="outlined"
        to="/resume"
        startDecorator={(
          <Avatar size="lg" color="primary">
            <IoReaderOutline />
          </Avatar>
          )}
        endDecorator={(
          <RiArrowRightSLine size="1.3em" />
          )}
        sx={(theme) => ({
          '&:not(:hover)': {
            backgroundColor: '#0000008c',
          },
          '&:hover': {
            boxShadow: `0 0 40px 5px ${theme.palette.primary[900]}`,
            '& > span > svg': {
              transform: 'translateX(.6rem) scale(1.2)',
              filter: `drop-shadow(-.3rem 0 0 ${theme.palette.primary[300]}) drop-shadow(-.3rem 0 0 ${theme.palette.primary[400]})`,
            },
          },
          '&:active > span > svg': {
            transform: 'translateX(.6rem) scale(1.1)',
            filter: `drop-shadow(-.3rem 0 0 ${theme.palette.primary[200]}) drop-shadow(-.3rem 0 0 ${theme.palette.primary[200]})`,
          },
          '& > span > svg': {
            transition: 'all ease .2s',
          },
          position: 'relative',
          borderRadius: '100px',
          width: 'fit-content',
          backdropFilter: 'blur(5px)',
          transition: 'all ease .2s',
          flexShrink: 0,
          padding: 1,
          paddingRight: 2,
          '&::before': mobile ? {} : {
            position: 'absolute',
            content: '""',
            top: '50%',
            left: '-50px',
            width: '50px',
            height: '70px',
            marginLeft: '-1px',
            border: `1.5px solid ${theme.palette.primary[700]}`,
            borderBottom: 'none',
            borderRight: 'none',
            borderTopLeftRadius: '50px',
          },
        })}
      >
        <Stack alignItems="flex-start" sx={{ textAlign: 'left' }}>
          <Typography level="body1" textColor="inherit" fontWeight="lg" lineHeight="1.2em">
            Access online resume
          </Typography>
          <Typography level="body2" textColor="inherit" fontWeight="sm" sx={{ opacity: 0.8 }}>
            Dynamic, interactive, and up-to-date
          </Typography>
        </Stack>
      </Button>
      <Typography
        level={mobile ? 'h2' : 'display2'}
        fontWeight="md"
        display="flex"
        justifyContent={mobile ? 'center' : 'initial'}
        textAlign={mobile ? 'center' : 'initial'}
        fontFamily="'Fira Code', monospace"
        flexWrap="wrap"
      >
        {greeting()}
        &nbsp;
        <TypeWriter
          typeInterval={20}
        >
          {visitor}
        </TypeWriter>
      </Typography>
      <Typography
        level={mobile ? 'h5' : 'h4'}
        textColor="text.tertiary"
        sx={{
          position: 'relative',
          padding: mobile ? '0 1rem' : 0,
          textAlign: mobile ? 'center' : 'left',
        }}
      >
        The name&apos;s
        {' '}
        <ATypography textColor="primary.400" href="https://www.linkedin.com/in/bsodium/">
          Elliot Négrel-Jerzy
        </ATypography>
        {' '}
        , but you can call me
        {' '}
        <ATypography href="https://github.com/BSoDium">
          BSoDium
        </ATypography>
        . I&apos;m a
        {' '}
        <Typography textColor="text.primary">
          Software engineer
        </Typography>
            &nbsp;
        {currentCompany ? (
          <>
            {'at '}
            <ATypography textColor="text.primary" href={currentCompany.url}>
              {currentCompany.company}
            </ATypography>
            &nbsp;
          </>
        ) : null}
        and an
        {' '}
        <Typography textColor="text.primary">
          Open-source
        </Typography>
        {' '}
        enthusiast.
      </Typography>
    </Stack>
  );
}
