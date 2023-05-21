/* eslint-disable react/no-array-index-key */
import React from 'react';
import {
  Avatar, Chip, Stack, Typography,
} from '@mui/joy';
import details from 'assets/Details';
import { IoSchoolOutline } from 'react-icons/io5';
import moment from 'moment';
import { HiOutlineOfficeBuilding } from 'react-icons/hi';
import { FiPackage } from 'react-icons/fi';
import { BsCode } from 'react-icons/bs';
import { SlWrench } from 'react-icons/sl';
import { TbCircleDashed } from 'react-icons/tb';
import { Category } from './Terminal';

const skillIcons: {
  [key: string]: React.ReactNode;
} = {
  languages: <BsCode />,
  frameworks: <FiPackage />,
  tools: <SlWrench />,
  others: <TbCircleDashed />,
};

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
                <Avatar
                  color="neutral"
                  variant="solid"
                  size="lg"
                  src={item.icon}
                  sx={{
                    borderRadius: 'var(--Card-radius)',
                  }}
                >
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
                          textDecoration: 'dotted underline',
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
                      <Typography textColor="text.tertiary">
                        {` (${duration})`}
                      </Typography>
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
        <Stack alignItems="start" gap={2} paddingTop={1}>
          <Stack direction="row" flexWrap="wrap" gap={1}>
            {Object.entries(skillIcons).map(([skillsetName, skillsetIcon]) => (
              <Chip
                variant="outlined"
                color="neutral"
                size="sm"
                key={skillsetName}
                startDecorator={skillsetIcon}
              >
                {skillsetName}
              </Chip>
            ))}
          </Stack>
          <Stack direction="row" alignItems="start" flexWrap="wrap" gap={1}>
            {Object.entries(details.skills).map(([skillsetName, skillset]) => (
              skillset.map((skill) => (
                <Chip
                  variant="soft"
                  color="primary"
                  size="md"
                  key={skill}
                  startDecorator={skillIcons[skillsetName as keyof (typeof details)['skills']]}
                >
                  {skill}
                </Chip>
              ))
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
        <Stack gap={2} p={1}>
          {details.experience.reduce((acc, item) => {
            const lastItem = acc[acc.length - 1];
            if (lastItem && lastItem.length && lastItem[0].company === item.company) {
              lastItem.push(item);
              return acc;
            }
            return [...acc, [item]];
          }, [] as typeof details.experience[number][][]).map((items, index) => (
            <Stack direction="row" gap={1.5} key={`${items[0].company}-${index}}`}>
              <Avatar
                color="neutral"
                variant="solid"
                size="lg"
                src={items[0].icon}
                sx={{
                  borderRadius: 'var(--Card-radius)',
                }}
              >
                <HiOutlineOfficeBuilding />
              </Avatar>
              <Stack gap={2}>
                {items.map((item, subIndex) => (
                  <Stack>
                    <Typography level="body1" display="flex" alignItems="baseline" flexWrap="wrap" gap={1}>
                      {subIndex === 0 && (item.url ? (
                        <Typography
                          component="a"
                          href={item.url}
                          textColor="inherit"
                          target="_blank"
                          sx={{
                            textDecoration: 'dotted underline',
                            '&:hover': {
                              textDecoration: 'underline',
                            },
                          }}
                        >
                          {item.company}
                        </Typography>
                      ) : item.company) }
                      {items.length === 1 && (
                      <Typography level="body2" component="span" textColor="text.secondary">
                        {item.start}
                        {' '}
                        -
                        {' '}
                        {item.end}
                      </Typography>
                      )}
                    </Typography>
                    <Typography level="body2" display="flex" gap={1}>
                      <Typography fontWeight="lg">
                        {item.position}
                      </Typography>
                      {items.length > 1 && (
                      <Typography level="body2" component="span" textColor="text.secondary">
                        {item.start}
                        {' '}
                        -
                        {' '}
                        {item.end}
                      </Typography>
                      )}
                    </Typography>
                    <Typography level="body2" textColor="text.tertiary">
                      {item.description}
                    </Typography>
                  </Stack>
                ))}
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
