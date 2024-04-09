/* eslint-disable no-bitwise */
import {
  Avatar,
  Box, Button, Card, Chip, CircularProgress, Divider, Stack, Typography,
} from '@mui/joy';
import React, { useEffect, useState } from 'react';
import { BsJournalBookmark, BsJournalCode } from 'react-icons/bs';
import {
  FaCode, FaCodeBranch, FaStar,
} from 'react-icons/fa';
import { RxOpenInNewWindow } from 'react-icons/rx';
import { Repository, getRepositories } from 'utils/Api';
import colors from 'assets/colors.json';
import { Parallax } from 'react-scroll-parallax';
import { Default, Mobile, useMobileMode } from './Responsive';

/**
 * Beautifies a string
 * @param str The string to beautify
 * @returns The beautified string
 */
export function beautify(str: string) {
  return str.replace(/-/g, ' ').replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}

function ProjectCard({
  project,
}: {
  project: Repository;
}) {
  const mobile = useMobileMode();

  return (
    <Card
      component={Stack}
      variant="outlined"
      gap={2}
      p={3}
      justifyContent="space-between"
      sx={{
        ...(mobile && {
          background: 'transparent',
          border: 'none',
          paddingX: 1,
          paddingY: 0,
        }),
        transition: 'all 0.3s ease',
        cursor: 'pointer',
        '&:hover': {
          boxShadow: '0 0 40px 5px rgba(0, 0, 0, 0.5)',
          transform: 'scale(1.03)',
          zIndex: 1,
        },
      }}
    >
      <Stack gap={2}>
        <Stack direction="row" alignItems="center" gap={2}>
          <Avatar>
            <BsJournalBookmark />
          </Avatar>
          <Stack>
            <Typography level="h5">
              {beautify(project.name)}
            </Typography>
            <Typography
              level="body2"
              startDecorator={(
                <FaCode style={{
                  color: colors[project.language as keyof typeof colors]?.color || 'white',
                }}
                />
              )}
            >
              {project.language}
            </Typography>
          </Stack>
        </Stack>
        <Typography
          level="body2"
          sx={{
            flexGrow: 0,
          }}
        >
          {project.description}
        </Typography>
      </Stack>
      <Stack direction="row" gap={2} justifyContent="space-between">
        <Stack direction="row" gap={2}>
          <Typography
            level="body2"
            startDecorator={
              <FaStar />
                }
          >
            {project.stargazers_count}
          </Typography>
          <Typography
            level="body2"
            startDecorator={
              <FaCodeBranch />
            }
          >
            {project.forks}
          </Typography>
        </Stack>
        <Stack direction="row" gap={1}>
          <Button
            variant="plain"
            component="a"
            color="info"
            href={project.html_url}
            target="_blank"
            sx={{
              flexShrink: 0,
            }}
          >
            Git Repository
          </Button>
          {project.homepage && (
          <Button
            component="a"
            color="info"
            variant="solid"
            href={project.homepage}
            target="_blank"
            endDecorator={
              <RxOpenInNewWindow />
            }
          >
            Visit
          </Button>
          )}
        </Stack>
      </Stack>
    </Card>
  );
}

export default function Featured() {
  const mobile = useMobileMode();

  const [projects, setProjects] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error>();

  useEffect(() => {
    setLoading(true);
    getRepositories('BSoDium').then((data) => {
      setProjects(data.filter((project) => project.topics.includes('featured')));
    }).catch(() => {
      setError(new Error('Failed to load projects, check your internet connection.'));
    }).finally(() => {
      setLoading(false);
    });
  }, []);

  return (
    <Stack
      gap={3}
    >
      <Stack
        gap={1}
        alignItems={mobile ? 'center' : 'flex-start'}
      >
        <Typography
          level="h2"
          sx={{ position: 'relative', textAlign: mobile ? 'center' : 'left' }}
          id="featured"
        >
          <Default>
            <Avatar
              color="info"
              sx={(theme) => ({
                position: 'absolute',
                left: '-50px',
                top: '0',
                transform: 'translateX(-50%)',
                border: 'none',
                outline: `1.5px solid ${theme.palette.info[400]}`,
                boxShadow: `0 0 40px 5px ${theme.palette.info[700]}`,
              })}
            >
              <BsJournalCode />
            </Avatar>
          </Default>
          Featured
          {' '}
          <Typography
            textColor="info.400"
            alignItems="center"
            fontWeight="xl"
            endDecorator={(
              <Default>
                <Chip variant="soft" color="info">
                  {projects.length}
                  {' '}
                  repositories
                </Chip>
              </Default>
          )}
          >
            Projects
          </Typography>
        </Typography>
        <Mobile>
          <Chip variant="soft" color="info">
            {projects.length}
            {' '}
            repositories
          </Chip>
        </Mobile>
      </Stack>
      <Parallax
        translateY={['50px', '0px']}
        scale={[0.9, 1]}
        opacity={[0, 1]}
        easing="easeOutBack"
      >
        <Box
          component={Stack}
          gap={3}
          sx={{
            width: '100%',
            display: 'flex',
            flexDirection: mobile ? 'column' : 'row',
            flexWrap: 'wrap',
            '& > *': {
              flexGrow: 1,
              width: mobile ? 'auto' : 'min(300px, 100%)',
            },
          }}
        >
          {error && (
          <Typography level="body1" color="danger">
            {error.message}
          </Typography>
          )}
          {loading ? (
            <CircularProgress color="info" />
          ) : (
            <>
              {projects.map((project, index) => (
                <React.Fragment
                  key={project.name}
                >
                  <ProjectCard
                    project={project}
                  />
                  {mobile && index < projects.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </>
          )}
        </Box>
      </Parallax>
    </Stack>
  );
}
