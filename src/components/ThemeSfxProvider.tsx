import { useColorScheme } from "@mui/joy";
import { useEffect, useRef, useState } from "react";
import flashBangSfx from "@assets/sound/flashbang.mp3";
import flashBangBaby from "@assets/baby-vaporised.webp";
import useSound from "use-sound";
import { AnimatePresence, motion } from "motion/react";
import { css } from "@emotion/react";

export default function ThemeSfxProvider() {
  const [playFlashBang] = useSound(flashBangSfx, { volume: 0.15 });
  const { mode, systemMode } = useColorScheme();
  const [displayImage, setDisplayImage] = useState(false);
  const hasInitialized = useRef(false);

  // Play flash-bang sound effect when enabling light mode at night, only once per day
  useEffect(() => {
    // Skip the initial load
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      return;
    }

    const hour = new Date().getHours();
    const isNight = hour < 5;
    const isLightMode =
      mode === "light" || (mode === "system" && systemMode === "light");
    const hasPlayed =
      localStorage.getItem("flash-bang-played") === new Date().toDateString();

    if (isLightMode && isNight && !hasPlayed) {
      setDisplayImage(true);
      playFlashBang();
      setTimeout(() => {
        setDisplayImage(false);
      }, 50);
      localStorage.setItem("flash-bang-played", new Date().toDateString());
    }
  }, [mode, systemMode, playFlashBang]);

  return (
    <AnimatePresence>
      {displayImage && (
        <motion.img
          src={flashBangBaby}
          css={css`
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            pointer-events: none;
            filter: invert(1) contrast(2);
            z-index: 3000;
            mask: linear-gradient(
                to bottom,
                rgba(0, 0, 0, 0) 0%,
                rgba(0, 0, 0, 1) 20%,
                rgba(0, 0, 0, 1) 80%,
                rgba(0, 0, 0, 0) 100%
              ),
              linear-gradient(
                to right,
                rgba(0, 0, 0, 0) 0%,
                rgba(0, 0, 0, 1) 20%,
                rgba(0, 0, 0, 1) 80%,
                rgba(0, 0, 0, 0) 100%
              );
            mask-composite: intersect;
          `}
          initial={false}
          animate={{
            opacity: 1,
          }}
          exit={{
            opacity: 0,
          }}
          transition={{
            duration: 3,
          }}
        />
      )}
    </AnimatePresence>
  );
}
