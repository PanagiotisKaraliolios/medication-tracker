import { Feather } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import { Tabs } from 'expo-router';
import { useEffect, useMemo, useRef } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  borderRadius,
  type ColorScheme,
  shadows,
  tablet as tabletLayout,
} from '../../components/ui/theme';
import { useResponsive } from '../../hooks/useResponsive';
import { useThemeColors } from '../../hooks/useThemeColors';

const TAB_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  index: 'home',
  medications: 'package',
  reports: 'bar-chart-2',
  profile: 'user',
};

/* Short labels for the narrow side rail */
const RAIL_LABELS: Record<string, string> = {
  index: 'Today',
  medications: 'Meds',
  reports: 'Reports',
  profile: 'Profile',
};

function AnimatedTabIcon({
  name,
  color,
  focused,
}: {
  name: keyof typeof Feather.glyphMap;
  color: string;
  focused: boolean;
}) {
  const scale = useRef(new Animated.Value(focused ? 1 : 1)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (focused) {
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1.15,
          friction: 4,
          tension: 200,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: -2,
          friction: 4,
          tension: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          friction: 6,
          tension: 120,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          friction: 6,
          tension: 120,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [focused, scale, translateY]);

  return (
    <Animated.View style={{ transform: [{ scale }, { translateY }] }}>
      <Feather name={name} size={22} color={color} />
    </Animated.View>
  );
}

/* ── Shared tab item renderer ── */
function renderTabItems(
  state: BottomTabBarProps['state'],
  descriptors: BottomTabBarProps['descriptors'],
  navigation: BottomTabBarProps['navigation'],
  c: ColorScheme,
  isTablet: boolean,
) {
  return state.routes.map((route, index) => {
    const { options } = descriptors[route.key];
    const label = isTablet
      ? (RAIL_LABELS[route.name] ?? options.title ?? route.name)
      : ((options.title ?? route.name) as string);
    const isFocused = state.index === index;
    const iconName = TAB_ICONS[route.name] ?? 'circle';
    const color = isFocused ? c.teal : c.gray400;

    const onPress = () => {
      const event = navigation.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      });
      if (!isFocused && !event.defaultPrevented) {
        navigation.navigate(route.name, route.params);
      }
    };

    const onLongPress = () => {
      navigation.emit({ type: 'tabLongPress', target: route.key });
    };

    return (
      <Pressable
        key={route.key}
        accessibilityRole="button"
        accessibilityState={isFocused ? { selected: true } : undefined}
        accessibilityLabel={options.tabBarAccessibilityLabel}
        onPress={onPress}
        onLongPress={onLongPress}
        style={isTablet ? railStyles(c).railTab : undefined}
      >
        {isFocused && (
          <View
            style={
              isTablet
                ? railStyles(c).railPill
                : {
                    ...StyleSheet.absoluteFill,
                    backgroundColor: `${c.teal}15`,
                    borderRadius: borderRadius.xl,
                    marginHorizontal: 4,
                  }
            }
          />
        )}
        <AnimatedTabIcon name={iconName} color={color} focused={isFocused} />
        <Animated.Text
          style={[{ fontSize: 11, fontWeight: '600', marginTop: 4, color }]}
          numberOfLines={1}
        >
          {label}
        </Animated.Text>
      </Pressable>
    );
  });
}

/* ── Tablet side rail ── */
function SideRail({ state, descriptors, navigation }: BottomTabBarProps) {
  const c = useThemeColors();
  const insets = useSafeAreaInsets();
  const rs = useMemo(() => railStyles(c), [c]);

  return (
    <View
      style={[
        rs.rail,
        {
          paddingTop: Math.max(insets.top, 16) + 8,
          paddingBottom: Math.max(insets.bottom, 16),
          paddingLeft: Math.max(insets.left, 0),
        },
      ]}
    >
      {renderTabItems(state, descriptors, navigation, c, true)}
    </View>
  );
}

/* ── Phone bottom bar ── */
function BottomBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const c = useThemeColors();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(c), [c]);

  return (
    <View style={[styles.barOuter, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <LinearGradient
        colors={[`${c.background}00`, c.background, c.background]}
        locations={[0, 0.4, 1]}
        style={styles.barGradient}
        pointerEvents="none"
      />
      <View style={styles.barInner}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label = (options.title ?? route.name) as string;
          const isFocused = state.index === index;
          const iconName = TAB_ICONS[route.name] ?? 'circle';
          const color = isFocused ? c.teal : c.gray400;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          const onLongPress = () => {
            navigation.emit({ type: 'tabLongPress', target: route.key });
          };

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : undefined}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              onPress={onPress}
              onLongPress={onLongPress}
              style={styles.tab}
            >
              {isFocused && <View style={styles.pill} />}
              <AnimatedTabIcon name={iconName} color={color} focused={isFocused} />
              <Animated.Text style={[styles.label, { color }]} numberOfLines={1}>
                {label}
              </Animated.Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function TabLayout() {
  const _c = useThemeColors();
  const { isTablet } = useResponsive();

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        tabBar={(props) => (isTablet ? <SideRail {...props} /> : <BottomBar {...props} />)}
        screenOptions={{
          headerShown: false,
          animation: 'fade',
        }}
      >
        <Tabs.Screen name="index" options={{ title: 'Today' }} />
        <Tabs.Screen name="medications" options={{ title: 'Medications' }} />
        <Tabs.Screen name="reports" options={{ title: 'Reports' }} />
        <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
      </Tabs>
    </View>
  );
}

/* ── Phone bottom bar styles ── */
function makeStyles(c: ColorScheme) {
  return StyleSheet.create({
    barOuter: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      alignItems: 'center',
      paddingHorizontal: 12,
    },
    barGradient: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    barInner: {
      flexDirection: 'row',
      backgroundColor: c.card,
      borderRadius: borderRadius.xxl,
      paddingVertical: 8,
      paddingHorizontal: 6,
      ...shadows.lg,
      width: '100%',
      maxWidth: 400,
    },
    tab: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 6,
      position: 'relative',
    },
    pill: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: `${c.teal}15`,
      borderRadius: borderRadius.xl,
      marginHorizontal: 4,
    },
    label: {
      fontSize: 11,
      fontWeight: '600',
      marginTop: 4,
    },
  });
}

/* ── Tablet side rail styles ── */
function railStyles(c: ColorScheme) {
  return StyleSheet.create({
    rail: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: tabletLayout.sideRailWidth,
      backgroundColor: c.card,
      borderRightWidth: 1,
      borderRightColor: c.gray200,
      alignItems: 'center',
      gap: 8,
      zIndex: 10,
    },
    railTab: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      paddingHorizontal: 8,
      width: 64,
      position: 'relative',
    },
    railPill: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: `${c.teal}15`,
      borderRadius: borderRadius.lg,
      margin: 4,
    },
  });
}
