import { Injectable, EventEmitter } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse, HttpParams, HttpRequest } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { throwError, Observable, BehaviorSubject } from 'rxjs';
import { catchError, map, switchMap, retry } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AppService } from './app.service'
// import { MatSnackBar } from '@angular/material/snack-bar';
import { LocaleService } from './locale/locale.service';
import { firstValueFrom } from 'rxjs';

interface ApplyTemplateResult {
  templateId: string;
  maintenanceType: string;
  success: boolean;
  errorCode?: string;
}

export interface OtherPtwCancelDetails {
  _id: string;
  ptw_id: string;
  bay_path: string;
  crossing_feeder_bay_paths?: string[];
  requested_by: string;
  designation: string;
  mobile_no: number;
  issuedto: string;
  remarks: string;
  issued_by?: string;
  ptw_request_datetime?: number;
  ptw_issue_datetime?: number;
  reason?: string;
}

export enum MaintenanceStatus {
  Planned = 'planned',
  BackdatedEntry = 'backdated_entry',
  XenApprovalRequested = 'xen_approval_requested',
  XenApproved = 'xen_maintainance_approved',
  SLDCShutDownCodeRequested = 'sldc_shutdown_code_requested',
  SLDCShutDownCodeIssued = 'sldc_shutdown_code_issued',
  RequestPTW = 'request_ptw',
  PTWRequested = 'ptw_requested',
  BCCertificateRequested = 'backcharging_requested',
  BCCertificateIssued = 'backcharging_issued',
  PTWIssued = 'ptw_issued',
  InProgress = 'in_progress',
  PTWCancelRequested = 'ptw_cancellation_requested',
  PTWCancelRequestedWorkComplete = 'ptw_c_r_work_completed',
  PTWCancelRequestedWorkNotComplete = 'ptw_c_r_work_incomplete',
  BCCancelCertificateRequested = 'backcharging_cancel_requested',
  BCCancelCertificateIssued = 'backcharging_cancel_issued',
  PTWCancellationIssued = 'ptw_cancellation_issued',
  SLDCChargingCodeRequested = 'sldc_charging_code_requested',
  SLDCChargingCodeIssued = 'sldc_charging_code_issued',
  ParameterSubmitPending = 'parameter_submit_pending',
  Mtc_MnP_WIP = 'mtc_mnp_wip',
  Mtc_WIP = 'mtc_wip',
  MnP_WIP = 'mnp_wip',
  ParameterApprovalPending = 'parameter_approval_pending',
  Complete = 'maintenance_complete',
  TLPartiallyComplete = 'tl_partially_complete',
  CompleteWorkIncomplete = 'maintenance_complete_work_incomplete',
  Cancel = 'maintainance_cancelled',
  Critical = 'critical',
  PatrollingCompleted = 'patrolling_completed',
  RestorationRequired = 'restoration_required',
  RestorationCompleted = 'restoration_completed',
  MaintainanceRescheduled = 'maintenance_rescheduled',
}

// Labels here MUST match ClientApp/src/app/project/maintenance.service.ts →
// MaintenanceStatusToString exactly, so the mobile dashboard shows the same
// text as the web dashboard for every status. Any pre-existing web typos
// (e.g. "Paritally", "Maintainance") and trailing spaces are preserved
// intentionally — fixing them belongs to a separate cross-app cleanup.
export const MaintenanceStatusToString: Record<string, { show: string }> = {
  planned: { show: 'Planned' },
  backdated_entry: { show: 'Backdated Entry' },
  xen_approval_requested: { show: 'XEN Approval Requested' },
  xen_maintainance_approved: { show: 'XEN Approved' },
  sldc_shutdown_code_requested: { show: 'SLDC Shutdown Code Requested' },
  sldc_shutdown_code_issued: { show: 'SLDC Shutdown Code Issued' },
  request_ptw: { show: 'Request For PTW' },
  ptw_requested: { show: 'PTW Requested' },
  backcharging_requested: { show: 'NBF Requested' },
  backcharging_issued: { show: 'NBF Issued' },
  ptw_issued: { show: 'PTW Issued' },
  in_progress: { show: 'In Progress' },
  ptw_cancellation_requested: { show: 'PTW Cancellation Requested' },
  ptw_c_r_work_completed: { show: 'PTW Cancellation Work Completed' },
  ptw_c_r_work_incomplete: { show: 'PTW Cancellation Work Incomplete' },
  backcharging_cancel_requested: { show: 'NBF Cancellation Requested ' },
  backcharging_cancel_issued: { show: 'NBF Cancelled' },
  ptw_cancellation_issued: { show: 'PTW Cancellation Issued' },
  sldc_charging_code_requested: { show: 'SLDC Charging Code Requested' },
  sldc_charging_code_issued: { show: 'SLDC Charging Code Issued' },
  parameter_submit_pending: { show: 'Parameter Submission Pending' },
  mtc_mnp_wip: { show: 'Mtc. And M&P WIP' },
  mtc_wip: { show: 'Mtc. WIP' },
  mnp_wip: { show: 'M&P WIP' },
  parameter_approval_pending: { show: 'Parameter Approval Pending' },
  maintenance_complete: { show: 'Completed' },
  tl_partially_complete: { show: 'Paritally Completed' },
  maintenance_complete_work_incomplete: { show: 'Work Incomplete' },
  maintainance_cancelled: { show: 'Cancelled By ' },
  critical: { show: 'Critical' },
  patrolling_completed: { show: 'Patrolling Done' },
  restoration_required: { show: 'Restoration Required' },
  restoration_completed: { show: "Restoration Completed Parameter's Pending" },
  maintenance_rescheduled: { show: 'Maintainance Rescheduled' },
};

export enum OtherPTWStatus {
  PTWRequested = 'ptw_requested',
  PTWIssued = 'ptw_issued',
  PTWCancellationRequested = 'ptw_cancellation_requested',
  PTWCancelled = 'ptw_cancelled',
  PTWRejected = 'ptw_rejected',
  TrialRequested = 'trial_requested',
  TrialSucceed = 'trial_succeed',
  TrialFailed = 'trial_failed',
}

/** Legacy: some docs may have "restored" after Restore Bay; treat as completed. */
export const OtherPTWStatusLegacyRestored = 'restored';


