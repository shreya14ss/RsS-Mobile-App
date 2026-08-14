import { Component, OnInit } from '@angular/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { App as CapApp } from '@capacitor/app';
import { Platform } from '@ionic/angular';
import { LocaleService } from './core/services/locale/locale.service';
import { AppService } from './core/services/app.service';
import { PushNotificationService } from './core/services/push-notification.service';
import { SignalRService } from './core/services/signal-r.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html'
})
export class AppComponent implements OnInit {

  constructor(
    private platform: Platform,
    public locale_service: LocaleService,
    public appService: AppService,
    private pushService: PushNotificationService,
    private signalR: SignalRService
  ) { }
  title = 'RsS';
  isLocalLoaded = false;
  // Time (ms since epoch) when the app was last backgrounded. Used to decide
  // whether resume was a brief screen-lock (keep modals) or a long suspension
  // where the WebView may have lost change-detection wiring (dismiss modals).
  // Persisted to sessionStorage so a WebView tear-down during background (low
  // memory / Doze on real devices) doesn't lose the timestamp before resume.
  private pausedAt: number | null = null;
  // Threshold above which we consider the suspension long enough that a stuck
  // modal is more likely than a healthy one. Screen locks under this window
  // preserve any in-progress dialog (Plan Maintenance form, etc.).
  private readonly MODAL_DISMISS_THRESHOLD_MS = 60_000;
  // Debounce guard so multiple lifecycle sources (Capacitor appStateChange,
  // Ionic Platform.resume, document visibilitychange) don't each run the
  // resume-handler once. Real devices fire two or three of these back-to-back.
  private lastResumeHandledAt = 0;
  private static readonly RESUME_DEDUP_WINDOW_MS = 2_000;
  private static readonly PAUSED_AT_KEY = 'app.pausedAt';
  ngOnInit() {
    this.locale_service.init().then(x => { this.afterLocale(); });
    this.initializeApp();
  }
  afterLocale() {
    document.body.style.setProperty('--current_font_name', this.locale_service.Locale.fontConfig.name);
    this.isLocalLoaded = true;
  }
  private async initializeApp() {
    await this.platform.ready();
    try {
      await StatusBar.setStyle({ style: Style.Dark });
      await StatusBar.setBackgroundColor({ color: '#1e3a5f' });
    } catch (_) {
      // Not available on web
    }
    try {
      await SplashScreen.hide();
    } catch (_) {
      // Not available on web
    }

    // ─── Pause/resume detection ─────────────────────────────────────────────
    // Real Android devices (Doze mode, OEM power skins) frequently miss the
    // Ionic Platform.pause event — the WebView is suspended before the JS
    // handler runs, `pausedAt` stays null, and the resume branch that dismisses
    // stuck modals is skipped. The modal then sits in the DOM with its RAF /
    // tap handlers frozen (unresponsive tabs and close button).
    //
    // Fix: use Capacitor's App.appStateChange as the primary source (fires
    // straight from native Activity.onPause/onResume), keep Ionic pause/resume
    // as a secondary source, and fall back to document.visibilitychange for
    // WebView-visibility edge cases. Persist pausedAt to sessionStorage so a
    // WebView tear-down during background still lets us compute the duration.
    const rehydrated = sessionStorage.getItem(AppComponent.PAUSED_AT_KEY);
    if (rehydrated) this.pausedAt = Number(rehydrated) || null;

    CapApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive) this.handleResume();
      else this.handlePause();
    });

    this.platform.pause.subscribe(() => this.handlePause());
    this.platform.resume.subscribe(() => this.handleResume());

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') this.handlePause();
      else if (document.visibilityState === 'visible') this.handleResume();
    });
  }

  private handlePause(): void {
    // Only capture the first pause in a burst — Capacitor + Ionic + visibility
    // events can each fire on the same transition; the earliest timestamp is
    // the correct one.
    if (this.pausedAt != null) return;
    const now = Date.now();
    this.pausedAt = now;
    try {
      sessionStorage.setItem(AppComponent.PAUSED_AT_KEY, String(now));
    } catch { /* sessionStorage full / disabled — non-fatal */ }
  }

  private handleResume(): void {
    // Dedup: three lifecycle sources fire on the same resume on some devices.
    const now = Date.now();
    if (now - this.lastResumeHandledAt < AppComponent.RESUME_DEDUP_WINDOW_MS) return;
    this.lastResumeHandledAt = now;

    const pausedForMs = this.pausedAt != null ? now - this.pausedAt : 0;
    this.pausedAt = null;
    sessionStorage.removeItem(AppComponent.PAUSED_AT_KEY);

    const isLoggedIn = !!sessionStorage.getItem('access_token');
    if (!isLoggedIn) return;

    // Ask the server whether our token still maps to an active session.
    // If another device force-logged us out while we were backgrounded,
    // the 401 flows through handleLoggedInError → routes to /login.
    this.appService.validateSession()
      .catch(() => { /* handleLoggedInError already routed to /login */ });
    this.pushService.refreshToken()
      .catch(e => console.error('[FCM] token refresh on resume failed', e));
    // Kick off hub reconnect eagerly so the hub is ready before the user's
    // next tap. Without this, the first tap post-resume tends to fire
    // invoke() while the socket is still Reconnecting — the invoke throws
    // and the user has to tap the menu item a second time.
    this.signalR.ensureConnected()
      .catch(e => console.error('[SignalR] reconnect on resume failed', e));
    // Dismiss any Ionic modal only when the app was backgrounded long
    // enough that change-detection wiring is likely broken. Short screen
    // locks (< threshold) preserve in-progress forms like Plan Maintenance
    // so the user doesn't lose their work every time they briefly lock the
    // phone. Long suspensions still get the safety net.
    //
    // When pausedForMs is 0 (no pause was captured — happens on real devices
    // where the WebView is frozen before JS can run) we treat it as a long
    // suspension and dismiss. Better to close a healthy modal than to leave
    // the user staring at a frozen one they can't close.
    const treatAsLong = pausedForMs === 0 || pausedForMs > this.MODAL_DISMISS_THRESHOLD_MS;
    if (treatAsLong) {
      this.appService.dismissAllModalsOnResume()
        .catch(e => console.error('[Modal] dismiss on resume failed', e));
    }
  }
}
