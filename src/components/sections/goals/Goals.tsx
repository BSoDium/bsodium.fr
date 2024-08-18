import { useEffect, useMemo, useState } from "react";
import {
  Avatar,
  Box,
  Button,
  Card,
  Chip,
  Sheet,
  Stack,
  Typography,
} from "@mui/joy";
import { TbHeartHandshake } from "react-icons/tb";
import { ColorPaletteProp, SxProps } from "@mui/joy/styles/types";
import { MdOutlineRocketLaunch } from "react-icons/md";
import { HiOutlineSparkles } from "react-icons/hi2";
import { Parallax } from "react-scroll-parallax";
import { animated, useSpringValue } from "@react-spring/web";
import details from "@/assets/Details";
import { Default, Mobile, useMobileMode } from "@/components/Responsive";
import Reach from "./Reach";

function Grid({ sx }: { sx?: SxProps }) {
  return (
    <Sheet
      sx={{
        position: "relative",
        width: "100%",
        height: "100%",
        backgroundColor: "transparent",
        backgroundImage:
          "linear-gradient(var(--joy-palette-divider) 1px, transparent 1px), linear-gradient(90deg, var(--joy-palette-divider) 1px, transparent 1px)",
        backgroundSize: "37px 37px, 37px 37px",
        maskImage: "radial-gradient(circle, black 0%, transparent 80%)",
        ...sx,
      }}
    />
  );
}

function Comment({ step }: { step: number }) {
  const mobile = useMobileMode();

  const opacity = useSpringValue(0);

  useEffect(() => {
    opacity.start(step >= 3 ? 1 : 0);
  }, [step]);

  return (
    <Card
      component={animated.div}
      variant="outlined"
      color="primary"
      sx={{
        position: "absolute",
        top: "calc(1rem + 100%)",
        left: mobile ? "10%" : "50%",
        width: "max-content",
        borderRadius: "1.5rem",
        borderTopLeftRadius: "0",
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: "0.7rem",
        padding: "0.5rem",
      }}
      style={{
        opacity,
      }}
    >
      <Avatar alt="Michael" color="primary" variant="solid" size="sm">
        M
      </Avatar>
      <Stack>
        <Typography level="body3" textColor="text.secondary" fontWeight="600">
          Michael
          {" • "}
          <Typography textColor="text.tertiary">5 minutes ago</Typography>
        </Typography>
        <Typography
          level="body2"
          textColor="text.secondary"
          sx={{ marginRight: "0.5rem" }}
        >
          Let&apos;s add a text input under these!
        </Typography>
      </Stack>
    </Card>
  );
}

function Cursor({ step }: { step: number }) {
  const labelTransforms = {
    left: "translate(calc(-100% + 6px), 18px)",
    right: "translate(calc(100% + 0px), 18px)",
  };

  const states: {
    top: string;
    left: string;
    rotate: string;
    opacity: string;
  }[] = [
    {
      top: "0",
      left: "20%",
      rotate: "0deg",
      opacity: "0",
    },
    {
      top: "12%",
      left: "49%",
      rotate: "0deg",
      opacity: "1",
    },
    {
      top: "52%",
      left: "60%",
      rotate: "-90deg",
      opacity: "1",
    },
    {
      top: "52%",
      left: "60%",
      rotate: "-90deg",
      opacity: "1",
    },
    {
      top: "75%",
      left: "4%",
      rotate: "0deg",
      opacity: "1",
    },
    {
      top: "100%",
      left: "30%",
      rotate: "0deg",
      opacity: "0",
    },
  ];

  const currentState = useMemo(
    () => ({
      ...states[step],
      labelTransform:
        labelTransforms[states[step].rotate === "0deg" ? "left" : "right"],
    }),
    [step]
  );

  const top = useSpringValue(currentState?.top);
  const left = useSpringValue(currentState?.left);
  const rotate = useSpringValue(currentState?.rotate);
  const labelTransform = useSpringValue(currentState?.labelTransform);
  const opacity = useSpringValue(currentState?.opacity);

  useEffect(() => {
    top.start(currentState?.top);
    left.start(currentState?.left);
    rotate.start(currentState?.rotate);
    labelTransform.start(currentState?.labelTransform);
    opacity.start(currentState?.opacity);
  }, [currentState]);

  return (
    <Box
      component={animated.div}
      sx={{
        zIndex: 99,
        position: "absolute",
      }}
      style={{
        top,
        left,
        opacity,
      }}
    >
      <Chip
        size="sm"
        component={animated.div}
        variant="solid"
        color="danger"
        sx={{
          position: "absolute",
          borderRadius: "var(--joy-radius-sm)",
          transformOrigin: "top right",
          transform: currentState?.labelTransform,
          filter: "drop-shadow(0 0 10px var(--joy-palette-background-body))",
        }}
        style={{
          transform: labelTransform,
        }}
      >
        {details.name.first}
      </Chip>
      <Stack
        className="wrapper"
        component={animated.div}
        sx={(theme) => ({
          position: "absolute",
          transformOrigin: "top right",
          "& svg": {
            fill: `color-mix(in srgb, ${theme.palette.danger[500]}, ${theme.palette.background.body} 40%)`,
            stroke: theme.palette.danger[500],
          },
        })}
        style={{
          rotate,
        }}
      >
        <svg
          height="25"
          viewBox="0 0 17 18"
          fill="var(--joy-palette-danger-500)"
          filter="drop-shadow(0 0 10px var(--joy-palette-background-body))"
        >
          <path
            d="M15.5036 3.11002L12.5357 15.4055C12.2666 16.5204 10.7637 16.7146 10.22 15.7049L7.4763 10.6094L2.00376 8.65488C0.915938 8.26638 0.891983 6.73663 1.96711 6.31426L13.8314 1.65328C14.7729 1.28341 15.741 2.12672 15.5036 3.11002ZM7.56678 10.6417L7.56645 10.6416C7.56656 10.6416 7.56667 10.6416 7.56678 10.6417L7.65087 10.4062L7.56678 10.6417Z"
            strokeWidth="1.5"
          />
        </svg>
      </Stack>
    </Box>
  );
}

