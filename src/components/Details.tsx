import React from 'react';
import {
  Avatar, Chip, Stack, Typography,
} from '@mui/joy';
import details from 'assets/details.json';
import { IoSchoolOutline } from 'react-icons/io5';
import moment from 'moment';
import { HiOutlineOfficeBuilding } from 'react-icons/hi';
import { Category } from './Terminal';

export default function Details({
  category,
}: {
  category: Category
}) {
  switch (category) {
    case 'education':
      return (
        <Stack gap={2} p={1}>
          {details.education.map((item) => {
            const startDate = moment(item.start, 'MMM YYYY').toDate();
            const endDate = moment(item.end, 'MMM YYYY').toDate();
            const duration = moment.duration(endDate.getTime() - startDate.getTime()).humanize();
            return (
              <Stack direction="row" gap={1.5} key={`${item.school}-${item.major}-${item.start}-${item.end}`}>
                <Avatar color="neutral" variant="solid" size="lg">
                  <IoSchoolOutline />
                </Avatar>
                <Stack>
                  <Typography level="body1" display="flex" alignItems="baseline" flexWrap="wrap" gap={1}>
                    {item.url ? (
                      <Typography
                        component="a"
                        href={item.url}
                        textColor="inherit"
                        target="_blank"
                        sx={{
                          textDecoration: 'none',
                          '&:hover': {
                            textDecoration: 'underline',
                          },
                        }}
                      >
                        {item.school}
                      </Typography>
                    ) : item.school }
                    <Typography level="body2" component="span" textColor="text.secondary">
                      {item.start}
                      {' '}
                      -
                      {' '}
                      {item.end}
                      {` (${duration})`}
                    </Typography>
                  </Typography>
                  <Typography level="body2">
                    {item.degree}
                    {' - '}
                    {item.major}
                  </Typography>
                </Stack>
              </Stack>
            );
          })}
        </Stack>
      );
    case 'skills':
      return (
        <Stack alignItems="start" p={1} gap={2}>
          <Stack direction="row" flexWrap="wrap" gap={1}>
            {details.skills.map((skill) => (
              <Chip variant="solid" color="neutral" size="sm" key={skill}>
                {skill}
              </Chip>
            ))}
          </Stack>
          <Typography level="body2">
            For more details, check out my
            {' '}
            <Typography component="a" href="https://www.linkedin.com/in/bsodium/#skills" target="_blank" rel="noreferrer" textColor="inherit">
              LinkedIn
            </Typography>
          </Typography>
        </Stack>
      );
    case 'experience':
      return (
        <Stack gap={1} p={1}>
          {details.experience.map((item) => (
            <Stack direction="row" gap={1.5} key={`${item.company}-${item.position}-${item.start}-${item.end}`}>
              <Avatar color="neutral" variant="solid" size="lg">
                <HiOutlineOfficeBuilding />
              </Avatar>
              <Stack>
                <Typography level="body1" display="flex" alignItems="baseline" flexWrap="wrap" gap={1}>
                  {item.url ? (
                    <Typography
                      component="a"
                      href={item.url}
                      textColor="inherit"
                      target="_blank"
                      sx={{
                        textDecoration: 'none',
                        '&:hover': {
                          textDecoration: 'underline',
                        },
                      }}
                    >
                      {item.company}
                    </Typography>
                  ) : item.company }
                  <Typography level="body2" component="span" textColor="text.secondary">
                    {item.start}
                    {' '}
                    -
                    {' '}
                    {item.end}
                  </Typography>
                </Typography>
                <Typography level="body2">
                  {item.position}
                </Typography>
                <Typography level="body2">
                  {item.description}
                </Typography>
              </Stack>
            </Stack>
          ))}
        </Stack>
      );
    default:
      return (
        <Stack>
          The currently selected category is
          {' '}
          {category}
          {' '}
          but there is no content for it yet.
        </Stack>
      );
  }
}
