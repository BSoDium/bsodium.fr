import NavigationBarItems from "@/navigation/NavigationBarItems";
import ThemeSwitcher from "@/navigation/ThemeSwitcher";
import { Box, IconButton, Stack } from "@mui/joy";
import { LuX } from "react-icons/lu";

export default function FullscreenMenu({ onClose }: { onClose: () => void }) {
  return (
    <Box
      sx={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "var(--joy-palette-background-surface)",
        zIndex: 2000,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
      }}
    >
      <IconButton
        onClick={onClose}
        sx={{ position: "absolute", top: "1.5rem", right: "1.5rem" }}
      >
        <LuX />
      </IconButton>
      <Stack direction="column" gap={2} alignItems="center">
        <NavigationBarItems />
      </Stack>
      <ThemeSwitcher />
    </Box>
  );
}
