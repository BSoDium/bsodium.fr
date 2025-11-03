import { Button, ButtonProps } from "@mui/joy";
import { AnimatePresence, motion } from "motion/react";
import { useLocation } from "react-router-dom";
import { navigationBarItems } from "../items";
import { css } from "@emotion/react";
import { LuMenu, LuX } from "react-icons/lu";
import { useEffect, useState } from "react";

export default function MenuButton({
  open,
  ...props
}: ButtonProps & { open?: boolean }) {
  const { pathname } = useLocation();
  const currentItem = navigationBarItems.find((item) => item.path === pathname);

  const [displayItemIcon, setDisplayItemIcon] = useState(true);

  // Display the icon for 3 seconds after pathname changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setDisplayItemIcon(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, [pathname]);

  if (!currentItem) {
    return null;
  }

  const { icon: Icon, label } = currentItem;
  const ButtonIcon = open ? LuX : displayItemIcon ? Icon : LuMenu;

  return (
    <Button
      component={motion.button}
      layoutId="menu-button"
      variant="plain"
      color="neutral"
      style={{
        position: "relative",
        minHeight: "fit-content",
        borderRadius: "100vmax",
        padding: ".6rem .75rem .6rem .6rem",
        fontSize: "var(--joy-fontSize-sm)",
        fontWeight: `var(--joy-fontWeight-md)`,
        color: "var(--joy-palette-text-primary)",
        backgroundColor:
          "color-mix(in srgb, var(--joy-palette-neutral-softBg), transparent 100%)",
      }}
      whileHover={{
        backgroundColor:
          "color-mix(in srgb, var(--joy-palette-neutral-softBg), transparent 50%)",
      }}
      whileTap={{
        backgroundColor:
          "color-mix(in srgb, var(--joy-palette-neutral-softBg), transparent 0%)",
      }}
      {...props}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          style={{
            position: "absolute",
            top: "-1px",
            left: "-1px",
            width: "calc(100% + 2px)",
            height: "calc(100% + 2px)",
            borderRadius: "100vmax",
            pointerEvents: "none",
            zIndex: -1,
          }}
          css={css`
            border: 1px solid #0000;
            background: linear-gradient(
                  var(--joy-palette-background-body),
                  var(--joy-palette-background-body)
                )
                padding-box,
              linear-gradient(
                  var(--angle),
                  rgba(0, 0, 0, 0),
                  var(--joy-palette-text-tertiary),
                  rgba(0, 0, 0, 0),
                  rgba(0, 0, 0, 0),
                  var(--joy-palette-text-secondary)
                )
                border-box;
            animation: 8s rotate linear infinite;

            &::before {
              content: "";
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              border-radius: 100vmax;
              background: inherit;
              border: 5px solid #0000;
              filter: blur(8px);
              z-index: -1;
            }

            @keyframes rotate {
              to {
                --angle: 360deg;
              }
            }

            @property --angle {
              syntax: "<angle>";
              initial-value: 0deg;
              inherits: false;
            }
          `}
        />
        (
        <motion.span
          initial={{ opacity: 0, rotate: -90 }}
          animate={{ opacity: 1, rotate: 0 }}
          exit={{ opacity: 0, rotate: 90 }}
          style={{ marginRight: "0.5rem", lineHeight: 0 }}
          key={`icon-${displayItemIcon}-${open}`}
        >
          <ButtonIcon />
        </motion.span>
        <motion.span
          style={{
            display: "flex",
            alignItems: "center",
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </motion.span>
      </AnimatePresence>
    </Button>
  );
}
