import type { Meta, StoryObj } from "@storybook/react-vite";
import { BrowserRouter } from "react-router-dom";
import FullscreenMenu from "./FullscreenMenu";
import ThemeProvider from "@/components/ThemeProvider";
import { Button, Box, Typography } from "@mui/joy";
import { useState } from "react";

const meta: Meta<typeof FullscreenMenu> = {
  title: "Navigation/FullscreenMenu",
  component: FullscreenMenu,
  parameters: {
    layout: "fullscreen",
  },
  decorators: [
    (Story) => (
      <BrowserRouter>
        <ThemeProvider>
          <Story />
        </ThemeProvider>
      </BrowserRouter>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof FullscreenMenu>;

/**
 * Wrapper component to demonstrate the menu with a trigger button
 */
function MenuDemo() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Box sx={{ padding: 4, minHeight: "100vh" }}>
      <Typography level="h2" gutterBottom>
        Fullscreen Menu Demo
      </Typography>
      <Typography sx={{ marginBottom: 2 }}>
        Click the button below to open the fullscreen menu overlay.
      </Typography>
      <Button onClick={() => setIsOpen(true)} color="primary" variant="solid">
        Open Menu
      </Button>

      {isOpen && (
        <FullscreenMenu
          onClose={() => setIsOpen(false)}
          rootId="storybook-root"
        />
      )}
    </Box>
  );
}

export const Default: Story = {
  render: () => <MenuDemo />,
};

export const AlwaysOpen: Story = {
  render: () => (
    <Box sx={{ minHeight: "100vh" }}>
      <FullscreenMenu
        onClose={() => {
          /* Menu close handler */
        }}
        rootId="storybook-root"
      />
    </Box>
  ),
};

/**
 * Demo with contextual content behind the menu to show the backdrop blur effect
 */
function MenuWithContent() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Box sx={{ padding: 4, minHeight: "100vh" }}>
      <Typography level="h2" gutterBottom>
        Menu with Background Content
      </Typography>
      <Typography sx={{ marginBottom: 2 }}>
        This demonstrates the backdrop blur effect over page content.
      </Typography>
      <Button onClick={() => setIsOpen(true)} color="primary" variant="solid">
        Open Menu
      </Button>

      <Box sx={{ marginTop: 4 }}>
        <Typography level="h3" gutterBottom>
          Sample Content
        </Typography>
        {Array.from({ length: 10 }).map((_, i) => (
          <Typography key={i} sx={{ marginTop: 2 }}>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
            eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim
            ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut
            aliquip ex ea commodo consequat.
          </Typography>
        ))}
      </Box>

      {isOpen && (
        <FullscreenMenu
          onClose={() => setIsOpen(false)}
          rootId="storybook-root"
        />
      )}
    </Box>
  );
}

export const WithBackgroundContent: Story = {
  render: () => <MenuWithContent />,
};
