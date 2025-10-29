import { Box, useColorScheme } from "@mui/joy";
import {
  animated,
  easings,
  useSpringRef,
  useTransition,
} from "@react-spring/web";
import balloonData from "@/assets/balloon.webp?progressive";
import planetDarkData from "@/assets/planet_dark.webp?progressive";
import planetLightData from "@/assets/planet_light.webp?progressive";
import skyData from "@/assets/sky.webp?progressive";
import spaceStationData from "@/assets/space-station.webp?progressive";
import ProgressiveImage from "@/components/ProgressiveImage";
import { useEffect } from "react";
import { Parallax } from "react-scroll-parallax";
import { useMobileMode } from "@/components/Responsive";

export const transitionConfig = {
  duration: 1000,
  easing: easings.easeInOutExpo,
};

export default function Illustrations() {
  const skyTransRef = useSpringRef();
  const planetTransRef = useSpringRef();
  const accessoryTransRef = useSpringRef();

  const { colorScheme } = useColorScheme();
  const mobile = useMobileMode();

  const skyTransition = useTransition(colorScheme, {
    ref: skyTransRef,
    initial: null,
    keys: null,
    from: { opacity: 0, top: "0rem" },
    enter: { opacity: 1, top: "0vh" },
    leave: { opacity: 0, top: "-100rem" },
    config: transitionConfig,
  });

  const [planetTransition] = useTransition(
    colorScheme,
    {
      ref: planetTransRef,
      keys: null,
      initial: null,
      from: {
        opacity: 0,
        top: "0rem",
        scale: 0.5,
        zIndex: -1,
      },
      enter: {
        opacity: 1,
        top: mobile ? "-50rem" : "-44rem",
        scale: 1,
        zIndex: 0,
      },
      leave: {
        opacity: 1,
        top: "-100rem",
        scale: 0.7,
        zIndex: 0,
      },
      config: transitionConfig,
    },
    [colorScheme, mobile]
  );

  const [accessoryTransition] = useTransition(
    colorScheme,
    {
      ref: accessoryTransRef,
      keys: null,
      initial: null,
      from: {
        opacity: 0,
        top: "20rem",
        scale: 0.5,
        zIndex: -1,
      },
      enter: {
        opacity: 1,
        top: mobile ? "5rem" : "12rem",
        scale: 1,
        zIndex: 0,
      },
      leave: {
        opacity: 0,
        top: "-100rem",
        scale: 0.7,
        zIndex: 0,
      },
      config: transitionConfig,
    },
    [colorScheme, mobile]
  );

  useEffect(() => {
    planetTransRef.start();
    accessoryTransRef.start();
    skyTransRef.start();
  }, [colorScheme, planetTransRef, accessoryTransRef, skyTransRef]);

  useEffect(() => {
    planetTransRef.start({
      to: {
        top: mobile ? "-50rem" : "-44rem",
      },
    });
    accessoryTransRef.start({
      to: {
        top: mobile ? "5rem" : "12rem",
      },
    });
  }, [mobile, planetTransRef, accessoryTransRef]);

  useEffect(() => {
    document.body.style.transition = `background-color ease ${
      transitionConfig.duration / 1000
    }s, color ease ${transitionConfig.duration / 1000}s`;
    return () => {
      document.body.style.transition = "";
    };
  }, []);

  return (
    <Parallax speed={-20} startScroll={0} disabled={mobile}>
      <Box
        component="div"
        sx={{
          position: "relative",
          width: "100vw",
          height: "100vh",
          pointerEvents: "none",
          "*": {
            transition: `background-color ${
              transitionConfig.duration / 1000
            }s ease, color ${transitionConfig.duration / 1000}s ease`,
          },
        }}
      >
        {skyTransition((style, item) => {
          switch (item) {
            case "light":
              return (
                <animated.div
                  style={{ ...style, zIndex: -1, position: "relative" }}
                >
                  <div
                    id="gradient"
                    style={{
                      position: "absolute",
                      height: "100vh",
                      width: "100vw",
                      top: "0",
                      left: "0",
                      background:
                        "linear-gradient(to bottom, #5594bc, transparent)",
                    }}
                  />
                  <ProgressiveImage
                    variants={skyData}
                    alt="sky"
                    style={{
                      position: "absolute",
                      width: "max(100vw, 200vh)",
                      top: "0",
                      left: "0",
                      opacity: 0.5,
                      mixBlendMode: "color-dodge",
                      maskImage:
                        "linear-gradient(to bottom, black, transparent 20%)",
                      WebkitMaskImage:
                        "linear-gradient(to bottom, black, transparent 20%)",
                    }}
                  />
                </animated.div>
              );
            case "dark":
              return (
                <animated.div
                  style={{ ...style, zIndex: -1, position: "relative" }}
                >
                  <ProgressiveImage
                    variants={skyData}
                    alt="sky"
                    style={{
                      position: "absolute",
                      width: "max(100vw, 200vh)",
                      top: "0",
                      left: "0",
                      zIndex: -1,
                      filter: "brightness(0.5)",
                      maskImage:
                        "linear-gradient(to bottom, black 10%, transparent 90%)",
                      WebkitMaskImage:
                        "linear-gradient(to bottom, black 10%, transparent 90%)",
                    }}
                  />
                  <ProgressiveImage
                    variants={skyData}
                    alt="sky"
                    style={{
                      position: "absolute",
                      width: "max(100vw, 200vh)",
                      top: "calc(max(100vw, 200vh) / 7)",
                      left: "0",
                      zIndex: -1,
                      transform: "scaleY(-1)",
                      filter: "blur(calc(100vw / 1200)) brightness(0.5)",
                      maskImage:
                        "linear-gradient(to bottom, transparent 20%, #00000059 50%, transparent 70%)",
                      WebkitMaskImage:
                        "linear-gradient(to bottom, transparent 20%, 00000059 50%, transparent 80%)",
                    }}
                  />
                </animated.div>
              );
            default:
              return null;
          }
        })}
        {planetTransition((style, item) => {
          switch (item) {
            case "light":
              return (
                <animated.div
                  style={{
                    ...style,
                    position: "absolute",
                    width: "75rem",
                    left: "calc(50% - 37.5rem)",
                  }}
                >
                  <ProgressiveImage
                    variants={planetLightData}
                    alt="planet"
                    style={{
                      width: "100%",
                      height: "100%",
                      animation: "spin 360s linear infinite",
                    }}
                  />
                </animated.div>
              );
            case "dark":
              return (
                <animated.div
                  style={{
                    ...style,
                    position: "absolute",
                    width: "75rem",
                    left: "calc(50% - 37.5rem)",
                  }}
                >
                  <ProgressiveImage
                    variants={planetDarkData}
                    alt="planet"
                    style={{
                      width: "100%",
                      height: "100%",
                      filter:
                        "hue-rotate(20deg) drop-shadow(0 0 4rem #0C0223) drop-shadow(-3rem -3rem 3rem #3570b55b)",
                      animation: "spin 360s linear infinite",
                    }}
                  />
                </animated.div>
              );
            default:
              return null;
          }
        })}
        {accessoryTransition((style, item) => {
          switch (item) {
            case "light":
              return (
                <animated.div
                  style={{
                    ...style,
                    position: "absolute",
                    width: "min(200px, 60vw)",
                    left: mobile ? "50%" : "55%",
                    transform: `translateX(${mobile ? "-50%" : "20vw"})`,
                  }}
                >
                  <ProgressiveImage
                    variants={balloonData}
                    alt="balloon"
                    style={{
                      width: "100%",
                      height: "100%",
                      animation: "float 20s ease-in-out infinite",
                    }}
                  />
                </animated.div>
              );
            case "dark":
              return (
                <animated.div
                  style={{
                    ...style,
                    position: "absolute",
                    width: "min(500px, 80vw)",
                    left: "50%",
                    transform: `translateX(${mobile ? "-50%" : "20vw"})`,
                  }}
                >
                  <ProgressiveImage
                    variants={spaceStationData}
                    alt="space station"
                    style={{
                      width: "100%",
                      height: "100%",
                      transformOrigin: "",
                      filter: `${
                        mobile ? "" : "drop-shadow(0 0 .5rem #141619b0)"
                      } drop-shadow(.5rem -.5rem 2rem #8fa4cc4e)`,
                      animation: "float 20s ease-in-out infinite",
                    }}
                  />
                </animated.div>
              );
            default:
              return null;
          }
        })}
      </Box>
    </Parallax>
  );
}
