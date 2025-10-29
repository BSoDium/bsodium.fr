import React, { ComponentProps, useEffect, useRef, useState } from "react";

interface ImageMetadata {
  src: string;
  width: number;
  height: number;
  format: string;
}

export type ProgressiveImageProps = {
  meta: ImageMetadata[];
  alt: string;
  onLoad?: () => void;
  imgProps?: Omit<
    ComponentProps<"img">,
    "src" | "srcSet" | "alt" | "loading" | "onLoad"
  >;
} & ComponentProps<"picture">;

/**
 * A React component that progressively loads images using multiple resolutions and formats.
 * It starts by displaying a low-resolution placeholder image with a blur effect,
 * and then replaces it with a high-resolution image once it's fully loaded.
 * Behaves exactly like a normal <img /> tag with progressive and lazy loading capabilities.
 */
export default function ProgressiveImage({
  meta,
  alt,
  onLoad,
  imgProps,
  ...pictureProps
}: ProgressiveImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLImageElement>(null);
  const highResLoadedRef = useRef(false);

  // Set up intersection observer for lazy loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          // Disconnect after becoming visible since we don't need to track anymore
          observer.disconnect();
        }
      },
      { rootMargin: "50px" } // Start loading slightly before image enters viewport
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  // Monitor when the actual rendered image (from srcSet) loads
  useEffect(() => {
    if (!visible || !ref.current) return;

    const imgElement = ref.current;

    // Check if image is already loaded (from cache)
    if (imgElement.complete && imgElement.naturalWidth > 0) {
      if (!highResLoadedRef.current) {
        highResLoadedRef.current = true;
        setLoaded(true);
        onLoad?.();
      }
    }
  }, [visible, onLoad]);

  /** Callback handling the image load event. */
  const handleLoad = () => {
    if (!highResLoadedRef.current) {
      highResLoadedRef.current = true;
      setLoaded(true);
      onLoad?.();
    }
  };

  if (!meta || meta.length === 0) {
    return null;
  }

  // Sort by width to get the smallest as placeholder and largest as full resolution
  const sortedData = [...meta].sort((a, b) => a.width - b.width);
  const placeholder = sortedData[0]; // Smallest (20px wide)
  const fullRes = sortedData[sortedData.length - 1]; // Largest

  // Group by format for srcSet
  const avifImages = sortedData.filter((img) => img.format === "avif");
  const webpImages = sortedData.filter((img) => img.format === "webp");
  const pngImages = sortedData.filter((img) => img.format === "png");

  const pictureStyle: React.CSSProperties = {
    aspectRatio: `${fullRes.width} / ${fullRes.height}`,
    width: pictureProps.style?.height ? "auto" : fullRes.width,
    height: pictureProps.style?.width ? "auto" : fullRes.height,
    ...pictureProps.style,
  };

  const imgStyle: React.CSSProperties = {
    // By default, the picture element dictates the image size
    width: "100%",
    height: "100%",
    ...imgProps?.style,
    filter: loaded
      ? (imgProps?.style?.filter as string) || "none"
      : `${(imgProps?.style?.filter as string) || ""} blur(10px)`.trim(),
    transition: `${
      imgProps?.style?.transition || ""
    } filter 0.5s ease-out`.trim(),
  };

  return (
    <picture {...pictureProps} style={pictureStyle}>
      {visible && avifImages.length > 0 && (
        <source
          type="image/avif"
          srcSet={avifImages
            .map((img) => `${img.src} ${img.width}w`)
            .join(", ")}
          sizes={imgProps?.sizes}
        />
      )}
      {visible && webpImages.length > 0 && (
        <source
          type="image/webp"
          srcSet={webpImages
            .map((img) => `${img.src} ${img.width}w`)
            .join(", ")}
          sizes={imgProps?.sizes}
        />
      )}
      {visible && pngImages.length > 0 && (
        <source
          type="image/png"
          srcSet={pngImages.map((img) => `${img.src} ${img.width}w`).join(", ")}
          sizes={imgProps?.sizes}
        />
      )}
      <img
        {...imgProps}
        ref={ref}
        src={visible ? fullRes.src : placeholder.src}
        alt={alt}
        loading="lazy"
        onLoad={handleLoad}
        style={imgStyle}
      />
    </picture>
  );
}
