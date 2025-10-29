import type { Meta, StoryObj } from "@storybook/react-vite";
import ProgressiveImage from "./ProgressiveImage";
import vaderImageData from "@/assets/vader.webp?progressive";

const meta: Meta<typeof ProgressiveImage> = {
  component: ProgressiveImage,
  title: "Components/ProgressiveImage",
};

export default meta;
type Story = StoryObj<typeof ProgressiveImage>;

export const Default: Story = {
  args: {
    variants: vaderImageData,
    alt: "Darth Vader",
    style: {
      width: "100%",
      height: "auto",
      backgroundColor: "black",
    },
  },
};

