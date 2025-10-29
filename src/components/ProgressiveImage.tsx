import { ComponentProps, useEffect, useRef, useState } from "react";

export type ProgressiveImageProps = {
  variants: ImageVariantCollection;
} & Omit<ComponentProps<"img">, "src" | "srcSet" | "loading">;

/**
 * Progressive image loading component with lazy loading and blur-to-sharp transition.
 * Supports multiple formats (AVIF, WebP, PNG) and resolutions.
 */
export default function ProgressiveImage({
  variants,
  style,
  ...imageProps
}: ProgressiveImageProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isErrored, setIsErrored] = useState(false);
  const isSuccessful = isLoaded && !isErrored;

  // Set isLoaded to true if the image is already cached
  useEffect(() => {
    if (imgRef.current) {
      setIsLoaded(imgRef.current.complete);
    }
  }, []);

  if (!variants || variants.length === 0) {
    return null;
  }

  const avifImages = variants.filter((img) => img.format === "avif");
  const webpImages = variants.filter((img) => img.format === "webp");
  const pngImages = variants.filter((img) => img.format === "png");

  const sortedPngImages = pngImages.sort((a, b) => a.width - b.width);
  const minResPngImage = sortedPngImages[0];
  const maxResPngImage = sortedPngImages[sortedPngImages.length - 1];

  return (
    <picture>
      {avifImages.length > 0 && (
        <source
          type="image/avif"
          srcSet={avifImages
            .map((img) => `${img.src} ${img.width}w`)
            .join(", ")}
        />
      )}
      {webpImages.length > 0 && (
        <source
          type="image/webp"
          srcSet={webpImages
            .map((img) => `${img.src} ${img.width}w`)
            .join(", ")}
        />
      )}
      {pngImages.length > 0 && (
        <source
          type="image/png"
          srcSet={pngImages.map((img) => `${img.src} ${img.width}w`).join(", ")}
        />
      )}
      <img
        ref={imgRef}
        loading="lazy"
        src={maxResPngImage.src}
        onLoad={() => setIsLoaded(true)}
        onError={() => setIsErrored(true)}
        style={{
          backgroundImage: isSuccessful
            ? undefined
            : `url(${minResPngImage.src})`,
          backgroundSize: isSuccessful ? undefined : "100% 100%",
          filter: isSuccessful ? "none" : "blur(20px)",
          transition: "filter 0.5s ease-out",
          ...style,
        }}
        {...imageProps}
      />
    </picture>
  );
}
