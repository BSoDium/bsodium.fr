import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { Box, Sheet } from "@mui/joy";
import { useState } from "react";

import ProgressiveImage from "../components/ProgressiveImage";

// Import actual image data from your assets
import balloonData from "@/assets/balloon.webp?progressive";
import planetDarkData from "@/assets/planet_dark.webp?progressive";
import skyData from "@/assets/sky.webp?progressive";
import mountainsDarkData from "@/assets/mountains_dark.webp?progressive";

// Mock data for different scenarios
const createMockImageData = (
  baseName: string,
  originalWidth: number,
  originalHeight: number
) => {
  const percentages = [0.15, 0.35, 0.65, 1.0];
  const formats = ["avif", "webp", "png"] as const;

  return formats.flatMap((format) =>
    percentages.map((percent) => ({
      src: `/mock-images/${baseName}-${Math.round(
        originalWidth * percent
      )}w.${format}`,
      width: Math.round(originalWidth * percent),
      height: Math.round(originalHeight * percent),
      format,
    }))
  );
};

// Mock image datasets for different use cases
const mockSmallIcon = createMockImageData("small-icon", 64, 64);
const mockMediumImage = createMockImageData("medium-image", 400, 300);
const mockPortraitImage = createMockImageData("portrait", 600, 800);
const mockWideImage = createMockImageData("wide", 1000, 400);

// Loading state demo component
const LoadingDemo = ({ meta, title }: { meta: any; title: string }) => {
  const [loadCount, setLoadCount] = useState(0);
  const [loadTimes, setLoadTimes] = useState<number[]>([]);

  const handleLoad = () => {
    setLoadCount((prev) => prev + 1);
    setLoadTimes((prev) => [...prev, Date.now()]);
  };

  return (
    <Box
      sx={{
        p: 2,
        border: "1px solid",
        borderColor: "divider",
        borderRadius: "sm",
      }}
    >
      <h4>{title}</h4>
      <ProgressiveImage
        meta={meta}
        alt={title}
        onLoad={handleLoad}
        style={{ maxWidth: "100%", height: "auto" }}
      />
      <Box sx={{ mt: 1, fontSize: "sm", color: "text.secondary" }}>
        Loads: {loadCount} | Load times:{" "}
        {loadTimes.length > 0
          ? loadTimes.map((t) => new Date(t).toLocaleTimeString()).join(", ")
          : "None"}
      </Box>
    </Box>
  );
};

// Intersection Observer Demo
const LazyLoadingDemo = () => {
  return (
    <Box sx={{ height: "200vh" }}>
      <Box
        sx={{
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "background.level1",
        }}
      >
        <h2>Scroll down to see lazy loading in action ⬇️</h2>
      </Box>
      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          p: 2,
        }}
      >
        <LoadingDemo meta={balloonData} title="Balloon (Lazy)" />
        <LoadingDemo meta={planetDarkData} title="Planet (Lazy)" />
        <LoadingDemo meta={skyData} title="Sky (Lazy)" />
        <LoadingDemo meta={mountainsDarkData} title="Mountains (Lazy)" />
      </Box>
    </Box>
  );
};

// Performance comparison component
const PerformanceComparison = () => {
  return (
    <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: "1fr 1fr" }}>
      <Sheet sx={{ p: 2, borderRadius: "sm" }}>
        <h4>With Progressive Loading</h4>
        <ProgressiveImage
          meta={balloonData}
          alt="Balloon with progressive loading"
          style={{ width: "100%", maxWidth: "300px", height: "auto" }}
        />
        <Box sx={{ mt: 1, fontSize: "sm", color: "success.500" }}>
          ✅ Blur placeholder while loading
          <br />
          ✅ Multiple formats (AVIF, WebP, PNG)
          <br />
          ✅ Responsive image sizes
          <br />✅ Lazy loading with intersection observer
        </Box>
      </Sheet>

      <Sheet sx={{ p: 2, borderRadius: "sm" }}>
        <h4>Regular Image (for comparison)</h4>
        <img
          src={balloonData[balloonData.length - 1]?.src}
          alt="Regular image loading"
          style={{ width: "100%", maxWidth: "300px", height: "auto" }}
          loading="lazy"
        />
        <Box sx={{ mt: 1, fontSize: "sm", color: "warning.500" }}>
          ⚠️ No progressive loading
          <br />
          ⚠️ Single format only
          <br />
          ⚠️ Fixed size
          <br />
          ⚠️ Basic lazy loading only
        </Box>
      </Sheet>
    </Box>
  );
};

