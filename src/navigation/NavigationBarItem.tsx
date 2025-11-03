import { Button } from "@mui/joy";
import { motion } from "motion/react";
import { ReactNode, useId } from "react";
import { NavLink, NavLinkProps, NavLinkRenderProps } from "react-router-dom";

export default function NavigationBarItem({
  children,
  ...props
}: NavLinkProps) {
  const render = (renderProps: NavLinkRenderProps): ReactNode => {
    const id = useId();
    const { isActive } = renderProps;
    return (
      <Button
        component={motion.button}
        layoutId={`${id}-nav-item-button`}
        variant={"plain"}
        color="neutral"
        style={{
          position: "relative",
          minHeight: "fit-content",
          borderRadius: "100vmax",
          padding: ".6rem .75rem .6rem .6rem",
          fontSize: "var(--joy-fontSize-sm)",
          fontWeight: `var(--joy-fontWeight-md)`,
          backgroundColor:
            "color-mix(in srgb, var(--joy-palette-neutral-softBg), transparent 100%)",
        }}
        animate={{
          color: isActive
            ? "var(--joy-palette-text-primary)"
            : "var(--joy-palette-text-secondary)",
        }}
        whileHover={{
          backgroundColor: isActive
            ? "color-mix(in srgb, var(--joy-palette-neutral-softBg), transparent 100%)"
            : "color-mix(in srgb, var(--joy-palette-neutral-softBg), transparent 50%)",
        }}
        whileTap={{
          backgroundColor:
            "color-mix(in srgb, var(--joy-palette-neutral-softBg), transparent 0%)",
        }}
      >
        {isActive && (
          <motion.span
            layoutId="nav-item-active-bg"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              borderRadius: "100vmax",
              padding: ".6rem .75rem .6rem .75rem",
              backgroundColor: "var(--joy-palette-neutral-softBg)",
              pointerEvents: "none",
              zIndex: -1,
            }}
          />
        )}
        <motion.span
          layout
          style={{
            display: "flex",
            alignItems: "center",
          }}
        >
          {children as ReactNode}
        </motion.span>
      </Button>
    );
  };

  return (
    <NavLink {...props} style={{ textDecoration: "none" }}>
      {render}
    </NavLink>
  );
}
