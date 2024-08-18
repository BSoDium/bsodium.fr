import { Button, Stack, useColorScheme, VariantProp } from "@mui/joy";
import Color from "color";
import React, { useMemo } from "react";

function getPalette(
  primaryColor: string,
  colorScheme: "light" | "dark" = "dark"
): {
  color: string;
  backgroundColor: string;
  borderColor: string;
  shadow: {
    1: string;
    2: string;
    3: string;
    4: string;
  };
} {
  const color = Color(primaryColor);
  const hsl = color.hsl();

  return colorScheme === "light"
    ? {
        color: hsl.lightness(5).hex(),
        backgroundColor: hsl.lightness(90).hex(),
        borderColor: hsl.lightness(80).hex(),
        shadow: {
          1: hsl.lightness(95).hex(),
          2: hsl.lightness(90).hex(),
          3: hsl.lightness(85).hex(),
          4: hsl.lightness(80).hex(),
        },
      }
    : {
        color: hsl.lightness(90).hex(),
        backgroundColor: hsl.lightness(10).hex(),
        borderColor: hsl.lightness(20).hex(),
        shadow: {
          1: hsl.lightness(5).hex(),
          2: hsl.lightness(10).hex(),
          3: hsl.lightness(15).hex(),
          4: hsl.lightness(20).hex(),
        },
      };
}

type LinkProps = {
  url: string;
  icon: React.ReactNode;
  title: string;
  color?: string;
  variant?: VariantProp;
};

export function Link({
  url,
  icon,
  title,
  color,
  variant,
}: NonNullable<LinkProps>) {
  const { colorScheme } = useColorScheme();

  const { shadow, ...css } = color
    ? getPalette(color, colorScheme)
    : { shadow: undefined };

  return (
    <Button
      component="a"
      href={url}
      target="_blank"
      size="lg"
      color="neutral"
      variant={variant || "outlined"}
      startDecorator={icon}
      sx={{
        transition: "all 0.2s ease",
        "&:hover":
          css && shadow
            ? {
                ...css,
                transform: "translateY(-.8rem)",
                filter: `drop-shadow(0 .2rem 0 ${shadow[4]}) drop-shadow(0 .2rem 0 ${shadow[3]}) drop-shadow(0 .2rem 0 ${shadow[2]}) drop-shadow(0 .2rem 0 ${shadow[1]})`,
                "&:after": {
                  content: '""',
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  width: "100%",
                  height: ".8rem",
                },
              }
            : undefined,
        "&:active":
          css && shadow
            ? {
                ...css,
                transform: "translateY(-.4rem)",
                filter: `drop-shadow(0 .1rem 0 ${shadow[4]}) drop-shadow(0 .1rem 0 ${shadow[3]}) drop-shadow(0 .1rem 0 ${shadow[2]}) drop-shadow(0 .1rem 0 ${shadow[1]})`,
                "&:after": {
                  content: '""',
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  width: "100%",
                  height: ".4rem",
                },
              }
            : undefined,
      }}
    >
      {title}
    </Button>
  );
}

export default function LinkCarousel({
  links,
  repeat = 2,
}: {
  links: LinkProps[];
  repeat?: number;
}) {
  const repeatedLinks = useMemo(
    () => Array.from({ length: repeat }, () => links).flat(),
    [links, repeat]
  );

  const animationDurations = useMemo(
    () => [Math.random() * 30 + 40, Math.random() * 30 + 40],
    []
  );

  return (
    <Stack
      gap={1}
      sx={{
        position: "relative",
        py: ".8rem",
        overflow: "hidden",
        width: "100%",
        marginX: -5,
        maskImage:
          "linear-gradient(to right, transparent, black 20%, black 80%, transparent)",
        "& > *": {
          "@keyframes slide": {
            "0%": {
              transform: "translateX(0)",
            },
            "100%": {
              transform: `translateX(calc(-${
                (repeat - 1) * (100 / repeat)
              }% - 8px))`,
            },
          },
        },
      }}
    >
      {[repeatedLinks, repeatedLinks.slice().reverse()].map((_links, i) => (
        <Stack
          key={i}
          direction="row"
          gap={1}
          sx={{
            width: "max-content",
            animation: `slide ${animationDurations[i]}s linear infinite`,
            "&:hover": {
              animationPlayState: "paused",
            },
          }}
        >
          {_links.map((link, index) => (
            <Link {...link} key={index} />
          ))}
        </Stack>
      ))}
    </Stack>
  );
}
