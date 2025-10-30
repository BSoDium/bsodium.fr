import {
  Button,
  Stack,
  Typography,
  useColorScheme,
} from "@mui/joy";
import React, { ReactNode, useEffect, useState } from "react";
import { useMobileMode } from "@/components/Responsive";
import { Link, useLocation } from "react-router-dom";
import {
  BsHouse,
  BsHouseFill,
  BsJournalBookmark,
  BsJournalBookmarkFill,
  BsMoon,
  BsFilePerson,
  BsFilePersonFill,
  BsSun,
} from "react-icons/bs";
import { MdOutlineAutoMode } from "react-icons/md";
import useOverlayQueryParam from "@/navigation/useOverlayQueryParam";

const modes = ["light", "dark", "system"] as const;

function NavigationBarItem({
  icon,
  text,
  to,
  selectedIcon,
  layout = "vertical",
  selected,
}: {
  icon: ReactNode;
  text: string;
  to: string;
  selectedIcon?: ReactNode;
  layout?: "vertical" | "horizontal";
  selected?: boolean;
}) {
  const mobile = useMobileMode();
  return layout === "vertical" ? (
    <Stack
      component={Link}
      to={to}
      alignItems="center"
      gap={0.5}
      sx={{
        cursor: "pointer",
        borderRadius: "0.5rem",
        fontSize: "1.3rem",
        paddingX: "1rem",
        textDecoration: "none",
      }}
    >
      <Button
        color="neutral"
        variant={selected ? "solid" : "plain"}
        sx={(theme) => ({
          transition: "all 0.2s",
          padding: "0.3rem 1.1rem",
          borderRadius: "100vmax",
          minHeight: "fit-content",
          fontSize: "inherit",
          "& > svg": {
            transition: "all 0.2s",
          },
          "&:hover > svg": {
            transform: "scale(1.05)",
          },
          ...(selected
            ? {
                backgroundColor: theme.palette.text.primary,
                color: selected
                  ? theme.palette.background.body
                  : theme.palette.text.primary,
                "&:hover, &:active": {
                  backgroundColor: mobile
                    ? theme.palette.text.primary
                    : theme.palette.text.secondary,
                  color: theme.palette.background.body,
                },
              }
            : {}),
        })}
      >
        {selected ? selectedIcon || icon : icon}
      </Button>
      <Typography level="body3" fontWeight="700" textColor="text.primary">
        {text}
      </Typography>
    </Stack>
  ) : (
    <Button
      component={Link}
      to={to}
      color="neutral"
      variant={selected ? "solid" : "plain"}
      sx={(theme) => ({
        minHeight: "fit-content",
        borderRadius: "100vmax",
        padding: ".6rem 1rem",
        transition: "all 0.2s",
        "& > svg": {
          transition: "all 0.2s",
        },
        "&:hover > svg": {
          transform: "scale(1.05)",
        },
        ...(selected
          ? {
              backgroundColor: theme.palette.text.primary,
              color: selected
                ? theme.palette.background.body
                : theme.palette.text.primary,
              "&:hover": {
                backgroundColor: mobile
                  ? undefined
                  : theme.palette.text.secondary,
                color: theme.palette.background.body,
              },
            }
          : {}),
      })}
      startDecorator={selected ? selectedIcon || icon : icon}
    >
      {text}
    </Button>
  );
}

export default function NavigationBar({
  children,
}: {
  children: ReactNode | ReactNode[];
}) {
  const location = useLocation();
  const { mode, setMode } = useColorScheme();

  const hidden = useOverlayQueryParam();

  const [width, setWidth] = useState<number>();
  const [height, setHeight] = useState<number>();

  const navigationRef = React.createRef<HTMLDivElement>();

  // Resize observer
  useEffect(() => {
    const resizeObserver = new ResizeObserver((entries) => {
      entries.forEach((entry) => {
        const [{ inlineSize: newWidth, blockSize: newHeight }] =
          entry.borderBoxSize;
        setWidth(newWidth);
        setHeight(newHeight);
      });
    });

    if (navigationRef.current) {
      resizeObserver.observe(navigationRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [navigationRef]);

  // Safe area insets
  useEffect(() => {
    document.documentElement.style.setProperty(
      "--nav-safe-area-inset-top",
      height ? `${height}px` : "3rem"
    );
    document.documentElement.style.setProperty(
      "--nav-safe-area-inset-bottom",
      "0px"
    );
    document.documentElement.style.setProperty(
      "--nav-safe-area-inset-left",
      "0px"
    );

    return () => {
      document.documentElement.style.removeProperty(
        "--nav-safe-area-inset-top"
      );
      document.documentElement.style.removeProperty(
        "--nav-safe-area-inset-bottom"
      );
      document.documentElement.style.removeProperty(
        "--nav-safe-area-inset-left"
      );
    };
  }, [width, height]);

  return (
    <>
      <Stack
        ref={navigationRef}
        direction="row"
        sx={(theme) => ({
          position: "fixed",
          top: 0,
          left: 0,
          gap: 4,
          display: hidden ? "none" : "flex",
          alignItems: "center",
          backgroundColor: `color-mix(in srgb, ${theme.palette.background.body}, transparent 50%)`,
          zIndex: 1000,
          backdropFilter: "blur(10px)",
          padding: ".5rem 2rem",
          width: "100vw",
          height: "fit-content",
          borderBottom: `1px solid ${theme.palette.divider}`,
        })}
      >
        <Stack flex={1} justifyContent={"flex-start"} direction={"row"} gap={1}>
          <NavigationBarItem
            icon={<BsHouse />}
            selectedIcon={<BsHouseFill />}
            text="Home"
            layout={"horizontal"}
            to="/"
            selected={location.pathname === "/"}
          />
          <NavigationBarItem
            icon={<BsJournalBookmark />}
            selectedIcon={<BsJournalBookmarkFill />}
            text="Projects"
            layout={"horizontal"}
            to="/projects"
            selected={location.pathname.startsWith("/projects")}
          />
          <NavigationBarItem
            icon={<BsFilePerson />}
            selectedIcon={<BsFilePersonFill />}
            text="Resume"
            layout={"horizontal"}
            to="/resume"
            selected={location.pathname === "/resume"}
          />
        </Stack>

        <Button
          variant="plain"
          color="neutral"
          size="lg"
          sx={{
            minHeight: "fit-content",
            borderRadius: "100vmax",
            padding: ".6rem 1rem",
            transition: "all 0.2s",
            fontSize: "var(--joy-fontSize-sm)",
          }}
          onClick={() => {
            if (mode) setMode(modes[(modes.indexOf(mode) + 1) % modes.length]);
          }}
          startDecorator={
            mode === "system" ? (
              <MdOutlineAutoMode />
            ) : mode === "light" ? (
              <BsSun />
            ) : (
              <BsMoon />
            )
          }
        >
          {`${
            mode === "system" ? "System" : mode === "light" ? "Light" : "Dark"
          } theme`}
        </Button>
      </Stack>
      {children}
    </>
  );
}
