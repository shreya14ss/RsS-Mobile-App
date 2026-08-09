import { Injectable, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';
import { HubConnection, HubConnectionBuilder } from '@microsoft/signalr';
import { throwError, Observable, Subject, Subscription } from 'rxjs';
import { GroupAccessRight, ProjectViewData, SGroupAccessRight } from './project-resolver.service';
import * as pako from 'pako';
import { BehaviorSubject } from 'rxjs';
import { environment } from 'src/environments/environment';
import { AppService } from './app.service';
import { PVMainComponent } from '../../features/pvmain/pvmain.component';


@Injectable({
  providedIn: 'root'
})

export class SignalRService {
  private alarmCountSubject = new BehaviorSubject<any>(null);
  alarm_count: any;
  alarmCount$ = this.alarmCountSubject.asObservable();
  updateDataReceived = new EventEmitter<any>();
  shiftReportDataReceived = new EventEmitter<any>();
  eventlogDlgIccpData = new EventEmitter<any>();
  hmiReceived = new EventEmitter<any>();
  coreConnection = new EventEmitter<any>();
  reconnection = new EventEmitter<any>();
  dbConnection = new EventEmitter<boolean>();
  connectionStatus = new EventEmitter<boolean>();
  topAlarm = new EventEmitter<any>();
  commandReply = new EventEmitter<any>();
  //updateLS = new EventEmitter<LoadSheddingItem>();
  updateTimeReso: EventEmitter<boolean> = new EventEmitter<boolean>();
  ManualDisconnect: boolean = false;
  private connectionIsEstablished = false;
  private running = false;
  private _hubConnection: HubConnection;
  private login_sub: Subscription;
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly RETRY_INTERVAL = 10000;
  private connectionRetryCount = 0;
  InProgress: boolean = true;
  private messageTimeoutCheckInterval: any = null;
  pvmain: PVMainComponent = null;
  message$: any;
  constructor(private appSerive: AppService, private router: Router) {
    this.createConnection();
    this.registerOnServerEvents();
  }
  async destroy() {
    if (this.running) {
      this.login_sub.unsubscribe();
      this.login_sub = null;
      this.closeConsoleDialog$.next();
      this.ManualDisconnect = true;
      this.running = false;
      this.stopMessageTimeoutCheck();
      await this._hubConnection.stop().catch();
    }
  }

  /**
   * Ensures the hub is Connected before returning. Handles every lifecycle state
   * so callers (getProjectViewDetails, app.component resume) don't need to know
   * whether auto-reconnect is mid-flight or fully exhausted. Safe to call
   * repeatedly and concurrently. Never throws — on failure, hub stays
   * Disconnected and the caller's next invoke() will fail cleanly.
   */
  public async ensureConnected(): Promise<void> {
    if (this.ManualDisconnect) return;
    const state = this._hubConnection.state;
    if (state === 'Connected') return;

    if (state === 'Reconnecting' || state === 'Connecting' || state === 'Disconnecting') {
      // Wait for the in-flight transition to settle rather than racing it.
      await this.waitForConnected(15000);
      return;
    }

    // Disconnected — auto-reconnect already exhausted (or never started).
    // Reset flags so startConnection() re-enters its retry loop.
    this.connectionIsEstablished = false;
    this.running = false;
    try {
      await this.startConnection();
    } catch (err) {
      console.log('ensureConnected: manual reconnect failed', err);
    }
  }

  private waitForConnected(timeoutMs: number): Promise<void> {
    return new Promise(resolve => {
      const start = Date.now();
      const tick = () => {
        const s = this._hubConnection.state;
        if (s === 'Connected' || s === 'Disconnected' || (Date.now() - start) > timeoutMs) {
          resolve();
        } else {
          setTimeout(tick, 100);
        }
      };
      tick();
    });
  }

  private startMessageTimeoutCheck(): void {
    // Timeout watchdog is disabled on mobile — no continuous data stream expected
    this.stopMessageTimeoutCheck();
  }

  private stopMessageTimeoutCheck(): void {
    if (this.messageTimeoutCheckInterval) {
      clearTimeout(this.messageTimeoutCheckInterval);
      this.messageTimeoutCheckInterval = null;
    }
  }

  private createConnection() {
    this._hubConnection = new HubConnectionBuilder()
      .withUrl(environment.baseURL + '/hub/ProjectHub', { accessTokenFactory: () => sessionStorage.getItem("access_token") })
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: (retryContext) => {
          if (this.connectionRetryCount >= this.MAX_RETRY_ATTEMPTS) {
            this.connectionRetryCount = 0;
            this.InProgress = false;
            return null;
          }
          this.InProgress = true;
          this.connectionRetryCount++;
          console.log(`Attempting reconnection ${this.connectionRetryCount}/${this.MAX_RETRY_ATTEMPTS}`);

          return this.RETRY_INTERVAL;
        }
      })
      .build();

    this._hubConnection.serverTimeoutInMilliseconds = 300000;
    this._hubConnection.keepAliveIntervalInMilliseconds = 60000;
  }
  public async startConnection(): Promise<void | any> {
    this.running = true;
    this.connectionRetryCount = 0;
    this.InProgress = true;
    this.appSerive.setProjectInitialValues(null);
    this.login_sub = this.appSerive.loginModeChanged.subscribe(async (data) => await this.destroy());
    for (let cnt = 0; this.running && !this.connectionIsEstablished && cnt < 3; cnt++) {
      await this._hubConnection
        .start()
        .then(() => {
          this.InProgress = false;
          this.connectionIsEstablished = true;
          console.log('Hub connection started');
          this.ManualDisconnect = false;
          this.connectionStatus.emit(true);
          this.startMessageTimeoutCheck();
          if (!this.running) {
            //this.login_sub.unsubscribe();
            this._hubConnection.stop().catch();
            return throwError('session').toPromise();
          }
          return true;
        })
        .catch(err => {
          console.log('Error while establishing connection, try ' + (cnt + 1).toString() + '...');
        });
    }
    if (!this.connectionIsEstablished)
      return throwError('session').toPromise();
  }

  async getProjectViewDetails(id: string, path: string, view: string, params: any) {
    // Handle every hub state before invoking. Without this the first tap after
    // a long background resume tends to fire invoke() while the hub is still
    // Reconnecting/Connecting, which throws — the resolver then cancels the
    // navigation and the user has to tap again.
    await this.ensureConnected();

    if (path == null || path == '') {
      path = sessionStorage.getItem('ProjectPath');
      if (path == null)
        path = '';
    }
    if (view == null || view == '') {
      view = sessionStorage.getItem('ProjectView');
      if (view == null)
        view = '';
    }
    let cfg: any = JSON.parse(sessionStorage.getItem('ProjectConfig'));
    if (cfg == null || cfg.id != id) {
      cfg = null;
    }

    return this._hubConnection.invoke<ProjectViewData>('projectDetails', {
      'view': view, 'cfg': (cfg == null) ? null : cfg.rev, 'path': path, 'paramsdata': params, 'platform': 'mobile'
    }).then((data: ProjectViewData) => {
      if (data == null) {
        return data;
      }
      if (data.code != null) {
        return data;
      }
      if (data.cfg) {
        cfg = data.cfg.settings;
        cfg.id = data.cfg._id;
        cfg.rev = data.cfg._rev;
        sessionStorage.setItem('ProjectConfig', JSON.stringify(cfg));
      }
      data.cfg = cfg;
      if (data.group_path != null)
        sessionStorage.setItem('ProjectPath', data.group_path.join('/'));
      else
        sessionStorage.removeItem('ProjectPath');
      if (data.view != null)
        sessionStorage.setItem('ProjectView', data.view);
      else
        sessionStorage.removeItem('ProjectView');
      return data;
    }).catch((err) => {
      console.log(err)
      return null;
    });

  }
  PageOperationalSave(view_id: string, time_val, values: any, resolution: number): Promise<any> {
    return this._hubConnection.invoke<any>('pageOperationalSave', view_id, time_val, values, resolution).then(data => { return data; }).catch(data => { return { code: 'hub' }; });
  }

  SaveOperationalData(view_id: string, time_val, values: any, cot: string, isTemp: boolean, reso: number): Promise<any> {
    return this._hubConnection.invoke<any>('saveOperationalData', view_id, time_val, values, cot, isTemp, reso).then(data => { return data; }).catch(data => { return { code: 'hub' }; });
  }
  SubstituteOperationalData(view_id: string, time_val, values: any, cot: string, isVTQLog: boolean, reso: number, isTemp: boolean = false, voltageDict: any = null) {

    return this._hubConnection.invoke<any>('substituteOperationalData', view_id, time_val, values, cot, isVTQLog, reso, isTemp, voltageDict).then(data => { return data; }).catch(data => { return 'hub'; });
  }

  UpdateEventCot(id: number, curTime: number, restorationTime: number, iccpTimeAutoMap: boolean, restorationTimeAutoMap: boolean, cot: string, object_detail: any, restoreobject_list: any, remark: string, startIndex: number, endIndex: number) {
    return this._hubConnection.invoke<any>('UpdateEventCot', id, curTime, restorationTime, iccpTimeAutoMap, restorationTimeAutoMap, cot, object_detail, restoreobject_list, remark, startIndex, endIndex).then(data => { return data; }).catch(data => { return 'hub'; });
  }

  UpdateExistingObjectsEntry(view_id: string, time: number, values: any) {
    return this._hubConnection.invoke<any>('UpdateExistingObjectsEntry', view_id, time, values).then(data => { return data; }).catch(data => { return 'hub'; });
  }

  GetShiftNotClosedReasons(path: string, date: string) {
    return this._hubConnection.invoke<any>('GetShiftNotClosedReasons', path, date).then(data => { return data; }).catch(data => { return 'hub'; });
  }

  StartGetIccpDataForEventLog(path: string, maintenance: boolean, restoration: boolean) {
    return this._hubConnection.invoke<any>('StartGetIccpDataForEventLog', path, maintenance, restoration).then(data => { return data; }).catch(data => { return 'hub'; });
  }

  StopShiftReportUpdates(): Promise<void> {
    return this._hubConnection.invoke('StopShiftReportUpdates')
      .then(() => {
        console.log('Shift report updates stopped');
      })
      .catch(error => {
        console.error('Failed to stop shift report updates:', error);
      });
  }
  StopGetIccpDataForEventLog(): Promise<void> {
    return this._hubConnection.invoke('StopGetIccpDataForEventLog')
  }
  // StartSendData() {
  //   this.pvmain.StartSendingdata();
  // }

  StartSendData() {
    console.log("Triggering startSendData");

    if (!this._hubConnection || this._hubConnection.state !== 'Connected') {
      console.warn("⚠️ Hub not connected");
      return;
    }

    if (this.pvmain) {
      this.pvmain.StartSendingdata();
    } else {
      this.StartSendingdata();
    }
  }
  StartSendingdata() {
    console.log("Send Data");
    // Swallow the "not Connected" rejection during the reconnect window.
    // On resume from long background the hub is still reconnecting when
    // ngAfterViewInit fires this — the reconnect logic will retry the
    // send once the hub is back. Without the catch, Angular's zone flags
    // it as an unhandled promise rejection.
    this._hubConnection.invoke('startSendData').catch(() => { /* retry on reconnect */ });
  }

  ScanInhibit(object_id: number, value: any, reason_inbit: string) {
    return this._hubConnection.invoke<any>('scanInhibit', object_id, value, reason_inbit).then(data => { return data; }).catch(data => { return 'hub'; });
  }
  Substitute(object_id: number, value: any, reason_inbit: string, dateTime: number) {
    return this._hubConnection.invoke<any>('Substitute', object_id, value, reason_inbit, dateTime).then(data => { return data; }).catch(data => { return 'hub'; });
  }
  AlarmInhibit(object_id: number, value: boolean, reason_inbit: string) {
    return this._hubConnection.invoke<any>('alarmInhibit', object_id, value, reason_inbit).then(data => { return data; }).catch(data => { return 'hub'; });
  }

  UpdateConfigurationChanges() {
    return this._hubConnection.invoke<any>('UpdateConfigurationChanges').then(data => { return data; }).catch(data => { return 'hub'; });
  }

  ControlInhibit(object_id: number, value: boolean, reason_inbit: string) {
    return this._hubConnection.invoke<any>('controlInhibit', object_id, value, reason_inbit).then(data => { return data; }).catch(data => { return 'hub'; });
  }
  //async ScanInhibit(data: number): Promise<any> {
  //  try {
  //    const data_1 = await this._hubConnection.invoke('scanInhibit', data);
  //    return data_1;
  //  }
  //  catch (data_2) {
  //    return 'hub';
  //  }
  //}

  getAlarmCount(path: string): Promise<any> {
    return this._hubConnection.invoke<any>('getAlarmCount', path).then(data => { return data; }).catch(data => { return 'hub'; });
  }

  UpdatePageReuest(view_id: string, data: any) {
    this._hubConnection.invoke('updatePageReuest', view_id, data);
  }

  AlarmAcknowledge(object_list: number[]) {
    return this._hubConnection.invoke<boolean>('alarmAcknowledge', object_list).then(data => { return data; }).catch(data => { return false; });
  }
  AlarmDelete(object_list: number[]) {
    return this._hubConnection.invoke<boolean>('alarmDelete', object_list).then(data => { return data; }).catch(data => { return false; });
  }

  StartCommand(object_id: number, value: any, comment: string, type: number, isInterlock: boolean, syncCheckBypass: boolean, isTest: boolean) {
    return this._hubConnection.invoke<any>('startCommand', object_id, value, comment, type, isInterlock, syncCheckBypass, isTest).then(data => { return data; }).catch(data => { return { code: 'hub', request_id: 0 }; });
  }
  CancelCommand(request_id: number, client_num: number) {
    return this._hubConnection.invoke<string>('cancelCommand', request_id, client_num).then(data => { return data; }).catch(data => { return 'hub'; });
  }
  SboCommand(request_id: number, client_num: number) {
    return this._hubConnection.invoke<string>('sboCommand', request_id, client_num).then(data => { return data; }).catch(data => { return 'hub'; });
  }
  getGroupChildren(data: any): Promise<any> {
    return this._hubConnection.invoke('getGroupChildren', data).then(data => { return data; }).catch(data => { return null; })
  }

  AddLSLogic(item: any): Promise<string> {
    return this._hubConnection.invoke<string>('addLSLogic', item).then(data => { return data; }).catch(data => { return 'hub'; });
  }

  EditLSLogic(old_name: string, item: any): Promise<string> {
    return this._hubConnection.invoke<string>('editLSLogic', old_name, item).then(data => { return data; }).catch(data => { return 'hub'; });
  }

  DeleteLSLogic(name: string): Promise<string> {
    return this._hubConnection.invoke<string>('deleteLSLogic', name).then(data => { return data; }).catch(data => { return 'hub'; });
  }

  EnableLogic(object_id: number): Promise<any> {
    return this._hubConnection.invoke<string>('enableLogic', object_id, true).then(data => { return data; }).catch(data => { return { code: 'hub', request_id: 0 }; });
  }

  DisableLogic(object_id: number): Promise<any> {
    return this._hubConnection.invoke<string>('enableLogic', object_id, false).then(data => { return data; }).catch(data => { return { code: 'hub', request_id: 0 }; });
  }
  AddLSDetail(item: any): Promise<string> {
    return this._hubConnection.invoke<string>('addLSDetail', item).then(data => { return data; }).catch(data => { return 'hub'; });
  }
  private alarm_list: any[];
  private group_rights;
  private severity_list: any;
  private min_severity: number = 500;
  getRowStyle(alarmTemplate: any, severity: number, is_ack: boolean) {
    //let alarmTemplate: any = this.app
    let alarmTemplateItemSel = null;
    for (let alarmTemplateItem in alarmTemplate) {
      let sev = parseInt(alarmTemplateItem);
      if (sev == 0) {
        if (severity == 0) {
          alarmTemplateItemSel = alarmTemplate[alarmTemplateItem];
          break;
        }
      }
      else if (sev >= severity) {
        alarmTemplateItemSel = alarmTemplate[alarmTemplateItem];
        break;
      }
    }
    if (alarmTemplateItemSel == null)
      return null;
    let ret = {}
    if (is_ack)
      alarmTemplateItemSel = alarmTemplateItemSel.on_ack;
    else
      alarmTemplateItemSel = alarmTemplateItemSel.on_alarm;


    if (alarmTemplateItemSel.blink && alarmTemplateItemSel.blink.charAt(0) != 'n') {
      ret["val"] = {
        "background-color": alarmTemplateItemSel.back || '',
        "color": alarmTemplateItemSel.text || ''
      }
      if (alarmTemplateItemSel.blink.charAt(0) == 't' && alarmTemplateItemSel.blink.charAt(1) == 'e') {
        ret["blink"] = {
          "background-color": alarmTemplateItemSel.back || '',
          "color": alarmTemplateItemSel.blink_color || alarmTemplateItemSel.text || ''
        }
      }
      else if (alarmTemplateItemSel.blink.charAt(0) == 'b') {
        ret["blink"] = {
          "background-color": alarmTemplateItemSel.blink_color || alarmTemplateItemSel.back || '',
          "color": alarmTemplateItemSel.text || ''
        }
      }
      else {
        ret["blink"] = {
          "background-color": alarmTemplateItemSel.text || '',
          "color": alarmTemplateItemSel.back || ''
        }
      }
    }
    else {
      ret["background-color"] = alarmTemplateItemSel.back || '';
      ret["color"] = alarmTemplateItemSel.text || '';
    }

    return ret;
  }
  getEventRowStyle(eventSettings: any, reason: string, category_id: number): any {
    if (!eventSettings) {
      return {
        'background-color': '#ffffff',
        'color': '#000000'
      };
    }
    let matchedSetting = undefined;
    for (let i = 0; i < eventSettings.length; i++) {
      if (eventSettings[i].selected_option == 'Default') {
        var bgcolor = eventSettings[i].back;
        var textcolor = eventSettings[i].text;
      }
      if ((eventSettings[i].selected_option == 'COT' && eventSettings[i].cot == reason)) {
        matchedSetting = eventSettings[i];
        break;
      }
      else if ((eventSettings[i].selected_option == 'Category' && eventSettings[i].category == category_id)) {
        matchedSetting = eventSettings[i];
        break;
      }
    }

    if (matchedSetting) {
      return {
        'background-color': matchedSetting.back,
        'color': matchedSetting.text
      };
    }

    // Default style if no match found
    return {
      'background-color': bgcolor,
      'color': textcolor
    };
  }
  getInitialAlarm(): any {
    return { alarms: this.alarm_list.slice(0, 5), sound: this.min_severity > 255 ? -1 : this.min_severity };
  }
  checkGlobalAlarmAccess(): boolean {
    for (let right in this.group_rights) {
      if (this.group_rights[right].Item2.role.rights.some(right => this.checkAlarmAckRight(GroupAccessRight.AlarmAcknowledge, SGroupAccessRight[right])) && !this.group_rights[right].Item2.lockAlarm)
        return true;
    }
    return false;
  }
  checkAlarmAckRight(right, role) {
    if (role == GroupAccessRight.ProjectAdmin || role == GroupAccessRight.Admin || role == GroupAccessRight.AlarmDelete || role == GroupAccessRight.Control || role == GroupAccessRight.AlarmAcknowledge)
      return true;
    return false;
  }

  private messageSubject = new Subject<any>();
  GetMessages(): Observable<any> {
    return this.messageSubject.asObservable();
  }

  private messageReadSubject = new Subject<{ noticeId: string; projectId?: string }>();
  GetMessageRead(): Observable<{ noticeId: string; projectId?: string }> {
    return this.messageReadSubject.asObservable();
  }

  private noticesRemovedSubject = new Subject<{ maintenanceId: string; deletedCount: number; projectId?: string }>();
  GetNoticesRemoved(): Observable<{ maintenanceId: string; deletedCount: number; projectId?: string }> {
    return this.noticesRemovedSubject.asObservable();
  }

  private MappingChangesCount = new Subject<number>();
  GetMappingChangesCount(): Observable<any> {
    return this.MappingChangesCount.asObservable();
  }
  private damageBayLockChangedSubject = new Subject<{ bayPath: string; locked: boolean }>();
  /** Emits whenever a damage bay's lock state changes — locked on report creation, unlocked when all equipment is resolved.
   *  Mirrors ClientApp signal-r.service.ts:607-609. */
  damageBayLockChanged$ = this.damageBayLockChangedSubject.asObservable();
  private UpdateBaygroup = new Subject<number>();
  GeUpdateBaygroup(): Observable<any> {
    return this.UpdateBaygroup.asObservable();
  }
  private updateobservation = new Subject<void>();
  updateobservation_eventdlg(): Observable<any> {
    return this.updateobservation.asObservable();
  }
  private CoreConsoleMessages = new Subject<any>();
  GetCoreConsoleMessages(): Observable<any> {
    return this.CoreConsoleMessages.asObservable();
  }
  private closeConsoleDialog$ = new Subject<void>();
  CloseConsoleDlg(): Observable<void> {
    return this.closeConsoleDialog$.asObservable();
  }
  chunkBuffer: Uint8Array[] = [];
  totalChunks: number = 0;
  receivedChunkCount: number = 0;

  decodeChunkBytes(chunk_bytes: any): Uint8Array {
    if (chunk_bytes instanceof Uint8Array) {
      return chunk_bytes;
    }

    if (Array.isArray(chunk_bytes)) {
      // number[] from SignalR
      return new Uint8Array(chunk_bytes);
    }

    if (typeof chunk_bytes === 'string') {
      // base64 string
      const binaryStr = atob(chunk_bytes);
      const byteArray = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        byteArray[i] = binaryStr.charCodeAt(i);
      }
      return byteArray;
    }

    throw new Error("❌ Unknown chunk_bytes format received.");
  }

  private registerOnServerEvents(): void {

    this._hubConnection.on('ForceLogout', (data: any) => {
      // Another device force-logged this user in. Stop the hub so we don't
      // auto-reconnect with the (now invalid) token, clear local session state,
      // and route to /login. Just reloading the WebView would leave sessionStorage
      // intact and the app would come back up still holding the dead token.
      try { this._hubConnection?.stop(); } catch { /* ignore */ }
      this.running = false;
      this.connectionIsEstablished = false;
      this.appSerive.UpdateLogout();
      this.router.navigateByUrl('/login', { replaceUrl: true });
    });

    this._hubConnection.on("ReceiveMessage", (message: any) => {
      this.startMessageTimeoutCheck();
      this.messageSubject.next(message);
    });

    this._hubConnection.on("MessageRead", (payload: { noticeId: string; projectId?: string }) => {
      this.startMessageTimeoutCheck();
      if (payload?.noticeId) this.messageReadSubject.next(payload);
    });

    this._hubConnection.on("NoticesRemoved", (payload: { maintenanceId: string; deletedCount: number; projectId?: string }) => {
      this.startMessageTimeoutCheck();
      if (payload?.maintenanceId != null && typeof payload.deletedCount === 'number')
        this.noticesRemovedSubject.next(payload);
    });

    this._hubConnection.on("UpdateEventDlgObservation", () => {
      this.startMessageTimeoutCheck();
      this.updateobservation.next();
    });
    this._hubConnection.on('reloadRequest', (data: any) => {
      this.startMessageTimeoutCheck();
      window.location.reload();
    });

    this._hubConnection.on("ProjectDataReceivedChunk", (payload) => {
      this.startMessageTimeoutCheck();

      const { chunk_index, total_chunks, chunk_bytes } = payload;

      if (!chunk_bytes || typeof chunk_index !== 'number' || typeof total_chunks !== 'number') {
        console.warn("⚠️ Invalid chunk received:", payload);
        return;
      }

      // Initialize buffer on first chunk or if not yet initialized
      if (!this.chunkBuffer || chunk_index === 0) {
        this.chunkBuffer = new Array(total_chunks).fill(null);
        this.totalChunks = total_chunks;
        this.receivedChunkCount = 0;
      }

      // Store the chunk if it's not already stored
      if (!this.chunkBuffer[chunk_index]) {
        // Ensure chunk_bytes is a Uint8Array
        const byteArray = this.decodeChunkBytes(chunk_bytes);
        this.chunkBuffer[chunk_index] = byteArray;
        this.receivedChunkCount++;
      }

      // Reassemble when all chunks are received
      if (this.receivedChunkCount === this.totalChunks) {



        try {
          const fullLength = this.chunkBuffer.reduce((acc, b) => acc + b.length, 0);
          const combined = new Uint8Array(fullLength);
          let offset = 0;

          for (const part of this.chunkBuffer) {
            if (!part) throw new Error("Missing chunk during reassembly");
            combined.set(part, offset);
            offset += part.length;
          }

          // Decode JSON from UTF-8 bytes
          const decompressed = pako.inflate(combined, { to: 'string' });



          const fullPayload = JSON.parse(decompressed);

          this.updateDataReceived.emit(fullPayload);
        } catch (e) {
          console.error("❌ Failed to reassemble or decode payload:", e);
        } finally {
          this.chunkBuffer = null;
          this.totalChunks = 0;
          this.receivedChunkCount = 0;
        }
      }

    });
    this._hubConnection.on("AlarmCountUpdated", (count: any) => {
      this.startMessageTimeoutCheck();
      this.alarm_count = count;
      // If multiple components need it:
      this.alarmCountSubject.next(count);
    });


    /*this._hubConnection.on("ProjectDataReceivedChunk", (payload) => {
      let { chunk_index, total_chunks, chunk_bytes } = payload;

      if (!chunk_bytes || typeof chunk_index !== 'number' || typeof total_chunks !== 'number') {
        console.warn("Invalid chunk received");
        return;
      }

      if (chunk_index === 0) {
        this.chunkBuffer = new Array(total_chunks).fill(null);
        this.totalChunks = total_chunks;
      }

      // Decode this chunk from base64 → Uint8Array
     // let binary = atob(base64);
      //base64 = null;
      const byteArray = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        byteArray[i] = binary.charCodeAt(i);
      }
      binary = null;
      this.chunkBuffer[chunk_index] = chunk_bytes;

      // Reassemble once all chunks received
      if (this.chunkBuffer.filter(Boolean).length === this.totalChunks) {
        try {
          // Merge all Uint8Arrays into one
          let fullLength = this.chunkBuffer.reduce((acc, b) => acc + b.length, 0);
          const combined = new Uint8Array(fullLength);
          let offset = 0;
          for (const part of this.chunkBuffer) {
            combined.set(part, offset);
            offset += part.length;
          }

          //// Decompress (inflate) using pako
          //const decompressed = pako.inflate(combined, { to: 'string' });
          //const payload = JSON.parse(decompressed);

          // Decode UTF-8 JSON string from binary
          const decoder = new TextDecoder('utf-8');
          const jsonString = decoder.decode(combined);
          const payload = JSON.parse(jsonString);

          this.chunkBuffer = [];
          this.totalChunks = 0;

          this.
          .emit(payload);
        } catch (e) {
          console.error("❌ Failed to reassemble or decompress projectDataReceived:", e);
        } finally {
          this.chunkBuffer = [];
          this.totalChunks = 0;
        }

      }
    });*/



    this._hubConnection.on('projectDataReceived', (data: any) => {
      this.startMessageTimeoutCheck();
      console.log("Entered updateDataReceived signal", data)
      this.updateDataReceived.emit(data);
    });

    this._hubConnection.on('ShiftNotClosedReport', (data: any) => {
      this.startMessageTimeoutCheck();
      this.shiftReportDataReceived.emit(data);
    });
    this._hubConnection.on('EventLogIccpData', (data: any) => {
      this.startMessageTimeoutCheck();
      this.eventlogDlgIccpData.emit(data);
    });
    this._hubConnection.on('hMIReceived', (data: any) => {
      this.startMessageTimeoutCheck();
      this.hmiReceived.emit(data);
    });
    this._hubConnection.on('ConnectionUMacCore', (data: any) => {
      this.startMessageTimeoutCheck();
      this.coreConnection.emit(data);
    });
    this._hubConnection.on('connectionDB', (data: boolean) => {
      this.startMessageTimeoutCheck();
      this.dbConnection.emit(data);
    });

    this._hubConnection.on('dbchanged', (data: boolean) => {
      this.startMessageTimeoutCheck();
      window.location.reload();

    });
    this._hubConnection.on('disconnect', () => {
      this.startMessageTimeoutCheck();
      this._hubConnection.stop();
    });
    this._hubConnection.onreconnecting((error) => {
      console.log(new Date(), 'SignalR Reconnecting ${this.connectionRetryCount} ...', error);
    });

    this._hubConnection.onreconnected((connectionId) => {
      this.InProgress = false;
      console.log(new Date(), 'SignalR Reconnected', connectionId);
      this.connectionRetryCount = 0;
      this.startMessageTimeoutCheck();
      this.reconnection.emit(true);
    });
    this._hubConnection.on('alarms', (data: any) => {
      this.startMessageTimeoutCheck();
      let data_src = this.alarm_list;
      let min_sev_ch = false;
      for (let data_item of data.del) {
        let index = 0;
        for (let tmp_data_item of data_src) {
          if (data_item == tmp_data_item.id) {
            if (tmp_data_item.state.charAt(0) != 's' && tmp_data_item.severity > 0) {
              this.severity_list[tmp_data_item.severity]--;
              if (this.severity_list[tmp_data_item.severity] == 0) {
                delete this.severity_list[tmp_data_item.severity];
                if (tmp_data_item.severity == this.min_severity)
                  min_sev_ch = true;
              }
            }
            data_src.splice(index, 1);
            break;
          }
          index++;
        }
      }

      let bells: string[] = [];
      for (let data_item of data.add) {
        let alarmack = false;
        let index = 0;
        for (let tmp_data_item of data_src) {
          if (data_item.id == tmp_data_item.id) {
            if (data_item.state && tmp_data_item.state.charAt(0) != 's')
              alarmack = true;
            break;
          }
          index++;
        }

        let path = data_item.path.join('/');
        let right = Object.keys(this.group_rights).find(right => path.startsWith(right));
        if (right) {
          // if (!alarmack && !this.appSerive.tempsoundControl && FooterComponent.getSound(this.appSerive, data_item.details.severity))
          //   this.appSerive.tempsoundControl(true);
          let row = { style: this.getRowStyle(this.appSerive.getAlarmSettings(), data_item.details.severity, data_item.state), id: data_item.id, state: data_item.state ? 'spellcheck' : 'notifications', acknowledge: { disabled: this.group_rights[right].Item1 < 1 || data_item.state }, delete: { disabled: this.group_rights[right].Item1 < 1 || !data_item.state }, datetime: data_item.datetime, entry: data_item.entry, text: data_item.details.text, severity: data_item.details.severity, path: data_item.path };
          if (index == data_src.length) {
            if (!data_item.state && data_item.details.severity > 0) {
              if (this.severity_list[data_item.details.severity])
                this.severity_list[data_item.details.severity]++;
              else
                this.severity_list[data_item.details.severity] = 1;

              if (!min_sev_ch && this.min_severity > data_item.details.severity)
                this.min_severity = data_item.details.severity;
            }
          }
          else {
            let tmp_data_item = data_src[index];
            if (data_item.state != (tmp_data_item.state.charAt(0) == 's') || data_item.details.severity != tmp_data_item.severity) {
              if (tmp_data_item.state.charAt(0) != 's' && tmp_data_item.severity > 0) {
                this.severity_list[tmp_data_item.severity]--;
                if (this.severity_list[tmp_data_item.severity] == 0) {
                  delete this.severity_list[tmp_data_item.severity];
                  if (tmp_data_item.severity == this.min_severity)
                    min_sev_ch = true;
                }
              }
              if (!data_item.state && data_item.details.severity > 0) {
                if (this.severity_list[data_item.details.severity])
                  this.severity_list[data_item.details.severity]++;
                else
                  this.severity_list[data_item.details.severity] = 1;

                if (!min_sev_ch && this.min_severity > data_item.details.severity)
                  this.min_severity = data_item.details.severity;
              }
            }
            data_src.splice(index, 1);
          }
          data_src.unshift(row);
          if (!alarmack)
            bells.push(path + " --> " + row.text + " --> " + row.severity);
        }
      }
      if (min_sev_ch) {
        this.min_severity = 500;
        for (let sev in this.severity_list) {
          let sever = parseInt(sev);
          if (this.min_severity > sever)
            this.min_severity = sever;
        }
      }
      this.topAlarm.emit({ alarms: this.alarm_list.slice(0, 5), sound: this.min_severity > 255 ? -1 : this.min_severity, bells: bells });
    });
    this._hubConnection.on('initialValues', (data: any) => {
      this.startMessageTimeoutCheck();
      this.group_rights = data.roles;
      this.appSerive.setProjectInitialValues({ alarmTemplate: data.alarmTemplate });
      this.initilizeAlarms(data.alarms, data.alarmTemplate);
    });
    this._hubConnection.on('initAlarms', (data: any) => {
      this.startMessageTimeoutCheck();
      let alarmTemplate = this.appSerive.getAlarmSettings();
      if (alarmTemplate)
        this.initilizeAlarms(data, alarmTemplate);
    });
    this._hubConnection.on('commandReply', (data: any) => {
      this.startMessageTimeoutCheck();
      this.commandReply.emit(data);
    });
    // this._hubConnection.on('updateLS', (data: LoadSheddingItem) => {
    //   this.startMessageTimeoutCheck();
    //   this.updateLS.emit(data);
    // });

    this._hubConnection.onclose((error) => {
      this.connectionIsEstablished = false;
      console.log(new Date(), 'Hub disconnected message from onclose', error.message);
      this.connectionStatus.emit(false);
      this.connectionRetryCount = 0;
      this.stopMessageTimeoutCheck();
    });
    this._hubConnection.on('UpdateMappingChangesCount', (count: any) => {
      this.startMessageTimeoutCheck();
      this.MappingChangesCount.next(count)
    });
    this._hubConnection.on('UpdateBaygroup', (path: any) => {
      this.startMessageTimeoutCheck();
      this.UpdateBaygroup.next(path)
    });

    this._hubConnection.on('DamageBayLockChanged', (payload: { bayPath: string; locked: boolean }) => {
      this.startMessageTimeoutCheck();
      if (payload?.bayPath != null) {
        this.damageBayLockChangedSubject.next(payload);
      }
    });

  }
  initilizeAlarms(alarms, alarmTemplate) {
    this.severity_list = {};
    this.min_severity = 500;
    this.alarm_list = alarms.reduce((acc, data_item) => {
      let severity: any = data_item.details?.severity ?? "----";
      let text: string = data_item.details?.text ?? "----";
      let path = data_item.path.join('/');
      let right = Object.keys(this.group_rights).find(right => path.startsWith(right));
      if (right) {
        acc.push({ style: this.getRowStyle(alarmTemplate, severity, data_item.state), id: data_item.id, state: data_item.state ? 'spellcheck' : 'notifications', acknowledge: { disabled: this.group_rights[right] < 1 || data_item.state }, delete: { disabled: this.group_rights[right] < 1 || !data_item.state }, datetime: data_item.datetime, entry: data_item.entry, text: text, severity: severity, path: data_item.path });
        if (!data_item.state && severity > 0) {
          if (this.severity_list[severity])
            this.severity_list[severity]++;
          else
            this.severity_list[severity] = 1;
          if (this.min_severity > severity)
            this.min_severity = severity;
        }
      }
      return acc;
    }, []).sort((x, y) => {
      if (x.datetime < y.datetime)
        return 1;
      if (x.datetime > y.datetime)
        return -1;
      if (x.entry < y.entry)
        return 1;
      if (x.entry > y.entry)
        return -1;
      if (x.id < y.id)
        return 1;
      return -1;
    });
    this.topAlarm.emit({ alarms: this.alarm_list.slice(0, 5), sound: this.min_severity > 255 ? -1 : this.min_severity, bells: [] });
  }
  UpdateOperationalDataSettings(path: number[], view: string, settings: any, generalSetting: any): Promise<any> {
    return this._hubConnection.invoke<string>('UpdateOperationalDataSettings', view, path, settings, generalSetting).then(data => { return data; }).catch(data => { return 'hub' });
  }
  UpdateGroupOperationalDataSettings(path: number[], view: string, settings: any, generalSetting: any): Promise<any> {
    return this._hubConnection.invoke<string>('UpdateGroupOperationalDataSettings', view, path, settings, generalSetting).then(data => { return data; }).catch(data => { return 'hub' });
  }
  UpdateLogStartupObjSettings(path: number[], view: string, settings: any): Promise<any> {
    return this._hubConnection.invoke<string>('UpdateLogStartupObjSettings', view, path, settings).then(data => { return data; }).catch(data => { return 'hub' });
  }

  UpdateReportSettings(path: number[], view: string, settings: any, generalSetting: any): Promise<any> {

    return this._hubConnection.invoke<string>('updateReportSettings', view, path, settings, generalSetting).then(data => { return data; }).catch(data => { return 'hub' });
  }
  UpdateMapSettings(path: number[], view: string, settings: any): Promise<any> {
    return this._hubConnection.invoke<string>('updateMapSettings', view, path, settings).then(data => { return data; }).catch(data => { return 'hub' });
  }
  UpdateDashboardTimeSettings(timesetting: any): Promise<string> {
    this.updateTimeReso.emit(true);
    return this._hubConnection.invoke<string>('updateDashboardTimeSettings', timesetting).then(data => { return data; }).catch(data => { return 'hub' });
  }
  UpdateMaintenanceDashboardTimeSettings(timesetting: any): Promise<string> {
    return this._hubConnection.invoke<string>('updateMaintenanceDashboardTimeSettings', timesetting).then(data => { return data; }).catch(data => { return 'hub' });
  }
  UpdateScheduleDashboardTimeSettings(timesetting: any): Promise<string> {
    return this._hubConnection.invoke<string>('updateScheduleDashboardTimeSettings', timesetting).then(data => { return data; }).catch(data => { return 'hub' });
  }
  UpdateCCDashboardTimeSettings(timesetting: any): Promise<string> {
    return this._hubConnection.invoke<string>('updateCCDashboardTimeSettings', timesetting).then(data => { return data; }).catch(data => { return 'hub' });
  }
  SaveDashboardTimeSettings(view: string) {
    return this._hubConnection.invoke<string>('saveDashboardTimeSettings', view).then(data => { return data; }).catch(data => { return 'hub' });
  }
  getHMIPop(data_selection: string): Promise<any> {
    return this._hubConnection.invoke<any>('getHMIPop', data_selection).then(data => { return data; }).catch(data => { return { code: 'hub' }; });
  }
  JoinCoreConsoleGroup(logtypes: any): Promise<any> {
    this._hubConnection.on("CoreConsoleMessages", (data: string) => {
      this.startMessageTimeoutCheck();
      this.CoreConsoleMessages.next(data);
    });
    return this._hubConnection.invoke<any>('JoinCoreConsoleGroup', 'CoreLogs', logtypes)
      .catch(error => {
        console.error('SignalR invoke error:', error);
      });
  }
  LeaveCoreConsoleGroup(logtypes: any): Promise<void> {
    this._hubConnection.off("CoreConsoleMessages");
    return this._hubConnection.invoke('LeaveCoreConsoleGroup', 'CoreLogs', logtypes)
      .catch(error => {
        console.error('SignalR invoke error:', error);
      });
  }

  //saveProjectSettings(settings: any): Promise<string> {
  //  return this._hubConnection.invoke<string>('saveProjectSettings', settings).then(data => { return data; }).catch(data => { return 'hub' });
  //}
  //getAlarmSettings(route: ActivatedRouteSnapshot): any {
  //  return route.root.firstChild.firstChild.data.viewData.alarmTemplate;
  //}
  //setAlarmSettings(settings: any): Promise<string> {
  //  return this._hubConnection.invoke<string>('setAlarmSettings', settings).then(data => { return data; }).catch(data => { return 'hub' });
  //}
  setCurentShiftSummary(stime: number, etime: number) {
    return this._hubConnection.invoke<string>('setCurentShiftSummary', stime, etime).then(data => { return data; }).catch(data => { return 'hub' });
  }
  GetObjectListForAlarm(path: string) {
    return this._hubConnection.invoke<any>('GetObjectListForAlarm', path).then(data => { return data; }).catch(data => { return 'hub' });
  }
  GetObjectList(path: string) {
    return this._hubConnection.invoke<any>('GetObjectList', path).then(data => { return data; }).catch(data => { return 'hub' });
  }
  GetConfigVersionDetails() {
    return this._hubConnection.invoke<any>('getConfigVersionDetails').then(data => { return data; }).catch(data => { return 'hub' });
  }
  AllLoadStatusView() {
    return this._hubConnection.invoke<any>('AllLoadStatusView').then(data => { return data; }).catch(data => { return 'hub' });
  }

  getLiveTrendPopUpData(objectDetails) {
    return this._hubConnection.invoke<any>('getLiveTrendPopUpData', objectDetails).then(data => { return data; }).catch(data => { return 'hub' });
  }

  GetCBLastDetails(id: number, time: number) {
    return this._hubConnection.invoke<any>('GetCBLastDetails', id, time).then(data => { return data; }).catch(data => { return 'hub' });
  }

  GetObjectsByTimestamp(path: string, time: number) {
    return this._hubConnection.invoke<any>('GetObjectsByTimestamp', path, time).then(data => { return data; }).catch(data => { return 'hub' });
  }

  /*StopConnection(): void {
    if (this._hubConnection) {
      this._hubConnection.off("ReceiveMessage");
    }

  disconnectSignalR(): void {
    let abc: any = this._hubConnection;
    abc.connection.transport.stop();
  }*/

  UpdateBayOrdering(view_id: string, bay_list: string[]) {
    return this._hubConnection.invoke<any>('UpdateBayOrdering', view_id, bay_list);
  }

  UpdateDeviceInfoView(view_id: string, device_path: string) {
    return this._hubConnection.invoke<any>('UpdateDeviceInfoView', view_id, device_path);
  }
  updateReportPathFilter(path: string) {
    return this._hubConnection.invoke<any>('updateReportPathFilter', path);
  }

  updateFaultPathFilter(path: string) {
    return this._hubConnection.invoke<any>('updateFaultPathFilter', path);
  }
  SaveStateOfSldSetChanges(current_view_id: string, roster_view_id: string) {
    return this._hubConnection.invoke<any>('SaveStateOfSldSetChanges', current_view_id, roster_view_id).then(data => { return data; }).catch(data => { return 'hub'; });
  }

  GetObjectDeviceNameByID(object_ids: number[]) {
    return this._hubConnection.invoke<any>('GetObjectDeviceNameByID', object_ids).then(data => { return data; }).catch(data => { return 'hub'; });
  }



  //StopConnectionForLogout(): void {
  // this.connectionIsEstablished = false;
  /*this.connectionStatus.emit(false);*/
  /*this.connectionRetryCount = this.MAX_RETRY_ATTEMPTS + 1;
  this._hubConnection.stop();*/
  //}
}
