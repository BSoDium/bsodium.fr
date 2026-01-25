import { Button, useColorScheme } from "@mui/joy";
import { AnimatePresence, motion, MotionConfig } from "motion/react";
import { LuMoon, LuSun, LuSunMoon } from "react-icons/lu";

const modes = ["light", "dark", "system"] as const;

export default function ThemeSwitcher() {
  const { mode, setMode } = useColorScheme();

  return (
    <MotionConfig
      transition={{
        type: "spring",
        stiffness: 500,
        damping: 30,
      }}
    >
      <Button
        component={motion.button}
        layoutId="theme-mode-button"
        variant="plain"
        color="neutral"
        style={{
          overflow: "hidden",
          position: "relative",
          minHeight: "fit-content",
          borderRadius: "100vmax",
          padding: ".625rem .775rem .625rem .625rem",
          fontSize: "var(--joy-fontSize-sm)",
          background:
            "color-mix(in srgb, var(--joy-palette-neutral-softBg), transparent 100%)",
        }}
        whileHover={{
          background:
            "color-mix(in srgb, var(--joy-palette-neutral-softBg), transparent 50%)",
        }}
        whileTap={{
          background:
            "color-mix(in srgb, var(--joy-palette-neutral-softBg), transparent 0%)",
        }}
        transition={{
          background: { ease: "easeIn", duration: 0.2 },
        }}
        onClick={() => {
          if (mode) setMode(modes[(modes.indexOf(mode) + 1) % modes.length]);
        }}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={`icon-${mode}`}
            layout
            initial={{ opacity: 0, rotate: -90 }}
            animate={{ opacity: 1, rotate: 0 }}
            exit={{ opacity: 0, rotate: 90 }}
            style={{
              display: "flex",
              alignItems: "center",
              width: "1rem",
              height: "1rem",
              marginRight: "0.5rem",
              fontSize: "1.1rem",
            }}
          >
            {mode === "system" ? (
              <LuSunMoon />
            ) : mode === "light" ? (
              <LuSun />
            ) : (
              <LuMoon />
            )}
          </motion.span>
          <motion.span
            key={`label-${mode}`}
            layout
            initial={{ opacity: 0, rotate: -90 }}
            animate={{ opacity: 1, rotate: 0 }}
            exit={{ opacity: 0, rotate: 90 }}
            style={{
              whiteSpace: "nowrap",
              display: "inline-block",
              originX: "calc(-1 * (9px + 1.1rem))",
              originY: "center",
            }}
          >
            {`${
              mode === "system" ? "System" : mode === "light" ? "Light" : "Dark"
            }`}
          </motion.span>
          <motion.span layout>&nbsp;theme</motion.span>
        </AnimatePresence>
      </Button>
    </MotionConfig>
  );
}
