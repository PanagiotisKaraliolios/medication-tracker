const originalError = console.error;
console.error = (...args) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('react-test-renderer is deprecated') ||
      args[0].includes('was not wrapped in act(...)'))
  ) {
    return;
  }
  originalError.call(console, ...args);
};

const originalWarn = console.warn;
console.warn = (...args) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('[useCreateSchedule] Failed to schedule reminders') ||
      args[0].includes('[useUpdateSchedule] Failed to reschedule reminders') ||
      args[0].includes('[Snooze] Failed to schedule notification') ||
      args[0].includes('[Notifications] Failed to cancel') ||
      args[0].includes('Listening to push token changes is not yet fully supported'))
  ) {
    return;
  }
  originalWarn.call(console, ...args);
};
