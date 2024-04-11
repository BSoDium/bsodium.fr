import React from 'react';
import planet from 'assets/planet.webp';
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
      overflow: 'hidden',
    }}
    >
      <img
        src={planet}
        alt="planet"
        style={{
          position: 'absolute',
          width: 'min(700px, 140vw)',
          top: '-100px',
          left: 'min(350px, 50vw)',
          transform: 'translateX(-50%)',
          zIndex: -1,
        }}
      />
      <img
        src={sky}
        alt="sky"
        style={{
          position: 'absolute',
          height: '70vh',
          top: '0',
          left: '0',
          zIndex: -2,
          filter: 'blur(5px)',
        }}
      />
      <img
        src={sky}
        alt="sky"
        style={{
          position: 'absolute',
          height: '70vh',
          top: '50vh',
          left: '0',
          zIndex: -2,
          filter: 'blur(5px) brightness(0.3)',
          transform: 'scaleX(-1)',
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
