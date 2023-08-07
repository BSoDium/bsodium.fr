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
import LinkCarousel from './LinkCarousel';

export default function Contact() {
  return (
    <Stack
      gap={3}
    >
      <Typography level="h2" sx={{ position: 'relative' }} id="contact">
        <Default>
          <Avatar
            color="warning"
            sx={(theme) => ({
              position: 'absolute',
              left: '-50px',
              top: '0',
              transform: 'translateX(-50%)',
              border: 'none',
              outline: `1.5px solid ${theme.palette.warning[400]}`,
              boxShadow: `0 0 40px 5px ${theme.palette.warning[700]}`,
            })}
          >
            <FiMail />
          </Avatar>
        </Default>
        Get
        {' '}
        <Typography
          textColor="warning.400"
          fontWeight="xl"
        >
          In touch
        </Typography>
      </Typography>

      <Typography
        level="h5"
        textColor="text.secondary"
      >
        Feel free to
        {' '}
        <Typography
          textColor="text.primary"
        >
          contact me
        </Typography>
        {' '}
        if you have any questions or suggestions. I am
        always open to new ideas and opportunities.
      </Typography>

      <LinkCarousel links={[
        {
          url: `mailto:${details.contact.email}`,
          icon: <FiMail />,
          title: 'Email',
          color: 'warning',
        },
        {
          url: details.contact.linkedin,
          icon: <FaLinkedin />,
          title: 'LinkedIn',
          color: 'warning',
        },
        {
          url: details.contact.github,
          icon: <FaGithub />,
          title: 'GitHub',
          color: 'warning',
        },
        {
          url: details.contact.gitlab,
          icon: <FaGitlab />,
          title: 'GitLab',
          color: 'warning',
        },
        {
          url: details.contact.deviantart,
          icon: <FaDeviantart />,
          title: 'DeviantArt',
          color: 'warning',
        },
        {
          url: details.contact.researchgate,
          icon: <SiResearchgate />,
          title: 'ResearchGate',
          color: 'warning',
        },
      ]}
      />

      <Stack
        direction="row"
        gap={1}
        justifyContent="center"
        flexWrap="wrap"
        sx={{
          marginTop: '1rem',
          width: '100%',
          '& > *': {
            transition: 'transform 0.2s ease-in-out',
            '&:hover': {
              transform: 'scaleX(1.05) scaleY(1.1)',
            },
          },
        }}
      >
        <Button
          component="a"
          href={`mailto:${details.contact.email}`}
          size="lg"
          color="warning"
          variant="soft"
          startDecorator={
            <FiMail />
        }
        >
          Email
        </Button>
        <Button
          component="a"
          href={details.contact.linkedin}
          target="_blank"
          size="lg"
          color="warning"
          variant="soft"
          startDecorator={
            <FaLinkedin />
        }
        >
          LinkedIn
        </Button>
        <Button
          component="a"
          href={details.contact.github}
          target="_blank"
          size="lg"
          color="warning"
          variant="soft"
          startDecorator={
            <FaGithub />
        }
        >
          GitHub
        </Button>
        <Button
          component="a"
          href={details.contact.researchgate}
          target="_blank"
          size="lg"
          color="warning"
          variant="soft"
          startDecorator={
            <SiResearchgate />
        }
        >
          ResearchGate
        </Button>
        <Button
          component="a"
          href={details.contact.gitlab}
          target="_blank"
          size="lg"
          color="warning"
          variant="soft"
          startDecorator={
            <FaGitlab />
        }
        >
          GitLab
        </Button>
        <Button
          component="a"
          href={details.contact.deviantart}
          target="_blank"
          size="lg"
          color="warning"
          variant="soft"
          startDecorator={
            <FaDeviantart />
        }
        >
          DeviantArt
        </Button>
      </Stack>
    </Stack>
  );
}
