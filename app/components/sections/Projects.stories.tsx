import type { Meta, StoryObj } from '@storybook/react-vite';
import Projects from './Projects';

/**
 * Project showcase in a two-column card grid, each card containing a title,
 * description, tag chips, and an optional external link.
 */
const meta: Meta<typeof Projects> = {
  title: 'Sections/Projects',
  component: Projects,
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
