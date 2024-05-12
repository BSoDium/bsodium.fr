import { FiAtSign, FiUser } from 'react-icons/fi';
import phone from 'assets/phone.webp';
import React, { useEffect, useState } from 'react';
import { animated, useSpringValue } from '@react-spring/web';
import {
  Box, Button, Input, Stack, Textarea, Typography,
} from '@mui/joy';
import { MdSend } from 'react-icons/md';
import { FaFire } from 'react-icons/fa';
import { Default, useMobileMode } from './Responsive';

export default function Reach({ step } : {step: number}) {
  const mobile = useMobileMode();

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
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
      console.debug('Message sent successfully!');
    } else {
      console.error('Failed to send message. Please try again later.');
    }
  };

  const opacity = useSpringValue(0);
  const top = useSpringValue('80%');

  useEffect(() => {
    opacity.start((step >= 4 || mobile) ? 1 : 0);
    top.start((step >= 4 || mobile) ? '67%' : '80%');
  }, [step]);

  return (
    <Box
      component={animated.form}
      onSubmit={(event) => {
        submit(event);
        opacity.start(0);
        top.start('80%');
      }}
      sx={{
        position: 'absolute',
        left: 0,
        display: 'flex',
        flexDirection: 'row',
        justifyContent: mobile ? 'center' : 'flex-start',
        paddingX: mobile ? '0' : '5%',
        alignItems: 'center',
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
            startDecorator={(
              <MdSend />
          )}
          >
            Submit
          </Button>
        </Stack>
      </Stack>
      <Default>
        <animated.img
          src={phone}
          alt="phone"
          style={{
            position: 'absolute',
            top: '-3rem',
            left: 'max(65%, 32rem)',
            height: '30rem',
            filter: 'drop-shadow(1rem 1rem 2rem #a7062e65) drop-shadow(-1rem -1rem 2rem #58e7f478)',
          }}
        />
      </Default>
    </Box>
  );
}
