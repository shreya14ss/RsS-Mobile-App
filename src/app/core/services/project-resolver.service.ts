import { Injectable, OnDestroy } from '@angular/core';
import { Router, ActivatedRouteSnapshot, ActivatedRoute, RouterStateSnapshot, Resolve } from '@angular/router';
import { EMPTY, Observable, Subscription } from 'rxjs';
import { AppService } from './app.service';
import { BCSelectionClass } from '../../shared/breadcrumb/breadcrumb.component';
// import { DashTileComponent } from './pvdashboard/dash-tile/dash-tile.component';
import { SignalRService } from './signal-r.service';
//import * as moment from 'moment';
// import { PVEventComponent } from './pvevent/pvevent.component';
// import { PVAlarmComponent } from './pvalarm/pvalarm.component';
// import { MatBottomSheet, MatBottomSheetRef } from '@angular/material/bottom-sheet';
// import { MatDialog } from '@angular/material/dialog';
// import { LoadSheddingTreeComponent } from './loadshedding/load-shedding-tree/load-shedding-tree.component';
// import { PVStatusComponent } from './pvstatus/pvstatus.component';
// import { PVHistoryComponent } from './pvhistory/pvhistory.component';
import { PVMainComponent } from '../../features/pvmain/pvmain.component';
// import { PVLiveTrendComponent } from './pvlive-trend/pvlive-trend.component';
// import { LoadSheddingReportComponent } from './loadshedding/load-shedding-report/load-shedding-report.component';
// import { PVTrippingReportComponent } from './pvtripping-report/pvtripping-report.component';
// import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { shareReplay, map } from 'rxjs/operators';
// import { LoadSheddingMainComponent } from './loadshedding/load-shedding-main/load-shedding-main.component';
// import { PvOperationalViewComponent } from './pv-operational-view/pv-operational-view.component';
// import { EventLogViewComponent } from './event-log-view/event-log-view.component';
// import { LogStartupValueComponent } from './log-startup-value/log-startup-value.component';
// import { GroupOperationalViewComponent } from './group-operational-view/group-operational-view.component';
// import { ShiftSummaryComponent } from './shift-summary/shift-summary.component';
// import { RosterManagementComponent } from './project-settings/roster-management/roster-management.component';
import { MaintenanceDashboardComponent } from '../../features/maintenance-schedule/maintenance-dashboard/maintenance-dashboard.component';
import { PtwActionDlgComponent } from '../../features/maintenance-schedule/maintenance-dashboard/action-dlg/ptw-action-dlg/ptw-action-dlg.component';
import { PvPlanMaintenanceComponent } from 'src/app/features/maintenance-schedule/pv-plan-maintenance/pv-plan-maintenance.component';
// import { PvPlanMaintenanceComponent } from './maintenance-schedule/pv-plan-maintenance/pv-plan-maintenance.component';
// import { PvMaintenanceCompletedDashboardComponent } from './maintenance-schedule/pv-maintenance-dashboard/pv-maintenance-completed-dashboard/pv-maintenance-completed-dashboard.component';
// todo mobile
// import { PtwActionDlgComponent } from './maintenance-schedule/action-dlg/ptw-action-dlg/ptw-action-dlg.component';
// import { PVChartComponent } from './pvchart/pvchart.component';
// import { PvGroupOrderComponent } from './pv-group-order/pv-group-order.component';
// import { EventLogDlgComponent } from './event-log-view/event-log-dlg/event-log-dlg.component'
// import { EventLogGroupDlgComponent } from './event-log-view/event-log-group-dlg/event-log-group-dlg.component'
// import { DashBoardComponent } from './pvdashboard/dash-board/dash-board.component';
// import { PVShiftCloseReportComponent } from './pvshift-close-report/pvshift-close-report.component';
// import { PvShiftCloseReportDlgComponent } from './pvshift-close-report/pvshift-close-report-dlg/pvshift-close-report-dlg.component';
// import { PVUserInShiftComponent } from './pvuser-in-shift/pvuser-in-shift.component';
export enum UserRoles {
  SSE = 'SSE',
  JE = 'JE',
  Operator = 'Operator',
  SLDC = 'SLDC'
}
export enum Resolution {
  one_min = 1,
  five_min = 5,
  ten_min = 10,
  fifteen_min = 101,
  thirty_min = 102,
  hourly = 104,
  shift = 105,
  daily = 196,
  weekly = 1372,
  monthly = 2000,
  yearly = 2001
}

export enum GroupAccessRight {
  User,
  AlarmAcknowledge,
  ScanInhibit,
  Substitute,
  ManualLogging,
  AlarmDelete,
  AlarmInhibit,
  Control,
  ControlInhibit,
  Admin,
  InterlockBypass,
  SynchCheckBypass,
  ProjectAdmin,


