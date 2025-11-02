import type { Meta, StoryObj } from "@storybook/react-vite";
import ThemeSwitcher from "./ThemeSwitcher";
import ThemeProvider from "@/components/ThemeProvider";
import { CssBaseline } from "@mui/joy";

const meta: Meta<typeof ThemeSwitcher> = {
  title: "Navigation/ThemeSwitcher",
  component: ThemeSwitcher,
  decorators: [
    (Story) => (
      <ThemeProvider>
        <CssBaseline />
        <Story />
      </ThemeProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ThemeSwitcher>;

export const Default: Story = {};
