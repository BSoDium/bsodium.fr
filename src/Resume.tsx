import {
  Avatar, Box, Chip, Divider, Stack, Typography,
} from '@mui/joy';
import FixedMode from 'components/FixedMode';
import React from 'react';
import {
  RiBriefcaseLine,
  RiCompasses2Line,
  RiContactsLine,
  RiSettings5Line,
} from 'react-icons/ri';
import details from 'assets/Details';
import { TbSchool } from 'react-icons/tb';
import { IoLanguage } from 'react-icons/io5';
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
          color={language.native ? 'success' : 'info'}
          variant="soft"
          startDecorator={(
            <Avatar
              color={language.native ? 'success' : 'info'}
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
                Software engineer and computer science
                student at ENSEEIHT. Passionate about software development and
                contributing to the development community through open-source
                projects on GitHub. Proficient in various programming languages
                and technologies, ready to tackle any challenge and be a
                valuable asset to any team
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
                      (key) => (
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
                          <Typography
                            level="body2"
                            sx={{
                              wordBreak: 'break-word',
                            }}
                          >
                            {
                              details.contact[
                                key as keyof typeof details.contact
                              ]
                            }
                          </Typography>
                        </Stack>
                      ),
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
