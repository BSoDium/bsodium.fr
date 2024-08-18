import { Button, Stack, Typography } from "@mui/joy";

import { useMobileMode } from "@/components/Responsive";
import Meta from "@/components/Meta";
import { IoIosReturnLeft } from "react-icons/io";
import { Link } from "react-router-dom";
import details from "@/assets/Details";
import Directory from "@/components/projects/Directory";
import { ThemeAwareIllustration } from "./ThemeAwareIllustration";
import { ThemeSwitcherButton } from "./ThemeSwitcherButton";

export default function Projects() {
  const mobile = useMobileMode();
  return (
    <Stack
      width="100vw"
      position="relative"
      overflow="hidden"
      sx={{
        paddingLeft: "var(--nav-safe-area-inset-left)",
        paddingBottom: "var(--nav-safe-area-inset-bottom)",
      }}
    >
      <Meta
        title={`Projects and experiments - ${details.name.first} ${details.name.last}`}
      />
      <ThemeAwareIllustration />
      <Stack padding={mobile ? "1rem" : "5rem"} gap={2} alignItems="start">
        <Stack marginBottom="min(10vw, 3rem)" marginTop={mobile ? "10vw" : 0}>
          <Typography
            level="display1"
            fontSize="clamp(3rem, 15vw, 10rem)"
            fontWeight={200}
            lineHeight={1}
            sx={{
              position: "relative",
              marginLeft: ".25em",
              marginBottom: ".05em",
            }}
          >
            <Typography
              level="h2"
              sx={{
                position: "absolute",
                left: "-.6em",
                bottom: "1.7em",
                transform: "translateX(-50%) rotate(-90deg)",
                fontSize: "clamp(.5rem, 3vw, 2rem)",
              }}
            >
              Featured
            </Typography>
            Projects &
          </Typography>
          <Typography
            level="display1"
            fontSize="clamp(3rem, 15vw, 10rem)"
            fontWeight={300}
            lineHeight={0.6}
            zIndex={1}
            fontFamily={'"Righteous", sans-serif'}
          >
            Experiments
          </Typography>
        </Stack>
        <Stack
          direction="row"
          gap={1}
          sx={
            mobile
              ? {
                  width: "100%",
                  "& > *:first-child": {
                    flex: 1,
                  },
                }
              : {}
          }
        >
          <Button
            size="lg"
            component={Link}
            to="/"
            variant="outlined"
            color="neutral"
            endDecorator={<IoIosReturnLeft size="1.3em" />}
            sx={(theme) => ({
              transition: "all ease .2s",
              position: "relative",
              borderRadius: "0",
              width: "fit-content",
              flexShrink: 0,
              padding: "1 2",
              background: theme.palette.background.body,

              "&:hover": {
                background: theme.palette.text.primary,
                color: theme.palette.background.level1,
                borderColor: theme.palette.text.primary,
                "& > span > svg": {
                  transform: "translate(.6rem, .3rem) scale(1.2)",
                  filter: `drop-shadow(-.3rem -.3rem 0 ${theme.palette.text.tertiary}) drop-shadow(-.3rem -.3rem 0 ${theme.palette.text.secondary})`,
                },
              },
              "&:active": {
                transform: "scale(.98)",
                "& > span > svg": {
                  transform: "translate(.6rem, .3rem) scale(1.1)",
                  filter: `drop-shadow(-.3rem -.3rem 0 ${theme.palette.background.level1}) drop-shadow(-.3rem -.3rem 0 ${theme.palette.background.level1})`,
                },
              },
              "& > span > svg": {
                transition: "all ease .2s",
              },
            })}
          >
            Back to homepage
          </Button>
          <ThemeSwitcherButton />
        </Stack>
        <Directory />
      </Stack>
    </Stack>
  );
}