const meta = {
  title: "Components/ProgressiveImage",
  component: ProgressiveImage,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: `
A React component that progressively loads images using multiple resolutions and formats.
It provides:

- **Progressive Loading**: Shows a blurred low-res placeholder while loading the full image
- **Responsive Images**: Automatically serves appropriate image sizes based on viewport
- **Modern Formats**: Supports AVIF, WebP, and PNG with automatic fallbacks
- **Lazy Loading**: Uses Intersection Observer for performance
- **Smooth Transitions**: Animated transition from placeholder to full image

The component works with vite-imagetools to automatically generate multiple image variants
from a single source image at build time.
        `,
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    meta: {
      description:
        "Array of image metadata objects with different sizes and formats",
      control: false,
    },
    alt: {
      description: "Alternative text for the image",
      control: "text",
    },
    onLoad: {
      description: "Callback fired when the high-resolution image loads",
      action: "loaded",
    },
    style: {
      description: "CSS styles to apply to the image element",
      control: "object",
    },
  },
  args: {
    onLoad: fn(),
  },
} satisfies Meta<typeof ProgressiveImage>;

export default meta;
type Story = StoryObj<typeof meta>;

// Basic usage with real image data
export const Default: Story = {
  args: {
    meta: balloonData,
    alt: "Hot air balloon floating in the sky",
  },
};

// Different image formats and sizes
export const RealImages: Story = {
  args: {
    meta: balloonData,
    alt: "Real images demo",
  },
  render: () => (
    <Box
      sx={{
        display: "grid",
        gap: 2,
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
      }}
    >
      <LoadingDemo meta={balloonData} title="Balloon" />
      <LoadingDemo meta={planetDarkData} title="Planet Dark" />
      <LoadingDemo meta={skyData} title="Sky" />
      <LoadingDemo meta={mountainsDarkData} title="Mountains" />
    </Box>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "Examples using real images from the project assets with progressive loading.",
      },
    },
  },
};

// Mock data examples for different aspect ratios
export const DifferentSizes: Story = {
  args: {
    meta: mockSmallIcon,
    alt: "Different sizes demo",
  },
  render: () => (
    <Box
      sx={{
        display: "grid",
        gap: 2,
        gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
      }}
    >
      <Box>
        <h4>Small Icon (64×64)</h4>
        <ProgressiveImage meta={mockSmallIcon} alt="Small square icon" />
      </Box>
      <Box>
        <h4>Medium (400×300)</h4>
        <ProgressiveImage meta={mockMediumImage} alt="Medium landscape image" />
      </Box>
      <Box>
        <h4>Portrait (600×800)</h4>
        <ProgressiveImage
          meta={mockPortraitImage}
          alt="Tall portrait image"
          style={{ maxWidth: "150px", height: "auto" }}
        />
      </Box>
      <Box>
        <h4>Wide (1000×400)</h4>
        <ProgressiveImage
          meta={mockWideImage}
          alt="Wide landscape image"
          style={{ maxWidth: "200px", height: "auto" }}
        />
      </Box>
    </Box>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "Progressive images work with any aspect ratio and automatically generate appropriate sizes.",
      },
    },
  },
};

