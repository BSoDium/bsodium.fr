import type { Meta, StoryObj } from '@storybook/react-vite';
import Experience from './Experience';

/**
 * Work experience timeline listing roles at Kanop, Tauniqo/TalentYou, and
 * Escape Technologies in a left-bordered layout.
 */
const meta: Meta<typeof Experience> = {
  title: 'Sections/Experience',
  component: Experience,
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
