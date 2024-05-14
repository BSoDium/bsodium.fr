import { useMediaQuery } from 'react-responsive';

export interface ResponsiveProps {
  children: JSX.Element;
}

export const useDesktopMode = () => useMediaQuery({ minWidth: 992 });
export const useTabletMode = () => useMediaQuery({ minWidth: 768, maxWidth: 991 });
export const useMobileMode = () => useMediaQuery({ maxWidth: 767 });
export const useNonMobileMode = () => useMediaQuery({ minWidth: 768 });
export const useNonDesktopMode = () => useMediaQuery({ maxWidth: 991 });
export const useLandScapeMode = () => useMediaQuery({ minWidth: 'calc(75rem + 10rem)', minAspectRatio: '1/1' });

export type ResponsiveComponent = (props: ResponsiveProps) => JSX.Element | null;

export function Desktop({ children }: ResponsiveProps) {
  return useDesktopMode() ? children : null;
}
export function Tablet({ children }: ResponsiveProps) {
  return useTabletMode() ? children : null;
}
export function Mobile({ children }: ResponsiveProps) {
  return useMobileMode() ? children : null;
}
export function Default({ children }: ResponsiveProps) {
  return useNonMobileMode() ? children : null;
}