function Board({ step }: { step: number }) {
  const mobile = useMobileMode();
  const [cardScrollProgress, setCardScrollProgress] = useState(0);
  const cardColor = useMemo(
    () =>
      ["danger", "warning", "success"][
        Math.floor(cardScrollProgress * 3)
      ] as ColorPaletteProp,
    [cardScrollProgress]
  );
  return (
    <Sheet
      sx={{
        pointerEvents: "none",
        width: "min(50rem, 100%)",
        height: "40rem",
        overflow: "visible",
        background: "transparent",
      }}
    >
      <Parallax
        speed={0}
        style={{
          position: "absolute",
          top: "0",
          left: "0",
          width: "100%",
          height: "130%",
        }}
      >
        <Grid />
      </Parallax>
      <Parallax
        speed={10}
        style={{
          position: "absolute",
          top: "20%",
          left: "10%",
        }}
      >
        <Card
          variant="outlined"
          sx={{
            filter: "drop-shadow(0 0 20px var(--joy-palette-background-body))",
          }}
        >
          <Typography level="h3">
            <Typography textColor="text.tertiary">Design.</Typography>
            <br />
            <Typography textColor="text.secondary">Develop.</Typography>
            <br />
            <Typography>Deploy.</Typography>
            <br />
          </Typography>
        </Card>
      </Parallax>
      <Parallax
        speed={15}
        onProgressChange={(progress) => {
          if (progress < 0.7) {
            setCardScrollProgress(progress);
          } else {
            setCardScrollProgress(0.7);
          }
        }}
        style={{
          position: "absolute",
          top: mobile ? "40%" : "35%",
          right: mobile ? undefined : "25%",
          left: mobile ? "1rem" : undefined,
        }}
      >
        <Card
          variant="outlined"
          sx={{
            filter: "drop-shadow(0 0 20px var(--joy-palette-background-body))",
          }}
        >
          <Typography level="h5" fontWeight="700">
            Productivity{" "}
            <Typography textColor="text.secondary">at its finest.</Typography>
          </Typography>
          <Typography level="body1" textColor="text.secondary">
            With{" "}
            <Typography textColor="text.primary" fontWeight="700">
              quality
            </Typography>{" "}
            and{" "}
            <Typography textColor="text.primary" fontWeight="700">
              sustainability
            </Typography>{" "}
            at heart.
          </Typography>
          <Default>
            <Card
              variant="outlined"
              color={cardColor}
              className="indicator"
              sx={(theme) => ({
                position: "absolute",
                padding: "0.2rem 1rem",
                width: "max-content",
                top: "50%",
                left: "calc(100% + 2rem)",
                transform: "translateY(-50%)",
                border: `1px dashed ${theme.palette[cardColor][500]}`,
                "&::before": {
                  content: '""',
                  position: "absolute",
                  top: "50%",
                  right: "calc(100% + 1px)",
                  width: "calc(2rem - 1px)",
                  height: "1rem",
                  borderTop: `1px dashed ${theme.palette[cardColor][500]}`,
                },
              })}
            >
              <code style={{ fontSize: "0.9rem" }}>
                {`+ ${(50 * cardScrollProgress).toFixed(2)} px`}
              </code>
            </Card>
          </Default>
          <Mobile>
            <Card
              variant="outlined"
              color={cardColor}
              className="indicator"
              sx={(theme) => ({
                position: "absolute",
                padding: "0.2rem 1rem",
                width: "max-content",
                top: "calc(100% + 2rem)",
                left: "50%",
                transform: "translateY(-50%)",
                border: `1px dashed ${theme.palette[cardColor][500]}`,
                "&::before": {
                  content: '""',
                  position: "absolute",
                  top: "-1rem",
                  right: "calc(100% + 1px)",
                  width: "calc(2rem - 1px)",
                  height: "2rem",
                  borderBottom: `1px dashed ${theme.palette[cardColor][500]}`,
                  borderLeft: `1px dashed ${theme.palette[cardColor][500]}`,
                  borderRadius: "0 0 0 1rem",
                },
              })}
            >
              <code style={{ fontSize: "0.9rem" }}>
                {`+ ${(50 * cardScrollProgress).toFixed(2)} px`}
              </code>
            </Card>
          </Mobile>
        </Card>
      </Parallax>
      <Card
        variant="outlined"
        sx={{
          position: "absolute",
          padding: 1,
          filter: "drop-shadow(0 0 20px var(--joy-palette-background-body))",
          ...(mobile
            ? {
                top: "12%",
                right: "1rem",
              }
            : {
                top: "10%",
                left: "60%",
              }),
        }}
      >
        <Stack direction="row" gap={1}>
          <Avatar
            alt="Innovate"
            size="lg"
            sx={{
              fontSize: "1.5rem",
              borderRadius: "var(--Card-radius)",
            }}
          >
            <HiOutlineSparkles />
          </Avatar>
          <Stack direction="column">
            <Typography>Innovate.</Typography>
            <Typography level="body2" whiteSpace="nowrap">
              Shape tomorrow&apos;s guidelines.
            </Typography>
          </Stack>
        </Stack>
      </Card>
      <Card
        variant="outlined"
        sx={{
          position: "absolute",
          top: "70%",
          left: "50%",
          transform: "translateX(-50%)",
          filter: "drop-shadow(0 0 20px var(--joy-palette-background-body))",
          display: "flex",
          flexDirection: "row",
        }}
      >
        <Button variant="outlined" color="neutral">
          Discover
        </Button>
        <Button variant="soft" color="neutral" sx={{ whiteSpace: "nowrap" }}>
          Get Started
        </Button>
        <Button
          color="primary"
          startDecorator={<MdOutlineRocketLaunch />}
          sx={{ whiteSpace: "nowrap" }}
        >
          Ship it
        </Button>
        <Comment step={step} />
      </Card>
    </Sheet>
  );
}

