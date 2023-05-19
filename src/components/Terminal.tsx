import {
  Card, Chip, Divider, IconButton, Radio, RadioGroup, Sheet, Stack, Typography,
} from '@mui/joy';
import React, { useEffect, useState } from 'react';
import { SiPowershell } from 'react-icons/si';
import { VscChromeClose, VscChromeMaximize, VscChromeMinimize } from 'react-icons/vsc';
import { IoAddOutline } from 'react-icons/io5';
import { HiChevronDown } from 'react-icons/hi';
import { TypeAnimation } from 'react-type-animation';
import { FaCheck } from 'react-icons/fa';
import { Default } from './Responsive';
import Details from './Details';

export const categories = [
  'education',
  'skills',
  'experience',
  'projects',
  'interests',
] as const;

export type Category = typeof categories[number];

export interface Tab {
  name: string;
  icon: JSX.Element;
  content: string;
}

export default function Terminal() {
  const [tabs] = useState<Tab[]>([
    {
      name: 'pwsh in bsodium',
      icon: <SiPowershell />,
      content: 'Welcome to my website!',
    },
  ]);
  const [selected, setSelected] = useState<Category>();
  const [loadingTime, setLoadingTime] = useState<number>();

  useEffect(() => {
    setLoadingTime(Math.floor(Math.random() * 2000 + 300));
  }, []);

  return (
    <Stack
      gap={3}
    >
      <Card
        variant="outlined"
        component={Stack}
        sx={{
          backdropFilter: 'blur(20px)',
          backgroundColor: 'rgba(53, 54, 58, 0.499)',
          border: '1px solid rgb(83, 86, 93)',
          padding: 0,
          overflow: 'hidden',
          minHeight: '400px',
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
                  <IconButton
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
                  </IconButton>
                </Card>
              ))}
            </Stack>
            <Stack
              direction="row"
              p={0.5}
              paddingTop={1}
            >
              <IconButton
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
              </IconButton>
              <Divider orientation="vertical" />
              <IconButton
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
              </IconButton>
            </Stack>
          </Stack>
          <Default>
            <Stack direction="row">
              <IconButton
                variant="plain"
                color="neutral"
                sx={{
                  borderRadius: 0,
                  paddingX: 2,
                }}
              >
                <VscChromeMinimize />
              </IconButton>
              <IconButton
                variant="plain"
                color="neutral"
                sx={{
                  borderRadius: 0,
                  paddingX: 2,
                }}
              >
                <VscChromeMaximize />
              </IconButton>
              <IconButton
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
              </IconButton>
            </Stack>
          </Default>
        </Stack>
        <Sheet
          component={Stack}
          direction="column"
          sx={{
            backgroundColor: 'rgba(47, 51, 54, 0.181)',
            p: 2,
            gap: 1,
            flexGrow: 1,
          }}
        >
          <Typography
            fontFamily="'Fira Code', monospace"
            fontSize="0.875rem"
          >
            <Typography textColor="text.secondary">
              Powershell 7.3.4
              <br />
              Loading personal and system profiles took&nbsp;
              {loadingTime}
              ms.
            </Typography>
            <br />
            <Typography textColor="primary.300">
              root@bsodium:~$&nbsp;
            </Typography>
            {selected
              ? `bsodium.exe --${selected}`
              : (
                <TypeAnimation
                  sequence={categories.map((name) => [`bsodium.exe --${name}`, 1000]).flat()}
                  speed={50}
                  repeat={Infinity}
                />
              )}
          </Typography>
          <RadioGroup
            name="category"
            orientation="horizontal"
            sx={{
              flexWrap: 'wrap',
              gap: 1,
            }}
          >
            {categories.map((name) => {
              const checked = selected === name;
              return (
                <Chip
                  key={name}
                  variant="soft"
                  color={checked ? 'primary' : 'neutral'}
                  sx={{
                    fontSize: '0.85rem',
                  }}
                >
                  <Radio
                    variant="outlined"
                    color={checked ? 'primary' : 'neutral'}
                    disableIcon
                    overlay
                    label={name}
                    value={name}
                    checked={checked}
                    onChange={(event) => {
                      if (event.target.checked) {
                        setSelected(name);
                      }
                    }}
                    sx={{
                      fontSize: 'inherit',
                      '&  span': {
                        border: 'none',
                      },
                    }}
                  />
                </Chip>
              );
            })}
          </RadioGroup>
          {selected && <Details category={selected} />}
        </Sheet>
      </Card>
    </Stack>
  );
}
