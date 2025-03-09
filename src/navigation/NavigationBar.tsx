import {
  Button,
  IconButton,
  Stack,
  Tooltip,
  Typography,
  useColorScheme,
} from "@mui/joy";
import React, { useEffect, useMemo, useState } from "react";
import { useLandScapeMode, useMobileMode } from "@/components/Responsive";
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
import FloatingActionButton from "./FloatingActionButton";

const modes = ["light", "dark", "system"] as const;

function NavigationBarItem({
  icon,
  text,
  to,
  selectedIcon,
  layout = "vertical",
  selected,
}: {
  icon: JSX.Element;
  text: string;
  to: string;
  selectedIcon?: JSX.Element;
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
  children: JSX.Element | JSX.Element[];
}) {
  const location = useLocation();
  const { mode, setMode } = useColorScheme();

  const hidden = useOverlayQueryParam();

  const bottom = useMobileMode();
  const landscape = useLandScapeMode();
  const horizontal = useMemo(() => !landscape && !bottom, [landscape, bottom]);

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
      landscape || bottom || hidden ? "0" : height ? `${height}px` : "3rem"
    );
    document.documentElement.style.setProperty(
      "--nav-safe-area-inset-bottom",
      bottom && !hidden ? (height ? `${height}px` : "4.5rem") : "0px"
    );
    document.documentElement.style.setProperty(
      "--nav-safe-area-inset-left",
      landscape && !hidden ? (width ? `${width}px` : "5.5rem") : "0px"
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
  }, [landscape, bottom, width, height]);

  return (
    <>
      <Stack
        ref={navigationRef}
        direction={landscape ? "column" : "row"}
        sx={(theme) => ({
          position: "fixed",
          ...(bottom
            ? {
                bottom: 0,
                borderTop: `1px solid ${theme.palette.divider}`,
              }
            : {
                top: 0,
              }),
          left: 0,
          gap: 4,
          display: hidden ? "none" : "flex",
          alignItems: "center",
          backgroundColor: `color-mix(in srgb, ${theme.palette.background.body}, transparent 50%)`,
          zIndex: 1000,
          ...(landscape
            ? {
                paddingTop: "2rem",
                paddingBottom: "1.5rem",
                height: "100vh",
                width: "fit-content",
              }
            : {
                backdropFilter: "blur(10px)",
                padding: bottom ? ".5rem" : ".5rem 2rem",
                width: "100vw",
                height: "fit-content",
                borderBottom: bottom
                  ? undefined
                  : `1px solid ${theme.palette.divider}`,
              }),
        })}
      >
        <Stack
          flex={1}
          justifyContent={bottom ? "space-evenly" : "flex-start"}
          direction={landscape ? "column" : "row"}
          gap={landscape ? 2.5 : 1}
        >
          <NavigationBarItem
            icon={<BsHouse />}
            selectedIcon={<BsHouseFill />}
            text="Home"
            layout={horizontal ? "horizontal" : "vertical"}
            to="/"
            selected={location.pathname === "/"}
          />
          <NavigationBarItem
            icon={<BsJournalBookmark />}
            selectedIcon={<BsJournalBookmarkFill />}
            text="Projects"
            layout={horizontal ? "horizontal" : "vertical"}
            to="/projects"
            selected={location.pathname.startsWith("/projects")}
          />
          <NavigationBarItem
            icon={<BsFilePerson />}
            selectedIcon={<BsFilePersonFill />}
            text="Resume"
            layout={horizontal ? "horizontal" : "vertical"}
            to="/resume"
            selected={location.pathname === "/resume"}
          />
        </Stack>
        {horizontal ? (
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
              if (mode)
                setMode(modes[(modes.indexOf(mode) + 1) % modes.length]);
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
        ) : (
          <Tooltip
            variant="soft"
            placement="right"
            title={`${
              mode === "system" ? "System" : mode === "light" ? "Light" : "Dark"
            } theme`}
          >
            <IconButton
              variant="plain"
              color="neutral"
              size="lg"
              sx={{
                transition: "all 0.2s",
                display: bottom ? "none" : undefined,
                borderRadius: "100vmax",
                padding: 2,
              }}
              onClick={() => {
                if (mode)
                  setMode(modes[(modes.indexOf(mode) + 1) % modes.length]);
              }}
            >
              {mode === "system" ? (
                <MdOutlineAutoMode />
              ) : mode === "light" ? (
                <BsSun />
              ) : (
                <BsMoon />
              )}
            </IconButton>
          </Tooltip>
        )}
      </Stack>
      {bottom && !hidden && (
        <Tooltip
          variant="soft"
          placement="left"
          title={`${
            mode === "system" ? "System" : mode === "light" ? "Light" : "Dark"
          } theme`}
        >
          <FloatingActionButton
            size="lg"
            color="neutral"
            variant="outlined"
            onClick={() => {
              if (mode)
                setMode(modes[(modes.indexOf(mode) + 1) % modes.length]);
            }}
            sx={{
              height: "58px",
              width: "58px",
              borderRadius: "1rem",
            }}
          >
            {mode === "system" ? (
              <MdOutlineAutoMode />
            ) : mode === "light" ? (
              <BsSun />
            ) : (
              <BsMoon />
            )}
          </FloatingActionButton>
        </Tooltip>
      )}
      {children}
    </>
  );
}
