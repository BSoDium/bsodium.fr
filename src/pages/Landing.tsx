import React from "react";
import { Stack, Typography, TypographyProps } from "@mui/joy";
import { SxProps, TextColor } from "@mui/joy/styles/types";
import Featured from "@/components/sections/Featured";
import Contact from "@/components/sections/contact/Contact";
import Terminal from "@/components/sections/Terminal";
import Meta from "@/components/Meta";
import Header from "@/components/sections/Header";
import { useMobileMode, Default } from "@/components/Responsive";
import OpenSource from "@/components/sections/OpenSource";
import Divider from "@/components/sections/Divider";
import Goals from "@/components/sections/goals/Goals";
import { ParallaxProvider } from "react-scroll-parallax";
import Illustrations from "@/components/sections/Illustrations";
import Credits from "@/components/sections/Credits";
import details from "@/assets/Details";

export function ATypography({
  children,
  href = "#",
  target = "_blank",
  textColor = "inherit",
  sx = {},
  ...props
}: {
  children: React.ReactNode;
  href?: string;
  target?: string;
  textColor?: TextColor;
  sx?: SxProps;
} & TypographyProps) {
  return (
    <Typography
      component="a"
      href={href}
      target={target}
      textColor={textColor}
      sx={{
        textDecoration: "dotted underline",
        "&:hover": {
          textDecoration: "underline",
        },
        ...sx,
      }}
      {...props}
    >
      {children}
    </Typography>
  );
}

export default function Landing() {
  const mobile = useMobileMode();
  return (
    <ParallaxProvider>
      <Meta title={`${details.name.first} ${details.name.last}`} />
      <Stack overflow="hidden">
        <Illustrations />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            position: "relative",
            marginTop: `calc(-100vh + ${mobile ? "350px" : "420px"})`,
            width: "100vw",
            paddingTop: "var(--nav-safe-area-inset-top)",
            paddingBottom: "var(--nav-safe-area-inset-bottom)",
            paddingLeft: "var(--nav-safe-area-inset-left)",
          }}
        >
          <Stack
            sx={{
              width: "min(100%, 1200px)",
              height: "fit-content",
            }}
          >
            <Stack
              gap={mobile ? 3 : 0}
              sx={{
                paddingLeft: mobile ? 0 : "70px",
              }}
            >
              <Stack p="20px" gap="80px">
                <Header />
                <Terminal />
              </Stack>
              <Stack
                p="20px"
                gap="80px"
                sx={(theme) => ({
                  position: "relative",
                  "&::before": mobile
                    ? {}
                    : {
                        content: '""',
                        position: "absolute",
                        top: "-20px",
                        left: "-30px",
                        height: "calc(100% + 20px)",
                        width: "2px",
                        background: `linear-gradient(to bottom, ${theme.palette.info[500]} 10%, ${theme.palette.warning[500]} 70%)`,
                      },
                })}
              >
                <Featured />
                <Contact />
              </Stack>
            </Stack>
            <Default>
              <Stack
                sx={{
                  paddingX: mobile ? 0 : "70px",
                }}
              >
                <Divider />
              </Stack>
            </Default>
            <Stack
              sx={{
                paddingRight: mobile ? 0 : "70px",
              }}
            >
              <Stack
                p="20px"
                gap="80px"
                sx={(theme) => ({
                  position: "relative",
                  "&::before": mobile
                    ? {}
                    : {
                        content: '""',
                        position: "absolute",
                        top: "0",
                        right: "-30px",
                        height: "100%",
                        width: "2px",
                        background: `linear-gradient(to bottom, ${theme.palette.success[500]} 30%, ${theme.palette.danger[500]})`,
                      },
                })}
              >
                <OpenSource />
              </Stack>
              <Stack
                p="20px"
                gap="80px"
                sx={(theme) => ({
                  position: "relative",
                  "&::before": mobile
                    ? {}
                    : {
                        content: '""',
                        position: "absolute",
                        top: "0",
                        right: "-30px",
                        height: "100%",
                        width: "2px",
                        background: `linear-gradient(to bottom, ${theme.palette.danger[500]}, transparent 60%)`,
                      },
                })}
              >
                <Goals />
                <Credits />
              </Stack>
            </Stack>
          </Stack>
        </div>
      </Stack>
    </ParallaxProvider>
  );
}
