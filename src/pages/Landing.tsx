import React from "react";
import { Stack, Typography, TypographyProps } from "@mui/joy";
import { SxProps, TextColor } from "@mui/joy/styles/types";
import Meta from "@/components/Meta";
import { ParallaxProvider } from "react-scroll-parallax";
import details from "@/assets/Details";

export function ATypography({
  children,
  href = "#",
  target = "_blank",
  textColor = "inherit",
  sx = {},
  ...props
}: {
  children: React.ReactNode;
  href?: string;
  target?: string;
  textColor?: TextColor;
  sx?: SxProps;
} & TypographyProps) {
  return (
    <Typography
      component="a"
      href={href}
      target={target}
      textColor={textColor}
      sx={{
        textDecoration: "dotted underline",
        "&:hover": {
          textDecoration: "underline",
        },
        ...sx,
      }}
      {...props}
    >
      {children}
    </Typography>
  );
}

export default function Landing() {
  return (
    <ParallaxProvider>
      <Meta title={`Home • ${details.name.first} ${details.name.last}`} />
      <Stack overflow="hidden" marginTop="var(--navigation-bar-height)">
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            position: "relative",
            width: "100vw",
          }}
        >
          We are working on this.
        </div>
      </Stack>
    </ParallaxProvider>
  );
}
