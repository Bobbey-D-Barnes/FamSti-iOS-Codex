// Native Notifications Service – adapted from PWA for expo-notifications
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { db } from './storage';
import { Reminder } from '../types';
import { runProactiveChecks } from '../agent/proactiveChecks';
import { sessionFollowups } from '../agent/sessionFollowups';

const BACKGROUND_FETCH_TASK = 'background-fetch-proactive-checks';

TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
  try {
    await NotificationService.checkSessionFollowups();
    await NotificationService.checkProactiveInsightsNotifications();
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error('[Background Fetch] Failed:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export class NotificationService {
  private static intervalId: ReturnType<typeof setInterval> | null = null;

  static async requestPermission(): Promise<boolean> {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('Push notification permission not granted');
      return false;
    }

    // iOS specific: register for remote notifications
    if (Platform.OS === 'ios') {
      await Notifications.setNotificationChannelAsync?.('default', {
        name: 'default',
        importance: Notifications.AndroidImportance?.MAX,
      });
    }

    return true;
  }

  static async init() {
    const granted = await this.requestPermission();
    if (!granted) return;

    // Register native background fetch task
    await this.registerBackgroundTask();

    // Stop existing interval
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    // Check every minute
    this.intervalId = setInterval(() => {
      this.checkReminders();
      this.checkSessionFollowups();
      this.checkProactiveInsightsNotifications();
    }, 60000);

    // Initial check
    this.checkReminders();
    this.checkSessionFollowups();
    this.checkProactiveInsightsNotifications();
  }

  static async registerBackgroundTask() {
    try {
      if (Platform.OS === 'web') return;
      const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_FETCH_TASK);
      if (!isRegistered) {
        await BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
          minimumInterval: 60 * 15, // 15 minutes (minimum allowed on iOS)
          stopOnTerminate: false, // Run when closed
          startOnBoot: true, // Run on boot
        });
        console.log('[Background Fetch] Task registered successfully');
      }
    } catch (err) {
      console.warn('[Background Fetch] Registration failed:', err);
    }
  }

  static stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private static checkReminders = async () => {
    try {
      const reminders = await db.getReminders();
      const now = new Date();

      const dueReminders = reminders.filter((r) => {
        if (r.is_completed || r.is_dismissed) return false;
        const dueDate = new Date(r.due_date);
        return dueDate <= now;
      });

      for (const reminder of dueReminders) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `📋 ${reminder.title}`,
            body: reminder.description || 'Erinnerung fällig!',
            data: { reminderId: reminder.id },
          },
          trigger: null, // Fire immediately
        });

        // Mark as dismissed so we don't keep notifying
        await db.saveReminder({
          ...reminder,
          is_dismissed: true,
        });
      }
    } catch (e) {
      console.error('Failed to check reminders:', e);
    }
  };

  static checkSessionFollowups = async () => {
    try {
      const due = await sessionFollowups.getDue();
      if (due.length === 0) return;
      const sessions = await db.getSessions();
      for (const followup of due.slice(0, 3)) {
        const session = sessions.find((item) => item.id === followup.sessionId);
        if (!session || session.confirmed || session.cancellation_reason) {
          await sessionFollowups.completeBySession(followup.sessionId);
          continue;
        }
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Fahrt abbuchen?',
            body: `${session.student_name} ${session.start_time}-${session.end_time} als gefahren bestätigen?`,
            data: { sessionId: session.id, followupId: followup.id },
          },
          trigger: null,
        });
        await sessionFollowups.markAsked([followup.id]);
      }
    } catch (e) {
      console.error('Failed to check session followups:', e);
    }
  };

  static checkProactiveInsightsNotifications = async () => {
    try {
      const granted = await this.requestPermission();
      if (!granted) return;

      const insights = await runProactiveChecks();
      const highPriorityInsights = insights.filter((i) => i.priority === 'high');
      if (highPriorityInsights.length === 0) return;

      // Load notified record
      const notifiedStr = await AsyncStorage.getItem('fc_agent_notified_insights');
      const notified: Record<string, string> = notifiedStr ? JSON.parse(notifiedStr) : {};

      let hasNew = false;
      for (const insight of highPriorityInsights) {
        if (!notified[insight.id]) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: `🤖 Copilot: ${insight.title}`,
              body: insight.body,
              sound: true,
              data: { insightId: insight.id, route: insight.route },
            },
            trigger: null, // Fire immediately
          });

          notified[insight.id] = new Date().toISOString();
          hasNew = true;
        }
      }

      if (hasNew) {
        await AsyncStorage.setItem('fc_agent_notified_insights', JSON.stringify(notified));
      }
    } catch (e) {
      console.error('Failed to check proactive insights notifications:', e);
    }
  };

  static async scheduleSessionReminder(studentName: string, date: string, time: string) {
    const triggerDate = new Date(`${date}T${time}`);
    triggerDate.setMinutes(triggerDate.getMinutes() - 15); // 15 min before

    if (triggerDate <= new Date()) return; // Don't schedule past notifications

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🚗 Fahrstunde in 15 Minuten',
        body: `${studentName} um ${time}`,
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
      },
    });
  }

  static async scheduleReminder(reminder: Reminder) {
    const granted = await this.requestPermission();
    if (!granted) return false;

    const triggerDate = new Date(reminder.due_date);
    if (triggerDate <= new Date()) return false;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: reminder.title,
        body: reminder.description || 'Erinnerung fällig!',
        sound: true,
        data: { reminderId: reminder.id, reminderType: reminder.type },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
      },
    });
    return true;
  }

  static async cancelAll() {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }
}
