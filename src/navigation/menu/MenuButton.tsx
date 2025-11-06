import { Button, ButtonProps } from "@mui/joy";
import { AnimatePresence, motion } from "motion/react";
import { useLocation } from "react-router-dom";
import { navigationBarItems } from "../items";
import { css } from "@emotion/react";
import { LuMenu, LuX } from "react-icons/lu";
import { useEffect, useState } from "react";

const AnimatedBorder = ({
  borderWidth,
  blur = 0,
}: {
  borderWidth: number;
  blur?: number;
}) => {
  const padding = blur > 0 ? blur * 2 : 0;

  return (
    <span
      style={{
        position: "absolute",
        padding,
        top: `-${borderWidth + padding}px`,
        left: `-${borderWidth + padding}px`,
        width: `calc(100% + ${(borderWidth + padding) * 2}px)`,
        height: `calc(100% + ${(borderWidth + padding) * 2}px)`,
        filter: `blur(${blur}px)`,
        mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0) ",
        maskComposite: "exclude",
        pointerEvents: "none",
        borderRadius: "100vmax",
        zIndex: -1,
      }}
    >
      <motion.span
        style={{
          width: "100%",
          height: "100%",
          display: "block",
          borderRadius: "100vmax",
        }}
        css={css`
          border: ${borderWidth}px solid #0000;
          mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          mask-composite: exclude;
          background: linear-gradient(
              var(--angle),
              rgba(0, 0, 0, 0),
              var(--joy-palette-text-tertiary),
              rgba(0, 0, 0, 0),
              rgba(0, 0, 0, 0),
              var(--joy-palette-text-secondary)
            )
            border-box;
          animation: 8s rotate linear infinite;

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
    </span>
  );
};

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
        <AnimatedBorder borderWidth={3} blur={5} />
        <AnimatedBorder borderWidth={1} />
        <motion.span
          layout
          initial={{ opacity: 0, rotate: -90 }}
          animate={{ opacity: 1, rotate: 0 }}
          exit={{ opacity: 0, rotate: 90 }}
          style={{ marginRight: "0.5rem", lineHeight: 0 }}
          key={`icon-${displayItemIcon}-${open}`}
        >
          <ButtonIcon />
        </motion.span>
        <motion.span
          layout
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
