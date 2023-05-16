import {
  Box, Card, Stack, Typography,
} from '@mui/joy';
import React, { useEffect, useState } from 'react';
import getPinnedRepos from 'utils/Api';
import { BsJournalBookmark } from 'react-icons/bs';

export default function Featured() {
  const [projects, setProjects] = useState<any[]>([]);

  useEffect(() => {
    getPinnedRepos().then((response) => {
      setProjects(response.data);
    });
  }, []);

  return (
    <Stack
      gap={3}
    >
      <Typography level="h2" sx={{ position: 'relative' }}>
        Featured
        {' '}
        <Typography textColor="success.400" fontWeight="xl">
          Projects
        </Typography>
      </Typography>
      <Box
        component={Stack}
        direction="row"
        gap={3}
        p={2}
        sx={{
          width: '100%',
          height: '250px',
          overflowX: 'auto',
        }}
      >
        {projects.map((project) => (
          <Card variant="outlined" sx={{ width: '500px', height: '100%', flexShrink: 0 }}>
            <Typography
              level="h5"
              sx={{ position: 'relative' }}
              startDecorator={
                <BsJournalBookmark />
            }
            >
              {project.repo}
            </Typography>
          </Card>
        ))}
      </Box>
    </Stack>
  );
}
