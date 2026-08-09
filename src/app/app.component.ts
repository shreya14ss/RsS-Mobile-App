import { Component, OnInit } from '@angular/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
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

    this.platform.resume.subscribe(() => {
      const isLoggedIn = !!sessionStorage.getItem('access_token');
      if (isLoggedIn) {
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
        // Safety net: dismiss any Ionic modal that was open before we backgrounded.
        // Modals that survive a long WebView suspend/resume cycle can lose their
        // change-detection wiring — close button, back button, tab switches all
        // stop responding, forcing the user to kill the app. Dismissing on resume
        // guarantees a responsive UI. Users lose their modal state; that's the
        // acceptable tradeoff for not freezing the app.
        this.appService.dismissAllModalsOnResume()
          .catch(e => console.error('[Modal] dismiss on resume failed', e));
      }
    });
  }
}
