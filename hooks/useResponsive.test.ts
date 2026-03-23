import { renderHook } from '@testing-library/react-native';
import { Dimensions } from 'react-native';
import { useResponsive } from './useResponsive';

function setDimensions(width: number, height: number) {
  jest.spyOn(Dimensions, 'get').mockReturnValue({
    width,
    height,
    scale: 1,
    fontScale: 1,
  });
}

beforeEach(() => {
  jest.restoreAllMocks();
});

describe('useResponsive', () => {
  it('returns phone portrait values (375×812)', () => {
    setDimensions(375, 812);
    const { result } = renderHook(() => useResponsive());
    expect(result.current.isTablet).toBe(false);
    expect(result.current.isLandscape).toBe(false);
    expect(result.current.width).toBe(375);
    expect(result.current.height).toBe(812);
  });

  it('returns phone landscape values (812×375)', () => {
    setDimensions(812, 375);
    const { result } = renderHook(() => useResponsive());
    expect(result.current.isTablet).toBe(true);
    expect(result.current.isLandscape).toBe(true);
  });

  it('returns tablet portrait values (834×1194)', () => {
    setDimensions(834, 1194);
    const { result } = renderHook(() => useResponsive());
    expect(result.current.isTablet).toBe(true);
    expect(result.current.isLandscape).toBe(false);
  });

  it('treats exact breakpoint (768) as tablet', () => {
    setDimensions(768, 1024);
    const { result } = renderHook(() => useResponsive());
    expect(result.current.isTablet).toBe(true);
    expect(result.current.isLandscape).toBe(false);
  });

  it('treats below breakpoint (767) as phone', () => {
    setDimensions(767, 1024);
    const { result } = renderHook(() => useResponsive());
    expect(result.current.isTablet).toBe(false);
    expect(result.current.isLandscape).toBe(false);
  });

  it('treats square dimensions as not landscape', () => {
    setDimensions(500, 500);
    const { result } = renderHook(() => useResponsive());
    expect(result.current.isLandscape).toBe(false);
  });
});
