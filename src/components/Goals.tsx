/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useEffect, useMemo, useState } from 'react';
import {
  Avatar, Box, Button, Card, Chip, Sheet, Stack, Typography,
} from '@mui/joy';
import { TbHeartHandshake } from 'react-icons/tb';
import { ColorPaletteProp, SxProps } from '@mui/joy/styles/types';
import { MdOutlineRocketLaunch } from 'react-icons/md';
import { HiOutlineSparkles } from 'react-icons/hi2';
import { Parallax } from 'react-scroll-parallax';
import { animated, useSpring, useSpringValue } from '@react-spring/web';
import { Default } from './Responsive';

function Grid({ sx }: {sx?: SxProps}) {
  return (
    <Sheet sx={{
      position: 'relative',
      width: '100%',
      height: '100%',
      backgroundColor: 'transparent',
      backgroundImage: 'linear-gradient(var(--joy-palette-divider) 1px, transparent 1px), linear-gradient(90deg, var(--joy-palette-divider) 1px, transparent 1px)',
      backgroundSize: '37px 37px, 37px 37px',
      '&::before': {
        content: '""',
        position: 'absolute',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        background: 'radial-gradient(circle, transparent 0%, var(--joy-palette-background-body) 100%), linear-gradient(0deg, var(--joy-palette-background-body) 0%, transparent 16%, transparent 84%, var(--joy-palette-background-body) 100%);',
      },
      ...sx,
    }}
    />
  );
}

function Comment({ step } : {step: number}) {
  return (
    <Card
      variant="outlined"
      color="primary"
      sx={{
        position: 'absolute',
        top: 'calc(1rem + 100%)',
        left: '50%',
        width: 'max-content',
        borderRadius: '1.5rem',
        borderTopLeftRadius: '0',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: '0.7rem',
        padding: '0.5rem',
      }}
    >
      <Avatar color="primary" variant="solid" size="sm">
        M
      </Avatar>
      <Stack>
        <Typography level="body3" textColor="text.secondary" fontWeight="600">
          Michael
          {' • '}
          <Typography textColor="text.tertiary">
            5 minutes ago
          </Typography>
        </Typography>
        <Typography level="body2" textColor="text.secondary" sx={{ marginRight: '0.5rem' }}>
          Let&apos;s add a text input under these!
        </Typography>
      </Stack>
    </Card>
  );
}

function Cursor({ step } : {step: number}) {
  const labelTransforms = {
    left: 'translate(calc(-100% + 6px), 18px)',
    right: 'translate(calc(100% + 0px), 18px)',
  };

  const positions: {
    top: string;
    left: string;
    rotate: string;
    opacity: string;
  }[] = [{
    top: '0',
    left: '20%',
    rotate: '0deg',
    opacity: '0',
  }, {
    top: '12%',
    left: '49%',
    rotate: '0deg',
    opacity: '1',
  }, {
    top: '52%',
    left: '60%',
    rotate: '-90deg',
    opacity: '1',
  }, {
    top: '80%',
    left: '20%',
    rotate: '0deg',
    opacity: '1',
  }, {
    top: '80%',
    left: '20%',
    rotate: '0deg',
    opacity: '0',
  }];

  const currentPosition = useMemo(() => ({
    ...positions[step],
    labelTransform: labelTransforms[positions[step].rotate === '0deg' ? 'left' : 'right'],
  }), [step]);

  const top = useSpringValue(currentPosition?.top);
  const left = useSpringValue(currentPosition?.left);
  const rotate = useSpringValue(currentPosition?.rotate);
  const labelTransform = useSpringValue(currentPosition?.labelTransform);
  const opacity = useSpringValue(currentPosition?.opacity);

  useEffect(() => {
    top.start(currentPosition?.top);
    left.start(currentPosition?.left);
    rotate.start(currentPosition?.rotate);
    labelTransform.start(currentPosition?.labelTransform);
    opacity.start(currentPosition?.opacity);
  }, [currentPosition]);

  return (
    <Box
      component={animated.div}
      sx={{
        zIndex: 99,
        position: 'absolute',
      }}
      style={{
        top,
        left,
        opacity,
      }}
    >
      <Chip
        size="sm"
        component={animated.div}
        variant="solid"
        color="danger"
        sx={{
          position: 'absolute',
          borderRadius: 'var(--joy-radius-sm)',
          transformOrigin: 'top right',
          transform: currentPosition?.labelTransform,
          filter: 'drop-shadow(0 0 10px var(--joy-palette-background-body))',
        }}
        style={{
          transform: labelTransform,
        }}
      >
        Elliot
      </Chip>
      <Stack
        className="wrapper"
        component={animated.div}
        sx={{
          position: 'absolute',
          transformOrigin: 'top right',
        }}
        style={{
          rotate,
        }}
      >
        <svg
          height="25"
          viewBox="0 0 17 18"
          fill="var(--joy-palette-danger-600)"
          stroke="var(--joy-palette-danger-500)"
          filter="drop-shadow(0 0 10px var(--joy-palette-background-body))"
        >
          <path d="M15.5036 3.11002L12.5357 15.4055C12.2666 16.5204 10.7637 16.7146 10.22 15.7049L7.4763 10.6094L2.00376 8.65488C0.915938 8.26638 0.891983 6.73663 1.96711 6.31426L13.8314 1.65328C14.7729 1.28341 15.741 2.12672 15.5036 3.11002ZM7.56678 10.6417L7.56645 10.6416C7.56656 10.6416 7.56667 10.6416 7.56678 10.6417L7.65087 10.4062L7.56678 10.6417Z" strokeWidth="1.5" />
        </svg>
      </Stack>
    </Box>
  );
}

