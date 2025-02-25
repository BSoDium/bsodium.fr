import { IconButton } from "@mui/joy";
import { ComponentProps } from "react";

export type FloatingActionButtonProps = {} & ComponentProps<typeof IconButton>;
export default ({ color, variant, sx, ...rest }: FloatingActionButtonProps) => {
  return (
    <IconButton
      color={color}
      variant={variant}
      {...rest}
      sx={{
        position: "fixed",
        boxShadow: "lg",
        backgroundColor: `var(--joy-palette-${color}-${variant}Bg, var(--joy-palette-background-body))`,
        bottom: "calc(1rem + var(--nav-safe-area-inset-bottom))",
        right: "1rem",
        zIndex: 999,
        transition: "all 0.2s",
        "&:active": {
          transform: "scale(0.95)",
        },
        ...sx,
      }}
    />
  );
};
