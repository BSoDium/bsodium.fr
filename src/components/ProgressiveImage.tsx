import useRenderedSize from "@/hooks/useRenderedSize";
import { css } from "@emotion/react";
import { ComponentProps, useEffect, useRef, useState } from "react";

export type ProgressiveImageProps = {
  variants: ImageVariantCollection;
  style?: ComponentProps<"picture">["style"];
} & Omit<ComponentProps<"img">, "style">;

/**
 * Progressive image loading component with lazy loading and blur-to-sharp transition.
 * Supports multiple formats (AVIF, WebP, PNG) and resolutions.
 */
export default function ProgressiveImage({
  variants,
  style: pictureStyle,
  ...imgProps
}: ProgressiveImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isErrored, setIsErrored] = useState(false);
  const isSuccessful = isLoaded && !isErrored;

  const imgRef = useRef<HTMLImageElement>(null);
  const imgSize = useRenderedSize({
    ref: imgRef,
  });

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
  const maxResPngImage = sortedPngImages[sortedPngImages.length - 1];
  const minResPngImage = sortedPngImages[0];

  const minResImageBlurSize =
    imgSize !== null
      ? Math.max(
          Math.max(
            imgSize.width / minResPngImage.width,
            imgSize.height / minResPngImage.height
          ),
          1
        )
      : 20;

  return (
    <picture
      css={css`
        display: block;
        aspect-ratio: ${maxResPngImage.width} / ${maxResPngImage.height};
      `}
      style={pictureStyle}
    >
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
        {...imgProps}
        ref={imgRef}
        loading="lazy"
        src={maxResPngImage.src}
        onLoad={(event) => {
          setIsLoaded(true);
          imgProps?.onLoad?.(event);
        }}
        onError={(event) => {
          setIsErrored(true);
          imgProps?.onError?.(event);
        }}
        style={{
          height: "100%",
          width: "100%",
          backgroundImage: isSuccessful ? "none" : `url(${minResPngImage.src})`,
          backgroundSize: isSuccessful ? undefined : "100% 100%",
          transition: `filter 0.25s ease-out`,
          filter: isSuccessful ? "none" : `blur(${minResImageBlurSize}px)`,
        }}
      />
    </picture>
  );
}