  CreateEditOperationsView,
  ViewOperations,
  CreateShift,
  EditShift,
  ViewShift,
  CreateEditRoster,
  ViewRoster,
  CloseShift,
  SetSLD,

  //MaintenanceRights
  SLDCCodeIssueRequest,
  SLDCCodeApproveReject,
  PTWIssueRequest,
  PTWCancelRequest,
  PTWApproveCancel,
  SurveyLog,
  CreateScheduledMaintenance,
  ScheduleConditionalMaintenance,
  EventLogConditionalMaintenance,

  //new Added
  XENApproveReject,
  MaintenanceDateChange,
  ParameterApproveReject,
  EventLogView,
  EventLog,

  // MaintainanceDLG TAb Rights
  SLDCDetailsTab,
  PTWDetailsTab,


  //Buttons & Inputs
  RequestApprovalMaintenance,
  ApproveMaintenance,
  CancelMaintenance,
  maintenanceDateClicked,
  hoursAndDaysRequired,
  sldcShutDownCode,
  sldcChargingCode,
  saveTime,
  requestSLDCCode,
  IssueSLDCCode,
  requestSLDCRestoration,
  sldcCancelMaintenance,
  rqstPTWButton,
  PTWinputNo,
  RestorationButton,
  addEventLogButton,
  rqstPTWCancelButton,
  issuePTWButton,
  cancelPTWButton,
  transferPTWButton,
  OtherPTWTabAction,

  // Parameters
  maintenenceApproveRevert,
  maintenenceInputSaveSubmit,
  mnpApproveRevert,
  mnpInputSaveSubmit,

  //hotline
  hotlineInputSaveSubmit,
  hotlineObservationClose,
  hotlineObservationTab,

  // Observations
  observationListTabView,
  observationListTabInput,
  observationMaintenanceTabView,
  createManualObservationButton,

  // TL
  PlanTLMaintenance,
  TLPatrollingInput,
  TLMaintenanceParameterInputSaveSubmit,
  TLMaintenanceParameterApproveRevert,
  TLPatrollingReschedule,
  TLPatrollingCompleteMaintenance,
  ScheduleTLPatrolling,
  ConnectedTLMaintenanceTab,

  // Dashboard Tabs
  SubBayEqpTab,
  SubstationTabView,
  BayTabView,
  EquipmentTabView,
  HotLineTab,
  TLTab,
  ConditionalMaintenanceTab,
  OtherPTWTab,
  XENApprovalRequestTab,
  XENApprovedRequestTab,
  SLDCCodeRequestTab,
  AllMaintenancePlannedTab,
  BackfeedingRequestTab,
  TlMaintenanceTab,
  ObservationMaintenanceTab,

  StartUnscheduledMaintenance,

  SchdeuledDashboardBayEquipmentTabView,
  SchdeuledDashboardSubstationTabView,
  SchdeuledDashboardBayTabView,
  SchdeuledDashboardEquipmentTabView,
  SchdeuledDashboardTLTabView,
  observationstartMaintenanceInput,
  ScheduledObservationTLTab,
  ScheduledConnectedTLForBayTab,
  ScheduledConnectedBayForTLMaintenanceTab,
  ScheduledConnectedBayForSubstationMaintenanceTab,
  ScheduledShutdownRequestTab,
  //Connected Bay Tab

