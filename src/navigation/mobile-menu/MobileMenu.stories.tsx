import type { Meta, StoryObj } from "@storybook/react-vite";
import { BrowserRouter } from "react-router-dom";
import MobileMenu from "./MobileMenu";
import ThemeProvider from "@/components/ThemeProvider";
import { Box, Typography } from "@mui/joy";

const meta: Meta<typeof MobileMenu> = {
  title: "Navigation/MobileMenu",
  component: MobileMenu,
  parameters: {
    layout: "centered",
    viewport: {
      defaultViewport: "mobile1",
    },
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
type Story = StoryObj<typeof MobileMenu>;

export const Default: Story = {
  render: () => (
    <Box sx={{ padding: 2 }}>
      <Typography gutterBottom textColor="text.secondary">
        Click the menu button to open the mobile navigation panel
      </Typography>
      <MobileMenu />
    </Box>
  ),
};

export const InContext: Story = {
  render: () => (
    <Box
      sx={{
        width: "100%",
        minHeight: "100vh",
        backgroundColor: "background.body",
      }}
    >
      <Box
        sx={{
          position: "fixed",
          top: 0,
          right: 0,
          padding: 2,
          zIndex: 1000,
        }}
      >
        <MobileMenu />
      </Box>
      <Box sx={{ padding: 4, paddingTop: 8 }}>
        <Typography level="h1" gutterBottom>
          Mobile Navigation Demo
        </Typography>
        <Typography>
          The mobile menu button is positioned in the top-right corner. Click it
          to open the navigation panel and explore the mobile navigation
          experience.
        </Typography>
        <Typography sx={{ marginTop: 2 }}>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Etiam nec
          auctor quam. Integer vitae felis lectus. Proin dictum metus nulla, in
          blandit quam maximus at.
        </Typography>
      </Box>
    </Box>
  ),
  parameters: {
    layout: "fullscreen",
  },
};
