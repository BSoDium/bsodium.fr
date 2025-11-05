import { Default, Mobile } from "@/components/Responsive";
import MobileMenu from "@/navigation/MobileMenu";
import NavigationBarItems from "@/navigation/NavigationBarItems";
import ThemeSwitcher from "@/navigation/ThemeSwitcher";
import useOverlayQueryParam from "@/navigation/useOverlayQueryParam";
import { Stack, Typography } from "@mui/joy";
import {
  motion,
  useMotionTemplate,
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
  const navTop = useMotionValue(0);
  useMotionValueEvent(pageScrollY, "change", (latest) => {
    const previous = pageScrollY.getPrevious() || 0;
    const delta = latest - previous;

    const currentNavTop = navTop.get();
    let newNavTop = currentNavTop - delta;
    if (newNavTop > 0) newNavTop = 0;
    if (newNavTop < -height) newNavTop = -height;
    navTop.set(newNavTop);
  });

  // Handle scroll snapping
  const snapTopY = useTransform(() => pageScrollY.get() + navTop.get());
  const snapBottomY = useTransform(
    () => pageScrollY.get() + navTop.get() + height
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
  const navBackground = useMotionTemplate`color-mix(in srgb, var(--joy-palette-background-surface) ${navBackgroundVisibility}, transparent)`;

  // Handle nav border visibility on scroll
  const navBorderVisibility = useTransform(
    navScrollProgressY,
    [1, 0.5],
    ["100%", "0%"]
  );
  const navBorder = useMotionTemplate`1px solid color-mix(in srgb, var(--joy-palette-neutral-outlinedBorder) ${navBorderVisibility}, transparent)`;

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
        style={{
          position: "sticky",
          originY: "top",
          top: navTop,
          left: 0,
          height: `${height}px`,
          alignItems: "center",
          justifyContent: "center",
          display: hidden ? "none" : "flex",
          padding: "0 1.5rem",
          width: "100vw",
          zIndex: 1000,
          background: navBackground,
          backdropFilter: "blur(10px)",
          borderBottom: navBorder,
        }}
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
          <Default>
            <Stack
              id="nav-items"
              flex={1}
              alignItems="flex-start"
              direction="row"
              gap={1}
            >
              <NavigationBarItems />
            </Stack>
          </Default>
          <Stack id="nav-buttons" flex={1} alignItems="flex-end">
            <Default>
              <ThemeSwitcher />
            </Default>
            <Mobile>
              <MobileMenu />
            </Mobile>
          </Stack>
        </Stack>
      </Stack>
      {children}
    </>
  );
}
