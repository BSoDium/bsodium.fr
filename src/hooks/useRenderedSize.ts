import { RefObject, useEffect, useState } from "react";

/**
 * Custom hook to get the rendered size of a DOM element.
 * @param ref - The ref of the element to measure.
 * @returns The rendered size of the element or null if not available.
 */
export default function useRenderedSize({
  ref,
}: {
  ref: RefObject<HTMLElement | null>;
}) {
  const [size, setSize] = useState<{ width: number; height: number } | null>(
    null
  );

  useEffect(() => {
    if (!ref.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setSize({ width, height });
      }
    });

    resizeObserver.observe(ref.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [ref]);

  return size;
}