// Styling examples
export const WithCustomStyles: Story = {
  args: {
    meta: balloonData,
    alt: "Custom styles demo",
  },
  render: () => (
    <Box
      sx={{
        display: "grid",
        gap: 3,
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
      }}
    >
      <Box>
        <h4>Rounded Corners</h4>
        <ProgressiveImage
          meta={balloonData}
          alt="Image with rounded corners"
          style={{
            borderRadius: "12px",
            maxWidth: "200px",
            height: "auto",
          }}
        />
      </Box>
      <Box>
        <h4>With Shadow</h4>
        <ProgressiveImage
          meta={planetDarkData}
          alt="Image with shadow"
          style={{
            boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
            maxWidth: "200px",
            height: "auto",
          }}
        />
      </Box>
      <Box>
        <h4>Circular</h4>
        <ProgressiveImage
          meta={skyData}
          alt="Circular image"
          style={{
            borderRadius: "50%",
            width: "150px",
            height: "150px",
            objectFit: "cover",
          }}
        />
      </Box>
      <Box>
        <h4>With Additional Filter</h4>
        <ProgressiveImage
          meta={mountainsDarkData}
          alt="Image with sepia filter"
          style={{
            filter: "sepia(0.5) contrast(1.2)",
            maxWidth: "200px",
            height: "auto",
          }}
        />
      </Box>
    </Box>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "The component supports custom CSS styles including filters, which are preserved during the blur transition.",
      },
    },
  },
};

// Loading state demonstration
export const LoadingStates: Story = {
  args: {
    meta: balloonData,
    alt: "Loading states demo",
  },
  render: () => <LoadingDemo meta={balloonData} title="Watch Load Events" />,
  parameters: {
    docs: {
      description: {
        story:
          "Demonstrates the loading callback and shows how many times the image loads (typically just once due to browser caching).",
      },
    },
  },
};

// Lazy loading demonstration
export const LazyLoading: Story = {
  args: {
    meta: balloonData,
    alt: "Lazy loading demo",
  },
  render: () => <LazyLoadingDemo />,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        story:
          "Scroll down to see how images only start loading when they come into the viewport (with a 50px margin).",
      },
    },
  },
};

// Performance comparison
export const PerformanceDemo: Story = {
  args: {
    meta: balloonData,
    alt: "Performance comparison demo",
  },
  render: () => <PerformanceComparison />,
  parameters: {
    docs: {
      description: {
        story:
          "Side-by-side comparison showing the benefits of progressive loading vs regular image loading.",
      },
    },
  },
};

// Error handling
export const ErrorHandling: Story = {
  args: {
    meta: [
      {
        src: "/non-existent-image.webp",
        width: 400,
        height: 300,
        format: "webp",
      },
    ],
    alt: "This image will fail to load",
  },
  parameters: {
    docs: {
      description: {
        story: "Shows how the component handles broken image URLs gracefully.",
      },
    },
  },
};

// Empty meta array
export const EmptyMeta: Story = {
  args: {
    meta: [],
    alt: "No image data provided",
  },
  parameters: {
    docs: {
      description: {
        story:
          "Component safely handles empty or invalid meta arrays by rendering nothing.",
      },
    },
  },
};

// Accessibility example
export const Accessibility: Story = {
  args: {
    meta: balloonData,
    alt: "Accessibility demo",
  },
  render: () => (
    <Box sx={{ display: "grid", gap: 2 }}>
      <Box>
        <h4>Good Alt Text</h4>
        <ProgressiveImage
          meta={balloonData}
          alt="Colorful hot air balloon floating against a clear blue sky with white clouds"
          style={{ maxWidth: "300px", height: "auto" }}
        />
      </Box>
      <Box>
        <h4>Decorative Image (Empty Alt)</h4>
        <ProgressiveImage
          meta={planetDarkData}
          alt=""
          style={{ maxWidth: "300px", height: "auto" }}
        />
        <Box sx={{ fontSize: "sm", color: "text.secondary", mt: 1 }}>
          Use empty alt="" for decorative images that don't add information
        </Box>
      </Box>
    </Box>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "Examples of proper alt text usage for accessibility. Screen readers will announce descriptive alt text but skip decorative images with empty alt attributes.",
      },
    },
  },
};
