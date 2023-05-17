import {
  Avatar,
  Box, Button, Card, Chip, CircularProgress, Stack, Typography,
} from '@mui/joy';
import React, { useEffect, useState } from 'react';
import getPinnedRepos, { PinnedRepo } from 'utils/Api';
import { BsJournalBookmark } from 'react-icons/bs';
import {
  FaCode, FaCodeBranch, FaStar,
} from 'react-icons/fa';

export default function Featured() {
  const [projects, setProjects] = useState<PinnedRepo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPinnedRepos().then((data) => {
      setProjects(data);
      setLoading(false);
    });
  }, []);

  return (
    <Stack
      gap={3}
    >
      <Typography
        level="h2"
        sx={{ position: 'relative' }}
      >
        Featured
        {' '}
        <Typography
          textColor="success.400"
          alignItems="center"
          fontWeight="xl"
          endDecorator={(
            <Chip variant="soft">
              {projects.length}
              {' '}
              repositories
            </Chip>
          )}
        >
          Projects
        </Typography>
      </Typography>
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
        ) : projects.map((project) => (
          <Card
            component={Stack}
            variant="outlined"
            key={project.repo}
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
                    {project.repo}
                  </Typography>
                  <Typography
                    level="body2"
                    startDecorator={(
                      <FaCode style={{
                        color: project.languageColor,
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
                  position: 'relative',
                  overflow: 'hidden',
                  maxWidth: '300px',
                  maxHeight: '80px',
                  textOverflow: 'ellipsis',
                  '-webkit-line-clamp': 3,
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
                  {project.stars}
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
                  href={project.link}
                  target="_blank"
                >
                  Repository
                </Button>
                {project.website && (
                <Button
                  component="a"
                  href={project.website}
                  target="_blank"
                >
                  Demo
                </Button>
                )}
              </Stack>
            </Stack>
          </Card>
        ))}
      </Box>
    </Stack>
  );
}
