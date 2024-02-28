/* eslint-disable react/jsx-props-no-spreading */
import {
  Avatar,
  Card,
  Chip,
  Divider,
  IconButton,
  IconButtonProps,
  Sheet,
  Stack,
  Tab,
  TabList,
  Tabs,
  Tooltip,
  Typography,
} from '@mui/joy';
import React, { useEffect, useState } from 'react';
import {
  VscChromeClose,
  VscChromeMaximize,
  VscChromeMinimize,
  VscTerminalPowershell,
} from 'react-icons/vsc';

import { IoAddOutline } from 'react-icons/io5';
import { HiChevronDown } from 'react-icons/hi';
import { FaPause, FaPlay } from 'react-icons/fa';
import { RiUserLine } from 'react-icons/ri';
import mockMessages from 'utils/Messages';
import { Parallax } from 'react-scroll-parallax';
import { Default, useMobileMode } from './Responsive';
import Details from './Details';
import TypeWriter from './TypeWriter';

export const categories = ['experience', 'education', 'skills'] as const;

export type Category = (typeof categories)[number];

export interface Tab {
  name: string;
  icon: JSX.Element;
}

export function FakeButton({
  children,
  tooltipIndex,
  setTooltipIndex,
  ...props
}: {
  children: React.ReactNode;
  tooltipIndex: number;
  setTooltipIndex: React.Dispatch<React.SetStateAction<number>>;
} & IconButtonProps) {
  return (
    <Tooltip
      title={mockMessages[tooltipIndex]}
      variant="plain"
      onClose={() => {
        if (tooltipIndex < mockMessages.length - 1) {
          setTooltipIndex(tooltipIndex + 1);
        }
      }}
    >
      <IconButton {...props}>{children}</IconButton>
    </Tooltip>
  );
}

