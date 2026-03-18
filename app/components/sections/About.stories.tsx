import type { Meta, StoryObj } from '@storybook/react-vite';
import About from './About';

/**
 * Introductory about section with a scroll-triggered fade-in animation.
 */
const meta: Meta<typeof About> = {
  title: 'Sections/About',
  component: About,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
  decorators: [
    (Story) => (
      <div className="max-w-3xl mx-auto py-16 px-8">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