  ConnectedBayForTLMaintenanceTab,
  ConnectedBayForSubstationMaintenanceTab

}
export const SGroupAccessRight: any = {
  view: GroupAccessRight.User,
  alarm_acknowledge: GroupAccessRight.AlarmAcknowledge,
  scan_inhibit: GroupAccessRight.ScanInhibit,
  substitute: GroupAccessRight.Substitute,
  manual_logging: GroupAccessRight.ManualLogging,
  alarm_delete: GroupAccessRight.AlarmDelete,
  alarm_inhibit: GroupAccessRight.AlarmInhibit,
  control: GroupAccessRight.Control,
  control_inhibit: GroupAccessRight.ControlInhibit,
  admin: GroupAccessRight.Admin,
  interlock_bypass: GroupAccessRight.InterlockBypass,
  synccheck_bypass: GroupAccessRight.SynchCheckBypass,

  project_admin: GroupAccessRight.ProjectAdmin,


  create_edit_operations: GroupAccessRight.CreateEditOperationsView,
  view_operations: GroupAccessRight.ViewOperations,
  create_shift: GroupAccessRight.CreateShift,
  edit_shift: GroupAccessRight.EditShift,
  view_shift: GroupAccessRight.ViewShift,
  create_edit_roster: GroupAccessRight.CreateEditRoster,
  view_roster: GroupAccessRight.ViewRoster,
  close_shift: GroupAccessRight.CloseShift,
  set_sld: GroupAccessRight.SetSLD,

  //MaintenanceRIghts
  //sldc_issue_request: GroupAccessRight.SLDCCodeIssueRequest,
  sldc_approve_reject: GroupAccessRight.SLDCCodeApproveReject,
  //ptw_issue_req: GroupAccessRight.PTWIssueRequest,
  //ptw_cancel_req: GroupAccessRight.PTWCancelRequest,
  //ptw_approve_cancel: GroupAccessRight.PTWApproveCancel,
  //survey_log: GroupAccessRight.SurveyLog,
  create_scheduled_maintenance: GroupAccessRight.CreateScheduledMaintenance,
  create_conditional_maintenance: GroupAccessRight.ScheduleConditionalMaintenance,
  conditional_maintenance_event_log: GroupAccessRight.EventLogConditionalMaintenance,

  //newMaintenanceAdded
  xen_approve_reject: GroupAccessRight.XENApproveReject,
  maintenance_date: GroupAccessRight.MaintenanceDateChange,
  //parameter_approve_reject: GroupAccessRight.ParameterApproveReject,
  //event_log_view: GroupAccessRight.EventLogView,
  //event_log: GroupAccessRight.EventLog,

  //MaintainanceDLG TAb Rights
  //sldc_details_tab: GroupAccessRight.SLDCDetailsTab,
  //ptw_details_tab: GroupAccessRight.PTWDetailsTab,

  //buttons and inputs

  //request_approval_maintenance: GroupAccessRight.RequestApprovalMaintenance,
  approve_maintenance: GroupAccessRight.ApproveMaintenance,
  cancel_maintenance: GroupAccessRight.CancelMaintenance,
  //sldc_shutdown_code: GroupAccessRight.sldcShutDownCode,
  sldc_charging_code: GroupAccessRight.sldcChargingCode,
  //save_time: GroupAccessRight.saveTime,
  //request_sldc_code: GroupAccessRight.requestSLDCCode,
  issue_sldc_code: GroupAccessRight.IssueSLDCCode,
  //request_sldc_restoration: GroupAccessRight.requestSLDCRestoration,
  //sldc_cancel_maintenance: GroupAccessRight.sldcCancelMaintenance,
  rqst_ptw_Button: GroupAccessRight.rqstPTWButton,
  //restoration_button: GroupAccessRight.RestorationButton,
  //add_event_log_button: GroupAccessRight.addEventLogButton,
  rqst_ptw_cancel_button: GroupAccessRight.rqstPTWCancelButton,
  issue_ptw_button: GroupAccessRight.issuePTWButton,
  cancel_ptw_button: GroupAccessRight.cancelPTWButton,
  //transfer_ptw_button: GroupAccessRight.transferPTWButton,
  other_ptw_tab_action: GroupAccessRight.OtherPTWTabAction,
  // Parameters
  maintenence_parameter_approve_revert: GroupAccessRight.maintenenceApproveRevert,
  maintenence_input_save_submit: GroupAccessRight.maintenenceInputSaveSubmit,
  mnp_parameter_approve_revert: GroupAccessRight.mnpApproveRevert,
  mnp_input_save_submit: GroupAccessRight.mnpInputSaveSubmit,

  //hotline
  hotline_input_save_submit: GroupAccessRight.hotlineInputSaveSubmit,
  hotline_observation_close: GroupAccessRight.hotlineObservationClose,
  hotline_observation_tab_view: GroupAccessRight.hotlineObservationTab,

  //Observations
  observation_list_tab_view: GroupAccessRight.observationListTabView,
  //observation_list_tab_input: GroupAccessRight.observationListTabInput,
  observation_start_maintenance_input: GroupAccessRight.observationstartMaintenanceInput,
  observation_maintenance_tab_view: GroupAccessRight.observationMaintenanceTabView,
  connected_bay_for_tl_maintenance_tab_view: GroupAccessRight.ConnectedBayForTLMaintenanceTab,
  connected_bay_for_substation_maintenance_tab_view: GroupAccessRight.ConnectedBayForSubstationMaintenanceTab,
  create_manual_observation_button: GroupAccessRight.createManualObservationButton,

  // TL
  schedule_tl_maintenance: GroupAccessRight.PlanTLMaintenance,
  tl_patrolling_input: GroupAccessRight.TLPatrollingInput,
  tl_maintenance_parameter_input_save_submit: GroupAccessRight.TLMaintenanceParameterInputSaveSubmit,
  tl_maintenance_parameter_approve_revert: GroupAccessRight.TLMaintenanceParameterApproveRevert,
  //tl_patrolling_reschedule_button: GroupAccessRight.TLPatrollingReschedule,
  tl_patrolling_complete_maintenance_button: GroupAccessRight.TLPatrollingCompleteMaintenance,
  //schedule_tl_patrolling: GroupAccessRight.ScheduleTLPatrolling,
  connected_tl_tab_view: GroupAccessRight.ConnectedTLMaintenanceTab,
  // Dashboard Tabs
  sub_bay_eqp_tab_view: GroupAccessRight.SubBayEqpTab,
  substation_tab_view: GroupAccessRight.SubstationTabView,
  bay_tab_view: GroupAccessRight.BayTabView,
  equipment_tab_view: GroupAccessRight.EquipmentTabView,
  hotline_tab_view: GroupAccessRight.HotLineTab,
  tl_tab_view: GroupAccessRight.TLTab,
  conditional_maintenance_tab_view: GroupAccessRight.ConditionalMaintenanceTab,
  other_ptw_tab_view: GroupAccessRight.OtherPTWTab,
  xen_approval_request_tab_view: GroupAccessRight.XENApprovalRequestTab,
  xen_approved_request_tab_view: GroupAccessRight.XENApprovedRequestTab,
  sldc_code_request_tab_view: GroupAccessRight.SLDCCodeRequestTab,
  all_maintenance_tab_view: GroupAccessRight.AllMaintenancePlannedTab,
  backfeeding_request_tab_view: GroupAccessRight.BackfeedingRequestTab,

  start_unscheduled_maintenance: GroupAccessRight.StartUnscheduledMaintenance,

  scheduled_sub_bay_eqp_tab_view: GroupAccessRight.SchdeuledDashboardBayEquipmentTabView,
  scheduled_substation_tab_view: GroupAccessRight.SchdeuledDashboardSubstationTabView,
  scheduled_bay_tab_view: GroupAccessRight.SchdeuledDashboardBayTabView,
  scheduled_equipment_tab_view: GroupAccessRight.SchdeuledDashboardEquipmentTabView,
  scheduled_tl_tab_view: GroupAccessRight.SchdeuledDashboardTLTabView,
  scheduled_observation_tl_tab_view: GroupAccessRight.ScheduledObservationTLTab,
  scheduled_connected_tl_for_bay_tab_view: GroupAccessRight.ScheduledConnectedTLForBayTab,
  scheduled_connected_bay_for_substation_tab_view: GroupAccessRight.ConnectedBayForSubstationMaintenanceTab,
  scheduled_connected_bay_for_tl_tab_view: GroupAccessRight.ConnectedBayForTLMaintenanceTab,
  scheduled_shutdown_request_tab_view: GroupAccessRight.ScheduledShutdownRequestTab,

}



