import { Button, Stack, Tooltip, Typography } from "@mui/joy";
import { CSSProperties, useEffect, useState } from "react";
import Sparkle from "@/assets/svg/sparkle.svg?react";
import SparkleThin from "@/assets/svg/sparkle-thin.svg?react";
import Square from "@/assets/svg/square.svg?react";
import Flower from "@/assets/svg/flower.svg?react";
import TypeWriter from "@/components/TypeWriter";
import { animated, useSpringValue } from "@react-spring/web";
import { useNonDesktopMode } from "@/components/Responsive";
import { Link } from "react-router-dom";
import Meta from "@/components/Meta";

function getRandomRotation(prev = 0) {
  const random = Math.random();
  if (random < 0.33 && prev !== 90) {
    return 90;
  }
  if (random < 0.66 && prev !== -90) {
    return -90;
  }
  return 0;
}

export default function NoMatch() {
  const nonDesktop = useNonDesktopMode();

  const [rotations, setRotations] = useState({
    sparkle: 0,
    square: 0,
    flower: 0,
    sparkleThin: 0,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setRotations((prev) => ({
        sparkle: getRandomRotation(prev.sparkle),
        square: getRandomRotation(prev.square),
        flower: getRandomRotation(prev.flower),
        sparkleThin: getRandomRotation(prev.sparkleThin),
      }));
    }, 1500);
    return () => {
      clearInterval(interval);
    };
  }, []);

  const sparkleRotation = useSpringValue(rotations.sparkle);
  const squareRotation = useSpringValue(rotations.square);
  const flowerRotation = useSpringValue(rotations.flower);
  const sparkleThinRotation = useSpringValue(rotations.sparkleThin);

  useEffect(() => {
    sparkleRotation.start(rotations.sparkle);
    squareRotation.start(rotations.square);
    flowerRotation.start(rotations.flower);
    sparkleThinRotation.start(rotations.sparkleThin);
  }, [
    rotations,
    sparkleRotation,
    squareRotation,
    flowerRotation,
    sparkleThinRotation,
  ]);

  const svgStyle: CSSProperties = {
    aspectRatio: "1 / 1",
    width: "100%",
    height: "100%",
  };

  return (
    <>
      <Meta title="Page not found" />
      <Stack
        direction={nonDesktop ? "column" : "row"}
        gap={10}
        justifyContent="center"
        alignItems="center"
        width="100%"
        height="100%"
        overflow="hidden"
      >
        <Stack
          gap={1}
          sx={{
            maxWidth: "90vw",
            maxHeight: "90vw",
          }}
        >
          <Stack
            gap={1}
            direction="row"
            sx={{
              width: "100%",
              height: "min(45vw, 200px)",
            }}
          >
            <animated.div
              style={{
                rotate: sparkleRotation.to((deg) => `${deg}deg`),
              }}
            >
              <Sparkle style={svgStyle} />
            </animated.div>
            <animated.div
              style={{
                rotate: squareRotation.to((deg) => `${deg}deg`),
              }}
            >
              <Square style={svgStyle} />
            </animated.div>
          </Stack>
          <Stack
            gap={1}
            direction="row"
            sx={{
              width: "100%",
              height: "min(45vw, 200px)",
            }}
          >
            <animated.div
              style={{
                rotate: flowerRotation.to((deg) => `${deg}deg`),
              }}
            >
              <Flower style={svgStyle} />
            </animated.div>
            <animated.div
              style={{
                rotate: sparkleThinRotation.to((deg) => `${deg}deg`),
              }}
            >
              <SparkleThin style={svgStyle} />
            </animated.div>
          </Stack>
        </Stack>
        <Stack gap={5} alignItems={nonDesktop ? "center" : "left"}>
          <Typography
            level="display1"
            fontSize="clamp(7rem, 20vw, 15rem)"
            textAlign={nonDesktop ? "center" : "left"}
            lineHeight={0.8}
            fontFamily='"Fira Code", monospace'
          >
            404
          </Typography>
          <Typography
            textAlign={nonDesktop ? "center" : "left"}
            level="h4"
            fontFamily='"Fira Code", monospace'
            fontSize="clamp(1rem, 7vw, 1.5rem)"
            fontWeight="300"
            width="min(90vw, 25rem)"
            minHeight="3em"
          >
            <TypeWriter typeInterval={20}>
              We could not find the page you&apos;re looking for.
            </TypeWriter>
          </Typography>
          <Stack
            direction="row"
            gap={2}
            alignSelf="stretch"
            flexWrap="wrap"
            padding={nonDesktop ? 1 : 0}
          >
            <Button
              component={Link}
              to="https://github.com/BSoDium/bsodium.fr/issues/new?assignees=BSoDium&labels=bug&projects=&template=bug_report.md"
              target="_blank"
              size="lg"
              variant="outlined"
              color="neutral"
              sx={{
                flex: 1,
                whiteSpace: "nowrap",
              }}
            >
              File a bug report
            </Button>
            <Tooltip title="🎸 Country roads 🎙️" variant="soft">
              <Button
                component={Link}
                to="/"
                size="lg"
                variant="solid"
                color="success"
                sx={{
                  flex: 1,
                  whiteSpace: "nowrap",
                }}
              >
                Take me home
              </Button>
            </Tooltip>
          </Stack>
        </Stack>
      </Stack>
    </>
  );
}
