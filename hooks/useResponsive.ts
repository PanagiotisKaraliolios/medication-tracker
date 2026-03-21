import { useWindowDimensions } from 'react-native';

const TABLET_BREAKPOINT = 768;

export interface ResponsiveInfo {
  isTablet: boolean;
  isLandscape: boolean;
  width: number;
  height: number;
}

export function useResponsive(): ResponsiveInfo {
  const { width, height } = useWindowDimensions();
  return {
    isTablet: width >= TABLET_BREAKPOINT,
    isLandscape: width > height,
    width,
    height,
  };
}
