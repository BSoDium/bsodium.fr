import {
  FiAtSign, FiUser,
} from 'react-icons/fi';
import satelliteDark from 'assets/satellite_dark.png';
import satelliteLight from 'assets/satellite_light.png';
import React, { useEffect, useState } from 'react';
import {
  animated, useSpringRef, useSpringValue, useTransition,
} from '@react-spring/web';
import {
  Alert,
  Box, Button, Input, Stack, Textarea, Typography,
  useColorScheme,
} from '@mui/joy';
import { MdErrorOutline, MdSend } from 'react-icons/md';
import { FaFire } from 'react-icons/fa';
import { BsSendCheck } from 'react-icons/bs';
import { Default, useMobileMode } from './Responsive';

export default function Reach({ step } : {step: number}) {
  const mobile = useMobileMode();
  const { colorScheme } = useColorScheme();

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string>();

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    const response = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        access_key: '4e4e6aee-a458-4774-a6e3-a6df6c19abe5',
        email,
        name,
        message,
      }),
    });
    const result = await response.json();
    if (result.success) {
      setSubmitted(true);
    } else {
      setError(result.message);
    }
    setLoading(false);
  };

  const opacity = useSpringValue(0);
  const top = useSpringValue('80%');
  const scale = useSpringValue(1);

  const submissionTextOpacity = useSpringValue(0);
  const submissionTextScale = useSpringValue(1);

  useEffect(() => {
    if (!submitted) {
      opacity.start((step >= 4 || mobile) ? 1 : 0);
      top.start((step >= 4 || mobile) ? '67%' : '80%');
    }
  }, [step]);

  const satelliteTransitionRef = useSpringRef();

  const satelliteTransition = useTransition(colorScheme, {
    ref: satelliteTransitionRef,
    initial: null,
    keys: null,
    from: { opacity: 0 },
    enter: { opacity: 1 },
    leave: { opacity: 0 },
  });

  useEffect(() => {
    satelliteTransitionRef.start();
  }, [satelliteTransitionRef, colorScheme]);

  useEffect(() => {
    if (submitted) {
      opacity.start(0.3);
      scale.start(0.9);
      submissionTextOpacity.start(1);
      submissionTextScale.start(1);
    } else {
      opacity.start(1);
      scale.start(1);
      submissionTextOpacity.start(0);
      submissionTextScale.start(0.9);
    }
  }, [submitted, submissionTextOpacity, submissionTextScale]);

  return (
    <>
      <Box
        component={animated.form}
        onSubmit={submit}
        sx={{
          position: 'absolute',
          left: 0,
          display: 'flex',
          flexDirection: 'row',
          justifyContent: mobile ? 'center' : 'flex-start',
          paddingX: mobile ? '0' : '5%',
          alignItems: 'center',
          width: mobile ? 'calc(100% + 2rem)' : '100%',
          marginX: mobile ? '-1rem' : 'auto',
          maxHeight: '27rem',
        }}
        style={{
          opacity,
          top,
          transform: scale.to((s) => `scale(${s})`),
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
          <Typography
            level="h1"
          >
            {'Let\'s '}
            <Typography color="danger">
              connect.
            </Typography>
          </Typography>
          <Stack
            gap={1}
          >
            <Input
              variant="plain"
              placeholder="Your email address"
              type="email"
              name="email"
              startDecorator={(
                <FiAtSign />
          )}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
            <Input
              variant="plain"
              placeholder="Your name"
              type="text"
              name="name"
              startDecorator={(
                <FiUser />
          )}
              onChange={(event) => setName(event.target.value)}
              required
            />
            <Textarea
              variant="plain"
              placeholder="What's on your mind?"
              name="message"
              required
              onChange={(event) => setMessage(event.target.value)}
              minRows={4}
            />
            {error && (
            <Alert
              color="warning"
              startDecorator={(
                <MdErrorOutline size="1.1rem" />
              )}
              sx={{ gap: 0.5 }}
            >
              {error || 'Something went wrong. Please try again.'}
            </Alert>
            )}
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
                Surprise me
              </Button>
              <Button
                type="submit"
                variant="soft"
                loading={loading}
                startDecorator={(
                  <MdSend />
          )}
              >
                Submit
              </Button>
            </Stack>
          </Stack>
        </Stack>
        <Default>
          <>
            {satelliteTransition((style, item) => {
              switch (item) {
                case 'light':
                  return (
                    <animated.img
                      src={satelliteLight}
                      alt="satellite"
                      style={{
                        ...style,
                        position: 'absolute',
                        top: '-1rem',
                        left: 'max(67%, 36rem)',
                        height: '20rem',
                        filter: 'drop-shadow(-1rem -1rem 1.5rem #f4e9d068) drop-shadow(1rem 1rem 1rem #326c8c4c) hue-rotate(15deg)',
                      }}
                    />
                  );
                case 'dark':
                  return (
                    <animated.img
                      src={satelliteDark}
                      alt="satellite"
                      style={{
                        ...style,
                        position: 'absolute',
                        top: '-2rem',
                        left: 'max(65%, 36rem)',
                        height: '20rem',
                        filter: 'drop-shadow(-1rem -1rem 1.5rem #dcedfa41) drop-shadow(1rem 1rem 1rem #01012563)',
                      }}
                    />
                  );
                default:
                  return null;
              }
            })}
          </>
        </Default>

      </Box>
      <Stack
        direction="row"
        gap={4}
        alignItems="center"
        component={animated.div}
        sx={{
          position: 'absolute',
          bottom: '12rem',
          left: '15rem',
          transform: 'translate(-50%, -50%)',
        }}
        style={{
          opacity: submissionTextOpacity,
          transform: submissionTextScale.to((s) => `scale(${s})`),
        }}
      >
        <BsSendCheck size="3rem" style={{ color: 'var(--joy-palette-neutral-softColor)' }} />
        <Stack
          direction="column"
        >
          <Typography
            level="h2"
          >
            {'Thank '}
            <Typography color="primary">
              you.
            </Typography>
          </Typography>
          <Typography
            level="h5"
            textColor="text.secondary"
          >
            Your message has been sent.
          </Typography>
        </Stack>
      </Stack>
    </>
  );
}
