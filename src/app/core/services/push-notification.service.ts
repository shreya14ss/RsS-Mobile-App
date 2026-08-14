import { Injectable, Injector, NgZone } from '@angular/core';
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
    private injector: Injector,
    private ngZone: NgZone
  ) {}

  // In-memory cache of the resolved device_id. Preferences round-trips are
  // async, so concurrent callers (login init + resume refreshToken) used to
  // race: both read undefined, both minted fresh UUIDs, both POSTed to
  // /api/DeviceTokens. Result: user docs accumulated 20+ device_id/token
  // pairs for one physical device. This promise is created the first time
  // getOrCreateDeviceId runs and every subsequent caller awaits the same
  // promise — the read+write becomes atomic from the caller's POV.
  private deviceIdPromise: Promise<string> | null = null;
  // Guards init() from re-registering listeners and re-invoking register()
  // when UpdateToken is called more than once in a session (double-login,
  // token refresh flows).
  private initPromise: Promise<void> | null = null;
  // Last (token, deviceId) tuple successfully posted. Skips the network
  // hop when FCM re-fires 'registration' with the same token — which is
  // the common case since Firebase's token is stable across register() calls.
  private lastPosted: { token: string; deviceId: string } | null = null;

  init(): Promise<void> {
    // Idempotent: return the in-flight / completed promise instead of
    // running init a second time. Prevents duplicate 'registration' listeners
    // and duplicate register() calls after a re-login.
    if (this.initPromise) return this.initPromise;
    this.initPromise = this.initInternal().catch(e => {
      // On failure, clear so a subsequent login can retry.
      this.initPromise = null;
      throw e;
    });
    return this.initPromise;
  }

  private async initInternal(): Promise<void> {
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
    // Capacitor invokes plugin listeners from the native bridge, which is
    // OUTSIDE Angular's NgZone. Anything onTap does (tab switch, modal open,
    // subsequent state changes) then runs without change detection, so the
    // opened modal renders but its tab clicks and controls are dead. Force
    // the whole handler back into NgZone.
    PushNotifications.addListener('pushNotificationActionPerformed', a =>
      this.ngZone.run(() => this.onTap(a))
    );

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

    // Reset session guards so a subsequent login re-registers cleanly.
    this.lastPosted = null;
    this.initPromise = null;
    await PushNotifications.removeAllListeners();
  }

  private async onToken(token: string): Promise<void> {
    console.log('[FCM] registration event fired, token length:', token?.length);
    const deviceId = await this.getOrCreateDeviceId();

    // Skip the network hop if this exact (token, deviceId) pair was already
    // POSTed in this session. Firebase re-fires 'registration' with the same
    // token on every register() call — without this guard, the backend saw
    // one POST from init() and another from every resume-triggered
    // refreshToken(), even when nothing had changed.
    if (this.lastPosted && this.lastPosted.token === token && this.lastPosted.deviceId === deviceId) {
      console.log('[FCM] token unchanged since last POST; skipping');
      return;
    }

    await Preferences.set({ key: FCM_TOKEN_KEY, value: token });
    console.log('[FCM] posting token to backend, deviceId:', deviceId);
    try {
      await this.http
        .post(`${environment.baseURL}/api/DeviceTokens`, {
          token,
          deviceId,
          platform: 'android'
        })
        .toPromise();
      this.lastPosted = { token, deviceId };
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
        uniqueCode: data['uniqueCode'] ?? '',
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

  private getOrCreateDeviceId(): Promise<string> {
    // Serialize: all concurrent callers await the same promise so only one
    // read-and-conditional-write against Preferences ever runs. Fixes the
    // race where init() and refreshToken() both saw undefined and each
    // minted their own UUID, causing duplicate (token, deviceId) pairs to
    // accumulate in the user doc on the backend.
    if (this.deviceIdPromise) return this.deviceIdPromise;
    this.deviceIdPromise = (async () => {
      const { value: existing } = await Preferences.get({ key: DEVICE_ID_KEY });
      if (existing) return existing;
      const id = this.generateUUID();
      await Preferences.set({ key: DEVICE_ID_KEY, value: id });
      return id;
    })();
    return this.deviceIdPromise;
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
