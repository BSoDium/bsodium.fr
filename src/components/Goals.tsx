/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useEffect, useMemo, useState } from 'react';
import {
  Avatar, Box, Button, Card, Chip,
  Input, Sheet, Stack, Textarea, Typography,
} from '@mui/joy';
import { TbHeartHandshake } from 'react-icons/tb';
import { ColorPaletteProp, SxProps } from '@mui/joy/styles/types';
import { MdMail, MdOutlineRocketLaunch, MdSend } from 'react-icons/md';
import { HiOutlineSparkles } from 'react-icons/hi2';
import { Parallax } from 'react-scroll-parallax';
import { animated, useSpringValue } from '@react-spring/web';
import { FaFire } from 'react-icons/fa';
import { Default, useMobileMode } from './Responsive';

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
  const opacity = useSpringValue(0);

  useEffect(() => {
    opacity.start(step >= 3 ? 1 : 0);
  }, [step]);

  return (
    <Card
      component={animated.div}
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
      style={{
        opacity,
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

  const states: {
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
    top: '52%',
    left: '60%',
    rotate: '-90deg',
    opacity: '1',
  }, {
    top: '76%',
    left: '10%',
    rotate: '0deg',
    opacity: '1',
  }, {
    top: '100%',
    left: '20%',
    rotate: '0deg',
    opacity: '0',
  }];

  const currentState = useMemo(() => ({
    ...states[step],
    labelTransform: labelTransforms[states[step].rotate === '0deg' ? 'left' : 'right'],
  }), [step]);

  const top = useSpringValue(currentState?.top);
  const left = useSpringValue(currentState?.left);
  const rotate = useSpringValue(currentState?.rotate);
  const labelTransform = useSpringValue(currentState?.labelTransform);
  const opacity = useSpringValue(currentState?.opacity);

  useEffect(() => {
    top.start(currentState?.top);
    left.start(currentState?.left);
    rotate.start(currentState?.rotate);
    labelTransform.start(currentState?.labelTransform);
    opacity.start(currentState?.opacity);
  }, [currentState]);

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
          transform: currentState?.labelTransform,
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
          right: '25%',
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
            <Typography level="body2" whiteSpace="nowrap">
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
          sx={{ whiteSpace: 'nowrap' }}
        >
          Get Started
        </Button>
        <Button
          color="primary"
          startDecorator={<MdOutlineRocketLaunch />}
          sx={{ whiteSpace: 'nowrap' }}
        >
          Ship it
        </Button>
        <Comment step={step} />
      </Card>
    </Sheet>
  );
}

function Reach({ step } : {step: number}) {
  const mobile = useMobileMode();

  const opacity = useSpringValue(0);
  const top = useSpringValue('80%');

  useEffect(() => {
    opacity.start(step >= 4 ? 1 : 0);
    top.start(step >= 4 ? '67%' : '80%');
  }, [step]);

  return (
    <Box
      component={animated.form}
      action="https://api.web3forms.com/submit"
      method="POST"
      onSubmit={() => {
        opacity.start(0);
        top.start('80%');
      }}
      sx={{
        display: 'flex',
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
        left: 0,
        overflow: 'hidden',
        position: 'absolute',
        width: mobile ? 'calc(100% + 2rem)' : '100%',
        maxHeight: '27rem',
        marginX: mobile ? '-1rem' : 'auto',
      }}
      style={{
        opacity,
        top,
      }}
    >

      <Stack sx={{
        width: 'min(30rem, 90%)',
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
      }}
      >
        <input type="hidden" name="access_key" value="4e4e6aee-a458-4774-a6e3-a6df6c19abe5" />
        <Typography level="h1">
          Let&apos;s
          {' '}
          <Typography color="danger">
            connect.
          </Typography>
        </Typography>
        <Input
          variant="plain"
          placeholder="john@acme.co.uk"
          type="email"
          name="email"
          required
        />
        <Input
          variant="plain"
          placeholder="John Doe"
          type="text"
          name="name"
          required
        />
        <Textarea
          variant="plain"
          placeholder="Your message here..."
          name="message"
          required
          minRows={4}
        />
        <Stack direction="row" justifyContent="end" gap={1}>
          <Button
            component="a"
            color="danger"
            variant="soft"
            href="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
            target="_blank"
            startDecorator={(
              <FaFire />
        )}
          >
            Get rickrolled
          </Button>
          <Button
            type="submit"
            variant="soft"
            startDecorator={(
              <MdSend />
          )}
          >
            Submit
          </Button>
        </Stack>
      </Stack>
      <Default>
        <Typography
          level="display1"
          fontWeight="300"
          fontSize="7rem"
          sx={{
            display: 'flex',
            flexDirection: 'column',
            background: 'linear-gradient(-45deg, var(--joy-palette-danger-400), var(--joy-palette-primary-400))',
            '-webkit-background-clip': 'text',
            '-webkit-text-fill-color': 'transparent',
          }}
        >
          Together.
          <Typography
            fontSize="3rem"
          >
            We can build the
            {' '}
            <Typography
              color="danger"
              fontWeight={600}
              sx={{
                background: 'initial',
                '-webkit-background-clip': 'initial',
                '-webkit-text-fill-color': 'initial',
                filter: 'drop-shadow(0 0 30px var(--joy-palette-danger-600))',
              }}
            >
              future.
            </Typography>
          </Typography>
        </Typography>
      </Default>
    </Box>
  );
}

export default function Goals() {
  const mobile = useMobileMode();

  const [scrollingProgress, setScrollingProgress] = useState(0);
  const animationStep = useMemo(() => Math.round(scrollingProgress * 5), [scrollingProgress]);

  return (
    <Parallax
      shouldAlwaysCompleteAnimation
      onProgressChange={(progress) => setScrollingProgress(progress)}
    >
      <Stack
        sx={{
          width: '100%', height: '1200px', position: 'relative', overflow: 'visible',
        }}
        p="37px"
      >
        <Default>
          <Cursor step={animationStep} />
        </Default>
        <Stack
          sx={{
            position: 'absolute',
            top: mobile ? '-7rem' : '-2.5rem',
            right: '0',
            gap: 1,
            zIndex: 1,
            textAlign: mobile ? 'center' : 'right',
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
            {mobile ? <br /> : ' '}
            The way we see it.
            <Default>
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
            </Default>
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
          <Reach step={animationStep} />
        </Stack>
      </Stack>
    </Parallax>
  );
}
