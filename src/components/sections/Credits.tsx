import { useEffect } from "react";
import { Stack, Typography, useColorScheme } from "@mui/joy";
import { ATypography } from "@/pages/Landing";
import mountainsDark from "@/assets/mountains_dark.webp";
import mountainsDarkMin from "@/assets/mountains_dark.min.webp";
import mountainsLight from "@/assets/mountains_light.webp";
import mountainsLightMin from "@/assets/mountains_light.min.webp";
import { animated, useSpringRef, useTransition } from "@react-spring/web";
import ProgressiveImage from "@/components/ProgressiveImage";
import details from "@/assets/Details";
import { transitionConfig } from "@/components/sections/Illustrations";
import { useMobileMode } from "@/components/Responsive";

export default function Credits() {
  const mountainsTransRef = useSpringRef();

  const { colorScheme } = useColorScheme();
  const mobile = useMobileMode();

  const mountainsTransition = useTransition(colorScheme, {
    ref: mountainsTransRef,
    initial: null,
    keys: null,
    from: { opacity: 0 },
    enter: { opacity: 0.7 },
    config: transitionConfig,
  });

  useEffect(() => {
    mountainsTransRef.start();
  }, [mountainsTransRef, colorScheme]);

  return (
    <Stack position="relative">
      {mountainsTransition((style, item) => {
        switch (item) {
          case "light":
            return (
              <animated.div
                style={{
                  ...style,
                  position: "absolute",
                  bottom: 0,
                  width: "100%",
                  zIndex: -1,
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    height: "40rem",
                    width: "calc(100vw + 20rem)",
                    bottom: "-7rem",
                    left: "50%",
                    transform: "translateX(-50%)",
                    background:
                      "linear-gradient(to top, #577fc0 25%, #C4DEE7, transparent)",
                  }}
                />
                <ProgressiveImage
                  src={mountainsLight}
                  placeholder={mountainsLightMin}
                  alt="mountains"
                  style={{
                    position: "absolute",
                    height: "40rem",
                    left: "50%",
                    bottom: "0",
                    transform: "translate(-50%, 5rem)",
                    filter: "hue-rotate(25deg)",
                    maskImage:
                      "linear-gradient(to left, transparent, black 30%, black 70%, transparent)",
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
                  bottom: 0,
                  width: "100%",
                  zIndex: -1,
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    height: "40rem",
                    width: "calc(100vw + 20rem)",
                    bottom: "-7rem",
                    left: "50%",
                    transform: "translateX(-50%)",
                    background:
                      "linear-gradient(to top, #130D0B 25%, #1B1C21 40%, #16161A 50%, transparent)",
                  }}
                />
                <ProgressiveImage
                  src={mountainsDark}
                  placeholder={mountainsDarkMin}
                  alt="mountains"
                  style={{
                    position: "absolute",
                    height: "40rem",
                    left: "50%",
                    bottom: "0",
                    transform: "translate(-50%, 7rem)",
                    filter: "contrast(1.1) brightness(0.7) hue-rotate(200deg)",
                    maskImage:
                      "linear-gradient(to left, transparent, black 30%, black 70%, transparent)",
                  }}
                />
              </animated.div>
            );
          default:
            return null;
        }
      })}

      <Stack
        flexWrap="wrap"
        direction="row"
        columnGap={2}
        rowGap={3}
        justifyContent="space-between"
        sx={(theme) => ({
          position: "relative",
          paddingTop: mobile ? "22rem" : "23rem",
          "& > *": {
            flex: 1,
            minWidth: "200px",
            textAlign: "center",
            textShadow: `0 .2rem 1rem ${theme.palette.background.body}, .2rem 0 1rem ${theme.palette.background.body}, -0.2rem 0 1rem ${theme.palette.background.body}, 0 -0.2rem 1rem ${theme.palette.background.body}`,
          },
        })}
      >
        <Typography
          level="body2"
          textColor={colorScheme === "dark" ? "#6c7b97" : "#3d4b58"}
          minWidth="min(100%, 15rem)"
        >
          © {new Date().getFullYear()}{" "}
          {`${details.name.first} ${details.name.last}. All rights reserved.`}
        </Typography>
        <Typography
          level="body2"
          textColor={colorScheme === "dark" ? "#6c7b97" : "#3d4b58"}
          minWidth="min(100%, 15rem)"
        >
          {"Illustrations generated using "}
          <ATypography href="https://www.bing.com/create">
            Bing Image Creator
          </ATypography>
          {" and "}
          <ATypography href="https://openai.com/chatgpt/">ChatGPT</ATypography>
          {" powered by "}
          <ATypography href="https://openai.com/product/dall-e-2/">
            DALL·E
          </ATypography>
          .
        </Typography>
      </Stack>
    </Stack>
  );
}
