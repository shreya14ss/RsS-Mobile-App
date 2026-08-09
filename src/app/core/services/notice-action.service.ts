import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { AppService, Notice } from './app.service';

type ActionableNotice = Pick<Notice, 'isActionable' | 'actionType' | 'actionMetadata'>;

@Injectable({ providedIn: 'root' })
export class NoticeActionService {

  private static readonly MOBILE_DASHBOARD_VIEW = 'Maintenance Dashboard';
  private static readonly MOBILE_DASHBOARD_TABS = [
    'Substation', 'Bay', 'Equipment', 'Scheduled TL',
    'Patrolling TL', 'Asst. Mnt. Elmnt', 'Connected TL',
    'Breakdown Maintenance'
  ];

  constructor(private router: Router, private appService: AppService) {}

  canNavigate(notice: ActionableNotice): boolean {
    if (!notice?.isActionable || !notice?.actionType) return false;
    const md = notice.actionMetadata;
    if (!md) return false;
    if (md['target_view'] !== NoticeActionService.MOBILE_DASHBOARD_VIEW) return false;
    const targetTab = md['target_tab'] as string | undefined;
    if (targetTab && !NoticeActionService.MOBILE_DASHBOARD_TABS.includes(targetTab)) return false;
    return true;
  }

  async executeAction(notice: ActionableNotice): Promise<void> {
    if (!this.canNavigate(notice)) return;

    const metadata = notice.actionMetadata ?? {};

    const routeSnapshot = this.router.routerState.root.firstChild?.firstChild?.snapshot;
    const project_id = routeSnapshot?.paramMap.get('id') ?? '';
    const defaultPath = (routeSnapshot?.data?.['viewData']?.group_path as string[] | undefined)?.join('/') ?? '';
    const final_path = (metadata['PathForRosterNotification'] as string | undefined)?.trim() || defaultPath;

    const effectiveView = NoticeActionService.MOBILE_DASHBOARD_VIEW;
    const targetTab = metadata['target_tab'] as string | undefined;
    const effectiveTab = targetTab && NoticeActionService.MOBILE_DASHBOARD_TABS.includes(targetTab)
      ? targetTab
      : NoticeActionService.MOBILE_DASHBOARD_TABS[0];
    const effectiveMaintenanceId = (metadata['maintenance_id'] as string) ?? null;

    const dashboardLive = !!this.appService.switchMaintenanceTab;
    const canSwitchInPlace = dashboardLive && (final_path === defaultPath);

    if (canSwitchInPlace) {
      const currenttab = this.appService.getCurrentMaintenanceTab() ?? '';
      if (effectiveTab !== currenttab) {
        this.appService.switchMaintenanceTab(effectiveTab);
      }
      if (effectiveMaintenanceId) {
        this.appService.openMaintenanceById?.(effectiveMaintenanceId);
      }
    } else {
      this.appService.setPendingMaintenanceTab(effectiveTab);
      this.appService.setPendingMaintenanceId(effectiveMaintenanceId);
      this.router.navigate(['/project/' + project_id + '/' + final_path], {
        queryParams: { view: 'P' + effectiveView },
      });
    }
  }
}
