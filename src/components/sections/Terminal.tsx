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
  useColorScheme,
} from "@mui/joy";
import React, { useEffect, useState } from "react";
import {
  VscChromeClose,
  VscChromeMaximize,
  VscChromeMinimize,
  VscTerminalPowershell,
} from "react-icons/vsc";

import { IoAddOutline } from "react-icons/io5";
import { HiChevronDown } from "react-icons/hi";
import { FaPause, FaPlay } from "react-icons/fa";
import { RiUserLine } from "react-icons/ri";
import mockMessages from "@/utils/Messages";
import { Parallax } from "react-scroll-parallax";
import details from "@/assets/Details";
import { Default, Mobile, useMobileMode } from "@/components/Responsive";
import Details from "@/components/Details";
import TypeWriter from "@/components/TypeWriter";

export const categories = ["experience", "education"] as const;

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
  const { sx, ...rest } = props;

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
      <IconButton
        {...rest}
        sx={(theme) => ({
          ...((typeof sx === "function" ? sx(theme) : sx) as object),
          transition: "all ease .2s",
        })}
      >
        {children}
      </IconButton>
    </Tooltip>
  );
}

export default function Terminal() {
  const [tabs] = useState<Tab[]>([
    {
      name: `pwsh in ${details.name.nickname.toLowerCase()}`,
      icon: <VscTerminalPowershell />,
    },
  ]);
  const [displayed, setDisplayed] = useState<Category>(categories[0]);
  const [selected, setSelected] = useState<Category>(categories[0]);
  const [loadingTime, setLoadingTime] = useState<number>();
  const [tooltipIndex, setTooltipIndex] = useState(0);
  const [playing, setPlaying] = useState(true);

  const mobile = useMobileMode();
  const { colorScheme } = useColorScheme();
   
  const dark = colorScheme === "dark";

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

  useEffect(() => {
    if (mobile) {
      setPlaying(false);
    }
  }, [mobile]);

  return (
    <Stack
      gap={3}
      alignItems={mobile ? "center" : "flex-start"}
      sx={(theme) => ({
        position: "relative",
        "&::before": mobile
          ? {}
          : {
              content: '""',
              position: "absolute",
              top: "0",
              left: "-50px",
              height: "100%",
              width: "2px",
              background: `linear-gradient(to bottom, ${theme.palette.primary[500]}, ${theme.palette.info[500]})`,
            },
      })}
    >
      <Mobile>
        <Avatar
          color="primary"
          sx={(theme) => ({
            position: "relative",
            border: "none",
            outline: `2px solid ${theme.palette.primary[500]}`,
            boxShadow: `0 0 40px 5px rgba(${theme.palette.primary.mainChannel} / 0.4)`,
            overflow: "visible",
            marginTop: "3rem",
            "&::before": {
              content: '""',
              position: "absolute",
              top: "-5rem",
              height: "5rem",
              width: "2px",
              background: `linear-gradient(to bottom, transparent, ${theme.palette.primary[500]})`,
            },
          })}
        >
          <RiUserLine />
        </Avatar>
      </Mobile>
      <Typography
        level="h2"
        sx={{ position: "relative", textAlign: mobile ? "center" : "left" }}
        id="profile"
      >
        <Default>
          <Avatar
            color="primary"
            sx={(theme) => ({
              position: "absolute",
              left: "-49px",
              top: "0",
              transform: "translateX(-50%)",
              border: "none",
              outline: `2px solid ${theme.palette.primary[500]}`,
              boxShadow: `0 0 40px 5px rgba(${theme.palette.primary.mainChannel} / 0.4)`,
            })}
          >
            <RiUserLine />
          </Avatar>
        </Default>
        Profile{" "}
        <Typography color="primary" alignItems="center" fontWeight="xl">
          Overview
        </Typography>
      </Typography>
      <Parallax
        opacity={[0, 1]}
        disabled={mobile}
        easing="easeOutBack"
        style={{ width: "100%" }}
      >
        <Card
          variant="outlined"
          component={Stack}
          sx={(theme) => ({
            ...(mobile
              ? {
                  backgroundColor: "transparent",
                  border: "none",
                  boxShadow: "none",
                  margin: "-1rem",
                  marginTop: "1rem",
                }
              : {
                  backgroundColor: dark
                    ? `color-mix(in srgb, ${theme.palette.background.body}, ${theme.palette.neutral.softBg} 40%)`
                    : `color-mix(in srgb, ${theme.palette.background.level1}, transparent 70%)`,
                  border: `1px solid ${theme.palette.neutral.outlinedBorder}`,
                  height: "550px",
                  boxShadow: "lg",
                  margin: 0,
                }),
            padding: 0,
            gap: 0,
            marginBottom: "3rem",
            overflow: "hidden",
          })}
        >
          {!mobile && (
            <Stack direction="row" justifyContent="space-between" p={0}>
              <Stack
                direction="row"
                gap={0}
                sx={{
                  overflow: "hidden",
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
                      sx={(theme) => ({
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexDirection: "row",
                        width: "250px",
                        backgroundColor: dark
                          ? theme.palette.background.level1
                          : theme.palette.background.level2,
                        borderBottomRightRadius: 0,
                        borderBottomLeftRadius: 0,
                        boxShadow: "none",
                        position: "relative",
                        p: 0,
                        "&:before": {
                          zIndex: 100,
                          content: '""',
                          position: "absolute",
                          left: "-6px",
                          top: "50%",
                          height: "50%",
                          width: "6px",
                          borderRadius: "0 0 6px 0",
                          backgroundColor: "transparent",
                          boxShadow: `0 6px 0px 0px ${
                            dark
                              ? theme.palette.background.level1
                              : theme.palette.background.level2
                          }`,
                        },
                        "&:after": {
                          zIndex: 100,
                          content: '""',
                          position: "absolute",
                          right: "-6px",
                          top: "50%",
                          height: "50%",
                          width: "6px",
                          borderRadius: "0 0 0 6px",
                          backgroundColor: "transparent",
                          boxShadow: `0 6px 0px 0px ${
                            dark
                              ? theme.palette.background.level1
                              : theme.palette.background.level2
                          }`,
                        },
                      })}
                    >
                      <Typography
                        level="body2"
                        textColor="text.primary"
                        fontWeight="lg"
                        startDecorator={tab.icon}
                        sx={{
                          marginLeft: 1,
                          gap: 0.5,
                          wordWrap: "nowrap",
                          textOverflow: "ellipsis",
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
                          height: "25px",
                          minHeight: "25px",
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
                      borderRadius: "6px",
                      borderTopRightRadius: 0,
                      borderBottomRightRadius: 0,
                      minHeight: "25px",
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
                      borderRadius: "6px",
                      borderTopLeftRadius: 0,
                      borderBottomLeftRadius: 0,
                      minHeight: "25px",
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
                    sx={(theme) => ({
                      borderRadius: 0,
                      paddingX: 2,
                      "&:hover": {
                        backgroundColor: theme.palette.danger.solidBg,
                        color: theme.palette.danger.solidColor,
                      },
                    })}
                  >
                    <VscChromeClose />
                  </FakeButton>
                </Stack>
              </Default>
            </Stack>
          )}
          <Default>
            <Tooltip
              variant="outlined"
              title={`${playing ? "Pause" : "Resume"} auto-play`}
            >
              <IconButton
                size="sm"
                variant="plain"
                color="neutral"
                sx={{
                  position: "absolute",
                  bottom: "10px",
                  right: "15px",
                  zIndex: 1,
                }}
                onClick={() => {
                  setPlaying(!playing);
                }}
              >
                {playing ? <FaPause /> : <FaPlay />}
              </IconButton>
            </Tooltip>
          </Default>
          <Sheet
            component={Stack}
            direction="column"
            sx={(theme) => ({
              ...(mobile
                ? {
                    backgroundColor: "transparent",
                  }
                : {
                    backgroundColor: `color-mix(in srgb, transparent, ${
                      dark
                        ? theme.palette.background.level1
                        : theme.palette.background.level2
                    } 70%)`,
                  }),
              position: "relative",
              p: 2,
              gap: 1,
              flexGrow: 1,
              overflowY: "auto",
              overflowX: "hidden",
            })}
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
              <Typography color="primary">
                root@
                {details.name.nickname.toLowerCase()}
                :~$&nbsp;
              </Typography>
              <TypeWriter
                onTransitionEnd={() => {
                  setSelected(displayed);
                }}
                typeInterval={20}
                sx={{}}
              >
                {`${details.name.nickname.toLowerCase()}.exe ‑‑${displayed}`}
              </TypeWriter>
            </Typography>
            <Tabs
              aria-label="terminal options"
              value={selected}
              onChange={(_, newValue) => {
                setSelected(newValue as Category);
                setDisplayed(newValue as Category);
                setPlaying(false);
              }}
              sx={{
                width: "fit-content",
                backgroundColor: "transparent",
              }}
            >
              <TabList
                sx={{
                  backgroundColor: "transparent",
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
                      variant={checked ? "solid" : "plain"}
                      color="neutral"
                      sx={(theme) => ({
                        fontFamily: "'Fira Code', monospace",
                        borderRadius: "6px",
                        ...(checked
                          ? {
                              backgroundColor: dark
                                ? theme.palette.neutral.solidColor
                                : theme.palette.neutral.solidBg,
                              color: dark
                                ? theme.palette.neutral.solidBg
                                : theme.palette.neutral.solidColor,
                            }
                          : {}),
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
