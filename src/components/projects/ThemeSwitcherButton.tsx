import { IconButton, Stack, useColorScheme } from "@mui/joy";
import { GoMoon, GoSun } from "react-icons/go";

export function ThemeSwitcherButton() {
  const { colorScheme, setMode } = useColorScheme();

  return (
    <IconButton
      variant="outlined"
      color="neutral"
      size="lg"
      className={`state-${colorScheme}`}
      onClick={() => {
        setMode(colorScheme === "light" ? "dark" : "light");
      }}
      sx={(theme) => ({
        transition: "all ease .2s",
        position: "relative",
        borderRadius: "0",
        width: "fit-content",
        flexShrink: 0,
        padding: "1 2",
        overflow: "hidden",
        background: theme.palette.background.body,

        "& > svg": {
          transition: "all ease .2s",
        },

        "&:hover": {
          background: theme.palette.text.primary,
          color: theme.palette.background.level1,
          borderColor: theme.palette.text.primary,
          "& > svg": {
            transform: "rotate(-45deg)",
          },
        },
        "&:active": {
          transform: "scale(.98)",
        },

        "& > div": {
          transition: "all ease .2s",
        },

        "&.state-light > div": {
          transform: "translate(-50%, calc(-50% - 21px))",
        },

        "&.state-dark > div": {
          transform: "translate(-50%, calc(-50% + 21px))",
        },

        "&:hover > div": {
          transform: "translate(-50%, -50%)",
        },
      })}
    >
      <Stack
        direction="column"
        gap={3}
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
      >
        <GoMoon />
        <GoSun />
      </Stack>
    </IconButton>
  );
}
