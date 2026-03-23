import { Feather } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { useThemeColors } from '../../hooks/useThemeColors';
import type { ColorScheme } from './theme';

const BANNER_HEIGHT = 36;
const RECONNECT_DISPLAY_MS = 3000;

export function OfflineBanner() {
  const c = useThemeColors();
  const styles = React.useMemo(() => makeStyles(c), [c]);
  const insets = useSafeAreaInsets();
  const { isConnected } = useNetworkStatus();

  const [wasOffline, setWasOffline] = useState(false);
  const [showReconnected, setShowReconnected] = useState(false);
  const heightAnim = useRef(new Animated.Value(0)).current;
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isOffline = isConnected === false;

  useEffect(() => {
    if (isOffline) {
      setWasOffline(true);
      setShowReconnected(false);
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      Animated.timing(heightAnim, {
        toValue: insets.top + BANNER_HEIGHT,
        duration: 300,
        useNativeDriver: false,
      }).start();
    } else if (wasOffline && isConnected === true) {
      // Just reconnected
      setShowReconnected(true);
      reconnectTimer.current = setTimeout(() => {
        Animated.timing(heightAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: false,
        }).start(() => {
          setShowReconnected(false);
          setWasOffline(false);
        });
      }, RECONNECT_DISPLAY_MS);
    }
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    };
  }, [isConnected, heightAnim, insets.top, isOffline, wasOffline]);

  // Don't render anything if never been offline this session
  if (!isOffline && !showReconnected) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        showReconnected ? styles.reconnectedBg : styles.offlineBg,
        { height: heightAnim },
      ]}
    >
      <View style={[styles.content, { paddingTop: insets.top }]}>
        <Feather
          name={showReconnected ? 'wifi' : 'wifi-off'}
          size={14}
          color="#FFFFFF"
          style={styles.icon}
        />
        <Animated.Text style={styles.text}>
          {showReconnected ? 'Back online' : 'No internet connection'}
        </Animated.Text>
      </View>
    </Animated.View>
  );
}

function makeStyles(c: ColorScheme) {
  return StyleSheet.create({
    container: {
      overflow: 'hidden',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
    },
    offlineBg: {
      backgroundColor: c.warning,
    },
    reconnectedBg: {
      backgroundColor: c.success,
    },
    content: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    icon: {
      marginRight: 6,
    },
    text: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '600',
    },
  });
}
