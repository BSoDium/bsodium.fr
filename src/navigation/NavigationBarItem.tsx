import { Button } from "@mui/joy";
import { AnimatePresence, motion } from "motion/react";
import { ReactNode } from "react";
import { NavLink, NavLinkProps, useMatch } from "react-router-dom";
import { useNavigationBar } from "./NavigationBarContext";

export default function NavigationBarItem({
  children,
  to,
  ...props
}: NavLinkProps) {
  const id = `${to}`;
  const { hoveredItem, setHoveredItem } = useNavigationBar();
  const isHovered = hoveredItem === id;
  const isActive = useMatch(to as string) !== null;

  return (
    <NavLink to={to} {...props} style={{ textDecoration: "none" }}>
      <Button
        component={motion.div}
        layoutId={`${id}-nav-item-button`}
        variant="plain"
        color="neutral"
        onMouseEnter={() => {
          setHoveredItem(id);
        }}
        onMouseLeave={() => {
          setHoveredItem(null);
        }}
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
          "--content-scale": 1,
          color: isActive
            ? "var(--joy-palette-neutral-solidColor)"
            : "var(--joy-palette-text-secondary)",
        }}
        whileTap={{
          "--content-scale": 0.95,
        }}
      >
        <AnimatePresence>
          {isHovered && (
            <motion.div
              layoutId="nav-item-hovered-bg"
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
                zIndex: -2,
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
          )}
        </AnimatePresence>
        {isActive && (
          <motion.div
            layoutId="nav-item-active-bg"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              borderRadius: "100vmax",
              padding: ".6rem .75rem .6rem .75rem",
              backgroundColor: "var(--joy-palette-neutral-solidBg)",
              pointerEvents: "none",
              zIndex: -1,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
        )}
        <motion.div
          style={{
            display: "flex",
            alignItems: "center",
            whiteSpace: "nowrap",
            scale: "var(--content-scale)",
            zIndex: 1,
          }}
        >
          {children as ReactNode}
        </motion.div>
      </Button>
    </NavLink>
  );
}