function Board({ step } : {step: number}) {
  const [cardScrollProgress, setCardScrollProgress] = useState(0);
  const cardColor = useMemo(() => ['danger', 'warning', 'success'][Math.floor(cardScrollProgress * 3)] as ColorPaletteProp, [cardScrollProgress]);
  return (
    <Sheet
      sx={{
        pointerEvents: 'none',
        width: 'min(50rem, 100%)',
        height: '40rem',
        overflow: 'visible',
        background: 'transparent',
      }}
    >
      <Parallax
        speed={-20}
        style={{
          position: 'absolute',
          top: '0',
          left: '0',
          width: '100%',
          height: '130%',
        }}
      >
        <Grid />
      </Parallax>
      <Card
        variant="outlined"
        sx={{
          position: 'absolute',
          top: '20%',
          left: '10%',
          filter: 'drop-shadow(0 0 20px var(--joy-palette-background-body))',
        }}
      >
        <Typography
          level="h3"
        >
          <Typography
            textColor="text.tertiary"
          >
            Design.
          </Typography>
          <br />
          <Typography
            textColor="text.secondary"
          >
            Develop.
          </Typography>
          <br />
          <Typography>
            Deploy.
          </Typography>
          <br />
        </Typography>
      </Card>
      <Parallax
        speed={10}
        onProgressChange={(progress) => setCardScrollProgress(progress)}
        style={{
          position: 'absolute',
          top: '35%',
          left: '33%',
        }}
      >
        <Card
          variant="outlined"
          sx={{
            filter: 'drop-shadow(0 0 20px var(--joy-palette-background-body))',
          }}
        >
          <Typography level="h5" fontWeight="700">
            Productivity
            {' '}
            <Typography textColor="text.secondary">
              at its finest.
            </Typography>
          </Typography>
          <Typography level="body1" textColor="text.secondary">
            With
            {' '}
            <Typography textColor="text.primary" fontWeight="700">
              quality
            </Typography>
            {' '}
            and
            {' '}
            <Typography textColor="text.primary" fontWeight="700">
              sustainability
            </Typography>
            {' '}
            at heart.
          </Typography>
          <Card
            variant="outlined"
            color={cardColor}
            className="indicator"
            sx={{
              position: 'absolute',
              padding: '0.2rem 1rem',
              width: 'max-content',
              top: '50%',
              left: 'calc(100% + 2rem)',
              transform: 'translateY(-50%)',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: '50%',
                right: '100%',
                width: '2rem',
                height: '1rem',
                borderTop: '1px dashed var(--joy-palette-neutral-700)',
              },
            }}
          >
            <code style={{ fontSize: '0.9rem' }}>
              {`+ ${(50 * cardScrollProgress).toFixed(2)} px`}
            </code>
          </Card>
        </Card>
      </Parallax>
      <Card
        variant="outlined"
        sx={{
          position: 'absolute',
          padding: 1,
          top: '10%',
          left: '60%',
          filter: 'drop-shadow(0 0 20px var(--joy-palette-background-body))',
        }}
      >
        <Stack direction="row" gap={1}>
          <Avatar
            size="lg"
            sx={{
              fontSize: '1.5rem',
              borderRadius: 'var(--Card-radius)',
            }}
          >
            <HiOutlineSparkles />
          </Avatar>
          <Stack direction="column">
            <Typography>
              Innovate.
            </Typography>
            <Typography level="body2">
              Shape tomorrow&apos;s guidelines.
            </Typography>
          </Stack>
        </Stack>
      </Card>
      <Card
        variant="outlined"
        sx={{
          position: 'absolute',
          top: '70%',
          left: '50%',
          transform: 'translateX(-50%)',
          filter: 'drop-shadow(0 0 20px var(--joy-palette-background-body))',
          display: 'flex',
          flexDirection: 'row',
        }}
      >
        <Button
          variant="outlined"
          color="neutral"
        >
          Discover
        </Button>
        <Button
          variant="soft"
          color="neutral"
        >
          Get Started
        </Button>
        <Button
          color="primary"
          startDecorator={<MdOutlineRocketLaunch />}
        >
          Ship it
        </Button>
        <Comment step={1} />
      </Card>
    </Sheet>
  );
}

export default function Goals() {
  const [scrollingProgress, setScrollingProgress] = useState(0);
  const animationStep = useMemo(() => Math.round(scrollingProgress * 4), [scrollingProgress]);

  useEffect(() => {
    console.log(scrollingProgress, animationStep);
  }, [scrollingProgress]);

  return (
    <Default>
      <Parallax
        shouldAlwaysCompleteAnimation
        onProgressChange={(progress) => setScrollingProgress(progress)}
      >
        <Stack
          sx={{ width: '100%', height: '1200px', position: 'relative' }}
          p="37px"
        >
          <Cursor step={animationStep} />
          <Stack
            sx={{
              position: 'absolute',
              top: '-37px',
              right: '0',
              gap: 1,
              zIndex: 1,
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
                  boxShadow: `0 0 37px 5px ${theme.palette.danger[700]}`,
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
          <Stack
            component="div"
            sx={{
              width: '100%',
              height: '100%',
            }}
          >
            <Board step={animationStep} />
          </Stack>
        </Stack>
      </Parallax>
    </Default>
  );
}
