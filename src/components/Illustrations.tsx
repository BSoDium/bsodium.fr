import React from 'react';
import planet from 'assets/planet.png';
import planet2 from 'assets/planet_2.png';
import robot1 from 'assets/robot_flying_1.png';
import robot2 from 'assets/robot_flying_2.png';
import sky from 'assets/sky.webp';
import { Default, useMobileMode } from './Responsive';

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
          width: '100vw',
          top: '0',
          left: '0',
          zIndex: -1,
          filter: 'blur(calc(100vw * 0,002)) brightness(0.8) hue-rotate(30deg)',
          maskImage: 'linear-gradient(to bottom, black 10%, transparent 80%)',
          WebkitMaskImage: 'linear-gradient(to bottom, black 10%, transparent 80%)',
        }}
      />
      <img
        src={planet}
        alt="planet"
        style={{
          position: 'absolute',
          width: 'max(75rem, 100vw - 75rem)',
          top: '0',
          left: '0',
          transform: 'translate(-40%, -40%) rotate(80deg)',
          zIndex: -1,
          filter: 'blur(5px) brightness(0.8) hue-rotate(30deg)',
          maskImage: 'radial-gradient(circle at center, white 50%, transparent 60%)',
          WebkitMaskImage: 'radial-gradient(circle at center, white 50%, transparent 60%)',
        }}
      />
      <img
        src={planet2}
        alt="planet"
        style={{
          position: 'absolute',
          width: 'min(500px, 80vw)',
          top: '12rem',
          left: '90%',
          transform: 'translateX(-50%) scaleX(-1)',
          zIndex: -1,
          maskImage: 'linear-gradient(to bottom, black 10%, transparent 80%)',
          WebkitMaskImage: 'linear-gradient(to bottom, black 10%, transparent 80%)',
        }}
      />
      <img
        src={robot1}
        alt="robot"
        style={{
          position: 'absolute',
          width: '200px',
          height: '200px',
          top: '100px',
          right: '5%',
          zIndex: -1,
          filter: 'blur(5px) brightness(0.8)',
          transform: 'scale(0.5)',
          animation: 'float 20s ease-in-out infinite',
          animationDelay: '5s',
        }}
      />
      <Default>
        <img
          src={robot2}
          alt="robot"
          style={{
            position: 'absolute',
            width: '200px',
            height: '200px',
            top: '300px',
            right: '30%',
            zIndex: -1,
            filter: 'blur(5px) brightness(0.8)',
            transform: 'scale(0.5)',
            animation: 'float 20s ease-in-out infinite',
            animationDelay: '10s',
          }}
        />
      </Default>
      <img
        src={robot1}
        alt="robot"
        style={{
          position: 'absolute',
          width: '200px',
          height: '200px',
          top: mobile ? '200px' : '100px',
          right: mobile ? '40%' : '20%',
          zIndex: -1,
          animation: 'float 20s ease-in-out infinite',
          ...(mobile && {
            filter: 'brightness(0.8)',
          }),
        }}
      />
      <Default>
        <img
          src={robot2}
          alt="robot"
          style={{
            position: 'absolute',
            width: '200px',
            height: '200px',
            top: '250px',
            right: '10%',
            zIndex: -1,
            animation: 'float 20s ease-in-out infinite',
            animationDelay: '13s',
          }}
        />
      </Default>
    </div>
  );
}
