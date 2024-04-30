/* eslint-disable react/no-danger */
/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Input, Select, Option, Stack,
  IconButton,
  Button,
  Typography,
  Avatar,
  Box,
  Badge,
} from '@mui/joy';
import React, { useEffect, useMemo, useState } from 'react';
import {
  IoIosClose, IoIosSearch, IoIosShuffle,
} from 'react-icons/io';
import {
  Interaction,
  interactionDetails,
  Platform, platformDetails, Project, rank,
} from 'assets/Projects';
import {
  getDeviations, getFigmaFiles, getRepositories, Repository,
} from 'utils/Api';
import moment from 'moment';

function ProjectCard({ project }: { project: Project }) {
  const [open, setOpen] = useState(false);

  return (
    <Stack
      direction="row"
      padding={2}
      gap={2}
      onClick={() => setOpen(!open)}
      className={open ? 'open' : ''}
      sx={(theme) => ({
        transition: 'all ease .2s',
        position: 'relative',
        cursor: 'pointer',
        borderRadius: '0',
        backgroundColor: theme.palette.background.body,
        border: '1px solid transparent',
        borderBottom: `1px solid ${theme.palette.divider}`,
        overflow: 'hidden',
        '&:hover, &.open': {
          zIndex: 1,
          borderRadius: '1rem',
          border: `1px solid ${theme.palette.text.primary}`,
          filter: `drop-shadow(0 .4rem 0 ${theme.palette.text.primary})`,
          transform: 'translateY(-.4rem)',
          '&:after': {
            content: '""',
            position: 'absolute',
            bottom: '-.4rem',
            left: 0,
            width: '100%',
            height: '.4rem',
            backgroundColor: 'transparent',
          },
          '& .illustration': {
            opacity: 1,
          },

          '& .icon': {
            backgroundColor: theme.palette.text.primary,
            color: theme.palette.background.level1,
          },
        },
      })}
    >
      <Stack direction="column" gap={1}>
        <Avatar component="span" className="icon" variant="plain" size="md" sx={{ borderRadius: '.5rem', transition: 'all ease .2s', zIndex: 1 }}>
          {platformDetails[project.platform].icon({ size: '1.3rem' })}
        </Avatar>
        <Stack
          component="div"
          className={`interactions${open ? ' open' : ''}`}
          direction="column"
          gap={1}
          sx={{
            transition: 'all ease .4s',
            opacity: 0,
            maxHeight: 0,
            transform: 'translateY(-100%) scale(.8)',
            '&.open': {
              opacity: 1,
              maxHeight: '100vmax',
              transform: 'translateY(0) scale(1)',
            },
          }}
        >
          {Object.entries(interactionDetails)
            .map(([key, item]) => (project.interactions !== undefined
                && Object.keys(project.interactions).includes(key) ? (
                  <Stack key={key} alignItems="center">
                    <Stack
                      alignItems="center"
                      gap={0.5}
                      sx={{
                        padding: '.3rem .1rem',
                        lineHeight: 0.9,
                      }}
                    >
                      {item.icon({})}
                      <span style={{ fontSize: '0.9rem' }}>
                        {project.interactions[key as Interaction]}
                      </span>
                    </Stack>
                  </Stack>
              ) : null))}
        </Stack>
      </Stack>

      <Stack zIndex={1} gap={0.25}>
        <Typography
          level="h3"
          alignItems="baseline"
        >
          {project.title}
        </Typography>
        <Typography level="body2">
          <span dangerouslySetInnerHTML={{ __html: project.description || '' }} />
        </Typography>
        <Typography level="body3" marginTop={1}>
          {`${project.pubDate ? moment(project.pubDate).fromNow() : ''} - published on ${platformDetails[project.platform].label}`}
        </Typography>
      </Stack>
      {project.thumbnail && (
        <Box
          component="img"
          src={project.thumbnail}
          alt={project.title}
          className="illustration"
          sx={{
            transition: 'all ease .2s',
            position: 'absolute',
            right: 0,
            width: '60%',
            top: '50%',
            WebkitMaskImage: 'linear-gradient(to left,black 10%,transparent 80%)',
            maskImage: 'linear-gradient(to left,black 10%,transparent 80%)',
            opacity: 0,
            filter: 'blur(5px) brightness(.8)',
            transform: 'translateY(-50%)',
          }}
        />
      )}
    </Stack>
  );
}