export class ProjectViewData {
  viewData: any;
  group_path: string[];
  menu: any;
  view: string;
  access: {
    designation_name: string;
    role: {
      path: string;
      lockViews: boolean;
      lockAlarm: boolean;
      lockStatus: boolean;
      lockHistory: boolean;
      role: {
        rights: typeof SGroupAccessRight[];

      }
    }

  }
  cfg: any;
  code: string;
  umac_client_status: any;
  parameters: any;
  viewgroups: any;
}


@Injectable({
  providedIn: 'root'
})
export class ProjectResolverService implements Resolve<ProjectViewData>, OnDestroy {
  subscription: Subscription[] = [];
  temporaryChartReportState: {
    [key: string]: {
      originalSettings: any;
      trendSettings: any;
    }
  } = {};
  // public isHandset$: Observable<boolean> = this.breakpointObserver.observe(Breakpoints.Handset)
  //   .pipe(
  //     map(result => result.matches),
  //     shareReplay()
  //   );

  MaintenanceAccessRights: any = Object.keys(SGroupAccessRight).reduce((acc, right) => {
    acc[right] = false;
    return acc;
  }, {});

  // Mirrors ClientApp/src/app/project/project-resolver.service.ts. Alarm-
  // generated observations behave like JE observations for permission and
  // filtering purposes — every check that treats a "je" observation specially
  // must also accept "alarm". Callers should use this helper instead of
  // comparing observationtype directly.
  isJEObservation(type: string | undefined | null): boolean {
    return type === 'je' || type === 'alarm';
  }