export default function Terminal() {
  const [tabs] = useState<Tab[]>([
    {
      name: 'pwsh in bsodium',
      icon: <VscTerminalPowershell />,
    },
  ]);
  const [displayed, setDisplayed] = useState<Category>(categories[0]);
  const [selected, setSelected] = useState<Category>(categories[0]);
  const [loadingTime, setLoadingTime] = useState<number>();
  const [tooltipIndex, setTooltipIndex] = useState(0);
  const [playing, setPlaying] = useState(true);

  const mobile = useMobileMode();

  useEffect(() => {
    setLoadingTime(Math.floor(Math.random() * 300));
  }, []);

  useEffect(() => {
    if (playing) {
      const interval = setInterval(() => {
        setDisplayed((prev) => {
          const nextIndex = (categories.indexOf(prev) + 1) % categories.length;
          return categories[nextIndex];
        });
      }, 4000);
      return () => {
        clearInterval(interval);
      };
    }
    return undefined;
  }, [playing, selected]);

  return (
    <Stack
      gap={3}
      sx={(theme) => ({
        position: 'relative',
        '&::before': mobile ? {} : {
          content: '""',
          position: 'absolute',
          top: '0',
          left: '-50px',
          height: '100%',
          width: '1px',
          background: `linear-gradient(to bottom, ${theme.palette.primary[400]}, ${theme.palette.info[400]})`,
        },
      })}
    >
      <Typography
        level="h2"
        sx={{ position: 'relative', textAlign: mobile ? 'center' : 'left' }}
        id="profile"
      >
        <Default>
          <Avatar
            color="primary"
            sx={(theme) => ({
              position: 'absolute',
              left: '-50px',
              top: '0',
              transform: 'translateX(-50%)',
              border: 'none',
              outline: `1.5px solid ${theme.palette.primary[400]}`,
              boxShadow: `0 0 40px 5px ${theme.palette.primary[700]}`,
            })}
          >
            <RiUserLine />
          </Avatar>
        </Default>
        Profile
        {' '}
        <Typography
          textColor="primary.400"
          alignItems="center"
          fontWeight="xl"
        >
          Overview
        </Typography>
      </Typography>
      <Parallax
        translateY={['100px', '0px']}
        opacity={[0, 1]}
        easing="easeOutBack"
      >
        <Card
          variant="outlined"
          component={Stack}
          sx={{
            ...(mobile ? {
              backgroundColor: 'transparent',
              border: 'none',
            } : {
              backdropFilter: 'blur(40px)',
              backgroundColor: 'rgba(53, 54, 58, 0.4)',
              border: '1px solid rgb(83, 86, 93)',
              height: '550px',
            }),
            padding: 0,
            gap: 0,
            margin: mobile ? '-1rem' : '0',
            overflow: 'hidden',
          }}
        >
          {!mobile && (
          <Stack direction="row" justifyContent="space-between" p={0}>
            <Stack
              direction="row"
              gap={0}
              sx={{
                overflow: 'hidden',
              }}
            >
              <Stack
                direction="row"
                sx={{
                  p: 1,
                  gap: 0.2,
                  paddingBottom: 0,
                  paddingRight: 0,
                }}
              >
                {tabs.map((tab) => (
                  <Card
                    key={tab.name}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexDirection: 'row',
                      width: '250px',
                      backgroundColor: 'rgb(33, 37, 43)',
                      borderBottomRightRadius: 0,
                      borderBottomLeftRadius: 0,
                      boxShadow: 'none',
                      position: 'relative',
                      p: 0,
                      '&:before': {
                        zIndex: 100,
                        content: '""',
                        position: 'absolute',
                        left: '-6px',
                        top: '50%',
                        height: '50%',
                        width: '6px',
                        borderRadius: '0 0 6px 0',
                        backgroundColor: 'transparent',
                        boxShadow: '0 6px 0px 0px rgb(33, 37, 43)',
                      },
                      '&:after': {
                        zIndex: 100,
                        content: '""',
                        position: 'absolute',
                        right: '-6px',
                        top: '50%',
                        height: '50%',
                        width: '6px',
                        borderRadius: '0 0 0 6px',
                        backgroundColor: 'transparent',
                        boxShadow: '0 6px 0px 0px rgb(33, 37, 43)',
                      },
                    }}
                  >
                    <Typography
                      level="body2"
                      textColor="text.primary"
                      fontWeight="lg"
                      startDecorator={tab.icon}
                      sx={{
                        marginLeft: 1,
                        gap: 0.5,
                        wordWrap: 'nowrap',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {tab.name}
                    </Typography>
                    <FakeButton
                      tooltipIndex={tooltipIndex}
                      setTooltipIndex={setTooltipIndex}
                      size="sm"
                      variant="plain"
                      color="neutral"
                      sx={{
                        height: '25px',
                        minHeight: '25px',
                        marginRight: 0.5,
                      }}
                    >
                      <VscChromeClose />
                    </FakeButton>
                  </Card>
                ))}
              </Stack>
              <Stack direction="row" p={0.5} paddingTop={1}>
                <FakeButton
                  tooltipIndex={tooltipIndex}
                  setTooltipIndex={setTooltipIndex}
                  size="sm"
                  variant="soft"
                  color="neutral"
                  sx={{
                    borderRadius: '6px',
                    borderTopRightRadius: 0,
                    borderBottomRightRadius: 0,
                    minHeight: '25px',
                  }}
                >
                  <IoAddOutline />
                </FakeButton>
                <Divider orientation="vertical" />
                <FakeButton
                  tooltipIndex={tooltipIndex}
                  setTooltipIndex={setTooltipIndex}
                  size="sm"
                  variant="soft"
                  color="neutral"
                  sx={{
                    borderRadius: '6px',
                    borderTopLeftRadius: 0,
                    borderBottomLeftRadius: 0,
                    minHeight: '25px',
                  }}
                >
                  <HiChevronDown />
                </FakeButton>
              </Stack>
            </Stack>
            <Default>
              <Stack direction="row">
                <FakeButton
                  tooltipIndex={tooltipIndex}
                  setTooltipIndex={setTooltipIndex}
                  variant="plain"
                  color="neutral"
                  sx={{
                    borderRadius: 0,
                    paddingX: 2,
                  }}
                >
                  <VscChromeMinimize />
                </FakeButton>
                <FakeButton
                  tooltipIndex={tooltipIndex}
                  setTooltipIndex={setTooltipIndex}
                  variant="plain"
                  color="neutral"
                  sx={{
                    borderRadius: 0,
                    paddingX: 2,
                  }}
                >
                  <VscChromeMaximize />
                </FakeButton>
                <FakeButton
                  tooltipIndex={tooltipIndex}
                  setTooltipIndex={setTooltipIndex}
                  variant="plain"
                  color="neutral"
                  sx={{
                    borderRadius: 0,
                    paddingX: 2,
                    '&:hover': {
                      backgroundColor: 'rgb(255, 0, 0, 0.7)',
                    },
                  }}
                >
                  <VscChromeClose />
                </FakeButton>
              </Stack>
            </Default>
          </Stack>
          )}
          <Tooltip
            variant="outlined"
            title={`${playing ? 'Pause' : 'Resume'} auto-play`}
          >
            <IconButton
              size="sm"
              variant="plain"
              color="neutral"
              sx={{
                position: 'absolute',
                bottom: '10px',
                right: '15px',
                zIndex: 1,
              }}
              onClick={() => {
                setPlaying(!playing);
              }}
            >
              {playing ? <FaPause /> : <FaPlay />}
            </IconButton>
          </Tooltip>
          <Sheet
            component={Stack}
            direction="column"
            sx={{
              ...(mobile ? {
                backgroundColor: 'transparent',
              } : {
                backgroundColor: 'rgba(33, 37, 43, 0.8)',
              }),
              position: 'relative',
              p: 2,
              gap: 1,
              flexGrow: 1,
              overflowY: 'auto',
              overflowX: 'hidden',
            }}
          >
            <Typography
              fontFamily="'Fira Code', monospace"
              fontSize="0.875rem"
              component="span"
            >
              <Typography textColor="text.secondary">
                Powershell 7.3.4
                <br />
                Loading personal and system profiles took&nbsp;
                {loadingTime}
                ms.
              </Typography>
              <br />
              <Stack
                direction="row"
                flexWrap="nowrap"
              >
                <Typography textColor="primary.300">
                  root@bsodium:~$&nbsp;
                </Typography>
                <TypeWriter
                  onTransitionEnd={() => {
                    setSelected(displayed);
                  }}
                  typeInterval={20}
                  sx={{ whiteSpace: 'nowrap' }}
                >
                  {`bsodium.exe --${displayed}`}
                </TypeWriter>
              </Stack>
            </Typography>
            <Tabs
              aria-label="terminal options"
              value={selected}
              onChange={
            (_, newValue) => {
              setSelected(newValue as Category);
              setDisplayed(newValue as Category);
              setPlaying(false);
            }
            }
              sx={{
                width: 'fit-content',
                backgroundColor: 'transparent',
              }}
            >
              <TabList sx={{
                backgroundColor: 'transparent',
                gap: 0,
              }}
              >
                {categories.map((name) => {
                  const checked = selected === name;
                  return (
                    <Chip
                      component={Tab}
                      key={name}
                      value={name}
                      variant={checked ? 'solid' : 'plain'}
                      color="neutral"
                      sx={(theme) => ({
                        fontFamily: "'Fira Code', monospace",
                        borderRadius: '6px',
                        ...(checked ? {
                          backgroundColor: theme.palette.neutral[300],
                          color: theme.palette.neutral[900],
                        } : {
                        }),
                      })}
                    >
                      {name}
                    </Chip>
                  );
                })}
              </TabList>
            </Tabs>
            <Details category={selected} />
          </Sheet>
        </Card>
      </Parallax>
    </Stack>
  );
}
