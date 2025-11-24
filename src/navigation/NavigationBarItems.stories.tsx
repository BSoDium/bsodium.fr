import type { Meta, StoryObj } from "@storybook/react-vite";
import { BrowserRouter } from "react-router-dom";
import NavigationBarItems from "./NavigationBarItems";
import ThemeProvider from "@/components/ThemeProvider";
import { Stack, Typography, Box } from "@mui/joy";

const meta: Meta<typeof NavigationBarItems> = {
  title: "Navigation/NavigationBarItems",
  component: NavigationBarItems,
  parameters: {
    layout: "centered",
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
type Story = StoryObj<typeof NavigationBarItems>;

export const FlexRow: Story = {
  render: () => (
    <Box sx={{ width: "100%", padding: 4 }}>
      <Typography level="h4" gutterBottom>
        Horizontal Layout (Row)
      </Typography>
      <Typography sx={{ marginBottom: 2 }} textColor="text.secondary">
        Navigation items displayed in a horizontal row, typically used in
        desktop navigation bars.
      </Typography>
      <Stack direction="row" gap={1}>
        <NavigationBarItems />
      </Stack>
    </Box>
  ),
};

export const FlexColumn: Story = {
  render: () => (
    <Box sx={{ width: "100%", padding: 4 }}>
      <Typography level="h4" gutterBottom>
        Vertical Layout (Column)
      </Typography>
      <Typography sx={{ marginBottom: 2 }} textColor="text.secondary">
        Navigation items stacked vertically, typically used in mobile menus or
        sidebars.
      </Typography>
      <Stack direction="column" gap={1} alignItems="flex-start">
        <NavigationBarItems />
      </Stack>
    </Box>
  ),
};