  constructor(
    //private breakpointObserver: BreakpointObserver,
    private app: AppService,
    private router: Router,
    private route: ActivatedRoute,
    private _signalr: SignalRService,
    // private dialog: MatDialog,
    // private bottom_sheet: MatBottomSheet
  ) {
    console.log("Resolver is active")
    // A dropped SignalR socket is NOT a session invalidation — Android pauses
    // the WebView while backgrounded, so keepalive fails and auto-reconnect
    // eventually exhausts. Logging the user out here would kick them off every
    // time they backgrounded the app for >1 min. Real session expiry is caught
    // via the HTTP interceptor path (AppService.handleLoggedInError).

    this.subscription.push(_signalr.reconnection.subscribe(data => {
      const child = this.route.snapshot.root.firstChild?.firstChild;
      if (data && child)
        this.reloadMain(child, this.router.routerState.snapshot);
    }));

    // this.subscription.push(_signalr.shiftReportDataReceived.subscribe(data => {
    //   this.ShiftCloseReportDlg.updateData(data);
    // }));
    // this.subscription.push(_signalr.eventlogDlgIccpData.subscribe(data => {
    //   this.eventviewlogdlg.updateData(data);
    // }));
    this.subscription.push(_signalr.updateDataReceived.subscribe(data => {
      if (this.updateDataComponent != null)
        this.updateDataComponent.onUpdate();
      try {
        if (!this._signalr.ManualDisconnect && !this.app.InProgress) {
          if (this.viewtype != '' && data != null && data.object_list != null) {
            if (this.viewtype == 'maintenance_dashboard' || this.viewtype == 'completed_maintenance_dashboard') {
              if (this.mnt_dashboard != null)
                this.mnt_dashboard.updateEventsData(data.object_list, data.data);
            }
            else if (this.viewtype == 'plan_maintenance') {
              if (this.schedule_mnt_dashboard != null)
                this.schedule_mnt_dashboard.updateData(data.object_list, data.data);
            }

            // else if (this.viewtype.charAt(0) == 'r' && this.viewtype.charAt(7) == 'v') {
            //   if (this.roasterview != null && data.data != null) {

            //   }
            // }
            // else if (this.viewtype.charAt(0) == 'd' || this.viewtype.charAt(0) == 'r' || this.viewtype == 'maintenance_report' || this.viewtype == 'mnt_opr_dashboard') {
            //   let len = this.tiles.length;

            //   let rep_val = null;
            //   let tag_val = null;
            //   if (this.viewtype.charAt(0) == 'r' || this.viewtype == 'maintenance_report')
            //     rep_val = data.data;
            //   else {
            //     rep_val = data?.data?.report_val;
            //     tag_val = data?.data?.tag_lst;
            //   }

            //   for (let cnt = 0; cnt < len; cnt++) {
            //     if ((rep_val != null && rep_val.length > cnt && rep_val[cnt] != null) || this.tiles[cnt].viewData.type == 'maps')
            //       this.tiles[cnt].updateData(rep_val[cnt], data.object_list, data.update_counter);
            //     else if (this.tiles[cnt].viewData.type == "hmi") {
            //       this.tiles[cnt].updateData(tag_val, data.object_list, data.update_counter);
            //     }
            //     else if (data?.data?.tile_val[cnt]?.chartData && (this.tiles[cnt].viewData.type == "oprdata" || this.tiles[cnt].viewData.type == 'grpoprview' || this.tiles[cnt].viewData.type == 'eventlog' || this.tiles[cnt].viewData.type == 'fault' || this.tiles[cnt].viewData.type == 'eventview' || this.tiles[cnt].viewData.type == 'shiftclosereport' || this.tiles[cnt].viewData.type == 'usersinshift')) {
            //       this.tiles[cnt].updateData(data?.data?.tile_val[cnt]?.chartData, data.object_list, data.update_counter);
            //     }
            //   }
            //   if (this.summaryview != null && data.data?.additionalData) { // shift close through mnt_opr_dashboard
            //     this.summaryview.updateData(data.data?.additionalData);
            //   }
            //   if (this.dashboard)
            //     this.dashboard.isProgress = false;
            // }
            // else if (this.viewtype.charAt(0) == 'f') {
            //   if (this.trippingview != null && data.data != null)
            //     this.trippingview.updateData(data.data, data.update_counter);
            // }

            // else if (this.viewtype.charAt(0) == 'e' && this.viewtype.charAt(5) == 'l') {
            //   if (this.eventviewlog != null && data.data != null && data.data[0] != null) {
            //     this.eventviewlog.updateData(data.data[0], null, data.update_counter);
            //   }
            //   if (this.eventviewGrouplogdlg != null && data.data != null && data.data[1] != null) {
            //     this.eventviewGrouplogdlg.updateData(data.data[1], data.update_counter);
            //   }

            // }
            // else if (this.viewtype.charAt(0) == 'e') {
            //   if (this.eventview != null && data.data != null)
            //     this.eventview.updateData(data.data, data.update_counter);
            // }
            // else if (this.viewtype.charAt(0) == 'a') {
            //   if (this.alarmview != null && data.data != null)
            //     this.alarmview.updateData(data.data, data.update_counter);
            // }
            // //else if (this.viewtype.charAt(1) == 'e') {
            // //  if (this.viewtype.charAt(8) != 'e') {
            // //    if (this.lsview != null)
            // //      this.lsview.updateData(data.data, data.object_list);
            // //  }
            // //  else if (this.lsevent != null && data.data != null)
            // //    this.lsevent.updateData(data.data, data.update_counter);
            // //}
            // else if (this.viewtype.charAt(0) == 's' && this.viewtype.charAt(1) == 'h') {
            //   if (this.summaryview != null && data.data) {
            //     this.oprview.updateData({ event_log: data.data.opr_logs[0] }, data.object_list);
            //     this.eventviewlog.updateData(data.data.evt_log, data.object_list, data.update_counter);
            //     this.summaryview.updateData(data.data);
            //   }
            // }
            // else if (this.viewtype.charAt(0) == 's') {
            //   if (this.viewtype.charAt(1) == 'e') {
            //     if (this.asview != null)
            //       this.asview.updateData(data.data, data.object_list, data.update_counter);
            //   }
            //   else if (this.statusview != null)
            //     this.statusview.updateData(data.data, data.object_list);
            // }
            // else if (this.viewtype.charAt(0) == 't') {
            //   if (this.trendview != null)
            //     this.trendview.updateData(data.data, data.object_list);
            // }
            // else if (this.viewtype.charAt(0) == 'h') {
            //   if (this.historyview != null && data.data != null)
            //     this.historyview.updateData(data.data, data.update_counter);
            // }
            // else if (this.viewtype.charAt(0) == 'o' || (this.viewtype.charAt(0) == 'g' && this.viewtype.charAt(2) == 'p')) {
            //   if (this.oprview != null && data.data != null)
            //     this.oprview.updateData(data.data, data.object_list);
            // }
            // else if (this.viewtype.charAt(0) == 'l') {
            //   if (this.logstartupvalue != null)
            //     this.logstartupvalue.updateData(data.data, data.object_list);
            // }
            // else if (this.viewtype == 'chart') {
            //   if (this.chart_view != null)
            //     this.chart_view.updateData(data.data, data.object_list);
            // }
          }
        }
      } catch (er: any) {
        console.error(er);
      }
    }));
    // this.subscription.push(_signalr.hmiReceived.subscribe(data => {
    //   try {
    //     if (!this._signalr.ManualDisconnect && !this.app.InProgress && data.index < this.tiles.length)
    //       this.tiles[data.index].updateHMI(data.svg_list)
    //   } catch { }
    // }));
  }
  public checkAccess(accesstype: GroupAccessRight, route_snap: ActivatedRouteSnapshot, is_handset: boolean): boolean {
    let view_data: ProjectViewData = route_snap.root.firstChild.firstChild.data['viewData']
    if (view_data && view_data.access.role.role.rights && view_data.access.role.role.rights.map(right => { return SGroupAccessRight[right]; }).some(right => this.checkGroupRight(accesstype, right))) {
      if (is_handset) {
        let cfg: any = JSON.parse(sessionStorage.getItem('ProjectConfig'));
        if (cfg.handset_control === false)
          return false;
      }
      return true;
    }
    return false;
  }


