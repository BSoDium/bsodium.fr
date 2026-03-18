import type { Meta, StoryObj } from '@storybook/react-vite';
import Header from './Header';

/**
 * Fixed navigation bar with the BSoDium logo and section anchor links.
 * Uses `layout: 'fullscreen'` so the full-width sticky positioning is visible.
 */
const meta: Meta<typeof Header> = {
  title: 'Components/Header',
  component: Header,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
