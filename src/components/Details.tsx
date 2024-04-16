import {
  Avatar, Chip, Stack, Typography,
} from '@mui/joy';
import moment from 'moment';
import React, { useEffect } from 'react';
import { BsCode } from 'react-icons/bs';
import { FiPackage } from 'react-icons/fi';
import { GoOrganization } from 'react-icons/go';
import { SlWrench } from 'react-icons/sl';
import { TbCircleDashed } from 'react-icons/tb';
import details from 'assets/Details';
import { animated, useSpringRef, useTransition } from '@react-spring/web';
import { IoSchoolOutline } from 'react-icons/io5';
import { Category } from './Terminal';

export const skillIcons: {
  [key: string]: React.ReactNode;
} = {
  languages: <BsCode />,
  frameworks: <FiPackage />,
  tools: <SlWrench />,
  others: <TbCircleDashed />,
};

export function Education({ wrap } : {wrap?: boolean} = { wrap: false }) {
  return (
    <Stack direction={wrap ? 'row' : 'column'} flexWrap="wrap" justifyContent="space-between" gap={2} p={1}>
      {details.education.map((item) => (
        <Stack direction="row" gap={1.5} key={`${item.school}-${item.major}-${item.start}-${item.end}`}>
          <Avatar
            color="neutral"
            variant="soft"
            size="lg"
            src={item.icon}
            sx={(theme) => ({
              borderRadius: theme.getCssVar('radius-md'),
              border: `1px solid ${theme.getCssVar('palette-divider')}`,
            })}
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
              </Typography>
            </Typography>
            <Typography level="body2">
              {item.degree}
              {' - '}
              {item.major}
            </Typography>
          </Stack>
        </Stack>
      ))}
    </Stack>
  );
}

export function Experience() {
  return (
    <Stack gap={2} p={1}>
      {details.experience.reduce((acc, item) => {
        const lastItem = acc[acc.length - 1];
        if (lastItem && lastItem.length && lastItem[0].company === item.company) {
          lastItem.push(item);
          return acc;
        }
        return [...acc, [item]];
      }, [] as typeof details.experience[number][][]).map((items) => (
        <Stack
          direction="row"
          gap={1.5}
          key={`${items[0].company}-${Math.random()}}`}
        >
          <Avatar
            color="neutral"
            variant="soft"
            size="lg"
            src={items[0].icon}
            sx={(theme) => ({
              borderRadius: theme.getCssVar('radius-md'),
              border: `1px solid ${theme.getCssVar('palette-divider')}`,
            })}
          >
            <GoOrganization />
          </Avatar>
          <Stack
            gap={2}
            sx={(theme) => ({
              position: 'relative',
              '&::before': {
                content: '""',
                position: 'absolute',
                width: '1px',
                height: 'calc(100% - 3rem - 12px)',
                backgroundColor: theme.palette.divider,
                left: 'calc(-1.5rem - 12px)',
                top: 'calc(3rem + 12px)',
              },
            })}
          >
            {items.map((item, subIndex) => {
              const startDate = moment(item.start, 'MMM YYYY').toDate();
              const endDate = moment(item.end, 'MMM YYYY').toDate();
              const duration = moment.duration(endDate.getTime() - startDate.getTime()).humanize();
              return (
                <Stack key={`${item.company}-${item.position}-${item.start}-${item.end}`} gap={0.5}>
                  <Typography level="body1" display="flex" alignItems="baseline" flexWrap="wrap" gap={1}>
                    {subIndex === 0 && (item.url ? (
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
                    ) : item.company) }
                    {items.length === 1 && (
                    <>
                      <Typography level="body2" component="span" textColor="text.secondary">
                        {item.start}
                        {' '}
                        -
                        {' '}
                        {item.end}
                      </Typography>
                      <Typography level="body2" textColor="text.tertiary">
                        {` (${duration})`}
                      </Typography>
                    </>
                    )}
                  </Typography>
                  <Typography level="body2" display="flex" alignItems="baseline" flexWrap="wrap" gap={1}>
                    <Typography fontWeight="lg" textColor="text.primary">
                      {item.position}
                    </Typography>
                    {items.length > 1 ? (
                      <Typography level="body2" component="span" textColor="text.secondary">
                        {item.start}
                        {' '}
                        -
                        {' '}
                        {item.end}
                      </Typography>
                    ) : (
                      <Typography level="body2" component="span" textColor="text.secondary">
                        {' '}
                        {item.contract}
                        {' '}
                        -
                        {' '}
                        {item.location}
                      </Typography>
                    )}
                  </Typography>
                  {items.length > 1 && (
                  <Typography level="body2" textColor="text.secondary" fontWeight="md">
                    {item.contract}
                    {' '}
                    -
                    {' '}
                    {item.location}
                  </Typography>
                  )}
                  <Stack direction="row" alignItems="start" flexWrap="wrap" gap={1} paddingY={0.5}>
                    {item.skills.map((skill) => (
                      <Chip
                        variant="outlined"
                        color="neutral"
                        size="sm"
                        key={skill}
                      >
                        {skill}
                      </Chip>
                    ))}
                  </Stack>
                  <Typography level="body3" textColor="text.tertiary" component="div">
                    {typeof item.description === 'string' ? item.description : null}
                    {typeof item.description === 'object' ? (
                      <Stack>
                        {item.description.map((chunk) => (
                          <Typography key={chunk}>
                            -
                            {' '}
                            {chunk}
                          </Typography>
                        ))}
                      </Stack>
                    ) : null}
                  </Typography>

                </Stack>
              );
            })}
          </Stack>
        </Stack>
      ))}
    </Stack>
  );
}

export default function Details({
  category,
}: {
  category: Category
}) {
  const transRef = useSpringRef();

  const transitions = useTransition(category, {
    ref: transRef,
    keys: null,
    from: { opacity: 0 },
    enter: { opacity: 1 },
    leave: { opacity: 0, filter: 'blur(10px)', position: 'absolute' },
  });

  useEffect(() => {
    transRef.start();
  }, [category]);
  return (
    <Stack direction="row">
      {transitions((style, item) => {
        switch (item) {
          case 'education':
            return (
              <animated.div style={style}>
                <Education />
              </animated.div>
            );
          case 'experience':
            return (
              <animated.div style={style}>
                <Experience />
              </animated.div>
            );
          default:
            return (
              <animated.div style={style}>
                <Stack>
                  The currently selected category is
                  {' '}
                  {category}
                  {' '}
                  but there is no content for it yet.
                </Stack>
              </animated.div>
            );
        }
      })}
    </Stack>
  );
}
