import ThemeSwitcher from "@/navigation/ThemeSwitcher";
import useOverlayQueryParam from "@/navigation/useOverlayQueryParam";
import { Stack, Typography } from "@mui/joy";
import { motion } from "framer-motion";
import { ReactNode } from "react";
import { NavLink } from "react-router-dom";

export default function NavigationBar({
  children,
}: {
  children: ReactNode | ReactNode[];
}) {
  const hidden = useOverlayQueryParam();

  return (
    <>
      <Stack
        component="nav"
        direction="row"
        sx={(theme) => ({
          position: "sticky",
          top: 0,
          left: 0,
          gap: 4,
          height: "4rem",
          alignItems: "center",
          justifyContent: "center",
          display: hidden ? "none" : "flex",
          background: theme.palette.background.body,
          padding: "0 2rem",
          width: "100vw",
          zIndex: 1000,
        })}
      >
        <Stack
          gap={1}
          flex={1}
          direction={"row"}
          maxWidth={"80rem"}
          alignItems={"center"}
        >
          <Stack
            id="nav-items"
            flex={1}
            alignItems="flex-start"
            direction="row"
            gap={2}
          >
            <NavLink to="/">Home</NavLink>
            <NavLink to="/projects">Projects</NavLink>
            <NavLink to="/resume">Resume</NavLink>
          </Stack>
          <Typography
            id="nav-logo"
            level="h5"
            fontFamily="'Fira Code', monospace"
            height="1.6rem"
          >
            BSoDium
            <Typography fontWeight="sm">.fr</Typography>
            <Typography
              fontWeight="sm"
              component={motion.span}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{
                repeat: Infinity,
                duration: 0.5,
                repeatType: "reverse",
                ease: "easeInOut",
              }}
            >
              _
            </Typography>
          </Typography>
          <Stack id="nav-buttons" flex={1} alignItems="flex-end">
            <ThemeSwitcher />
          </Stack>
        </Stack>
      </Stack>
      {children}
    </>
  );
}
