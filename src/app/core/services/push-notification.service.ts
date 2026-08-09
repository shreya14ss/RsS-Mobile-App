import { Injectable, Injector } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Capacitor } from '@capacitor/core';
import {
  PushNotifications,
  ActionPerformed,
  Channel
} from '@capacitor/push-notifications';
import { Preferences } from '@capacitor/preferences';
import { environment } from 'src/environments/environment';
import { NoticeActionService } from './notice-action.service';
import { AppService } from './app.service';

const FCM_TOKEN_KEY = 'fcm_token';
const DEVICE_ID_KEY = 'device_id';

@Injectable({ providedIn: 'root' })
export class PushNotificationService {

  constructor(
    private http: HttpClient,
    private noticeAction: NoticeActionService,
    private injector: Injector
  ) {}

  async init(): Promise<void> {
    console.log('[FCM] init called, isNative:', Capacitor.isNativePlatform());
    if (!Capacitor.isNativePlatform()) return;

    const perm = await PushNotifications.requestPermissions();
    console.log('[FCM] permission result:', JSON.stringify(perm));
    if (perm.receive !== 'granted') return;

    await this.ensureChannels();
    console.log('[FCM] channels created, registering...');

    await PushNotifications.removeAllListeners();
    PushNotifications.addListener('registration', t => this.onToken(t.value));
    PushNotifications.addListener('registrationError', e => console.error('[FCM] registration error', e));
    PushNotifications.addListener('pushNotificationReceived', _n => {
      // App is foregrounded — SignalR dialog handles the UI; suppress the OS banner
      // by using data-only payloads on the backend (no notification key in payload).
    });
    PushNotifications.addListener('pushNotificationActionPerformed', a => this.onTap(a));

    await PushNotifications.register();
  }

  async refreshToken(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;
    const perm = await PushNotifications.checkPermissions();
    if (perm.receive !== 'granted') return;
    await PushNotifications.register();
  }

  async unregister(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;

    const { value: token } = await Preferences.get({ key: FCM_TOKEN_KEY });
    if (token) {
      try {
        await this.http
          .delete(`${environment.baseURL}/api/DeviceTokens/${encodeURIComponent(token)}`)
          .toPromise();
      } catch (e) {
        console.error('[FCM] failed to unregister token from backend', e);
      }
      await Preferences.remove({ key: FCM_TOKEN_KEY });
    }

    await PushNotifications.removeAllListeners();
  }

  private async onToken(token: string): Promise<void> {
    console.log('[FCM] registration event fired, token length:', token?.length);
    await Preferences.set({ key: FCM_TOKEN_KEY, value: token });
    const deviceId = await this.getOrCreateDeviceId();
    console.log('[FCM] posting token to backend, deviceId:', deviceId);
    try {
      await this.http
        .post(`${environment.baseURL}/api/DeviceTokens`, {
          token,
          deviceId,
          platform: 'android'
        })
        .toPromise();
      console.log('[FCM] token registered with backend successfully');
    } catch (e) {
      console.error('[FCM] failed to register token with backend', e);
    }
  }

  private onTap(action: ActionPerformed): void {
    const data = (action.notification.data ?? {}) as Record<string, string>;
    const isActionable = data['isActionable'] === 'True';
    const notice = {
      isActionable,
      actionType: data['actionType'] ?? '',
      actionMetadata: data['actionMetadata']
        ? JSON.parse(data['actionMetadata'])
        : null
    };

    if (isActionable && this.noticeAction.canNavigate(notice)) {
      this.noticeAction.executeAction(notice).catch(e =>
        console.error('[FCM] tap navigation error', e)
      );
    } else {
      const fullNotice = {
        ...notice,
        _id: data['noticeId'] ?? '',
        _rev: '',
        messageText: data['body'] ?? '',
        timestamp: Date.now(),
        sender: { id: '', name: data['title'] ?? 'RsS', loginId: '' },
        receivingUsers: [],
        receivingGroups: [],
        isUrgent: false,
        isNotification: true,
        readBy: []
      } as any;
      this.injector.get(AppService).urgentDlgShow(
        isActionable ? 'actionable' : 'non-actionable',
        fullNotice
      );
    }
  }

  private async getOrCreateDeviceId(): Promise<string> {
    const { value: existing } = await Preferences.get({ key: DEVICE_ID_KEY });
    if (existing) return existing;
    const id = this.generateUUID();
    await Preferences.set({ key: DEVICE_ID_KEY, value: id });
    return id;
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  private async ensureChannels(): Promise<void> {
    const urgent: Channel = {
      id: 'rss_urgent',
      name: 'Urgent Notifications',
      importance: 5,
      visibility: 1,
      lights: true,
      vibration: true
    };
    const normal: Channel = {
      id: 'rss_default',
      name: 'General Notifications',
      importance: 3,
      visibility: 1
    };
    await PushNotifications.createChannel(urgent);
    await PushNotifications.createChannel(normal);
  }
}
