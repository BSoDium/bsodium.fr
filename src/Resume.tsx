import {
  Avatar, Box, Chip, Divider, Stack, Typography,
} from '@mui/joy';
import React from 'react';
import {
  RiBriefcaseLine,
  RiCompasses2Line,
  RiContactsLine,
  RiSettings5Line,
} from 'react-icons/ri';
import { TbSchool } from 'react-icons/tb';
import { IoLanguage } from 'react-icons/io5';
import details from 'assets/Details';
import FixedMode from 'components/FixedMode';
import { Education, Experience, Skills } from 'components/Details';
import Title from 'components/Title';
import { useMobileMode } from 'components/Responsive';

export function Languages() {
  return (
    <Stack direction="row" flexWrap="wrap" gap={2} p={1}>
      {details.languages.map((language) => (
        <Chip
          size="lg"
          key={language.name}
          color={language.native ? 'primary' : 'info'}
          variant="soft"
          startDecorator={(
            <Avatar
              color={language.native ? 'primary' : 'info'}
              variant="solid"
              size="sm"
            >
              {language.level}
            </Avatar>
          )}
        >
          {`${language.name}${language.native ? ' (native)' : ''}`}
        </Chip>
      ))}
    </Stack>
  );
}

export default function Resume() {
  const mobile = useMobileMode();
  return (
    <FixedMode mode="system">
      <Title text="Curriculum Vitae - Elliot Négrel-Jerzy" />
      <Stack
        alignItems="center"
        sx={{
          width: '100vw',
          height: '100vh',
        }}
      >
        <Box component="div" maxWidth="65em">
          <Stack
            paddingX={mobile ? 4 : 12}
            paddingY={mobile ? 4 : 6}
            gap={3}
            width="100%"
            height="100%"
          >
            <Stack component="header" gap={1}>
              <Typography level="h2" fontWeight="xl">
                Elliot Négrel-Jerzy
              </Typography>
              <Typography level="h6" fontWeight="lg" textColor="text.secondary">
                Software Engineer
              </Typography>
              <Typography level="body2">
                Accomplished software developer with expertise in
                various programming languages and technologies.
                Dedicated to contributing to the development community
                through impactful open-source projects on GitHub.
                Proven ability to tackle challenging tasks and excel as a valuable team member.
              </Typography>
            </Stack>
            <Box
              component="section"
              sx={{
                gap: 3,
                ...(mobile
                  ? {
                    display: 'flex',
                    flexDirection: 'column',
                  }
                  : {
                    display: 'grid',
                    gridTemplateColumns: '1fr 2fr',
                  }),
              }}
            >
              <Stack
                gap={3}
                sx={{
                  gridColumn: '1 / 2',
                }}
              >
                <Stack gap={1}>
                  <Typography
                    level="h6"
                    fontWeight="lg"
                    startDecorator={(
                      <Avatar size="sm">
                        <RiContactsLine />
                      </Avatar>
                    )}
                  >
                    Contact
                  </Typography>
                  <Divider />
                  <Stack gap={1}>
                    {['address', 'email', 'phone', 'linkedin', 'github'].map(
                      (key) => {
                        const value = details.contact[
                          key as keyof typeof details.contact
                        ];
                        const isUrl = value.startsWith('http');
                        return (
                          <Stack key={key}>
                            <Typography
                              level="body2"
                              fontWeight="bold"
                              textTransform="capitalize"
                              sx={{
                                width: '100px',
                              }}
                            >
                              {key}
                            </Typography>
                            {isUrl ? (
                              <Typography
                                component="a"
                                level="body2"
                                href={value}
                                target="_blank"
                                sx={{
                                  wordBreak: 'break-word',
                                  textDecoration: 'none',
                                  '&:hover': {
                                    textDecoration: 'underline',
                                  },
                                }}
                              >
                                {value}
                              </Typography>
                            ) : (
                              <Typography
                                level="body2"
                                sx={{
                                  wordBreak: 'break-word',
                                }}
                              >
                                {value}
                              </Typography>
                            )}
                          </Stack>
                        );
                      },
                    )}
                  </Stack>
                </Stack>
                <Stack gap={1}>
                  <Typography
                    level="h6"
                    fontWeight="lg"
                    startDecorator={(
                      <Avatar size="sm">
                        <RiSettings5Line />
                      </Avatar>
                    )}
                  >
                    Technical skills
                  </Typography>
                  <Divider />
                  <Stack gap={1}>
                    <Skills include={['languages', 'frameworks', 'tools']} />
                  </Stack>
                </Stack>
                <div className="pagebreak" />
                <Stack gap={1}>
                  <Typography
                    level="h6"
                    fontWeight="lg"
                    startDecorator={(
                      <Avatar size="sm">
                        <RiCompasses2Line />
                      </Avatar>
                    )}
                  >
                    Competencies
                  </Typography>
                  <Divider />
                  <Stack gap={1}>
                    <Skills include={['others']} />
                  </Stack>
                </Stack>
              </Stack>
              <Stack
                gap={3}
                sx={{
                  gridColumn: '2 / 3',
                }}
              >
                <Stack gap={1}>
                  <Typography
                    level="h6"
                    fontWeight="lg"
                    startDecorator={(
                      <Avatar size="sm">
                        <RiBriefcaseLine />
                      </Avatar>
                    )}
                  >
                    Work history
                  </Typography>
                  <Divider />
                  <Experience />
                </Stack>
                <div className="pagebreak" />
                <Stack gap={1}>
                  <Typography
                    level="h6"
                    fontWeight="lg"
                    startDecorator={(
                      <Avatar size="sm">
                        <TbSchool />
                      </Avatar>
                    )}
                  >
                    Education
                  </Typography>
                  <Divider />
                  <Stack gap={1}>
                    <Education />
                  </Stack>
                </Stack>
                <Stack gap={1}>
                  <Typography
                    level="h6"
                    fontWeight="lg"
                    startDecorator={(
                      <Avatar size="sm">
                        <IoLanguage />
                      </Avatar>
                    )}
                  >
                    Languages
                  </Typography>
                  <Divider />
                  <Stack gap={1}>
                    <Languages />
                  </Stack>
                </Stack>
              </Stack>
            </Box>
          </Stack>
        </Box>
      </Stack>
    </FixedMode>
  );
}
