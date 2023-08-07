import React from 'react';
import {
  Avatar,
  Stack, Typography,
} from '@mui/joy';
import {
  FaDeviantart, FaGithub, FaGitlab, FaLinkedin,
} from 'react-icons/fa';
import { FiMail } from 'react-icons/fi';
import { SiResearchgate } from 'react-icons/si';
import details from 'assets/Details';
import LinkCarousel from './LinkCarousel';
import { Default } from './Responsive';

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

      <LinkCarousel
        repeat={4}
        links={[
          {
            url: `mailto:${details.contact.email}`,
            icon: <FiMail />,
            title: 'Email',
            color: '#ea4335',
          },
          {
            url: details.contact.linkedin,
            icon: <FaLinkedin />,
            title: 'LinkedIn',
            color: '#0a66c2',
          },
          {
            url: details.contact.github,
            icon: <FaGithub />,
            title: 'GitHub',
            color: '#24292e',
          },
          {
            url: details.contact.gitlab,
            icon: <FaGitlab />,
            title: 'GitLab',
            color: '#fc6d26',
          },
          {
            url: details.contact.deviantart,
            icon: <FaDeviantart />,
            title: 'DeviantArt',
            color: '#05cc47',
          },
          {
            url: details.contact.researchgate,
            icon: <SiResearchgate />,
            title: 'ResearchGate',
            color: 'hsl(175, 70%, 40%)',
          },
        ]}
      />
    </Stack>
  );
}
