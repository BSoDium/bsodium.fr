import type { Meta, StoryObj } from '@storybook/react-vite';
import Education from './Education';

/**
 * Education section displaying the ENSEEIHT/Toulouse INP engineering degree
 * in a left-bordered timeline layout.
 */
const meta: Meta<typeof Education> = {
  title: 'Sections/Education',
  component: Education,
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