export const OtherPTWStatusToString: Record<string, { show: string }> = {
  [OtherPTWStatus.PTWRequested]: { show: "PTW Requested" },
  [OtherPTWStatus.PTWIssued]: { show: "PTW Issued" },
  [OtherPTWStatus.PTWCancellationRequested]: { show: "PTW Cancellation Requested" },
  [OtherPTWStatus.PTWCancelled]: { show: "PTW Cancelled" },
  [OtherPTWStatus.PTWRejected]: { show: "Rejected" },
  [OtherPTWStatus.TrialRequested]: { show: "Trial Requested" },
  [OtherPTWStatus.TrialSucceed]: { show: "Trial Succeeded" },
  [OtherPTWStatus.TrialFailed]: { show: "Trial Failed" },
  [OtherPTWStatusLegacyRestored]: { show: "Completed" },
  pending_request: { show: "PTW Requested" }
};

// ─── Service ────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class MaintenanceService {
  constructor(private http: HttpClient,
    private router: Router,
    private appservice: AppService,
    //private _snackBar: MatSnackBar, 
    public locale_service: LocaleService) { } //this.TokenInit();

  loginModeChanged = new EventEmitter<any>();

  private handleLoggedInError = (error: HttpErrorResponse) => {
    // A 2xx status can still land here if the response body fails to parse
    // (e.g. empty body with responseType: 'json'). Never log the user out
    // for a successful HTTP status.
    if (error.status >= 200 && error.status < 300) {
      return throwError('api');
    }
    if (error.error instanceof ErrorEvent) {
      console.error('An error occurred:', error.error.message);
      return throwError('api');
    }
    else if (error.status == 404) {
      return throwError('notfound');
    }
    else if (error.status == 400) {
      return throwError('syntax');
    }
    else {
      console.error(
        `Backend returned code ${error.status}, ` +
        `body was: ${error.error}`);
      this.appservice.UpdateLogout();
      this.router.navigateByUrl('/login', { replaceUrl: true });
      return throwError('session');
    }
  };


  unassignedTLTowers(patrolling_details, tower_range) {
    const len = patrolling_details.length;
    let patrolling_warning = "";
    if (len == 0) {
      patrolling_warning = this.locale_service.Locale.language.project.maintenancesettings.patrollingnotsubmitted;
    }
    else {
      let min = tower_range.split("-")[0]; let max = tower_range.split("-")[1];
      let msg = "***NOTE: ";
      if (patrolling_details[0].tower_start != min) {
        let start = patrolling_details[0].tower_start;
        if (start - 1 != min)
          msg += `[ ${min} - ${start - 1} ], `;
        else
          msg += `${min} , `;
      }
      for (let idx = 1; idx < len; idx++) {
        if (patrolling_details[idx].tower_start - 1 != patrolling_details[idx - 1].tower_end) {
          msg += `[${patrolling_details[idx - 1].tower_end + 1} - ${patrolling_details[idx].tower_start - 1}], `
        }

      }

      let last = patrolling_details[len - 1].tower_end;
      if (last + 1 == max)
        msg += `${max} `;
      else if (last != max)
        msg += `[${patrolling_details[len - 1].tower_end + 1} - ${max}] `;


      msg += ` towers are not assigned.***`;
      if (msg === "***NOTE:  towers are not assigned.***")
        patrolling_warning = "";
      else
        patrolling_warning = msg;
    }
    return patrolling_warning;
  }

  maintenanceType = "";

  /**
   * Asset Damage / MDU lock check for a bay. Returns the current lock state and any
   * active damage report/equipments so the details dialog can render the block banner
   * and gate all action buttons the same way as the ClientApp.
   */
  getAssetDamageLock(bayPath: string, maintenanceId: string): Promise<any> {
    return this.http.get<any>(`${environment.baseURL}/api/ProjectView/AssetDamage/Lock`, {
      headers: this.appservice.httpHeaders,
      params: { bayPath, maintenanceId }
    }).pipe(catchError(this.handleLoggedInError)).toPromise().then(data => data).catch(data => ({ code: data }));
  }

  /** Bay paths with an active locked damage report — dashboard uses this to
   *  render the "damage report pending" warning icon on each maintenance card. */
  getLockedDamageBayPaths(): Promise<string[]> {
    return this.http.get<any>(`${environment.baseURL}/api/ProjectView/AssetDamage/LockedBays`, {
      headers: this.appservice.httpHeaders
    }).pipe(catchError(this.handleLoggedInError))
      .toPromise()
      .then(r => (r?.code === 'ok' ? (r.bayPaths ?? []) : []))
      .catch(() => []);
  }

  AddMaintenanceTemplate(data: any): Promise<any> {
    return (this.http.post<any>(`${environment.baseURL}/api/ProjectView/base/${this.maintenanceType}/`, data, { headers: this.appservice.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }
  ApplyMaintenanceTemplate(tmp_id: string): Promise<any> {
    return (this.http.post<any>(`${environment.baseURL}/api/ProjectView/base/apply/${this.maintenanceType}/${tmp_id}`, tmp_id, { headers: this.appservice.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }
  GetMaintenanceTemplateById(_id: string, maintenanceType: string): Promise<any> {
    return (this.http.get<any>(`${environment.baseURL}/api/ProjectView/base/${maintenanceType}/${_id}`, { headers: this.appservice.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }
  UpdateMaintenanceTemplate(data: any): Promise<any> {
    return this.http.put<any>(`${environment.baseURL}/api/ProjectView/base/${this.maintenanceType}/`, data, { headers: this.appservice.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => data).catch(error => ({ code: error }));
  }
  DeleteMaintenanceTemplateById(_id: string, type: string) {
    return (this.http.delete<any>(`${environment.baseURL}/api/ProjectView/base/${type}/${_id}`, { headers: this.appservice.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return data; }));
  }
  //DeleteMaintenanceById(_id: string,current_status: string) {
  //  return this.http.delete<any>(`${environment.baseURL}/api/ProjectView/maintenance/${_id}/${current_status}`, { headers: this.appservice.httpHeaders })
  //    .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => data).catch(data => data);
  //}
  GetAllMaintenanceTemplate(type: string, include_docs: boolean = true): Promise<any> {
    return (this.http.get<any>(`${environment.baseURL}/api/ProjectView/base/${type}/`, { headers: this.appservice.httpHeaders, params: { include_docs } })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }

  // ------------------------ PTW -----------------------------

  //GetMaxPTWId(): Promise<any> {
  //  return (this.http.get<any>(environment.baseURL + "/api/ProjectView/GetMaxPTWId", { headers: this.appservice.httpHeaders })
  //    .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  //}
  AddPTW(data: any): Promise<any> {
    return (this.http.post<any>(environment.baseURL + "/api/ProjectView/PTW", data, { headers: this.appservice.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }
  GetPTWByID(_id: string): Promise<any> {
    return (this.http.get<any>(`${environment.baseURL}/api/ProjectView/GetPTW`, { headers: this.appservice.httpHeaders, params: { _id } })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }
  UpdatePTW(data: any, status: string, mnt_id): Promise<any> {
    return this.http.put<any>(environment.baseURL + "/api/ProjectView/PTW/", data, { headers: this.appservice.httpHeaders, params: { status, mnt_id } })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => data).catch(error => ({ code: error }));
  }
  //GetAllPTW(): Promise<any> {
  //  return (this.http.get<any>(environment.baseURL + "/api/ProjectView/GetPTW", { headers: this.appservice.httpHeaders })
  //    .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  //}

  //-----------------PlanMaintenance Function--------------------//     

  CreateConditionalMnt(data: any) {
    return (this.http.post<any>(environment.baseURL + '/api/ProjectView/CreateConditionalMnt', data, { headers: this.appservice.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }

  SavePlanMnt(planMnt: any): Promise<any> {
    return (this.http.post<any>(environment.baseURL + '/api/ProjectView/planMnt', planMnt, { headers: this.appservice.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }

  UpdatePlanMnt(planMnt: any, actionType: string = ""): Promise<any> {
    return (this.http.put<any>(environment.baseURL + '/api/ProjectView/planMnt', planMnt, { params: { 'actionType': actionType }, headers: this.appservice.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }
  DeletePlanMnt(id: string) {
    return (this.http.delete<any>(`${environment.baseURL}/api/ProjectView/planMnt/${id}`, { headers: this.appservice.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return data; }));
  }

  GetPlanMntById(req_id: string): Promise<any> {
    return (this.http.get<any>(environment.baseURL + '/api/ProjectView/planMnt/' + req_id, { headers: this.appservice.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }

  //GetAllPlanMnt(): Promise<any> {
  //  return (this.http.get<any>(environment.baseURL + '/api/ProjectView/planMnt/', { headers: this.appservice.httpHeaders })
  //    .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  //}
  //GetAllPlanMnt(path: string): Promise<any> {
  //  return (this.http.get<any>(environment.baseURL + "/api/ProjectView/planMnt/", {
  //    params: { 'path': path },
  //    headers: this.appservice.httpHeaders
  //  }).pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  //}

  GetDashboardInfo(path: string): Promise<any> {
    return (this.http.get<any>(environment.baseURL + '/api/ProjectView/dashboard/', { params: { 'path': path }, headers: this.appservice.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }
  GetCompleteCancelDashboardInfo(path: string): Promise<any> {
    return (this.http.get<any>(environment.baseURL + '/api/ProjectView/dashboard/completeCancel', { params: { 'path': path }, headers: this.appservice.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }
  GetAllHistoryMnt(): Promise<any> {
    return (this.http.get<any>(environment.baseURL + '/api/ProjectView/historyMnt/', { headers: this.appservice.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }


  //GetAllPlanMnt2(path: string): Promise<any> {
  //  return (this.http.get<any>(environment.baseURL + "/api/ProjectView/planMnt/", {
  //    params: { 'path': path },
  //    headers: this.appservice.httpHeaders
  //  }).pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  //}

  //------------------------ BackCharging Cerficate -----------------------------

  AddBackCharging(data: any): Promise<any> {
    return (this.http.post<any>(environment.baseURL + "/api/ProjectView/BackCharging", data, { headers: this.appservice.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }
  GetBackChargingByID(req_id: string): Promise<any> {
    return (this.http.get<any>(environment.baseURL + "/api/ProjectView/GetBackCharging", { headers: this.appservice.httpHeaders, params: { req_id } })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }
  UpdateBackCharging(data: any, status: string = null): Promise<any> {
    return this.http.put<any>(environment.baseURL + "/api/ProjectView/BackCharging/", data, { headers: this.appservice.httpHeaders, params: { status } })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => data).catch(error => ({ code: error }));
  }
  //GetAllBackCharging(): Promise<any> {
  //  return (this.http.get<any>(environment.baseURL + "/api/ProjectView/GetBackCharging", { headers: this.appservice.httpHeaders })
  //    .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  //}

  /*Fetch Bay & Equipment List and observation list*/

  getListbyId(_id: string): Promise<any> {
    return (this.http.get<any>(environment.baseURL + "/api/ProjectView/EquipmentBayList/" + _id, { headers: this.appservice.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }

  // ------- Maintenance Device Master -------------
  GetDeviceMaster(): Promise<any> {
    return (this.http.get<any>(environment.baseURL + "/api/ProjectView/MaintenanceDeviceMaster/", { headers: this.appservice.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }


  // ------- Get All Substation Templates -----------
  GetSubstationTemplate(): Promise<any> {
    return (this.http.get<any>(environment.baseURL + "/api/ProjectView/SubstationTemplate/", { headers: this.appservice.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));

  }
  // ------- Substation-----------
  GetAllSubstation(include_doc: boolean = true): Promise<any> {
    return (this.http.get<any>(environment.baseURL + "/api/ProjectView/Substation", { headers: this.appservice.httpHeaders, params: { include_doc } })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }
  GetAllTL(include_doc = true): Promise<any> {
    return (this.http.get<any>(environment.baseURL + "/api/ProjectView/GetAllTL", { headers: this.appservice.httpHeaders, params: { include_doc } })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }
  GetTLsConnectedToSubstation(substationNameOrId: string): Promise<{ tls?: any[]; code?: string }> {
    return this.http.get<any>(
      environment.baseURL + '/api/ProjectView/GetTLsConnectedToSubstation',
      { headers: this.appservice.httpHeaders, params: { substationNameOrId: substationNameOrId ?? '' } }
    ).pipe(
      catchError(this.handleLoggedInError)
    ).toPromise().then(data => data ?? {}).catch(err => ({ code: err?.error?.code ?? 'db' }));
  }

  GetAuditReport(): Promise<{ tl?: any; substation?: any; code?: string }> {
    return this.http.get<any>(environment.baseURL + '/api/ProjectView/GetAuditReport', { headers: this.appservice.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => data ?? {}).catch(err => ({ code: err?.error?.code ?? 'db' }));
  }

  FixTLAnomalies(tlId: string, anomalies: { endpoint: string; bay_index: number; expected_path: string }[]): Promise<any> {
    return this.http.post<any>(environment.baseURL + '/api/ProjectView/FixTLAnomalies',
      { TlId: tlId, Anomalies: anomalies.map(a => ({ Endpoint: a.endpoint, BayIndex: a.bay_index, ExpectedPath: a.expected_path })) },
      { headers: this.appservice.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => data ?? {}).catch(err => ({ code: err?.error?.code ?? 'db' }));
  }
  GetTransmissionById(req_id: string): Promise<any> {
    return (this.http.get<any>(environment.baseURL + '/api/ProjectView/Transmission/' + req_id, { headers: this.appservice.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }
  AddTransmission(data: any): Promise<any> {
    return (this.http.post<any>(environment.baseURL + "/api/ProjectView/Transmission/", data, { headers: this.appservice.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }
  UpdateTransmission(data: any): Promise<any> {
    return (this.http.put<any>(environment.baseURL + `/api/ProjectView/Transmission/`, data, { headers: this.appservice.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }

  GetSubstationById(req_id: string): Promise<any> {
    return (this.http.get<any>(environment.baseURL + '/api/ProjectView/Substation/' + req_id, { headers: this.appservice.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }
  GetSubstationWithBayIndeces(req_id: string): Promise<any> {
    return (this.http.get<any>(environment.baseURL + '/api/ProjectView/GetSubstationWithBayIndeces/' + req_id, { headers: this.appservice.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }
  GetAllEquipmentsByBay(bay_path: string): Promise<any> {
    return (this.http.get<any>(environment.baseURL + '/api/ProjectView/GetAllEquipmentsByBay', { headers: this.appservice.httpHeaders, params: { bay_path } })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }
  AddSubstation(data: any): Promise<any> {
    return (this.http.post<any>(environment.baseURL + "/api/ProjectView/Substation/", data, { headers: this.appservice.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }
  UpdateSubstation(data: any): Promise<any> {
    return (this.http.put<any>(environment.baseURL + `/api/ProjectView/Substation/`, data, { headers: this.appservice.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }
  UpdateSubstationFromMdu(data: any): Promise<any> {
    return (this.http.put<any>(environment.baseURL + `/api/ProjectView/UpdateSubstationFromMdu/`, data, { headers: this.appservice.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }
  GetTLById(req_id: string): Promise<any> {
    return (this.http.get<any>(environment.baseURL + '/api/ProjectView/GetTL/' + req_id, { headers: this.appservice.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }
  GetTLByIds(paths: string[]): Promise<any> {
    let pathstr = paths.join("|");
    return (this.http.get<any>(environment.baseURL + '/api/ProjectView/GetTLByIds', { headers: this.appservice.httpHeaders, params: { pathstr } })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }
  //GetPlanMntByIds(mnt_ids: string[], maintenance_type: string, dev_name: string): Promise<any> {
  //  let mntIdStr = mnt_ids.join("|");
  //  return (this.http.get<any>(environment.baseURL + '/api/ProjectView/GetPlanMntByIds', { headers: this.appservice.httpHeaders, params: { mntIdStr, maintenance_type, dev_name } })
  //    .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  //}
  GetPlanMntByIds(mnt_ids: string[]): Promise<any> {
    return (this.http.post<any>(environment.baseURL + '/api/ProjectView/GetPlanMntByIds', mnt_ids, { headers: this.appservice.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }
  GetPlanMntByDeviceNames(device_names: string[]): Promise<any> {
    return (this.http.post<any>(environment.baseURL + '/api/ProjectView/GetPlanMntByDeviceNames', device_names, { headers: this.appservice.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }
  GetPlanMntsByDeviceName(dev_name: string, type: string = ""): Promise<any> {
    return (this.http.get<any>(environment.baseURL + '/api/ProjectView/GetPlanMntsByDeviceName', { headers: this.appservice.httpHeaders, params: { dev_name, type } })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }
  GetPlanMntsByType(type: string): Promise<any> {
    return (this.http.get<any>(environment.baseURL + '/api/ProjectView/GetPlanMntsByType', { headers: this.appservice.httpHeaders, params: { type } })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }
  BulkUpdatePlanMnts(mnts: any[]): Promise<any> {
    return (this.http.put<any>(environment.baseURL + '/api/ProjectView/BulkUpdatePlanMntByIds', mnts, { headers: this.appservice.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }
  GetDashboardInfoByDeviceNames(dev_names: string[], type: string): Promise<any> {
    let dev_name = dev_names.join("|");
    return (this.http.get<any>(environment.baseURL + '/api/ProjectView/GetDashboardInfoByDeviceNames', { headers: this.appservice.httpHeaders, params: { dev_name, type } })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }
  //UpdateSubstationById(data: any): Promise<any> {
  //  return (this.http.put<any>(`${environment.baseURL}/api/ProjectView/Substation/` , data, { headers: this.appservice.httpHeaders })
  //    .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  //}

  DeleteFromSubstation(_id: string) {
    return this.http.delete<any>(`${environment.baseURL}/api/ProjectView/Substation/${this.maintenanceType}/${_id}`, { headers: this.appservice.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => data).catch(data => data);
  }

  DeleteFromTransmission(_id: string) {
    return this.http.delete<any>(`${environment.baseURL}/api/ProjectView/Transmission/${this.maintenanceType}/${_id}`, { headers: this.appservice.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => data).catch(data => data);
  }

  GetScheduledMaintenanceList(path: string) {
    return (this.http.get<any>(environment.baseURL + "/api/ProjectView/ScheduledhMntlst", {
      params: { 'path': path },
      headers: this.appservice.httpHeaders
    }).pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }

  GetMaintenanceList(path: string) {
    return (this.http.get<any>(environment.baseURL + "/api/ProjectView/Mntlst", {
      params: { 'path': path },
      headers: this.appservice.httpHeaders
    }).pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }

  // ------- update cutoff -----------
  UpdateCutoff(mntlst: any, path: string): Promise<any> {
    return this.http.put<any>(environment.baseURL + "/api/ProjectView/Substation/Cutoff", { mntlst, path }, { headers: this.appservice.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => data).catch(error => ({ code: error }));
  }
  UpdateScheduleAfterCompletion(data): Promise<any> {
    return this.http.put<any>(environment.baseURL + "/api/ProjectView/Substation/Update", data, { headers: this.appservice.httpHeaders, params: { status } })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => data).catch(error => ({ code: error }));
  }

  //observation functions

  AddObservation(data: any): Promise<any> {
    return (this.http.post<any>(environment.baseURL + '/api/ProjectView/observation/', data, { headers: this.appservice.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }

  //GetObservationsByMaintenance(project_id: any, doc_id: any, type: any): Promise<any> {
  //  return (this.http.get<any>(environment.baseURL + "/api/ProjectView/GetObservation", { headers: this.appservice.httpHeaders, params: { project_id, doc_id, type } })
  //    .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  //}
  GetObservationById(req_id: string): Promise<any> {
    return (this.http.get<any>(environment.baseURL + '/api/ProjectView/GetObservationId/' + req_id, { headers: this.appservice.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }
  GetObservationByPath(device_path: string): Promise<any> {
    return (this.http.get<any>(environment.baseURL + '/api/ProjectView/GetObservationByPath', { headers: this.appservice.httpHeaders, params: { device_path } })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }
  UpdateObservation(data: any): Promise<any> {
    return this.http
      .put<any>(
        `${environment.baseURL}/api/ProjectView/UpdateObservation`,
        data,
        { headers: this.appservice.httpHeaders }
      )
      .pipe(catchError(this.handleLoggedInError))
      .toPromise()
      .then((response) => response)
      .catch((error) => ({ code: error }));
  }



  DeleteObservationById(_id: string, _rev?: string, connected_maintenance_id?: string, connected_parameter_id?: string) {
    const ob_body: any = { _id, _rev, connected_maintenance_id, connected_parameter_id: connected_parameter_id ?? null };

    return (this.http.delete<any>(`${environment.baseURL}/api/ProjectView/DeleteObservation`, { headers: this.appservice.httpHeaders, body: ob_body })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return data; }));
  }

  scheduleObservationMaintenance(path: string, date: string, observation, ObservationsList: string[], device_id, voltage_level, tower_range: string) {
    return this.http.put<any>(
      `${environment.baseURL}/api/ProjectView/scheduleObservationMaintenance`, { path, date, observation, ObservationsList, device_id, voltage_level, tower_range }, { headers: this.appservice.httpHeaders }).pipe(catchError(this.handleLoggedInError))
      .toPromise()
      .then((response) => response)
      .catch((error) => ({ code: error }));
  }

  GetObservationbyLists(ObservationsList: string[]): Promise<any> {
    const params = new HttpParams({ fromObject: { ObservationsList } });

    return this.http.get<any>(
      `${environment.baseURL}/api/ProjectView/GetObservationByLists`,
      {
        headers: this.appservice.httpHeaders,
        params,
      }
    )
      .pipe(catchError(this.handleLoggedInError))
      .toPromise()
      .then(data => data)
      .catch(error => ({ code: error }));
  }

  // Other PTW
  AddOtherPTW(data: any): Promise<any> {
    return (this.http.post<any>(environment.baseURL + "/api/ProjectView/AddOtherPTW", data, { headers: this.appservice.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }
  GetOtherPTWByID(_id: string): Promise<any> {
    return (this.http.get<any>(`${environment.baseURL}/api/ProjectView/GetOtherPTWByID/${_id}`, { headers: this.appservice.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }
  UpdateOtherPTW(data: any, status: string = null): Promise<any> {
    return this.http.put<any>(environment.baseURL + "/api/ProjectView/UpdateOtherPTW/", data, { headers: this.appservice.httpHeaders, params: { status } })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => data).catch(error => ({ code: error }));
  }

  GetClearancePTWByID(_id: string): Promise<any> {
    return (this.http.get<any>(`${environment.baseURL}/api/ProjectView/GetClearancePTWByID/${_id}`, { headers: this.appservice.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }
  UpdateClearancePTW(data: any, status: string = null): Promise<any> {
    return this.http.put<any>(environment.baseURL + "/api/ProjectView/UpdateClearancePTW", data, { headers: this.appservice.httpHeaders, params: { status } })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => data).catch(error => ({ code: error }));
  }
  GetAllOtherPTW(): Promise<any> {
    return (this.http.get<any>(environment.baseURL + "/api/ProjectView/GetAllOtherPTW", { headers: this.appservice.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }

  GenerateOtherPtwQrToken(groupPath?: string, substationCode?: string): Promise<{ token: string; url: string; expiresAt: string } | { code: any }> {
    const params: { group_path?: string; substation_code?: string } = {};
    if (groupPath) params.group_path = groupPath;
    if (substationCode) params.substation_code = substationCode;
    return (this.http.post<any>(`${environment.baseURL}/api/ProjectView/OtherPtwRequest/GenerateToken`, {}, { headers: this.appservice.httpHeaders, params })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => data).catch(err => { return { code: err }; }));
  }

  GenerateTrialRunQrToken(groupPath?: string, substationCode?: string): Promise<{ token: string; url: string; expiresAt: string } | { code: any }> {
    const params: { group_path?: string; substation_code?: string } = {};
    if (groupPath) params.group_path = groupPath;
    if (substationCode) params.substation_code = substationCode;
    return (this.http.post<any>(`${environment.baseURL}/api/ProjectView/ClearancePTW/GenerateToken`, {}, { headers: this.appservice.httpHeaders, params })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => data).catch(err => { return { code: err }; }));
  }

  getOtherPtwRequestNextPtwNo(token: string): Observable<{ ptwNo?: number | string; code?: string }> {
    const params = new HttpParams().set('token', token);
    const headers = { 'X-QR-Token': token };
    return this.http.get<{ ptwNo?: number | string; code?: string }>(`${environment.baseURL}/api/OtherPtwRequest/NextPtwNo`, { params, headers });
  }

  getOtherPtwRequestBays(token: string): Observable<{ bays?: string[]; code?: string }> {
    const params = new HttpParams().set('token', token);
    const headers = { 'X-QR-Token': token };
    return this.http.get<{ bays?: string[]; code?: string }>(`${environment.baseURL}/api/OtherPtwRequest/Bays`, { params, headers });
  }

  getClearancePTWNextClrNo(token: string): Observable<{ ptwNo?: number | string; code?: string }> {
    const params = new HttpParams().set('token', token);
    const headers = { 'X-QR-Token': token };
    return this.http.get<{ ptwNo?: number | string; code?: string }>(`${environment.baseURL}/api/ClearancePTW/NextClrNo`, { params, headers });
  }

  getClearancePTWBays(token: string): Observable<{ bays?: string[]; code?: string }> {
    const params = new HttpParams().set('token', token);
    const headers = { 'X-QR-Token': token };
    return this.http.get<{ bays?: string[]; code?: string }>(`${environment.baseURL}/api/ClearancePTW/Bays`, { params, headers });
  }

  submitOtherPtwRequest(token: string, body: {
    ptw_id: string;
    bay_path: string; user_name: string; designation: string;
    mobile_no: string; issuedto: string; remarks: string; reason: string;
    crossing_feeder_bay_paths?: string[];
  }): Observable<{ _id?: string; _rev?: string; code?: string }> {
    const params = new HttpParams().set('token', token);
    const headers = { 'X-QR-Token': token };
    return this.http.post<{ _id?: string; _rev?: string; code?: string }>(`${environment.baseURL}/api/OtherPtwRequest/Submit`, body, { params, headers });
  }

  submitClearancePTW(token: string, body: {
    ptw_id: string;
    bay_path: string; user_name: string; designation: string;
    mobile_no: string; issuedto: string; remarks: string; reason?: string;
    crossing_feeder_bay_paths?: string[];
  }): Observable<{ _id?: string; _rev?: string; code?: string }> {
    const params = new HttpParams().set('token', token);
    const headers = { 'X-QR-Token': token };
    return this.http.post<{ _id?: string; _rev?: string; code?: string }>(`${environment.baseURL}/api/ClearancePTW/Submit`, body, { params, headers });
  }

  GenerateOtherPtwCancelQrToken(otherPtwId: string): Promise<{ token: string; url: string; expiresAt: string } | { code: string }> {
    return (this.http.post<any>(`${environment.baseURL}/api/ProjectView/OtherPtwRequest/GenerateCancelToken`, { other_ptw_id: otherPtwId }, { headers: this.appservice.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => data).catch(err => ({ code: err })));
  }

  getOtherPtwCancelDetails(token: string, apiBase?: string): Observable<OtherPtwCancelDetails> {
    const params = new HttpParams().set('token', token);
    const headers = { 'X-QR-Token': token };
    const base = (apiBase && apiBase.trim()) ? apiBase.replace(/\/$/, '') : (environment.baseURL || '').replace(/\/$/, '');
    return this.http.get<OtherPtwCancelDetails>(`${base}/api/OtherPtwCancel/Details`, { params, headers });
  }

  submitOtherPtwCancel(token: string, work_done: string, apiBase?: string): Observable<{ _id?: string; _rev?: string; code?: string }> {
    const params = new HttpParams().set('token', token);
    const headers = { 'X-QR-Token': token };
    const base = (apiBase && apiBase.trim()) ? apiBase.replace(/\/$/, '') : (environment.baseURL || '').replace(/\/$/, '');
    return this.http.post<{ _id?: string; _rev?: string; code?: string }>(`${base}/api/OtherPtwCancel/Submit`, { work_done }, { params, headers });
  }

  //ConnectedTemplates
  CheckFrequencyConnected(id: string): Promise<any> {
    return (this.http.get<any>(environment.baseURL + '/api/ProjectView/ConnectedFrequency/' + id, { headers: this.appservice.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }
  CheckBayConnected(id: string): Promise<any> {
    return (this.http.get<any>(environment.baseURL + '/api/ProjectView/ConnectedBayTemplate/' + id, { headers: this.appservice.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }
  CheckParameteConnected(id: string): Promise<any> {
    return (this.http.get<any>(environment.baseURL + '/api/ProjectView/ConnectedParameter/' + id, { headers: this.appservice.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }
  CheckParameterMapConnected(id: string): Promise<any> {
    return (this.http.get<any>(environment.baseURL + '/api/ProjectView/ConnectedParameterMap/' + id, { headers: this.appservice.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }
  CheckParameterWithParameterMapConnected(id: string): Promise<any> {
    return (this.http.get<any>(environment.baseURL + '/api/ProjectView/ConnectedParameterWithParameterMap/' + id, { headers: this.appservice.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }
  GetAllMaintenanceTemplateInfo(type: string): Promise<any> {
    return (this.http.get<any>(environment.baseURL + `/api/ProjectView/GetAllMaintenanceTemplateInfo/${type}`, { headers: this.appservice.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }
  GetUsedTowerRange(tlpath: string): Promise<any> {
    return (this.http.get<any>(environment.baseURL + '/api/ProjectView/GetUsedTowerRange', { headers: this.appservice.httpHeaders, params: { tlpath } })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }
  GetAllTowerRanges(): Promise<any> {
    return (this.http.get<any>(environment.baseURL + '/api/ProjectView/GetAllTowerRanges', { headers: this.appservice.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }
  GetGroupHeirarchy(): Promise<any> {
    return (this.http.get<any>(environment.baseURL + '/api/ProjectView/GetGroupHeirarchy', { headers: this.appservice.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }
  GetLVbayFromHVbay(hv_bay: string): Promise<any> {
    return (this.http.get<any>(environment.baseURL + '/api/ProjectView/GetLVbayFromHVbay', { headers: this.appservice.httpHeaders, params: { hv_bay } })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }
  public httpHeaders: any;
  private TokenInit() {
    let token = sessionStorage.getItem("access_token") == null ? '' : sessionStorage.getItem("access_token");
    if (token != "") {
      token = "Bearer " + token;
      this.httpHeaders = new HttpHeaders({
        'Content-Type': 'application/json',
        'accept': 'application/json',
        'Authorization': token,
      });
    }
    else {
      this.httpHeaders = new HttpHeaders({
        'Content-Type': 'application/json',
        'accept': 'application/json'
      });
    }
  }
  //------ GettingJsonData-------
  //GetAllJsonData1(): Observable<any> {
  //  let apiurl: any = "https://dams.hvpn.org.in:8085/api/v1/substationdetails";
  //  let httpParams = new HttpParams();
  //  const requestBody = {
  //    substationcode: 11118
  //  };

  //  const headers = new HttpHeaders({
  //    'Content-Type': 'application/json'
  //  });

  //  const options = {
  //    headers,
  //    body: requestBody
  //  };
  //  return this.http.post<any>(apiurl, requestBody, { headers }).pipe(catchError(this.handleLoggedInError));
  //}

  GetSubstationData(code: number): Promise<any> {
    return (this.http.post<any>("https://dams.hvpn.org.in:8085/api/v1/substationdetails",
      { substationcode: code }, { headers: this.appservice.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }

  GetTransmissionData(code: string): Promise<any> {
    return (this.http.post<any>("https://dams.hvpn.org.in:8085/api/v1/transmissionlinedetailsbycode",
      { transmissionline_code: code }, { headers: this.appservice.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }

  updateMntList(id: string, data: any) {
    return this.http
      .put<any>(
        `${environment.baseURL}/api/ProjectView/UpdateMntList/${id}`,
        data,
        { headers: this.appservice.httpHeaders }
      )
      .pipe(catchError(this.handleLoggedInError))
      .toPromise()
      .then((response) => response)
      .catch((error) => ({ code: error }));
  }

  CreateLineBayScheduledMnt(data: any) {
    return (this.http.post<any>(environment.baseURL + '/api/ProjectView/CreateLineBayScheduledMnt', data, { headers: this.appservice.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }

  CreateTLScheduledMnt(data: any) {
    return (this.http.post<any>(environment.baseURL + '/api/ProjectView/CreateTLScheduledMnt', data, { headers: this.appservice.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }

  CreateObservationTLScheduledMnt(path: string, date: string, observation, ObservationsList: string[], device_id: string, voltage_level: string, tower_range: string, refference_maintenance_id: string) {
    return (this.http.put<any>(environment.baseURL + '/api/ProjectView/CreateObservationTLScheduledMnt',
      { path, date, observation, ObservationsList, device_id, voltage_level, tower_range, refference_maintenance_id }, { headers: this.appservice.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }
  CreateObservationBayScheduledMnt(path: string, date: string, observation, ObservationsList: string[], device_id: string, refference_maintenance_id: string) {
    return (this.http.put<any>(environment.baseURL + '/api/ProjectView/CreateObservationBayScheduledMnt',
      { path, date, observation, ObservationsList, device_id, refference_maintenance_id }, { headers: this.appservice.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }
  UpdateAllSubstation(data: any): Promise<any> {
    return (this.http.post<any>(environment.baseURL + "/api/ProjectView/UpdateAllSubstation/", data, { headers: this.appservice.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }

  getEquipmentTypesList(): Promise<any> {
    return (this.http.get<any>(environment.baseURL + "/api/ProjectView/getEquipmentTypesList/", { headers: this.appservice.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }

  NavigateToMaintenanceTab(project_id: string, path: string, view_name: string, tab_name: string) {
    // pvmain.resolve() strips all query params except `view` via location.replaceState,
    // so stash the tab in pending state so the dashboard can pick it up on mount.
    this.appservice.setPendingMaintenanceTab(tab_name);
    this.router.navigate(['/project/' + project_id + '/' + path], { queryParams: { view: 'P' + view_name, tab: tab_name } })
  }

  GetConnectedLineBySubstation(substation_path: string): Promise<any> {
    return (this.http.get<any>(environment.baseURL + "/api/ProjectView/GetConnectedLineBySubstation", { headers: this.appservice.httpHeaders, params: { substation_path } })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }


  // ------- Get Equipment Template by Ids -----------
  GetBayTemplateByIds(ids: any): Promise<any> {
    let temp_ids = ids.join("|");
    return (this.http.get<any>(environment.baseURL + "/api/ProjectView/BayTemplateByIds/" + temp_ids, { headers: this.appservice.httpHeaders, params: { temp_ids } })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }

  // ------- Get Equipment Template by Ids -----------
  GetEquipmentTemplateByIds(ids: any): Promise<any> {
    let temp_ids = ids.join("|");
    return (this.http.get<any>(environment.baseURL + "/api/ProjectView/EquipmentTemplateByIds/" + temp_ids, { headers: this.appservice.httpHeaders, params: { temp_ids } })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }

  GetSubstationTemplatesByIds(ids: any): Promise<any> {
    let temp_ids = ids.join("|");
    return (this.http.get<any>(environment.baseURL + "/api/ProjectView/SubstationTemplateByIds/" + temp_ids, { headers: this.appservice.httpHeaders, params: { temp_ids } })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }

  GetTLTemplatesByIds(ids: any): Promise<any> {
    let temp_ids = ids.join("|");
    return (this.http.get<any>(environment.baseURL + "/api/ProjectView/TLTemplateByIds/" + temp_ids, { headers: this.appservice.httpHeaders, params: { temp_ids } })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }

  // ------- Get Acitivity Param by Ids -----------
  GetActivityParamByIds(ids: any): Promise<any> {
    let temp_ids = ids.join("|");
    return (this.http.get<any>(environment.baseURL + "/api/ProjectView/ActivityParamByIds/" + temp_ids, { headers: this.appservice.httpHeaders, params: { temp_ids } })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }

  GetAllObservation(type = ""): Promise<any> {
    return (this.http.get<any>(environment.baseURL + "/api/ProjectView/GetAllObservation/", { headers: this.appservice.httpHeaders, params: { type } })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }

  GetEquipmentNamesList(path: string): Promise<any> {
    return (this.http.get<any>(environment.baseURL + "/api/ProjectView/GetEquipmentNamesList/", { headers: this.appservice.httpHeaders, params: { path } })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }
  createBulkObservation(objects: any): Promise<any> {
    return (this.http.post<any>(environment.baseURL + '/api/ProjectView/createbulkobservation/', objects, { headers: this.appservice.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }
  UpdateBulkObservation(objects: any): Promise<any> {
    return (this.http.put<any>(environment.baseURL + '/api/ProjectView/UpdateBulkObservation/', objects, { headers: this.appservice.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }

  GetObservationListByObjectId(path: string): Promise<any> {
    return (this.http.get<any>(`${environment.baseURL}/api/ProjectView/GetObservationListByObjectId/`, { headers: this.appservice.httpHeaders, params: { path } })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }
  //GetBayListIndex(id: string): Promise<any> {
  //  return (this.http.get<any>(environment.baseURL + '/api/ProjectView/GetBayListIndex/' + id, { headers: this.appservice.httpHeaders })
  //    .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  //}
  GetBayListIndex(id: string): Promise<any> {
    return (this.http.get<any>(environment.baseURL + "/api/ProjectView/GetBayListIndex/", { headers: this.appservice.httpHeaders, params: { id } })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }


  updateExistingLevelViews() {
    return this.http.put<any>(`${environment.baseURL}/api/ProjectView/UpdateExistingLevelViews`, {}, { headers: this.appservice.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => data).catch(error => ({ code: error }));
  }


  UpdateBulkTLForMap(data: any, manualConfig: boolean): Promise<any> {
    return (this.http.post<any>(environment.baseURL + "/api/ProjectView/UpdateBulkTLForMap/", data, { headers: this.appservice.httpHeaders, params: { manualConfig } })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }
  AddBulkTLFromMap(data: any): Promise<any> {
    return (this.http.post<any>(environment.baseURL + "/api/ProjectView/AddBulkTLFromMap/", data, { headers: this.appservice.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }
  DeleteBulkTLFromMap(data: any): Promise<any> {
    return (this.http.post<any>(environment.baseURL + "/api/ProjectView/DeleteBulkTLFromMap/", data, { headers: this.appservice.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }
  AddBulkSubstationFromMap(data: any): Promise<any> {
    return (this.http.post<any>(environment.baseURL + "/api/ProjectView/AddBulkSubstationFromMap/", data, { headers: this.appservice.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }
  DeleteBulkSubstationFromMap(data: any): Promise<any> {
    return (this.http.post<any>(environment.baseURL + "/api/ProjectView/DeleteBulkSubstationFromMap/", data, { headers: this.appservice.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }
  UpdateBulkSubstationForMap(data: any, manualConfig: boolean): Promise<any> {
    return (this.http.post<any>(environment.baseURL + "/api/ProjectView/UpdateBulkSubstationForMap/", data, { headers: this.appservice.httpHeaders, params: { manualConfig } })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }
  GetObjectDetails(Id: any): Promise<any> {
    return (this.http.get<any>(environment.baseURL + "/api/ProjectView/GetObjectDetails/", { headers: this.appservice.httpHeaders, params: { Id } })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }
  GetObjectDetailsByPath(standard: string, path: string): Promise<any> {
    return (this.http.get<any>(environment.baseURL + "/api/ProjectView/GetObjectDetailsByPath", { headers: this.appservice.httpHeaders, params: { standard, path } })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }


  BulkAddDocs(array: any[], type: string): Promise<any> {
    return (this.http.post<any>(environment.baseURL + "/api/ProjectView/BulkAddDocs", array, { headers: this.appservice.httpHeaders, params: { type } })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }
  GetEquipmentTemplatesFromBayType(BayType: string): Promise<any> {
    return (this.http.get<any>(environment.baseURL + "/api/ProjectView/GetEquipmentTemplatesFromBayType", { headers: this.appservice.httpHeaders, params: { BayType } })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }
  GetMaintenanceListByPath(path: string): Promise<any> {
    return this.http
      .get<any>(
        `${environment.baseURL}/api/ProjectView/GetMaintenanceListByPath?Path=${encodeURIComponent(path)}`,
        { headers: this.appservice.httpHeaders }
      )
      .pipe(catchError(this.handleLoggedInError))
      .toPromise()
      .then(data => data)
      .catch(err => ({ code: err }));
  }

  CreateObservationMNT(data: any): Promise<any> {
    return (this.http.post<any>(environment.baseURL + "/api/ProjectView/CreateObservationMNT/", data, { headers: this.appservice.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data.code }; }));
  }
  ClearParam(): Promise<any> {
    return (this.http.delete<any>(environment.baseURL + "/api/ProjectView/ClearParam", { headers: this.appservice.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }
  fetchLVBayMaintenanceList(name: string): Promise<any> {
    return (this.http.get<any>(environment.baseURL + "/api/ProjectView/fetchLVBayMaintenanceList", { headers: this.appservice.httpHeaders, params: { name } })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }
  checkAndUpdateActiveNonInitiatorMaintenance(path: string) {
    return this.http.post<{ updated: boolean }>(
      environment.baseURL + '/api/ProjectView/maintenance/check-update-non-initiator',
      null,
      {
        headers: this.appservice.httpHeaders,
        params: { path }
      }
    );
  }
  CreateManualObservation(data: any): Promise<any> {
    return (this.http.post<any>(environment.baseURL + "/api/ProjectView/CreateManualObservation/", data, { headers: this.appservice.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }

  // Old ApplyAll
  /*

  ApplyAll(devicetype: string): Promise<any> {
    return firstValueFrom(
      this.http.post<ApplyTemplateResult[]>(
        `${environment.baseURL}/api/ProjectView/ApplyAll`,
        { devicetype },
        { headers: this.appservice.httpHeaders }
      )
    );
  }

  */

  ApplyAllV2(devicetype: string): Promise<any> {
    return firstValueFrom(
      this.http.post<ApplyTemplateResult[]>(
        `${environment.baseURL}/api/ProjectView/ApplyAllV2`,
        { devicetype },
        { headers: this.appservice.httpHeaders }
      )
    );
  }

  /** Applies all S, B, and E templates to a single substation only. Use after importing one substation. */
  ApplyAllTemplatesToSubstation(substationId: string): Promise<ApplyTemplateResult[]> {
    return firstValueFrom(
      this.http.post<ApplyTemplateResult[]>(
        `${environment.baseURL}/api/ProjectView/ApplyAllTemplatesToSubstation`,
        { substationId: substationId?.trim() },
        { headers: this.appservice.httpHeaders }
      )
    );
  }

  getAllCustomDoc(): Observable<any> {
    return this.http.get<any>(
      `${environment.baseURL}/api/ProjectView/getAllCustomDoc`,
      { headers: this.appservice.httpHeaders }
    ).pipe(
      catchError(this.handleLoggedInError)
    );
  }

  updateCustomDoc(category: string, items: string[]): Observable<any> {
    const payload = {
      category: category,
      items: items
    };

    return this.http.post<any>(
      `${environment.baseURL}/api/ProjectView/updateCustomDoc/`,
      payload,
      { headers: this.appservice.httpHeaders }
    ).pipe(
      catchError(this.handleLoggedInError)
    );
  }
  isDuplicateCode(type: string, code: string): Promise<boolean> {
    return this.http.get<boolean>(
      `${environment.baseURL}/api/ProjectView/hasDuplicateCode`,
      {
        headers: this.appservice.httpHeaders,
        params: { type, code }
      }
    )
      .pipe(
        catchError((error) => this.handleLoggedInError(error))
      )
      .toPromise();
  }




}