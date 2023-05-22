/* eslint-disable react/jsx-props-no-spreading */
import {
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
import { SiPowershell } from 'react-icons/si';
import {
  VscChromeClose,
  VscChromeMaximize,
  VscChromeMinimize,
} from 'react-icons/vsc';
import { IoAddOutline } from 'react-icons/io5';
import { HiChevronDown } from 'react-icons/hi';
import mockMessages from 'utils/Messages';
import { FaPause, FaPlay } from 'react-icons/fa';
import { Default } from './Responsive';
import Details from './Details';
import TypeWriter from './TypeWriter';

export const categories = ['education', 'skills', 'experience'] as const;

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
      variant="outlined"
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
      icon: <SiPowershell />,
    },
  ]);
  const [displayed, setDisplayed] = useState<Category>('education');
  const [selected, setSelected] = useState<Category>('education');
  const [loadingTime, setLoadingTime] = useState<number>();
  const [tooltipIndex, setTooltipIndex] = useState(0);
  const [playing, setPlaying] = useState(true);

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
    <Stack gap={3}>
      <Card
        variant="outlined"
        component={Stack}
        sx={{
          backdropFilter: 'blur(20px)',
          backgroundColor: 'rgba(53, 54, 58, 0.499)',
          border: '1px solid rgb(83, 86, 93)',
          padding: 0,
          overflow: 'hidden',
          height: '500px',
        }}
      >
        <Stack direction="row" justifyContent="space-between" p={0}>
          <Stack direction="row" gap={0.5}>
            <Stack
              direction="row"
              sx={{
                p: 1,
                paddingBottom: 0,
                paddingRight: 0,
              }}
              gap={0.2}
            >
              {tabs.map((tab) => (
                <Card
                  variant="outlined"
                  key={tab.name}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexDirection: 'row',
                    width: '250px',
                    backgroundColor: '#282C34',
                    borderBottomRightRadius: 0,
                    borderBottomLeftRadius: 0,
                    overflow: 'hidden',
                    boxShadow: 'none',
                    p: 0,
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
        <Tooltip
          variant="outlined"
          title={`${playing ? 'Pause' : 'Resume'} auto-play`}
        >
          <IconButton
            size="sm"
            variant="soft"
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
            position: 'relative',
            backgroundColor: 'rgba(47, 51, 54, 0.3)',
            p: 2,
            gap: 1,
            flexGrow: 1,
            overflowY: 'auto',
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
              flexWrap="wrap"
            >
              <Typography textColor="primary.300">
                root@bsodium:~$&nbsp;
              </Typography>
              <TypeWriter
                onTransitionEnd={() => {
                  setSelected(displayed);
                }}
                typeInterval={20}
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
              gap: 1,
            }}
            >
              {categories.map((name) => {
                const checked = selected === name;
                return (
                  <Chip
                    component={Tab}
                    key={name}
                    value={name}
                    variant={checked ? 'solid' : 'outlined'}
                    color="primary"
                    sx={{
                      borderRadius: '6px',
                      ...(checked && {
                        backgroundColor: 'var(--joy-palette-primary-300)',
                        color: 'var(--joy-palette-primary-900)',
                      }),
                    }}
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
    </Stack>
  );
}
