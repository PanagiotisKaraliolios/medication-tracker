import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import type { DoseLogRow, MedicationRow, ScheduleRow } from '../types/database';
import { toISO } from '../utils/date';
import { buildTodayDoses } from '../utils/dose';
import { supabase } from './supabase';

const WIDGET_DATA_KEY = 'meditrack_widget_data';

export type WidgetData = {
  nextDose: {
    name: string;
    dosage: string;
    form: string;
    time: string;
    icon: string;
  } | null;
  updatedAt: string;
};

/**
 * Compute the next pending dose for today based on current time.
 * Returns null if no pending doses remain.
 */
export function computeNextDose(
  medications: MedicationRow[],
  schedules: ScheduleRow[],
  doseLogs: DoseLogRow[],
  dateISO: string,
): WidgetData['nextDose'] {
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayLabel = dayNames[new Date(`${dateISO}T00:00:00`).getDay()];

  const doses = buildTodayDoses(medications, schedules, doseLogs, todayLabel, dateISO);

  // All pending doses sorted chronologically
  const pendingDoses = doses
    .filter((d) => d.status === 'pending')
    .sort((a, b) => a.sortOrder - b.sortOrder);

  if (pendingDoses.length === 0) return null;

  // Prefer the next upcoming dose; if all are overdue, show the earliest one
  const target = pendingDoses.find((d) => d.sortOrder >= nowMinutes) ?? pendingDoses[0];

  return {
    name: target.name,
    dosage: target.dosage,
    form: target.form,
    time: target.time,
    icon: target.icon,
  };
}

/**
 * Write widget data to platform-specific shared storage.
 * - Android: AsyncStorage (read by widget task handler)
 * - iOS: App Group UserDefaults (read by WidgetKit extension)
 */
export async function writeWidgetData(data: WidgetData): Promise<void> {
  const json = JSON.stringify(data);

  if (Platform.OS === 'android') {
    await AsyncStorage.setItem(WIDGET_DATA_KEY, json);
  } else if (Platform.OS === 'ios') {
    try {
      const { NativeModules } = require('react-native');
      await NativeModules.WidgetBridge?.setItem?.(WIDGET_DATA_KEY, json);
    } catch (_err) {
      // Fallback to AsyncStorage if native module unavailable
      await AsyncStorage.setItem(WIDGET_DATA_KEY, json);
    }
  }
}

/**
 * Read widget data from platform-specific shared storage.
 */
export async function readWidgetData(): Promise<WidgetData | null> {
  try {
    let json: string | null = null;

    if (Platform.OS === 'android') {
      json = await AsyncStorage.getItem(WIDGET_DATA_KEY);
    } else if (Platform.OS === 'ios') {
      try {
        const { NativeModules } = require('react-native');
        json = (await NativeModules.WidgetBridge?.getItem?.(WIDGET_DATA_KEY)) ?? null;
      } catch {
        json = await AsyncStorage.getItem(WIDGET_DATA_KEY);
      }
    }

    return json ? JSON.parse(json) : null;
  } catch {
    return null;
  }
}

/**
 * Request all platform widgets to refresh their display.
 */
export async function requestWidgetRefresh(): Promise<void> {
  if (Platform.OS === 'android') {
    try {
      const { requestWidgetUpdate } = require('react-native-android-widget');
      const { NextDoseWidget } = require('../widgets/NextDoseWidget');
      const data = await readWidgetData();
      await requestWidgetUpdate({
        widgetName: 'NextDoseWidget',
        renderWidget: () => <NextDoseWidget data={data} />,
        widgetNotFound: () => {},
      });
    } catch (err) {
      console.warn('[Widget] Failed to request Android widget update:', err);
    }
  } else if (Platform.OS === 'ios') {
    // WidgetCenter.reloadAllTimelines() via local Expo module (modules/widget-bridge)
    try {
      const { NativeModules } = require('react-native');
      await NativeModules.WidgetBridge?.reloadAllTimelines?.();
    } catch (err) {
      console.warn('[Widget] Failed to reload iOS widget timelines:', err);
    }
  }
}

/**
 * Fetch fresh data from Supabase and push to the widget.
 * Used by mutation hooks that don't have the full data context.
 */
export async function fetchAndUpdateWidget(userId: string): Promise<void> {
  try {
    const todayISO = toISO(new Date());
    const [{ data: meds }, { data: scheds }, { data: logs }] = await Promise.all([
      supabase.from('medications').select('*').eq('user_id', userId).eq('is_active', true),
      supabase.from('schedules').select('*').eq('user_id', userId).eq('is_active', true),
      supabase.from('dose_logs').select('*').eq('user_id', userId).eq('scheduled_date', todayISO),
    ]);
    await updateWidget(
      (meds ?? []) as MedicationRow[],
      (scheds ?? []) as ScheduleRow[],
      (logs ?? []) as DoseLogRow[],
    );
  } catch (err) {
    console.warn('[Widget] Failed to fetch and update widget:', err);
  }
}

/**
 * Compute, write, and refresh widget data in one call.
 * Convenience function used after mutations and on app foreground.
 */
export async function updateWidget(
  medications: MedicationRow[],
  schedules: ScheduleRow[],
  doseLogs: DoseLogRow[],
): Promise<void> {
  try {
    const dateISO = toISO(new Date());
    const nextDose = computeNextDose(medications, schedules, doseLogs, dateISO);
    const data: WidgetData = { nextDose, updatedAt: new Date().toISOString() };
    await writeWidgetData(data);
    await requestWidgetRefresh();
  } catch (err) {
    console.warn('[Widget] Failed to update widget:', err);
  }
}
