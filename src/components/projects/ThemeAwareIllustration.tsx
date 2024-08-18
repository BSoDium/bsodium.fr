import { Stack, useColorScheme } from "@mui/joy";
import { animated, useSpringRef, useTransition } from "@react-spring/web";
import { useEffect, useState } from "react";
import ProgressiveImage from "@/components/ProgressiveImage";
import architectureDarkMin from "@/assets/architecture_dark.min.webp";
import architectureDark from "@/assets/architecture_dark.webp";
import architectureLightMin from "@/assets/architecture_light.min.webp";
import architectureLight from "@/assets/architecture_light.webp";

export function ThemeAwareIllustration() {
  const { colorScheme } = useColorScheme();
  const [loaded, setLoaded] = useState(false);

  const transRef = useSpringRef();

  const transitions = useTransition(colorScheme, {
    ref: transRef,
    keys: null,
    from: { opacity: 0 },
    enter: { opacity: 1 },
    leave: { opacity: 0, filter: "blur(10px)", position: "absolute" },
  });

  useEffect(() => {
    if (loaded) {
      transRef.start();
    }
  }, [colorScheme, loaded]);

  const imgSx = {
    position: "relative",
    marginTop: "-23rem",
    width: "100%",
    WebkitMaskImage: "linear-gradient(to left,black 10%,transparent 80%)",
    maskImage: "linear-gradient(to left,black 10%,transparent 80%)",
    filter: "grayscale(1)",
  } as React.CSSProperties;

  return (
    <Stack
      sx={{
        position: "absolute",
        right: "min(0rem, calc(100vw - 100rem))",
        width: "100rem",
        height: "min(100%, 31rem)",
        overflow: "hidden",
        paddingTop: "var(--nav-safe-area-inset-top)",
        "&:after": {
          content: '""',
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          backdropFilter: "blur(20px)",
          mask: "linear-gradient(to left, transparent, black 60%)",
        },
      }}
    >
      {transitions((style, item) => {
        switch (item) {
          case "light":
            return (
              <animated.div style={style}>
                <ProgressiveImage
                  src={architectureLight}
                  placeholder={architectureLightMin}
                  alt="Brutalist building by Arthur Swiffen"
                  onLoad={() => setLoaded(true)}
                  style={imgSx}
                />
              </animated.div>
            );
          case "dark":
            return (
              <animated.div style={style}>
                <ProgressiveImage
                  src={architectureDark}
                  placeholder={architectureDarkMin}
                  alt="Red lamps in Subway in Hamburg by Travel with Lenses"
                  onLoad={() => setLoaded(true)}
                  style={imgSx}
                />
              </animated.div>
            );
          default:
            return null;
        }
      })}
    </Stack>
  );
}
