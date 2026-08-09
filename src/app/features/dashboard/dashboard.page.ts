import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { AppService } from '../../core/services/app.service';
import { SignalRService } from '../../core/services/signal-r.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html'
})
export class DashboardPage implements OnInit, OnDestroy {

  /** Active view key from ?view= query param — e.g. 'PDashboard1', '_PE', '_PA' */
  activeView: string = null;

  /** Full project viewData from shared AppService state (set by TabsPage) */
  get viewData(): any { return this.appService.viewData; }

  loading = false;
  private querySub: Subscription;

  constructor(
    private route: ActivatedRoute,
    private appService: AppService,
    private signalRService: SignalRService
  ) { }

  ngOnInit() {
    this.querySub = this.route.queryParams.subscribe(params => {

      if (!params['view']) {
        return; // ⛔ WAIT — do nothing
      }

      this.activeView = params['view'];

      console.log('ACTIVE VIEW:', this.activeView, '| type:', this.resolvedViewType, '| viewData:', this.viewData?.viewData?.detail?.type, '| menuType:', this.activeViewData?.view_type);

    });
  }

  ngOnDestroy() {
    this.querySub?.unsubscribe();
  }

  async doRefresh(event: any) {
    event.target.complete();
  }

  // ── View-type helpers — mirror pvmain's *ngIf view switches ──────────────

  get isSpecialEvent() { return this.activeView === '_PE'; }
  get isSpecialAlarm() { return this.activeView === '_PA'; }
  get isSpecialStatus() { return this.activeView === '_PS'; }
  get isSpecialHistory() { return this.activeView === '_PH'; }

  /**
   * Resolved view type — checks menu view object (view_type) first,
   * then falls back to hub viewData (viewData.detail.type).
   */
  get resolvedViewType(): string {
    return this.activeViewData?.view_type
      ?? this.viewData?.viewData?.detail?.type
      ?? '';
  }

  get isPlanMaintenance(): boolean {
    return this.resolvedViewType === 'plan_maintenance';
  }

  get isMaintenanceDashboard(): boolean {
    return this.resolvedViewType === 'maintenance_dashboard';
  }

  get isCompletedMaintenance(): boolean {
    return this.resolvedViewType === 'completed_maintenance_dashboard';
  }

  get isDashView() {
    return this.activeView &&
      !this.isSpecialEvent && !this.isSpecialAlarm &&
      !this.isSpecialStatus && !this.isSpecialHistory &&
      !this.isPlanMaintenance &&
      !this.isMaintenanceDashboard &&
      !this.isCompletedMaintenance;
  }

  /** Active view detail object from projectViews / userViews */
  get activeViewData(): any {
    if (!this.activeView || !this.viewData?.menu) return null;
    const key = this.activeView;
    if (key.startsWith('U')) {
      return (this.viewData.menu.userViews || []).find((v: any) => 'U' + v.name === key) || null;
    }
    if (key.startsWith('P')) {
      const pViews = this.viewData.menu.projectViews || [];
      const gViews = (this.viewData.viewgroups || []).flatMap((g: any) => g.viewlist || []);
      return [...pViews, ...gViews].find((v: any) => 'P' + v.name === key) || null;
    }
    return null;
  }
}
