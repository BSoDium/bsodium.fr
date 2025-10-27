import { Box } from "@mui/joy";
import { animated } from "@react-spring/web";
import React, { ComponentProps, useEffect, useRef, useState } from "react";

interface ImageMetadata {
  src: string;
  width: number;
  height: number;
  format: string;
}

type ProgressiveImageData = ImageMetadata[];

export default function ProgressiveImage({
  meta,
  alt,
  animate = false,
  style,
  onLoad,
}: {
  meta: ProgressiveImageData;
  alt: string;
  animate?: boolean;
  style?: ComponentProps<typeof animated.img>["style"];
  onLoad?: () => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLImageElement>(null);

  // Intersection observer for lazy loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { rootMargin: "50px" } // Start loading slightly before image enters viewport
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  const handleLoad = () => {
    setLoaded(true);
    onLoad?.();
  };

  if (!meta || meta.length === 0) {
    return null;
  }

  // Sort by width to get the smallest as placeholder and largest as full resolution
  const sortedData = [...meta].sort((a, b) => a.width - b.width);
  const placeholder = sortedData[0]; // Smallest (20px wide)
  const fullRes = sortedData[sortedData.length - 1]; // Largest

  // Group by format for srcSet
  const webpImages = sortedData.filter((img) => img.format === "webp");
  const pngImages = sortedData.filter((img) => img.format === "png");

  const imgStyle: React.CSSProperties = {
    ...(style as React.CSSProperties),
    filter: loaded
      ? (style?.filter as string) || "none"
      : `${(style?.filter as string) || ""} blur(10px)`,
    transition: "filter 0.5s ease-out",
  };

  const ImageComponent = animate ? animated.img : "img";

  return (
    <Box component="picture" sx={{ display: "contents" }}>
      {visible && webpImages.length > 0 && (
        <source
          type="image/webp"
          srcSet={webpImages
            .map((img) => `${img.src} ${img.width}w`)
            .join(", ")}
        />
      )}
      {visible && pngImages.length > 0 && (
        <source
          type="image/png"
          srcSet={pngImages.map((img) => `${img.src} ${img.width}w`).join(", ")}
        />
      )}
      <Box
        ref={ref as React.RefObject<HTMLImageElement>}
        component={ImageComponent}
        src={visible ? fullRes.src : placeholder.src}
        alt={alt}
        loading="lazy"
        style={imgStyle}
        onLoad={handleLoad}
      />
    </Box>
  );
}
