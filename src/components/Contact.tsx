import React from 'react';
import {
  Avatar,
  Stack, Typography,
} from '@mui/joy';
import {
  FaDeviantart, FaGithub, FaGitlab, FaLinkedin, FaTwitter,
} from 'react-icons/fa';
import { FiMail, FiPhone } from 'react-icons/fi';
import { SiResearchgate } from 'react-icons/si';
import details from 'assets/Details';
import LinkCarousel from './LinkCarousel';
import { Default, useMobileMode } from './Responsive';

export default function Contact() {
  const mobile = useMobileMode();

  return (
    <Stack
      gap={3}
      sx={{ zIndex: 1, textAlign: mobile ? 'center' : 'left' }}
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
          in touch
        </Typography>
      </Typography>

      <Typography
        level="h5"
        textColor="text.tertiary"
        sx={{
          maxWidth: '500px',
        }}
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
        always open to new
        {' '}
        <Typography
          textColor="text.primary"
        >
          ideas and opportunities
        </Typography>
        .
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
            url: `tel:${details.contact.phone}`,
            icon: <FiPhone />,
            title: 'Phone',
            color: '#4285f4',
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
            color: '#1fada2',
          },
          {
            url: details.contact.twitter,
            icon: <FaTwitter />,
            title: 'Twitter',
            color: '#1da1f2',
          },
        ]}
      />
    </Stack>
  );
}
