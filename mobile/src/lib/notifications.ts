// Local notifications: the system permission prompt (only after the in-app
// priming screen) and a daily check-in reminder. Nothing is sent to a server.
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const native = Platform.OS === 'ios' || Platform.OS === 'android';

if (native) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

export async function requestNotifications(): Promise<boolean> {
  try {
    if (!native) {
      const N = (globalThis as { Notification?: { requestPermission: () => Promise<string> } }).Notification;
      if (!N) return false;
      return (await N.requestPermission()) === 'granted';
    }
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Updates',
        importance: Notifications.AndroidImportance.DEFAULT,
        lightColor: '#7954ed',
      });
    }
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    const asked = await Notifications.requestPermissionsAsync();
    return asked.granted;
  } catch {
    return false;
  }
}

// One reminder a day at 7pm to keep the check-in streak going.
export async function setDailyReminder(on: boolean) {
  if (!native) return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (!on) return;
    await Notifications.scheduleNotificationAsync({
      content: { title: 'Your daily check-in is ready', body: 'Check in to keep your streak going. Seven days earns a free pack.' },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: 19, minute: 0 },
    });
  } catch {
    // Scheduling is best effort (for example, unavailable in some simulators).
  }
}
