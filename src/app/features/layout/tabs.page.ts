import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { AppService } from '../../core/services/app.service';
import { SignalRService } from '../../core/services/signal-r.service';
import { MenuController, Platform } from '@ionic/angular';
import { environment } from '../../../environments/environment';
import { BCSelectionClass } from 'src/app/shared/breadcrumb/breadcrumb.component';
import { App } from '@capacitor/app';

@Component({
  selector: 'app-tabs',
  templateUrl: './tabs.page.html',
  styleUrls: ['./tabs.page.scss']
})
export class TabsPage implements OnInit, OnDestroy {

  productName = environment.productName;
  inProgress = false;
  userName = '';

  get viewData(): any { return this.appService.viewData; }
  get activeView(): string {
    return this.appService.viewData?.view;
  }
  breadcrumbSelection: BCSelectionClass[] = [];
  breadcrumbQueryParams: any = null;
  private subs: Subscription[] = [];

  constructor(
    private router: Router,
    private appService: AppService,
    private signalR: SignalRService,
    private menuCtrl: MenuController,
    private platform: Platform
  ) { }

  async ngOnInit() {
    this.userName = (await this.appService.getUserName()) || 'User';
    await this.loadViewData();
    this.listenRouteChanges();

    this.subs.push(
      this.platform.backButton.subscribeWithPriority(10, async () => {
        const menuOpen = await this.menuCtrl.isOpen('main-menu');
        if (menuOpen) {
          await this.menuCtrl.close('main-menu');
        } else {
          // Minimize (background) instead of exitApp() so the login session
          // survives when the user returns — matches swipe-up home behaviour.
          App.minimizeApp();
        }
      })
    );
    // ADD THIS (CRITICAL FIX)
    // this.subs.push(
    //   this.appService.breadcrumbUpdated.subscribe((data) => {
    //     console.log('Breadcrumb updated from component:', data);

    //     this.breadcrumbSelection = JSON.parse(JSON.stringify(data));
    //     this.breadcrumbQueryParams = { view: this.appService.viewData?.view };
    //   })
    // );
  }

  ngOnDestroy() {
    this.subs.forEach(s => s.unsubscribe());
  }

  // ─────────────────────────────────────────────
  // LOAD DATA (like ClientApp)
  // ─────────────────────────────────────────────
  private async loadViewData() {
    console.log('Tabs loadViewData START');
    this.inProgress = true;

    try {
      const mode = await this.appService.GetLoginModeDetails();
      console.log('Mode details:', mode);
      await this.signalR.startConnection();
      console.log('SignalR connected');

      const vd = await this.signalR.getProjectViewDetails(mode.project_id, '', '', null);
      console.log('ViewData initial:', vd);
      this.appService.viewData = vd;

      const def = this.getDefaultView(vd);
      console.log('Checking menu:', vd?.menu);
      console.log('userViews:', vd?.menu?.userViews);
      console.log('projectViews:', vd?.menu?.projectViews);
      console.log('Default view:', def);
      if (def) {
        console.log('Default view found:', def);

        const updated = await this.signalR.getProjectViewDetails(mode.project_id, '', def.key, null);
        console.log('Updated ViewData:', updated);

        this.appService.viewData = updated;
        this.signalR.StartSendData();
        await this.router.navigate(['/tabs/dashboard'], {
          queryParams: { view: def.key },
          replaceUrl: true
        });

        console.log('Navigation to dashboard complete');

      } else {
        console.error('No default view found → FALLBACK');

        // FORCE navigation (important)
        await this.router.navigate(['/tabs/dashboard'], {
          replaceUrl: true
        });

        console.log('Navigation to dashboard complete');
      }
    } finally {
      this.inProgress = false;
    }
  }
  // ─────────────────────────────────────────────
  // DEFAULT VIEW (ClientApp logic)
  // ─────────────────────────────────────────────
  private getDefaultView(vd: any): { key: string; label: string } | null {
    if (!vd?.menu) return null;

    const allViews = [
      ...(vd.menu.userViews || []),
      ...(vd.menu.projectViews || [])
    ];

    if (!allViews.length) return null;

    const def = allViews.find(v => v.is_default) || allViews[0];

    const key = (vd.menu.userViews.includes(def) ? 'U' : 'P') + def.name;

    return { key, label: def.name };
  }

  // ─────────────────────────────────────────────
  // BREADCRUMB (NO FALLBACK ❗)
  // ─────────────────────────────────────────────
  private setBreadcrumb() {
    const vd = this.appService.viewData;

    if (vd?.menu?.breadCrumbSelection?.length) {
      this.breadcrumbSelection = JSON.parse(
        JSON.stringify(vd.menu.breadCrumbSelection)
      );
      this.breadcrumbQueryParams = { view: vd.view };
    }
  }

  // ─────────────────────────────────────────────
  // ROUTE SYNC (VERY IMPORTANT)
  // ─────────────────────────────────────────────
  private listenRouteChanges() {
    this.subs.push(
      this.router.events
        .pipe(filter(e => e instanceof NavigationEnd))
        .subscribe(() => {
          this.setBreadcrumb();
        })
    );
  }

  /**
   * Called from every menu item click.
   * Invokes the hub with the real view key so viewData.viewData.detail.type
   * is correctly set before DashboardPage evaluates its view-type getters.
   */
  async selectView(key: string) {
    const currentPath = this.appService.viewData?.group_path?.join('/') || '';
    try {
      const updated = await this.signalR.getProjectViewDetails(this.appService.GetProjectID() || '', currentPath, key, null);
      this.appService.viewData = updated;
      this.setBreadcrumb();
      await this.menuCtrl.close('main-menu');
      await this.router.navigate(['/tabs/dashboard'], {
        queryParams: { view: updated.view || key },
        queryParamsHandling: 'merge',
        replaceUrl: true
      });
    } catch (err) {
      console.error('selectView error:', err);
    }
  }

  /** Returns the Ionic icon name for a menu view item.
   *  Prefers the DB-stored view_icon; falls back to a type-based default. */
  getViewIcon(view: any): string {
    if (view?.view_icon) return view.view_icon;
    switch (view?.view_type) {
      case 'plan_maintenance': return 'construct-outline';
      case 'maintenance_dashboard': return 'hammer-outline';
      case 'completed_maintenance_dashboard': return 'checkmark-done-outline';
      case 'mnt_opr_dashboard': return 'build-outline';
      case 'maintenance_report': return 'document-text-outline';
      default: return 'layers-outline';
    }
  }

  goBack() {
    window.history.back();
  }
  async logout() {
    try {
      await this.appService.LogoutUser();
      this.router.navigate(['/login'], { replaceUrl: true });

    } catch (error) {
      console.error('Logout failed', error);
    }
  }
}