  public checkMaintenanceAccess(route_snap: ActivatedRouteSnapshot) {

    for (let right in this.MaintenanceAccessRights) {
      this.MaintenanceAccessRights[right] = false;
    }

    let view_data: ProjectViewData = route_snap.root.firstChild.firstChild.data['viewData']
    if (view_data && view_data.access.role.role.rights) {
      for (let right of view_data.access.role.role.rights) {
        if (SGroupAccessRight[right] == GroupAccessRight.ProjectAdmin || SGroupAccessRight[right] == GroupAccessRight.Admin) {
          for (let right in this.MaintenanceAccessRights) {
            this.MaintenanceAccessRights[right] = true;
          }
          return;
        }
        this.MaintenanceAccessRights[right] = true;
      }
    }
    // missed rights testcases to be added (ex: if edit access exists view should also be true)
  }

  checkGroupRight(right, role) {
    if (role == GroupAccessRight.ProjectAdmin || role == GroupAccessRight.Admin || right == role)
      return true;
    switch (right) {
      case GroupAccessRight.User:
        return true;
      case GroupAccessRight.AlarmAcknowledge:
        return role == GroupAccessRight.AlarmDelete;
      case GroupAccessRight.ManualLogging:
        return role == GroupAccessRight.Control || role == GroupAccessRight.CloseShift;
      case GroupAccessRight.Control:
        return role == GroupAccessRight.InterlockBypass || role == GroupAccessRight.SynchCheckBypass;

      case GroupAccessRight.ViewOperations:
        return role == GroupAccessRight.CreateEditOperationsView || role == GroupAccessRight.ManualLogging;
      case GroupAccessRight.ViewRoster:
        return role == GroupAccessRight.CreateEditRoster;
      case GroupAccessRight.ViewShift:
        return role == GroupAccessRight.CreateShift || role == GroupAccessRight.EditShift;
    }
    return false;
  }
  reload() {
    // this.tiles = [];
    this.fullScreen = [];
    this.pvmain.loadComponent();
  }
  viewtype: string = '';
  //tiles: DashTileComponent[] = [];
  fullScreen: number[] = [];
  // trippingview: PVTrippingReportComponent = null;
  // eventview: PVEventComponent = null;
  // alarmview: PVAlarmComponent = null;
  // statusview: PVStatusComponent = null;
  // trendview: PVLiveTrendComponent = null;
  // historyview: PVHistoryComponent = null;
  // asview: LoadSheddingMainComponent = null;
  // oprview: PvOperationalViewComponent = null;
  // roasterview: RosterManagementComponent = null;
  // eventviewlog: EventLogViewComponent = null;
  // eventviewlogdlg: EventLogDlgComponent = null;
  // ShiftCloseReportDlg: PvShiftCloseReportDlgComponent = null;
  // eventviewGrouplogdlg: EventLogGroupDlgComponent = null;
  // ShiftCloseReport: PVShiftCloseReportComponent = null;
  // usersInShift: PVUserInShiftComponent = null;

