declare module "react-globe.gl" {
  import type { Component } from "react";

  interface GlobeProps {
    width?: number;
    height?: number;
    backgroundColor?: string;
    showGlobe?: boolean;
    showAtmosphere?: boolean;
    showGraticules?: boolean;
    globeImageUrl?: string;
    bumpImageUrl?: string;
    atmosphereColor?: string;
    atmosphereAltitude?: number;
    animateIn?: boolean;
    autoRotate?: boolean;
    autoRotateSpeed?: number;

    hexPolygonsData?: any[];
    hexPolygonGeoJsonGeometry?: string | ((d: any) => any);
    hexPolygonResolution?: number;
    hexPolygonMargin?: number;
    hexPolygonColor?: string | ((d: any) => string);
    hexPolygonAltitude?: number | ((d: any) => number);

    pointsData?: any[];
    pointLat?: string | ((d: any) => number);
    pointLng?: string | ((d: any) => number);
    pointColor?: string | ((d: any) => string);
    pointAltitude?: number | ((d: any) => number);
    pointRadius?: number | ((d: any) => number);
    pointsMerge?: boolean;

    arcsData?: any[];
    arcStartLat?: string | ((d: any) => number);
    arcStartLng?: string | ((d: any) => number);
    arcEndLat?: string | ((d: any) => number);
    arcEndLng?: string | ((d: any) => number);
    arcColor?: string | ((d: any) => string | string[]);
    arcAltitudeAutoScale?: number | ((d: any) => number);
    arcStroke?: number | ((d: any) => number) | null;
    arcDashLength?: number | ((d: any) => number);
    arcDashGap?: number | ((d: any) => number);
    arcDashAnimateTime?: number | ((d: any) => number);

    [key: string]: any;
  }

  export default class Globe extends Component<GlobeProps> {
    pointOfView(
      pov?: { lat?: number; lng?: number; altitude?: number },
      transitionMs?: number
    ): any;
    scene(): any;
    camera(): any;
    renderer(): any;
    controls(): any;
    globeMaterial(): any;
  }
}
