/// <reference types="vite/client" />
/// <reference types="vite-imagetools/client" />

declare interface ImageVariant {
  src: string;
  width: number;
  height: number;
  format: string;
}

declare type ImageVariantCollection = ImageVariant[];

declare module "*?progressive" {
  const value: ImageVariantCollection;
  export default value;
}
