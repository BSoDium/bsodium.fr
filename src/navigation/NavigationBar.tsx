import NavigationBarItems from "@/navigation/NavigationBarItems";
import ThemeSwitcher from "@/navigation/ThemeSwitcher";
import useOverlayQueryParam from "@/navigation/useOverlayQueryParam";
import { Stack, Typography } from "@mui/joy";
import {
  motion,
  useMotionValue,
  useMotionValueEvent,
  useScroll,
  useTransform,
} from "motion/react";
import { ReactNode } from "react";
import { Link } from "react-router-dom";

export default function NavigationBar({
  children,
  height = 64,
}: {
  children: ReactNode | ReactNode[];
  height?: number;
}) {
  const hidden = useOverlayQueryParam();

  // Handle nav hide/show on scroll
  const { scrollY: pageScrollY } = useScroll({ axis: "y" });
  const navY = useMotionValue(0);
  useMotionValueEvent(pageScrollY, "change", (latest) => {
    const previous = pageScrollY.getPrevious() || 0;
    const delta = latest - previous;

    const currentNavY = navY.get();
    let newNavY = currentNavY - delta;
    if (newNavY > 0) newNavY = 0;
    if (newNavY < -height) newNavY = -height;
    navY.set(newNavY);
  });

  // Handle scroll snapping
  const snapTopY = useTransform(() => pageScrollY.get() + navY.get());
  const snapBottomY = useTransform(
    () => pageScrollY.get() + navY.get() + height
  );

  // Handle nav background visibility on scroll
  const { scrollYProgress: navScrollProgressY } = useScroll({
    axis: "y",
    offset: [`${-height}px start`, `${height}px start`],
  });
  const navBackgroundVisibility = useTransform(
    navScrollProgressY,
    [1, 0.5],
    ["80%", "0%"]
  );

  return (
    <>
      <motion.span
        id="nav-snap-anchor-top"
        style={{
          position: "absolute",
          scrollSnapAlign: "start",
          top: snapTopY,

          width: "100%",
          height: 1,
          background: "transparent",
        }}
      />
      <motion.span
        id="nav-snap-anchor-bottom"
        style={{
          position: "absolute",
          scrollSnapAlign: "start",
          top: snapBottomY,

          width: "100%",
          height: 1,
          background: "transparent",
        }}
      />
      <Stack
        layoutRoot
        direction="row"
        layoutId="navigation-bar"
        component={motion.nav}
        style={
          {
            position: "sticky",
            originY: "top",
            y: navY,
            top: 0,
            left: 0,
            height: `${height}px`,
            alignItems: "center",
            justifyContent: "center",
            display: hidden ? "none" : "flex",
            padding: "0 2rem",
            width: "100vw",
            zIndex: 1000,
            "--nav-background-visibility": navBackgroundVisibility,
            background: `color-mix(in srgb, var(--joy-palette-background-surface) var(--nav-background-visibility), transparent 0%)`,
            backdropFilter: "blur(10px)",
          } as React.CSSProperties
        }
      >
        <Stack
          gap={4}
          flex={1}
          direction={"row"}
          maxWidth={"80rem"}
          alignItems={"center"}
        >
          <Typography
            id="nav-logo"
            level="h5"
            textColor="text.secondary"
            fontFamily="'Fira Code', monospace"
            height="1.6rem"
            component={Link}
            to="/"
            sx={{
              textDecoration: "none",
            }}
          >
            <Typography textColor="text.primary">BSoD</Typography>
            <Typography>ium</Typography>
            <Typography textColor="text.tertiary" fontWeight="sm">
              .fr
            </Typography>
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
          <Stack
            id="nav-items"
            flex={1}
            alignItems="flex-start"
            direction="row"
            gap={1}
          >
            <NavigationBarItems />
          </Stack>
          <Stack id="nav-buttons" flex={1} alignItems="flex-end">
            <ThemeSwitcher />
          </Stack>
        </Stack>
      </Stack>
      {children}
    </>
  );
}