  // logstartupvalue: LogStartupValueComponent = null;
  // summaryview: ShiftSummaryComponent = null;
  mnt_dashboard: MaintenanceDashboardComponent = null;
  // todo mobile
  mnt_ptw_form: PtwActionDlgComponent = null;
  schedule_mnt_dashboard: PvPlanMaintenanceComponent = null;
  // completed_mnt_dashboard: PvMaintenanceCompletedDashboardComponent = null;
  // chart_view: PVChartComponent = null;
  // dashboard: DashBoardComponent = null;
  //lsevent: LoadSheddingReportComponent = null;
  pvmain: PVMainComponent = null;
  //grouporder: PvGroupOrderComponent = null;
  xlsExportLogo: any = { path: null, height: 100, width: 100 };
  xlsExpFooterSum: any = null;
  footerds: any = null;
  xlsDynamicTab: any = null;
  xlsSkipRows: any = null;
  panelSettings: any = null;
  maintenance: any = {};

  async getResXlsLogo(path, cfglogo) {
    if (cfglogo) {
      try {
        const imageWH = new Image();
        imageWH.src = path;

        // Use await for reliable image loading and error handling
        const { width, height } = await new Promise((resolve, reject) => {
          imageWH.onload = () => resolve({ width: imageWH.width, height: imageWH.height });
          imageWH.onerror = reject;
        });

        if (this && this.xlsExportLogo) { // Assuming `this` refers to the component instance
          this.xlsExportLogo.height = height;
          this.xlsExportLogo.width = width;
          this.xlsExportLogo.path = path;
        } else {
          console.error('xlsExportLogo is not available in the current context.');
        }
      } catch (error) {
        console.error('Error loading image:', error);
      }
    }
  }
  resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Promise<ProjectViewData> {
    this.app.popupOpen = null;
    let id = route.paramMap.get('id');
    let path = route.url.map(data => { return decodeURIComponent(data.path); }).join('/');
    let view = route.queryParamMap.get('view');
    let params: any = route.queryParamMap.get('params');
    try {
      params = typeof params === 'string' ? JSON.parse(params) : params;
    } catch (e) {
      console.error('Invalid params:', params, e);
      params = null;
    }
    return this.getDetails(id, path, view, state.url, params);
  }
  removePopup(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    this.app.InProgress = true;
    this.app.popupOpen = null;
    let id = route.paramMap.get('id');
    let path = route.url.map(data => { return decodeURIComponent(data.path); }).join('/');
    let view = route.queryParamMap.get('view');
    let params: any = route.queryParamMap.get('params');
    try {
      params = typeof params === 'string' ? JSON.parse(params) : params;
    } catch (e) {
      console.error('Invalid params:', params, e);
      params = null;
    }
    this.getDetails(id, path, view, state.url, params).then(data => {
      this.pvmain.popupComponent(data.viewData.detail.type, data.viewData);
      this.app.InProgress = false;
    });
  }
  tempReloadCnt: number = 0;
  tempResetCnt: number = 0;
  onetime: boolean = false;
  oneTimeReloadReset: boolean = true;
  reloadMain(route: ActivatedRouteSnapshot, state: RouterStateSnapshot, src: any = null) {
    if (src) {
      this.tempReloadCnt++;
    }
    if (src == 'reset') {
      this.tempResetCnt++;
      this.tempReloadCnt = 0;
      return;
    }

    if (this.tempReloadCnt > 1 && src) { // on multiple chart in one dashboard reload once, reloading multiple times all chart becomes blank // for chart bug
      return;
    }

    this.app.InProgress = true;
    this.app.popupOpen = null;
    let id = route.paramMap.get('id');
    let path = route.url.map(data => { return decodeURIComponent(data.path); }).join('/');
    let view = route.queryParamMap.get('view');
    let params: any = route.queryParamMap.get('params');
    try {
      params = typeof params === 'string' ? JSON.parse(params) : params;
    } catch (e) {
      console.error('Invalid params:', params, e);
      params = null;
    }
    this.getDetails(id, path, view, state.url, params).then(data => {
      if (!route.data['viewData'])
        route.data['viewData'] = {};
      Object.assign(route.data['viewData'], data);
      this.pvmain.resolve(route.data);
    });
  }
  openPopup(id: string, path: string, view: string, stateurl: string, params: any) {
    this.app.InProgress = true;
    this.getDetails(id, path, view, stateurl, params).then(data => {
      this.app.popupOpen = data;
      this.pvmain.popupComponent(data.viewData.detail.type, data.viewData);
      this.app.InProgress = false;
    });
  }

