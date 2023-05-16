import {
  Button,
  Divider,
  Stack, Typography,
} from '@mui/joy';
import React from 'react';
import {
  FaDeviantart, FaGithub, FaGitlab, FaLinkedin,
} from 'react-icons/fa';
import { FiMail } from 'react-icons/fi';
import { SiResearchgate } from 'react-icons/si';

export default function Contact() {
  return (
    <Stack
      gap={3}
    >
      <Typography level="h2" sx={{ position: 'relative' }}>
        Get
        {' '}
        <Typography
          textColor="info.400"
          fontWeight="xl"
        >
          In touch
        </Typography>
      </Typography>

      <Typography
        level="h5"
        textColor="text.secondary"
      >
        Feel free to contact me if you have any questions or suggestions. I am
        always open to new ideas and opportunities.
      </Typography>

      <Stack
        direction="row"
        gap={2}
        justifyContent="center"
        flexWrap="wrap"
        sx={{
          marginTop: '1rem',
          width: '100%',
          '& > *': {
            flexGrow: 1,
            maxWidth: '300px',
            transition: 'transform 0.2s ease-in-out',
            '&:hover': {
              transform: 'scale(1.1)',
            },
          },
        }}
      >
        <Button
          component="a"
          href="mailto:negreljerzy.elliot@gmail.com"
          target="_blank"
          size="lg"
          variant="soft"
          startDecorator={
            <FiMail />
        }
        >
          Send me an email
        </Button>
        <Button
          component="a"
          href="https://www.linkedin.com/in/bsodium/"
          target="_blank"
          size="lg"
          variant="soft"
          startDecorator={
            <FaLinkedin />
        }
        >
          Contact me on LinkedIn
        </Button>
        <Button
          component="a"
          href="https://www.researchgate.net/profile/Elliot-Negrel-Jerzy"
          target="_blank"
          size="lg"
          variant="soft"
          startDecorator={
            <SiResearchgate />
        }
        >
          Follow me on ResearchGate
        </Button>
        <Button
          component="a"
          href="https://www.github.com/bsodium"
          target="_blank"
          size="lg"
          variant="soft"
          startDecorator={
            <FaGithub />
        }
        >
          Collaborate on GitHub
        </Button>
        <Button
          component="a"
          href="https://www.gitlab.com/bsodium"
          target="_blank"
          size="lg"
          variant="soft"
          startDecorator={
            <FaGitlab />
        }
        >
          Collaborate on GitLab
        </Button>
        <Button
          component="a"
          href="https://www.deviantart.com/bsodium"
          target="_blank"
          size="lg"
          variant="soft"
          startDecorator={
            <FaDeviantart />
        }
        >
          Follow me on DeviantArt
        </Button>
      </Stack>
    </Stack>
  );
}
