import { Box } from '@mui/joy';
import { animated } from '@react-spring/web';
import React, {
  ComponentProps,
  useEffect,
  useMemo,
  useState,
} from 'react';

function isCached(src: string) {
  const image = new Image();
  image.src = src;
  if (image.complete) {
    // Image is cached
    return true;
  }
  // Cancel the image request
  image.src = '';
  return false;
}

export default function ProgressiveImage({
  src,
  placeholder,
  alt,
  animate = false,
  style,
  onLoad,
}: {
  src: string;
  placeholder: string;
  alt: string;
  animate?: boolean;
  style?: ComponentProps<typeof animated.img>['style'];
  onLoad?: () => void;
}) {
  const start = useMemo(() => Date.now(), []);

  /** Whether the image is cached */
  const hasCache = isCached(src);

  const [loading, setLoading] = useState(!hasCache);
  const [elapsed, setElapsed] = useState<number | undefined>(hasCache ? 0 : undefined);
  const [currentSrc, setCurrentSrc] = useState(hasCache ? src : placeholder);

  useEffect(() => {
    if (loading) {
      const imageToLoad = new Image();
      imageToLoad.src = src;
      imageToLoad.onload = () => {
        setElapsed(Date.now() - start);
        setCurrentSrc(src);
      };
    }
  }, [src]);

  return animate ? (
    <Box
      component={animated.img}
      src={currentSrc}
      className={loading ? 'loading' : ''}
      alt={alt}
      style={style}
      sx={loading ? {
        transition: `filter ${Math.round((elapsed || 0) / 4)}ms`,
        '&.loading': {
          filter: `${style?.filter || ''} blur(20px) !important`,
        },
      } : {}}
      onLoad={() => {
        onLoad?.();
        if (currentSrc === src) {
          setLoading(false);
        }
      }}
    />
  ) : (
    <Box
      component="img"
      src={currentSrc}
      className={loading ? 'loading' : ''}
      alt={alt}
      style={style as React.CSSProperties}
      sx={loading ? {
        transition: `filter ${Math.round((elapsed || 0) / 4)}ms`,
        '&.loading': {
          filter: `${style?.filter || ''} blur(20px) !important`,
        },
      } : {}}
      onLoad={() => {
        onLoad?.();
        if (currentSrc === src) {
          setLoading(false);
        }
      }}
    />
  );
}
