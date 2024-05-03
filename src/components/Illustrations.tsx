import React from 'react';
import planet from 'assets/planet.png';
import planet2 from 'assets/planet_2.png';
import sky from 'assets/sky.webp';
import { Box } from '@mui/joy';
import { useMobileMode } from './Responsive';

export default function Illustrations() {
  const mobile = useMobileMode();

  return (
    <div style={{
      position: 'relative',
      width: '100vw',
      height: '100vh',
    }}
    >
      <img
        src={sky}
        alt="sky"
        style={{
          position: 'absolute',
          width: 'max(100vw, 200vh)',
          top: '0',
          left: '0',
          zIndex: -1,
          filter: 'blur(calc(100vw / 1200)) brightness(0.5)',
          maskImage: 'linear-gradient(to bottom, black 10%, transparent 90%)',
          WebkitMaskImage: 'linear-gradient(to bottom, black 10%, transparent 90%)',
        }}
      />
      <img
        src={sky}
        alt="sky"
        style={{
          position: 'absolute',
          width: 'max(100vw, 200vh)',
          top: 'calc(max(100vw, 200vh) / 7)',
          left: '0',
          zIndex: -1,
          transform: 'scaleY(-1)',
          filter: 'blur(calc(100vw / 1200)) brightness(0.5)',
          maskImage: 'linear-gradient(to bottom, transparent 20%, #00000059 50%, transparent 80%)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 20%, 00000059 50%, transparent 80%)',
        }}
      />
      <img
        src={planet}
        alt="planet"
        style={{
          position: 'absolute',
          width: '75rem',
          top: '-44rem',
          left: 'calc(50% - 37.5rem)',
          zIndex: -1,
          filter: `${mobile ? 'brightness(0.5)' : 'brightness(1)'} hue-rotate(20deg) drop-shadow(0 0 4rem #0C0223) drop-shadow(-3rem -3rem 3rem #3570b55b)`,
          animation: 'spin 360s linear infinite',
        }}
      />
      <Box
        component="img"
        src={planet2}
        alt="planet"
        sx={{
          position: 'absolute',
          width: 'min(500px, 80vw)',
          top: '12rem',
          left: '90%',
          transform: 'translateX(-50%) scaleX(-1)',
          zIndex: -1,
          filter: 'drop-shadow(-1rem 1rem 20px #01030C) drop-shadow(1rem -2rem 1rem #e7f9fa18)',
        }}
      />
    </div>
  );
}
