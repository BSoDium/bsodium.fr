import { createPortal } from "react-dom";
import { Card } from "@mui/joy";
import { motion } from "motion/react";
import { useEffect, useRef } from "react";

export default function MobileMenuPanel({
  open,
  onClose,
}: {
  open?: boolean;
  onClose?: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !onClose) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    // Add a small delay to prevent immediate closure when opening
    const timeoutId = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open, onClose]);

  return open
    ? createPortal(
        <Card
          ref={panelRef}
          component={motion.div}
          style={{
            position: "fixed",
            overflow: "hidden",
            top: 0,
            right: 0,
            width: "100vw",
            height: "100vh",
            borderRadius: 0,
            padding: "1rem",
            paddingTop: "4rem",
            zIndex: 2000,
            display: "flex",
            gap: "0.5rem",
            flexDirection: "column",
            alignItems: "stretch",
          }}
          sx={{
            boxShadow: "lg",
          }}
        >
          Mobile menu panel content
        </Card>,
        document.body
      )
    : null;
}
