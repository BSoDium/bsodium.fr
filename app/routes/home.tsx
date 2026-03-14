import { useRef } from "react";
import {
  motion,
  useScroll,
  useTransform,
  type MotionValue,
} from "motion/react";
import type { Route } from "./+types/home";

import layer1 from "~/assets/parallax/1.png";
import layer2 from "~/assets/parallax/2.png";
import layer3 from "~/assets/parallax/3.png";
import layer4 from "~/assets/parallax/4.png";
import layer5 from "~/assets/parallax/5.png";

const parallaxLayers = [layer1, layer2, layer3, layer4, layer5];

export function meta({}: Route.MetaArgs) {
  return [
    { title: "BSoDium" },
    { name: "description", content: "BSoDium's portfolio" },
  ];
}

function ParallaxLayer({
  src,
  index,
  offsetY,
  scrollYProgress,
}: {
  src: string;
  index: number;
  offsetY?: number;
  scrollYProgress: MotionValue<number>;
}) {
  const exitEnd = (parallaxLayers.length - index) / parallaxLayers.length;
  const yVh = useTransform(
    scrollYProgress,
    [0, exitEnd],
    ["0vh", "-150vh"],
  );
  const y = useTransform(() => {
    const progress = yVh.get();
    return offsetY ? `calc(${progress} + ${offsetY}px)` : progress;
  });

  return (
    <motion.img
      src={src}
      alt=""
      style={{ y, zIndex: index + 1 }}
      className="absolute top-0 left-0 w-full"
      draggable={false}
    />
  );
}

export default function Home() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  return (
    <div ref={containerRef} className="relative h-[300vh]">
      <div
        className="sticky top-0 h-screen overflow-hidden"
        style={{ backgroundColor: "#0a0a0a" }}
      >
        {parallaxLayers.map((src, index) => (
          <ParallaxLayer
            key={index}
            src={src}
            index={index}
            offsetY={index >= 3 ? 400 : undefined}
            scrollYProgress={scrollYProgress}
          />
        ))}
      </div>
    </div>
  );
}
