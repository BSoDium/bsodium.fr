/* eslint-disable no-bitwise */
import {
  Avatar,
  Box, Button, Card, Chip, CircularProgress, Stack, Typography,
} from '@mui/joy';
import React, { useEffect, useState } from 'react';
import { BsJournalBookmark, BsJournalCode } from 'react-icons/bs';
import {
  FaCode, FaCodeBranch, FaStar,
} from 'react-icons/fa';
import { Repository, getRepositories } from 'utils/Api';
import colors from 'assets/colors.json';
import { Default, Mobile } from './Responsive';

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
  return (
    <Card
      component={Stack}
      variant="outlined"
      gap={2}
      p={3}
      justifyContent="space-between"
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
          sx={{
            maxWidth: '300px',
          }}
          level="body2"
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
            variant="outlined"
            component="a"
            color="info"
            href={project.html_url}
            target="_blank"
          >
            Repository
          </Button>
          {project.homepage && (
          <Button
            component="a"
            color="info"
            href={project.homepage}
            target="_blank"
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
  const [projects, setProjects] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    getRepositories('BSoDium').then((data) => {
      setProjects(data.filter((project) => project.topics.includes('featured')));
      setLoading(false);
    });
  }, []);

  return (
    <Stack
      gap={3}
    >
      <Stack
        gap={1}
      >
        <Typography
          level="h2"
          sx={{ position: 'relative' }}
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
          <Chip variant="soft">
            {projects.length}
            {' '}
            repositories
          </Chip>
        </Mobile>
      </Stack>
      <Box
        component={Stack}
        direction="row"
        gap={3}
        sx={{
          width: '100%',
          display: 'flex',
          flexWrap: 'wrap',
          '& > *': {
            flexGrow: 1,
            height: '250px',
            minWidth: '300px',
          },
        }}
      >
        {loading ? (
          <CircularProgress />
        ) : (
          <>
            {projects.map((project) => (
              <ProjectCard
                project={project}
                key={project.name}

              />
            ))}
          </>
        )}
      </Box>
    </Stack>
  );
}
