import ThemeSwitcher from "@/navigation/ThemeSwitcher";
import { Box, Stack } from "@mui/joy";
import { motion } from "motion/react";
import { Ref } from "react";
import { createPortal } from "react-dom";
import { navigationBarItems } from "../items";
import NavigationBarItem from "../NavigationBarItem";
import { NavigationBarProvider } from "../NavigationBarContext";
import { css } from "@emotion/react";

export default function FullscreenMenu({
  onClose,
  ref,
}: {
  onClose: () => void;
  ref?: Ref<HTMLDivElement>;
}) {
  return createPortal(
    <Box
      ref={ref}
      component={motion.div}
      initial={{ "--opacity": 0, "--blur": "0px" }}
      animate={{ "--opacity": 1, "--blur": "10px" }}
      exit={{ "--opacity": 0, "--blur": "0px" }}
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        width: "auto",
        height: "100vh",
        zIndex: 2000,
        display: "flex",
        flexDirection: "column",
        alignItems: "end",
        justifyContent: "space-between",
        gap: 4,
      }}
    >
      <Stack
        direction="column"
        gap={1}
        alignItems="end"
        css={css`
          position: relative;
          padding: 1.5rem 1.5rem;

          & > * {
            opacity: var(--opacity);
          }

          &::before {
            content: "";
            position: absolute;
            top: 0;
            right: 0;
            width: calc(100% + 2rem);
            height: calc(100% + 2rem);
            background-color: transparent;
            backdrop-filter: blur(var(--blur));
            mask-image: linear-gradient(
                to bottom,
                rgba(0, 0, 0, 1) 0%,
                rgba(0, 0, 0, 1) calc(100% - 2rem),
                rgba(0, 0, 0, 0) calc(100% + 2rem)
              ),
              linear-gradient(
                to left,
                rgba(0, 0, 0, 1) 0%,
                rgba(0, 0, 0, 1) calc(100% - 2rem),
                rgba(0, 0, 0, 0) calc(100% + 2rem)
              ),
              radial-gradient(
                circle at top right,
                rgba(0, 0, 0, 1) 0%,
                rgba(0, 0, 0, 1) 70%,
                rgba(0, 0, 0, 0) 100%
              );
            mask-composite: intersect;
            -webkit-mask-composite: source-in;
            pointer-events: none;
            z-index: -1;
          }
        `}
      >
        <NavigationBarProvider>
          {navigationBarItems.map(({ path, icon: Icon, label }) => (
            <NavigationBarItem key={path} to={path}>
              <Icon style={{ marginRight: "0.5rem" }} />
              {label}
            </NavigationBarItem>
          ))}
          {/* Some extra mocked items */}
          <NavigationBarItem key="/mock1" to="/mock1">
            <div style={{ marginRight: "0.5rem" }}>🔍</div>
            Mock Item 1
          </NavigationBarItem>
          <NavigationBarItem key="/mock2" to="/mock2">
            <div style={{ marginRight: "0.5rem" }}>⚙️</div>
            Mock Item 2
          </NavigationBarItem>
          <NavigationBarItem key="/mock3" to="/mock3">
            <div style={{ marginRight: "0.5rem" }}>🌈</div>
            Mock Item 3
          </NavigationBarItem>
        </NavigationBarProvider>
      </Stack>
      <ThemeSwitcher />
    </Box>,
    document.body
  );
}
