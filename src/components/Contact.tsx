import {
  Avatar,
  Button,
  Stack, Typography,
} from '@mui/joy';
import React from 'react';
import {
  FaDeviantart, FaGithub, FaGitlab, FaLinkedin,
} from 'react-icons/fa';
import { FiMail } from 'react-icons/fi';
import { SiResearchgate } from 'react-icons/si';
import details from 'assets/Details';
import { Default } from './Responsive';

export default function Contact() {
  return (
    <Stack
      gap={3}
    >
      <Typography level="h2" sx={{ position: 'relative' }} id="contact">
        <Default>
          <Avatar
            color="info"
            sx={(theme) => ({
              position: 'absolute',
              marginLeft: '-50px',
              transform: 'translateX(-50%)',
              border: 'none',
              outline: `1px solid ${theme.palette.info[400]}`,
              boxShadow: `0 0 40px 5px ${theme.palette.info[700]}`,
            })}
          >
            <FiMail />
          </Avatar>
        </Default>
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
              transform: 'scaleX(1.05) scaleY(1.1)',
              transition: 'transform 0.2s ease-in-out',
            },
          },
        }}
      >
        <Button
          component="a"
          href={`mailto:${details.contact.email}`}
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
          href={details.contact.linkedin}
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
          href={details.contact.github}
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
          href={details.contact.researchgate}
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
          href={details.contact.gitlab}
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
          href={details.contact.deviantart}
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
