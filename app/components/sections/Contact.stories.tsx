import type { Meta, StoryObj } from '@storybook/react-vite';
import Contact from './Contact';

/**
 * Contact section with GitHub, LinkedIn, and email links rendered as
 * bordered button-style anchors.
 */
const meta: Meta<typeof Contact> = {
  title: 'Sections/Contact',
  component: Contact,
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
