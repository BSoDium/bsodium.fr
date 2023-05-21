import { Typography } from '@mui/joy';
import React, { useEffect, useState } from 'react';

/**
 * A typewriter effect that types out the text in `children` one character at a time.
 */
export default function TypeWriter({
  children: toText,
  typeInterval = 50,
  onTransitionEnd = () => {
    // noop
  },
}: {
  children: string
  typeInterval?: number
  onTransitionEnd?: () => void
}) {
  // Text that is currently displayed
  const [currentText, setCurrentText] = useState('');

  useEffect(() => {
    // If the text is the same, do nothing
    if (toText === currentText) {
      onTransitionEnd();
      return () => {
        // noop
      };
    }
    // If the text is different, start the animation
    const interval = setInterval(() => {
      // If the text is the same, stop the animation (should never be reached)
      if (toText === currentText) {
        clearInterval(interval);
        return;
      }
      // if currentText is included in toText, add one more character
      if (toText.startsWith(currentText)) {
        setCurrentText(toText.slice(0, currentText.length + 1));
      } else {
        // if currentText is not included in toText, remove one character
        setCurrentText(currentText.slice(0, currentText.length - 1));
      }
    }, Math.random() * 1.6 * typeInterval + typeInterval * 0.8);
    return () => { clearInterval(interval); };
  }, [toText, currentText]);

  return (
    <Typography>
      {currentText}
    </Typography>
  );
}
