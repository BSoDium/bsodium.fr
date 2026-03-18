import type { Meta, StoryObj } from '@storybook/react-vite';
import Globe from './Globe';

/**
 * Interactive 3D globe powered by react-globe.gl. Displays animated arcs
 * between European cities on a dark hexagonal polygon map with auto-rotation.
 *
 * The component fills its parent container, so a fixed-size wrapper is
 * provided in the story decorator below.
 */
const meta: Meta<typeof Globe> = {
  title: 'Components/Globe',
  component: Globe,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div style={{ width: '600px', height: '500px' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
