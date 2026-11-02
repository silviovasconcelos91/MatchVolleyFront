import { useWindowDimensions } from 'react-native';

// Caps content width so SVG graphs stay readable on wide desktop browsers.
export const MAX_CONTENT_WIDTH = 600;

// Reactive window width (updates on resize / rotation), capped at MAX_CONTENT_WIDTH.
export const useContentWidth = (): number => {
  const { width } = useWindowDimensions();
  return Math.min(width, MAX_CONTENT_WIDTH);
};
