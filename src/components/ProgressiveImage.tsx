import React, { useState, useEffect, ComponentProps } from 'react';
import { animated } from '@react-spring/web';

export default function ProgressiveImage({
  src,
  placeholder,
  alt,
  animate = false,
  style,
}: ComponentProps<typeof animated.img> & {
  src: string;
  placeholder: string;
  alt: string;
  animate?: boolean;
  style: ComponentProps<typeof animated.img>['style'];
}) {
  const [loading, setLoading] = useState(true);
  const [currentSrc, setCurrentSrc] = useState(placeholder);

  useEffect(() => {
    const imageToLoad = new Image();
    imageToLoad.src = src;
    imageToLoad.onload = () => {
      setCurrentSrc(src);
      setLoading(false);
    };
  }, [src]);

  return animate ? (
    <animated.img
      src={currentSrc}
      alt={alt}
      style={{ ...style, ...(loading ? { filter: 'blur(20px)' } : {}) }}
    />
  ) : (
    <img
      src={currentSrc}
      alt={alt}
      style={{ ...(style as React.CSSProperties), ...(loading ? { filter: 'blur(20px)' } : {}) }}
    />
  );
}