export default function Directory() {
  const [search, setSearch] = useState('');
  const [platform, setPlatform] = useState<string | null>(null);

  const [projects, setProjects] = useState([] as Project[]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error>();

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getRepositories('BSoDium'),
      getDeviations(),
      getFigmaFiles(),
    ]).then(([repositories, deviations, figmaFiles]) => {
      setProjects([
        ...repositories.filter((project) => project.topics.includes('featured')).map((repository) => ({
          title: repository.name,
          description: repository.description,
          source: repository.html_url,
          demo: repository.homepage,
          platform: 'github',
          interactions: {
            stars: repository.stargazers_count,
            forks: repository.forks,
          },
        } as Project)),
        ...deviations,
        ...figmaFiles,
      ]);
    }).catch(() => {
      setError(new Error('Failed to load projects, check your internet connection.'));
    }).finally(() => {
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    setProjects((p) => p.filter((project) => (
      (search === ''
      || project.title.toLowerCase().includes(search.toLowerCase())
      || (project.description && project.description.toLowerCase().includes(search.toLowerCase()))
      )
      && (platform === null || project.platform === platform)
    )));
  }, [search, platform]);

  return (
    <Stack
      paddingY={1}
      width="100%"
    >
      <Stack direction="row" flexWrap="wrap" gap={1}>
        <Input
          size="lg"
          placeholder="Search for a project"
          variant="outlined"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          startDecorator={(
            <IoIosSearch />
        )}
          sx={(theme) => ({
            transition: 'all ease .2s',
            width: 'min(100%, 30rem)',
            cursor: 'pointer',
            borderRadius: '0',
            outline: 'none',
            backgroundColor: theme.palette.background.body,
            '--Input-focusedHighlight': theme.palette.text.secondary,
            '&:before': {
              transition: 'all ease .2s',
            },

            '&:has(:focus)': {
              borderRadius: '100vmax 0 0 100vmax',
            },

          })}
        />
        <Select
          placeholder="Filter by platform"
          color="neutral"
          variant="outlined"
          sx={(theme) => ({
            transition: 'all ease .2s',
            borderRadius: '0',
            backgroundColor: theme.palette.background.body,
            width: '12rem',
            '& + ul': {
              borderRadius: '0',
              padding: 0,
            },
          })}
          value={platform}
          onChange={(e, newValue) => setPlatform(newValue)}
          endDecorator={platform !== null && (
            <IconButton
              variant="plain"
              color="neutral"
              sx={{ fontSize: '1.5rem' }}
              onClick={() => setPlatform(null)}
            >
              <IoIosClose />
            </IconButton>
          )}
          indicator={platform !== null ? null : undefined}
          renderValue={(option) => {
            const details = platformDetails[option?.value as Platform];
            return option && details && (
            <Stack direction="row" gap={1} alignItems="center">
              <details.icon />
              {option.label}
            </Stack>
            );
          }}
        >
          {Object.entries(platformDetails).map(([key, item]) => (
            <Option color="neutral" component={Stack} key={key} value={key} direction="row" gap={1}>
              <item.icon />
              {item.label}
            </Option>
          ))}
        </Select>
        <Button
          size="lg"
          variant="outlined"
          color="neutral"
          startDecorator={(
            <IoIosShuffle style={{ fontSize: '1.5rem' }} />
          )}
          sx={(theme) => ({
            transition: 'all ease .2s',
            position: 'relative',
            borderRadius: '0',
            width: 'fit-content',
            flexShrink: 0,
            paddingInline: '1rem',

            borderColor: theme.palette.text.primary,
            background: theme.palette.text.primary,
            color: theme.palette.background.level1,
            '& > span > svg': {
              transition: 'all ease .2s',
            },
            '&:hover': {
              backgroundColor: theme.palette.background.body,
              color: theme.palette.text.primary,
              '& > span > svg': {
                transform: 'rotate3d(1, 0, 0, 540deg) scale(1.2)',
              },
            },
            '&:active': {
              transform: 'scale(.98)',
            },
          })}
        >
          Randomize
        </Button>
      </Stack>
      <Stack paddingBlockStart={4}>
        {projects.sort((a, b) => rank(b, projects) - rank(a, projects)).map((project) => (
          <ProjectCard key={project.title} project={project} />
        ))}
      </Stack>
    </Stack>
  );
}