  private getDetails(id: string, path: string, view: string, stateurl: string, params: any): Promise<ProjectViewData> {
    this.fullScreen = [];
    // this.tiles = [];
    // this.trippingview = null;
    // this.eventview = null;
    // this.ShiftCloseReport = null;
    // this.usersInShift = null;
    // this.alarmview = null;
    // this.statusview = null;
    // this.trendview = null;
    // this.historyview = null;
    // this.oprview = null;
    // this.eventviewlog = null;
    // this.logstartupvalue = null;
    // this.summaryview = null;
    // this.roasterview = null;
    this.mnt_dashboard = null;
    this.schedule_mnt_dashboard = null;
    // todo mobile
    // this.mnt_ptw_form = null;
    // this.completed_mnt_dashboard = null;
    // this.chart_view = null;
    // this.grouporder = null;
    // this.dashboard = null;
    return this._signalr.getProjectViewDetails(id, path, view, params).then(
      project => {
        if (project) {

          if (!project.group_path) {
            this.app.LogoutUser().then(() => {
              this.router.navigateByUrl('/login' + stateurl);
            });
            return null;
          }
          /*let str_url: string = '/project/' + id;
          if (project.group_path != null) {
              str_url += '/' + project.group_path.join('/');
              //let query_param = (project.viewData != null) ? 'view=' + encodeURI(this.viewData.viewData.name) : "";
              //if (this.viewData.viewData != null)
              //    this.router.navigate([str_url, { view: this.viewData.viewData.name }], { replaceUrl: true });
              //else
              //    this.router.navigate([str_url], { replaceUrl: true });
              if (project.viewData != null)
                  this.location.replaceState(str_url, 'view=' + encodeURI(project.viewData.name));
              else
                  this.location.replaceState(str_url);
          }*/
          const bc_sel: BCSelectionClass[] = project.menu?.breadCrumbSelection;
          if (bc_sel) {
            let parent_route = '/project/' + id.toString() + '/';
            for (const bcsel_item of bc_sel) {
              bcsel_item.parent_route = parent_route;
              if (bcsel_item.sel_index != null)
                parent_route = parent_route + bcsel_item.elements[bcsel_item.sel_index].route + '/';
            }
          }
          if (project.viewData != null)
            this.viewtype = project.viewData.detail.type;
          else
            this.viewtype = '';
          return project;
        } else {
          // Hub returned null — invoke failed, typically because the app was
          // in background long enough for the SignalR socket to drop. Do NOT
          // log the user out. Reject to cancel this navigation so the user
          // stays on the current view; they can retry once the hub reconnects.
          console.log('API NULL received — hub unreachable, cancelling navigation');
          this.app.InProgress = false;
          return Promise.reject('offline');
        }
      }).catch(error => {
        if (error == 'offline') {
          // Re-throw to cancel navigation without logging the user out.
          throw error;
        }
        if (error == 'access' || error == 'session') {
          this.app.LogoutUser().then(() => {
            this.router.navigateByUrl('/login' + stateurl);
          });
        }
        console.log('API Error code received : ' + error);
        return EMPTY.toPromise();
      });
  }
  private checkVisibility(path: number[]): boolean {
    let len1 = this.fullScreen.length;
    let len2 = path.length;
    if (len1 < len2)
      return true;

    for (let cnt = 0; cnt < len2; cnt++)
      if (this.fullScreen[cnt] != path[cnt])
        return false;
    return true;
  }
  // private checkVisibilityAll() {
  //   for (let tile of this.tiles)
  //     tile.setDisplay(this.checkVisibility(tile.path));
  // }
  // fullscreenout() {
  //   this.fullScreen = [];
  //   this.checkVisibilityAll();
  //   window.dispatchEvent(new Event('resize'));
  // }
  // fullscreenin(path: number[]) {
  //   this.fullScreen = path;
  //   this.checkVisibilityAll();
  //   window.dispatchEvent(new Event('resize'));
  // }
  updateDataComponent = null;
  ngOnDestroy(): void {
    for (let sub of this.subscription)
      sub.unsubscribe();
    this.subscription = [];
  }
  debounceSearch(callback, delay) {
    let timer;
    return function (...args) {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        callback(...args);
      }, delay);
    }
  }
}
