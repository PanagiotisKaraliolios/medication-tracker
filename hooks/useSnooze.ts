import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import Toast from 'react-native-toast-message';
import {
  scheduleSnoozeNotification,
  cancelSnoozeNotification,
  addNotificationResponseListener,
  requestNotificationPermissions,
  SNOOZE_ACTION_TAKE,
  SNOOZE_ACTION_SNOOZE_AGAIN,
  type SnoozeNotificationData,
} from '../lib/notifications';
import { SNOOZE_STORAGE_KEY } from '../constants/storage';
import { parseSnoozeDuration, formatTimeLeft } from '../utils/snooze';
import type { TodayDose } from '../utils/dose';

interface UseSnoozeParams {
  selectedISO: string;
  loadDoses: () => void;
  logDose: (scheduleId: string, medicationId: string, date: string, timeLabel: string, status: 'taken' | 'skipped') => Promise<{ data: any; error: string | null }>;
  adjustSupply: (medicationId: string, delta: number) => void;
  handleStatusChange: (dose: TodayDose, status: 'taken' | 'skipped') => Promise<void>;
}

export function useSnooze({
  selectedISO,
  loadDoses,
  logDose,
  adjustSupply,
  handleStatusChange,
}: UseSnoozeParams) {
  const [snoozedUntil, setSnoozedUntil] = useState<Record<string, number>>({});
  const snoozeNotifIds = useRef<Record<string, string>>({});
  const [, setTick] = useState(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [snoozeDialogDose, setSnoozeDialogDose] = useState<TodayDose | null>(null);

  // ── Request notification permissions once ──
  useEffect(() => {
    requestNotificationPermissions();
  }, []);

  // ── Handle notification action responses (Take Now / Snooze Again) ──
  useEffect(() => {
    const subscription = addNotificationResponseListener(async (response) => {
      const actionId = response.actionIdentifier;
      const data = response.notification.request.content.data as unknown as SnoozeNotificationData | undefined;

      if (!data?.doseKey) return;

      if (actionId === SNOOZE_ACTION_TAKE) {
        setSnoozedUntil((prev) => {
          const next = { ...prev };
          delete next[data.doseKey];
          return next;
        });
        delete snoozeNotifIds.current[data.doseKey];

        await logDose(data.scheduleId, data.medicationId, selectedISO, data.timeLabel, 'taken');
        if (data.dosagePerDose) {
          adjustSupply(data.medicationId, -data.dosagePerDose);
        }
        Toast.show({ type: 'success', text1: 'Dose taken', text2: data.medicationName });
        loadDoses();
      } else if (actionId === SNOOZE_ACTION_SNOOZE_AGAIN) {
        const deliveredId = response.notification.request.identifier;
        Notifications.dismissNotificationAsync(deliveredId).catch(() => {});

        const prevNotifId = snoozeNotifIds.current[data.doseKey];
        if (prevNotifId) {
          cancelSnoozeNotification(prevNotifId);
        }

        const durationMs = parseSnoozeDuration(data.snoozeDuration);
        const until = Date.now() + durationMs;
        setSnoozedUntil((prev) => ({ ...prev, [data.doseKey]: until }));

        try {
          const notifId = await scheduleSnoozeNotification(data.medicationName, durationMs, data);
          snoozeNotifIds.current[data.doseKey] = notifId;
        } catch {
          // best-effort
        }

        const durationLabel =
          durationMs < 60000
            ? `${Math.round(durationMs / 1000)}s`
            : `${Math.round(durationMs / 60000)} min`;
        Toast.show({
          type: 'success',
          text1: 'Snoozed again',
          text2: `${data.medicationName} snoozed for ${durationLabel}`,
        });
      }
    });

    return () => subscription.remove();
  }, [logDose, adjustSupply, selectedISO, loadDoses]);

  // ── Restore persisted snooze state ──
  useEffect(() => {
    AsyncStorage.getItem(SNOOZE_STORAGE_KEY).then((raw) => {
      if (!raw) return;
      try {
        const parsed: Record<string, number> = JSON.parse(raw);
        const now = Date.now();
        const valid: Record<string, number> = {};
        for (const [key, until] of Object.entries(parsed)) {
          if (until > now) valid[key] = until;
        }
        if (Object.keys(valid).length > 0) {
          setSnoozedUntil(valid);
        }
        if (Object.keys(valid).length !== Object.keys(parsed).length) {
          AsyncStorage.setItem(SNOOZE_STORAGE_KEY, JSON.stringify(valid));
        }
      } catch {
        // corrupted data — ignore
      }
    });
  }, []);

  // ── Persist snooze state on change ──
  useEffect(() => {
    if (Object.keys(snoozedUntil).length === 0) {
      AsyncStorage.removeItem(SNOOZE_STORAGE_KEY);
    } else {
      AsyncStorage.setItem(SNOOZE_STORAGE_KEY, JSON.stringify(snoozedUntil));
    }
  }, [snoozedUntil]);

  // ── Snooze timer — update countdown & expire snoozed doses ──
  useEffect(() => {
    const entries = Object.keys(snoozedUntil);
    if (entries.length === 0) {
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
      return;
    }

    if (!tickRef.current) {
      tickRef.current = setInterval(() => {
        const now = Date.now();
        setSnoozedUntil((prev) => {
          const next: Record<string, number> = {};
          let changed = false;
          for (const [key, until] of Object.entries(prev)) {
            if (until > now) {
              next[key] = until;
            } else {
              changed = true;
            }
          }
          return changed ? next : prev;
        });
        setTick((t) => t + 1);
      }, 1000);
    }

    return () => {
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
    };
  }, [snoozedUntil]);

  // ── Snooze actions ──

  const handleSnoozeRequest = useCallback((dose: TodayDose) => {
    setSnoozeDialogDose(dose);
  }, []);

  const handleSnoozeConfirm = useCallback(async () => {
    if (!snoozeDialogDose) return;
    const dose = snoozeDialogDose;
    setSnoozeDialogDose(null);

    if (snoozedUntil[dose.key] && snoozedUntil[dose.key] > Date.now()) {
      Toast.show({ type: 'info', text1: 'Already snoozed', text2: `${dose.name} is already snoozed` });
      return;
    }

    const prevNotifId = snoozeNotifIds.current[dose.key];
    if (prevNotifId) {
      cancelSnoozeNotification(prevNotifId);
      delete snoozeNotifIds.current[dose.key];
    }

    const durationMs = parseSnoozeDuration(dose.snoozeDuration);
    const until = Date.now() + durationMs;
    setSnoozedUntil((prev) => ({ ...prev, [dose.key]: until }));

    try {
      const notifId = await scheduleSnoozeNotification(dose.name, durationMs, {
        doseKey: dose.key,
        medicationId: dose.medicationId,
        scheduleId: dose.scheduleId,
        medicationName: dose.name,
        snoozeDuration: dose.snoozeDuration,
        timeLabel: dose.timeLabel,
        dosagePerDose: dose.dosagePerDose,
      });
      snoozeNotifIds.current[dose.key] = notifId;
    } catch (err) {
      console.warn('[Snooze] Failed to schedule notification:', err);
    }

    const durationLabel =
      durationMs < 60000
        ? `${Math.round(durationMs / 1000)}s`
        : `${Math.round(durationMs / 60000)} min`;
    Toast.show({
      type: 'success',
      text1: 'Dose snoozed',
      text2: `${dose.name} snoozed for ${durationLabel}`,
    });
  }, [snoozeDialogDose, snoozedUntil]);

  const handleCancelSnooze = useCallback((dose: TodayDose) => {
    const notifId = snoozeNotifIds.current[dose.key];
    if (notifId) {
      cancelSnoozeNotification(notifId);
      delete snoozeNotifIds.current[dose.key];
    }
    setSnoozedUntil((prev) => {
      const next = { ...prev };
      delete next[dose.key];
      return next;
    });
  }, []);

  const handleTakeSnoozed = useCallback(
    async (dose: TodayDose) => {
      const notifId = snoozeNotifIds.current[dose.key];
      if (notifId) {
        cancelSnoozeNotification(notifId);
        delete snoozeNotifIds.current[dose.key];
      }
      setSnoozedUntil((prev) => {
        const next = { ...prev };
        delete next[dose.key];
        return next;
      });
      await handleStatusChange(dose, 'taken');
    },
    [handleStatusChange],
  );

  return {
    snoozedUntil,
    snoozeDialogDose,
    setSnoozeDialogDose,
    handleSnoozeRequest,
    handleSnoozeConfirm,
    handleCancelSnooze,
    handleTakeSnoozed,
    formatTimeLeft,
  };
}