export default function Goals() {
  const mobile = useMobileMode();

  const animationDelay = 0.2;

  const [scrollingProgress, setScrollingProgress] = useState(0);
  const animationStep = useMemo(
    () =>
      Math.min(
        Math.round(
          Math.max(0, scrollingProgress - animationDelay) *
            (6 / (1 - animationDelay))
        ),
        5
      ),
    [scrollingProgress]
  );

  return (
    <Parallax
      shouldAlwaysCompleteAnimation
      onProgressChange={(progress) => setScrollingProgress(progress)}
    >
      <Stack
        sx={{
          width: "100%",
          height: "1200px",
          marginTop: mobile ? "10rem" : "0",
          position: "relative",
        }}
        p="37px"
      >
        <Default>
          <Cursor step={animationStep} />
        </Default>
        <Stack
          sx={{
            position: "absolute",
            gap: 1,
            zIndex: 1,
            textAlign: mobile ? "center" : "right",
            ...(mobile
              ? {
                  top: "-10rem",
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: "100%",
                  alignItems: "center",
                }
              : {
                  top: "-2.5rem",
                  right: "0",
                  alignItems: "flex-end",
                }),
          }}
        >
          <Mobile>
            <Avatar
              color="danger"
              sx={(theme) => ({
                position: "relative",
                border: "none",
                outline: `2px solid ${theme.palette.danger[500]}`,
                boxShadow: `0 0 40px 5px rgba(${theme.palette.danger.mainChannel} / 0.4)`,
                overflow: "visible",
                marginTop: "3rem",
                marginBottom: "1rem",
                "&::before": {
                  content: '""',
                  position: "absolute",
                  top: "-5rem",
                  height: "5rem",
                  width: "2px",
                  background: `linear-gradient(to bottom, transparent, ${theme.palette.danger[400]})`,
                },
              })}
            >
              <TbHeartHandshake />
            </Avatar>
          </Mobile>
          <Typography
            level="h2"
            sx={{
              position: "relative",
            }}
            id="footer"
          >
            <Typography textColor="danger.400" fontWeight="xl">
              Software.
            </Typography>
            {mobile ? <br /> : " "}
            The way we see it.
            <Default>
              <Avatar
                color="danger"
                sx={(theme) => ({
                  position: "absolute",
                  top: "0",
                  right: "-50px",
                  transform: "translateX(50%)",
                  border: "none",
                  outline: `2px solid ${theme.palette.danger[500]}`,
                  boxShadow: `0 0 40px 5px rgba(${theme.palette.danger.mainChannel} / 0.4)`,
                })}
              >
                <TbHeartHandshake />
              </Avatar>
            </Default>
          </Typography>
          <Typography level="body1" textColor="text.secondary">
            Let&apos;s build products that people love.{" "}
            <Typography textColor="text.primary" fontWeight="600">
              Together.
            </Typography>
          </Typography>
        </Stack>
        <Stack
          component="div"
          sx={{
            width: mobile ? "100vw" : "100%",
            height: "100%",
            margin: mobile ? "0 calc(-50vw + 50%)" : "0",
          }}
        >
          <Board step={animationStep} />
          <Reach step={animationStep} />
        </Stack>
      </Stack>
    </Parallax>
  );
}
