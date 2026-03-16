import { useEffect, useMemo, useRef, useState } from "react";
import GlobeGL from "react-globe.gl";
import { feature } from "topojson-client";
import { MeshPhongMaterial } from "three";

const WORLD_ATLAS_URL =
  "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const LOCATIONS = [
  { name: "Paris", lat: 48.8566, lng: 2.3522 },
  { name: "Toulouse", lat: 43.6047, lng: 1.4442 },
  { name: "Klagenfurt", lat: 46.6247, lng: 14.3053 },
  { name: "Vienna", lat: 48.2082, lng: 16.3738 },
  { name: "Brussels", lat: 50.8503, lng: 4.3517 },
];

const ARCS = [
  { startLat: 43.6047, startLng: 1.4442, endLat: 48.8566, endLng: 2.3522 },
  { startLat: 48.8566, startLng: 2.3522, endLat: 48.2082, endLng: 16.3738 },
  { startLat: 48.2082, startLng: 16.3738, endLat: 46.6247, endLng: 14.3053 },
  { startLat: 48.8566, startLng: 2.3522, endLat: 50.8503, endLng: 4.3517 },
];

export default function Globe() {
  const globeRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);
  const [countries, setCountries] = useState<any[]>([]);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const globeMaterial = useMemo(() => {
    const mat = new MeshPhongMaterial();
    mat.color.set(0x0a0a1a);
    mat.emissive.set(0x080820);
    mat.emissiveIntensity = 0.3;
    return mat;
  }, []);

  // Fetch country boundaries
  useEffect(() => {
    fetch(WORLD_ATLAS_URL)
      .then((r) => r.json())
      .then((topo: any) => {
        const geo = feature(topo, topo.objects.countries) as any;
        setCountries(geo.features);
      })
      .catch(() => {});
  }, []);

  // Track container size
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () =>
      setDimensions({ width: el.clientWidth, height: el.clientHeight });
    update();
    const obs = new ResizeObserver(update);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Configure globe once after mount
  useEffect(() => {
    const globe = globeRef.current;
    if (!globe || initializedRef.current) return;

    globe.pointOfView({ lat: 46, lng: 10, altitude: 2.0 }, 0);

    const controls = globe.controls();
    if (controls) controls.enableZoom = false;

    initializedRef.current = true;
  }, [dimensions.width, dimensions.height]);

  return (
    <div ref={containerRef} className="h-full w-full" aria-label="Decorative globe">
      {dimensions.width > 0 && (
        <GlobeGL
          ref={globeRef}
          width={dimensions.width}
          height={dimensions.height}
          backgroundColor="rgba(0,0,0,0)"
          showGlobe={true}
          globeMaterial={globeMaterial}
          showAtmosphere={true}
          atmosphereColor="rgba(120, 100, 255, 0.15)"
          atmosphereAltitude={0.18}
          autoRotate={true}
          autoRotateSpeed={0.3}
          animateIn={true}
          hexPolygonsData={countries}
          hexPolygonGeoJsonGeometry={(d: any) => d.geometry}
          hexPolygonResolution={3}
          hexPolygonMargin={0.7}
          hexPolygonColor={() => "rgba(255, 255, 255, 0.08)"}
          hexPolygonAltitude={0.005}
          pointsData={LOCATIONS}
          pointLat="lat"
          pointLng="lng"
          pointColor={() => "rgba(180, 160, 255, 0.9)"}
          pointAltitude={0.02}
          pointRadius={0.3}
          arcsData={ARCS}
          arcStartLat="startLat"
          arcStartLng="startLng"
          arcEndLat="endLat"
          arcEndLng="endLng"
          arcColor={() => "rgba(147, 130, 255, 0.5)"}
          arcAltitudeAutoScale={0.3}
          arcStroke={0.5}
          arcDashLength={0.5}
          arcDashGap={0.3}
          arcDashAnimateTime={3000}
        />
      )}
    </div>
  );
}
