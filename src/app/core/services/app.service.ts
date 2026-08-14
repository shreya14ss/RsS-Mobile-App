import { Injectable, Inject, EventEmitter, LOCALE_ID, Injector } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { catchError, map, switchMap } from 'rxjs/operators';
import { throwError, Observable, BehaviorSubject, of, forkJoin } from 'rxjs';
import { Router, ActivatedRouteSnapshot } from '@angular/router';
import { ModalController } from '@ionic/angular';
//import { SignalRService } from './project/signal-r.service';
/*import { GroupAccessRight, ProjectViewData } from './project/project-resolver.service';*/
import { environment } from '../../../environments/environment';
import { DOCUMENT } from '@angular/common';
import { MaintenanceService } from './maintenance.service';
import { StorageService } from './storage.service';
import { PushNotificationService } from './push-notification.service';

export interface AppVersionDetails {
  product: string;
  title: string;
  copyRight: string;
  versionInformation: string;
}

export interface ShapeCategories {
  [category: string]: ShapeItem[];
}

export interface templateData {
  shapes: string[];
}

export interface svgItem {
  name: string;
  svgContent: string;
  fileName: string;
}

export interface ShapeItem {
  name: string;
  svgPath: string;
}

export interface Notice {
  _id: string;
  _rev: string;
  sender: UserInfo;
  receivingUsers: UserInfo[];
  receivingGroups: string[];
  messageText: string;
  uniqueCode?: string;
  timestamp: number;
  isUrgent: boolean;
  readBy: string[];
  isNotification: boolean;
  isActionable?: boolean;
  actionType?: string;
  actionMetadata?: {
    maintenance_id?: string;
    target_view?: string;
    target_tab?: string;
    route_params?: any;
    expectedCompletionStatus?: string | string[];
    currentStatus?: string;
    [key: string]: any;
  };
  actionButtonText?: string;
}
interface UserInfo {
  id: string;
  name: string;
  loginId: string;
}


@Injectable({
  providedIn: 'root'
})

export class AppService {
  public popupOpen: any = null;
  public InProgress: boolean = true;
  public httpHeaders: any;
  public soundControl: boolean = true;
  public tempsoundControl: boolean = true;
  elem: any;
  public saved_tab: Window = null;
  private bound_saved: any;
  private _showUrgentDlg = new BehaviorSubject<{
    show: boolean,
    type: 'actionable' | 'non-actionable'
  }>({ show: false, type: 'non-actionable' });

  showUrgentDlg$ = this._showUrgentDlg.asObservable(); private environmentVariables = new Map<string, unknown>();
  private environmentInitialized = false;
  private environmentInitPromise: Promise<void> | null = null;
  private environmentReady = new BehaviorSubject<boolean>(false);
  public environmentReady$ = this.environmentReady.asObservable();
  public basicShapes: ShapeCategories = {};
  public templateShapes: svgItem[] = [];
  private shapesLoaded = new BehaviorSubject<boolean>(false);
  public shapesLoaded$ = this.shapesLoaded.asObservable();
  viewData: any;
  constructor(private http: HttpClient,
    private router: Router,
    private storageService: StorageService,
    //private signalRService: SignalRService,
    @Inject(DOCUMENT) private document: any,
    @Inject(LOCALE_ID) protected localeIconId: string,
    private injector: Injector) {
    this.UpdateLogout();
    this.soundControl = (localStorage.getItem("rssSoundControl") || 't') != 'f';
    this.tempsoundControl = (sessionStorage.getItem("tempsoundControl") || 't') != 'f';
    this.TokenInit();
    this.elem = document.documentElement;
    //this.loadBasicShapes();
    //this.loadTemplateShapes();
  }

  public loadTemplateShapes(): void {
    this.http.get<templateData>('assets/hvg-template/hvg-template.json')
      .pipe(
        catchError(error => {
          console.error('Failed to load shapes list:', error);
          return of({ shapes: [] } as templateData);
        }),
        switchMap((shapeData: templateData) => {
          const svgRequests = shapeData.shapes.map(fileName =>
            this.http.get(`assets/hvg-template/shapes/${fileName}`, { responseType: 'text' })
              .pipe(
                map(svgContent => ({
                  name: fileName.replace('.svg', '').replace(/[-_]/g, ' '),
                  svgContent: svgContent,
                  fileName: fileName
                } as svgItem)),
                catchError(error => {
                  console.error(`Failed to load SVG: ${fileName}`, error);
                  return of({
                    name: fileName.replace('.svg', ''),
                    svgContent: '<svg><text x="10" y="20">Error</text></svg>',
                    fileName: fileName
                  } as svgItem);
                })
              )
          );
          return forkJoin(svgRequests);
        })
      )
      .subscribe({
        next: (shapes: svgItem[]) => {
          this.templateShapes = shapes;
          this.shapesLoaded.next(true);
          console.log('All SVG shapes loaded successfully:', shapes.length, shapes);
        },
        error: (error) => {
          console.error('Error loading shapes:', error);
          this.templateShapes = [];
          this.shapesLoaded.next(true);
        }
      });
  }

  public loadBasicShapes(): void {
    this.http.get<ShapeCategories>('assets/hvg-template/basic-shapes.json')
      .pipe(
        catchError(error => {
          console.error('Failed to load basic shapes:', error);
          // Return empty object instead of void
          return of({} as ShapeCategories);
        })
      )
      .subscribe(
        (shapes: ShapeCategories) => {
          this.basicShapes = shapes;
          console.log('Basic shapes loaded successfully:', shapes);
        },
        (error) => {
          console.error('Error loading basic shapes:', error);
          this.basicShapes = {};
        }
      );
  }

  getShapesByCategory(category: string): ShapeItem[] {
    return this.basicShapes[category] || [];
  }

  getAllTemplateShapes(): svgItem[] {
    return this.templateShapes;
  }

  getAllShapes(): ShapeItem[] {
    return Object.values(this.basicShapes).flat();
  }

  getCategories(): string[] {
    return Object.keys(this.basicShapes);
  }

  areShapesLoaded(): boolean {
    return Object.keys(this.basicShapes).length > 0;
  }

  areTemplatesLoaded(): boolean {
    return this.templateShapes.length > 0;
  }

  async waitForEnvironment(): Promise<void> {
    if (this.environmentInitialized) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      const subscription = this.environmentReady$.subscribe((ready) => {
        if (ready) {
          subscription.unsubscribe();
          resolve();
        }
      });
    });
  }

  setAllEnvironmentVariables(values: Record<string, unknown>): void {
    this.environmentVariables.clear();
    for (const [key, value] of Object.entries(values)) {
      this.environmentVariables.set(key, value);
    }
  }

  getEnvironmentValue<T = unknown>(key: string): T | undefined {
    return this.environmentVariables.get(key) as T | undefined;
  }
  // showUrgentDlg$ = this._showUrgentDlg.asObservable();
  private _pendingTapNotice: Notice | null = null;
  getPendingTapNotice(): Notice | null { return this._pendingTapNotice; }
  clearPendingTapNotice(): void { this._pendingTapNotice = null; }

  urgentDlgShow(type: 'actionable' | 'non-actionable' = 'non-actionable', notice?: Notice) {
    if (notice) this._pendingTapNotice = notice;
    this._showUrgentDlg.next({ show: true, type });
  }

  private _cachedNotices: Notice[] = [];
  get cachedNotices(): Notice[] { return this._cachedNotices; }
  setCachedNotices(notices: Notice[]): void { this._cachedNotices = notices; }
  addCachedNotice(notice: Notice): void {
    if (!this._cachedNotices.some(n => n._id === notice._id))
      this._cachedNotices.unshift(notice);
  }
  removeCachedNotice(noticeId: string): void {
    this._cachedNotices = this._cachedNotices.filter(n => n._id !== noticeId);
  }
  removeCachedNoticesByMaintenanceId(maintenanceId: string): void {
    this._cachedNotices = this._cachedNotices.filter(
      n => n.actionMetadata?.maintenance_id !== maintenanceId
    );
  }

  urgentDlgHide() {
    this._showUrgentDlg.next({
      show: false,
      type: this._showUrgentDlg.value.type
    });
  }

  private closesavedTab() {
    this.saved_tab.removeEventListener("beforeunload", this.bound_saved);
    this.saved_tab = null;
  }
  setSavedTab(tab: Window) {
    if (this.saved_tab)
      this.closesavedTab();
    if (tab) {
      this.bound_saved = this.closesavedTab.bind(this);
      this.saved_tab = tab;
      this.saved_tab.addEventListener("beforeunload", this.bound_saved);
    }
  }
  // isLoggedIn(): boolean {
  //   return (sessionStorage.getItem("access_token") != null);
  // }

  async isLoggedIn(): Promise<boolean> {
    const token = await this.storageService.getToken();
    return token != null;
  }

  UpdateToken(token: string, user_name: string, login_id: string) {
    sessionStorage.setItem("access_token", token);
    sessionStorage.setItem("user_name", user_name);
    sessionStorage.setItem("login_id", login_id);
    console.log("TOKEN SAVED:", token);
    this.TokenInit();
    this.injector.get(PushNotificationService).init().catch(e => console.error('[FCM] init failed', e));
  }
  getUserName(): string {
    return sessionStorage.getItem("user_name");
  }
  getLoginID(): string {
    return sessionStorage.getItem("login_id");
  }
  UpdateLogout() {
    sessionStorage.clear();
    // Also clear the native persistent store (Capacitor Preferences) — the
    // JwtInterceptor reads the token via StorageService.getToken() which
    // consults Preferences first. Leaving it populated would leak the
    // invalidated token into the next request and loop 401s forever.
    this.storageService.clear().catch(e => console.error('[Storage] clear failed', e));
    // Dismiss any open Ionic modals — router.navigateByUrl('/login') changes
    // the underlying route, but modals overlay the router-outlet and stay
    // visible until explicitly dismissed. Without this the user would keep
    // seeing the cached dialog and think they're still logged in.
    this.dismissAllModals().catch(e => console.error('[Modal] dismiss on logout failed', e));
    // Wipe in-memory maintenance-dashboard state so a saved tab from the
    // previous session doesn't leak into the next login on this device.
    this.pendingMaintenanceTab = null;
    this.pendingMaintenanceId = null;
    this.currentMaintenanceTab = '';
    this.TokenInit();
  }

  private async dismissAllModals(): Promise<void> {
    const modalCtrl = this.injector.get(ModalController, null);
    if (!modalCtrl) return;
    // getTop() returns the top-most open modal, or undefined when none remain.
    // Loop so nested modals also close.
    let top = await modalCtrl.getTop();
    let safety = 10;
    while (top && safety-- > 0) {
      // Race dismiss() against a timeout. On real devices resuming from Doze
      // the modal's animation runtime can be dead — dismiss() then never
      // resolves and we'd hang forever. If the timeout wins, tear the
      // element out of the DOM directly so the user isn't trapped.
      const el = top;
      const dismissed = await Promise.race([
        el.dismiss().then(() => true).catch(() => false),
        new Promise<boolean>(r => setTimeout(() => r(false), 800))
      ]);
      if (!dismissed) {
        try { el.remove(); } catch { /* already detached */ }
      }
      top = await modalCtrl.getTop();
    }
  }

  // Public wrapper called from platform.resume in AppComponent. Same behaviour
  // as the logout path — close any stuck modal so the user isn't trapped by
  // a modal whose event bindings broke during the WebView suspend/resume cycle.
  async dismissAllModalsOnResume(): Promise<void> {
    return this.dismissAllModals();
  }
  GetProjectID(): string {
    let mod = this.GetLoginModeDetails();
    if (mod.mode != 'P')
      return null;
    return mod.project_id;
  }
  GetImagePathById(project_id: string): string {
    return environment.baseURL + '/api/ProjectView/Image/' + project_id + "/";
  }
  GetImagePath(): string {
    let mod = this.GetLoginModeDetails();
    if (mod.mode != 'P')
      return null;
    return this.GetImagePathById(mod.project_id);
  }
  GetSoundPath(): string {
    let mod = this.GetLoginModeDetails();
    if (mod.mode != 'P')
      return null;
    return environment.baseURL + '/api/ProjectView/Sound/' + mod.project_id + "/";
  }

  SendUpdatedEnvironment(updatedEnvironment: any): Promise<string> {
    return (this.http.post<string>(environment.baseURL + '/api/ProjectView/updateProjectForEnvironment', updatedEnvironment, { headers: this.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => {
        return data;
      }).catch(data => { return data; }));
  }

  GetEnvironment(projectId: string): Promise<Record<string, any>> {
    return this.http.get<Record<string, any>>(`${environment.baseURL}/api/ProjectView/GetEnvironmentVariables/`, {
      params: { projectId },
      headers: this.httpHeaders
    })
      .pipe(
        catchError(this.handleLoggedInError)
      )
      .toPromise();
  }
  SendMessagePath(msg: any): Promise<string> {
    return (this.http.post<string>(environment.baseURL + '/api/ProjectView/sendmessage', msg, { headers: this.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => {
        return data;
      }).catch(data => { return data; }));
  }

  UpdateReadMessages(msg: any): Promise<any> {
    return (this.http.put<any>(environment.baseURL + '/api/ProjectView/updateReadMessage/', msg, { headers: this.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }

  GetUnreadMessagePath(): Promise<string> {
    return (this.http.get<string>(environment.baseURL + '/api/ProjectView/GetAllUnreadMessages/', { headers: this.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => {
        return data;
      }).catch(data => { return data; }));
  }

  GetAllUnreadNotices(groupPath: string): Promise<string> {
    return (this.http.get<string>(environment.baseURL + '/api/ProjectView/GetAllUnreadNotices/', { params: { groupPath }, headers: this.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => {
        return data;
      }).catch(data => { return data; }));
  }

  getUnreadNoticeCount(groupPath: string): Promise<number> {
    return this.http
      .get<{ count?: number; code?: string }>(environment.baseURL + '/api/ProjectView/GetUnreadNoticeCount/', {
        params: { groupPath },
        headers: this.httpHeaders
      })
      .pipe(catchError(this.handleLoggedInError))
      .toPromise()
      .then((data) => (data && typeof data.count === 'number' ? data.count : 0))
      .catch(() => 0);
  }

  DeleteActionableNoticesByMtc(maintenance_id: string): Promise<{ deletedCount?: number; code?: string }> {
    if (!maintenance_id) {
      return Promise.resolve({ code: 'invalid' });
    }

    return this.http.delete<{ deletedCount?: number; code?: string }>(
      `${environment.baseURL}/api/ProjectView/DeleteActionableNoticesByMtc/${maintenance_id}`,
      { headers: this.httpHeaders }
    )
      .pipe(catchError(this.handleLoggedInError))
      .toPromise()
      .then(data => {
        return data || { code: 'unknown' };
      })
      .catch(error => {
        console.error('Error deleting actionable notices:', error);
        return { code: 'api' };
      });
  }

  GetAllNotices(page: Number, limit: Number): Promise<any> {
    return (this.http.get<any>(environment.baseURL + '/api/ProjectView/GetAllmessages/' + page + '/' + limit, { headers: this.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }

  GetMessagesWithPathAndIdPath(): string {
    return environment.baseURL + '/api/projectview/GetMessageWithPathAndId/'
  }

  /*GetMessagesWithPathAndIdPath(view_id: string): Promise<any> {
    return (this.http.get<any>(environment.baseURL + '/api/ProjectView/GetMessageWithPathAndId/' + view_id, { headers: this.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }*/

  NewGetMessagesWithPathAndIdPath(): string {
    return environment.baseURL + '/api/projectview/NewGetMessageWithPathAndId/'
  }


  GetMyNotices(userId: string, userPath: string, page: Number, limit: Number): Promise<any> {
    return (this.http.get<any>(environment.baseURL + '/api/ProjectView/GetAllMessagesMyNotices/' + userId + '/' + `${encodeURIComponent(userPath)}` + '/' + page + '/' + limit, { headers: this.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }

  /*GetUserIdsFromProjectId(): string {
    return environment.baseURL + '/api/projectusers/userIds/'
  }*/

  GetUserIdsFromProjectId(projectId: string): Promise<any> {
    return (this.http.get<any>(environment.baseURL + '/api/projectusers/userIds/' + projectId, { headers: this.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }

  GetUserIdsFromRight(right: string, path: string): Promise<any> {
    return (this.http.get<any>(environment.baseURL + '/api/ProjectView/GetUserIdsFromRight', { headers: this.httpHeaders, params: { right, path } })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }

  GetLoginModeDetails(): { mode: string, project_id: string } {
    let ret_mode = sessionStorage.getItem("mode") || '';
    let ret_project_id = "";
    if (ret_mode.charAt(0) == 'P') {
      ret_project_id = ret_mode.slice(1);
      ret_mode = ret_mode.charAt(0);
    }
    return {
      mode: ret_mode, project_id: ret_project_id
    }
  }
  loginModeChanged = new EventEmitter<any>();
  async SetLoginMode(mode: string, project_id: string, password: string): Promise<void> {
    //await this.signalRService.destroy();
    this.loginModeChanged.emit({ mode, project_id, password });
    if (mode.charAt(0) == 'P') {
      mode = mode + project_id;
      sessionStorage.removeItem("ProjectConfig");
    }
    let response = await this.http.post(environment.baseURL + '/api/Users/Setmode', null, { headers: this.httpHeaders, params: { password, 'url_type': mode } }).pipe(catchError(this.handleLoggedInError)).toPromise();
    if (response == null || response["code"] == null || response["code"] == undefined || response["code"] == '') {
      sessionStorage.setItem("mode", mode);
    }
    else
      return throwError(response["code"]).toPromise();
  }
  checkSwitchAccess(): string {
    let roles = (sessionStorage.getItem("roles") || '').split(';');
    if (roles.length == 0 || (roles.length == 1 && roles[0].charAt(0) == 'P'))
      return '';
    for (let role of roles) {
      if (role.charAt(0) == 'P')
        return 'P';
      else if (role.charAt(1) == 'A')
        return 'B';
    }
    return 'P';
  }
  checkConfiguratorAccess(): boolean {
    let roles = (sessionStorage.getItem("roles") || '').split(';');
    for (let role of roles) {
      if (role.charAt(0) == 'P')
        return false;
      else if (role.charAt(1) == 'A')
        return true;
    }
    return false;
  }
  checkMultiTenantAdmin(): string[] | boolean {
    let roles = (sessionStorage.getItem("roles") || '').split(';');
    if (roles.length == 0)
      return false;
    if (roles.length == 1 && roles[0].charAt(0) == 'S')
      return roles[0].charAt(1) == 'A';
    var tid: string[] = [];
    for (let role of roles) {
      if (role.charAt(0) == 'P')
        break;
      else if (role.charAt(1) == 'A')
        tid.push(role.slice(2));
    }
    if (tid.length == 0)
      return false;
    return tid;
  }
  checkTenantAdmin(tenant_id: string): boolean {
    let roles = (sessionStorage.getItem("roles") || '').split(';');
    if (roles.length == 0)
      return false;
    if (roles.length == 1 && roles[0].charAt(0) == 'S')
      return roles[0].charAt(1) == 'A';
    for (let role of roles) {
      if (role.charAt(0) == 'P')
        break;
      if (tenant_id == role.slice(2))
        return role.charAt(1) == 'A';
    }
    return false;
  }

  filterProjects(tenant_id, projectData, is_admin) {
    let roles = (sessionStorage.getItem("roles") || '').split(';');
    if (roles.length == 0)
      return [];
    else if (roles[0].charAt(0) == 'S') {
      if (!is_admin || roles[0].charAt(1) == 'A') {
        return projectData;
      }
      else
        return [];
    }
    else {
      for (let role of roles) {
        if (role.charAt(0) == 'P') {
          break;
        }
        else {
          if (tenant_id == role.slice(2)) {
            if (!is_admin || role.charAt(1) == 'A') {
              return projectData;
            }
            else
              return [];
          }

        }
      }
      let ret = [];
      for (let project of projectData) {
        for (let role of roles) {
          if (!is_admin || role.charAt(1) == 'A') {
            if (role.charAt(0) == 'P') {
              if (project._id == role.slice(2).split(',')[1]) {
                ret.push(project);
                break;
              }
            }
          }
        }
      }
      return ret;
    }
  }
  filterTenants(tenantData, is_admin) {
    let roles = (sessionStorage.getItem("roles") || '').split(';');
    if (roles.length == 0)
      return [];
    else if (roles[0].charAt(0) == 'S') {
      if (!is_admin || roles[0].charAt(1) == 'A')
        return tenantData;
      else
        return [];
    }
    else {
      let ret = [];
      for (let tenant of tenantData) {
        for (let role of roles) {
          if (!is_admin || role.charAt(1) == 'A') {
            if (role.charAt(0) == 'P') {
              if (tenant._id == role.slice(2).split(',')[0]) {
                ret.push(tenant);
                break;
              }
            }
            else {
              if (tenant._id == role.slice(2)) {
                ret.push(tenant);
                break;
              }
            }
          }
        }
      }
      return ret;
    }
  }
  private TokenInit() {
    let token = sessionStorage.getItem("access_token") == null ? '' : sessionStorage.getItem("access_token");
    console.log("TOKEN INIT CALLED:", token);
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
  async LogoutUser() {
    if (sessionStorage.getItem("access_token") != null) {
      await this.injector.get(PushNotificationService).unregister().catch(e => console.error('[FCM] unregister failed', e));
      this.loginModeChanged.emit(null);
      try {
        await this.http.post(environment.baseURL + '/api/Users/LogOut', null, { headers: this.httpHeaders }).toPromise();
      }
      catch (error) { }
      this.UpdateLogout();
    }
  }

  // Called on app resume to detect force-logouts that happened while the app was
  // backgrounded. SignalR's ForceLogout event is lost when the WebView is suspended,
  // so we ask the server directly whether our token still maps to an active session.
  // A 401 flows through handleLoggedInError → UpdateLogout + navigate to /login.
  async validateSession(): Promise<void> {
    if (!sessionStorage.getItem("access_token")) return;
    await this.http.get(environment.baseURL + '/api/Users/Ping', { headers: this.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise();
  }
  async LoginUser(login: string, password: string, url_type: string): Promise<string> {
    try {
      let response = await this.http.post(environment.baseURL + '/api/Users/Login', null, { headers: this.httpHeaders, params: { 'login': login.trim(), 'password': password, 'url_type': url_type } }).toPromise();
      if (response["code"] == null || response["code"] == undefined || response["code"] == '') {
        this.UpdateToken(response["token"], response["userName"], login);
        let mode = response["mode"];
        sessionStorage.setItem("mode", mode);
        if (mode != '' && mode.charAt(0) == 'P')
          sessionStorage.removeItem("ProjectConfig");
        let roles = response["roles"];
        sessionStorage.setItem("roles", roles.join(';'));
        return "";
      }
      else
        return response["code"];
    }
    catch (error) {
      return "api";
    }
  }
  async ForceLoginUser(login: string, password: string, url_type: string): Promise<string> {
    try {
      let response = await this.http.post(environment.baseURL + '/api/Users/ForceLogin', null, { headers: this.httpHeaders, params: { 'login': login, 'password': password, 'url_type': url_type } }).toPromise();
      if (response["code"] == null || response["code"] == undefined || response["code"] == '') {
        this.UpdateToken(response["token"], response["userName"], login);
        let mode = response["mode"];
        sessionStorage.setItem("mode", mode);
        if (mode != '' && mode.charAt(0) == 'P')
          sessionStorage.removeItem("ProjectConfig");
        let roles = response["roles"];
        sessionStorage.setItem("roles", roles.join(';'));
        return "";
      }
      else
        return response["code"];
    }
    catch (error) {
      return "api";
    }
  }
  async GetProjectsList(tenant_id: string): Promise<any[]> {
    return (await this.http.get<any[]>(environment.baseURL + '/api/Projects/TenantsProject/' + tenant_id, { headers: this.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise());
  }
  async GetTenantsList(): Promise<any[]> {
    return await this.http.get<any[]>(environment.baseURL + '/api/Tenants', { headers: this.httpHeaders }).pipe(catchError(this.handleLoggedInError)).toPromise();
  }
  GetCurrentProjectConfig(): any {
    return JSON.parse(sessionStorage.getItem('ProjectConfig'));
  }
  async GetProjectConfig(id: string): Promise<any> {
    try {
      let cfg: any = JSON.parse(sessionStorage.getItem('ProjectConfig'));
      if (cfg == null || cfg.id != id) {
        cfg = await this.http.get(environment.baseURL + '/api/Projects/' + id + '/Config', { headers: this.httpHeaders }).toPromise();
        let settings = cfg.settings;
        settings.id = cfg._id;
        settings.rev = cfg._rev;
        sessionStorage.setItem('ProjectConfig', JSON.stringify(settings));
        cfg = settings;
      }
      return cfg;
    }
    catch (error) {
      return null;
    }

  }
  getImageList(): Promise<any> {
    return (this.http.get<any>(environment.baseURL + '/api/ProjectView/ImageList/', { headers: this.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }
  AddImage(image: File, file_name: string): Promise<string> {
    const formData: FormData = new FormData();
    let tmp_http_head = new HttpHeaders({
      'enctype': 'multipart/form-data',
      'accept': 'application/json',
      'Authorization': this.httpHeaders.get('Authorization')
    });
    formData.append('file', image, file_name);
    return (this.http.post<string>(environment.baseURL + '/api/ProjectView/Image/', formData, { headers: tmp_http_head })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return data; }));
  }
  UpdateImage(image: File, file_name: string): Promise<string> {
    const formData: FormData = new FormData();
    let tmp_http_head = new HttpHeaders({
      'enctype': 'multipart/form-data',
      'accept': 'application/json',
      'Authorization': this.httpHeaders.get('Authorization')
    });
    formData.append('file', image, file_name);
    return (this.http.put<string>(environment.baseURL + '/api/ProjectView/Image/', formData, { headers: tmp_http_head })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return data; }));
  }
  DeleteImage(name: string): Promise<string> {
    return (this.http.delete(environment.baseURL + '/api/ProjectView/Image/' + name, { headers: this.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => {
        return "";
      }).catch(data => { return data; }));
  }
  SaveSVG(svg_lst: any[], view_id: string, path: number[], preview: boolean): Promise<any> {
    const formData: FormData = new FormData();
    let tmp_http_head = new HttpHeaders({
      'enctype': 'multipart/form-data',
      'accept': 'application/json',
      'Authorization': this.httpHeaders.get('Authorization')
    });
    let len = svg_lst.length;
    for (let cnt = 0; cnt < len; cnt++) {
      if (svg_lst[cnt].file)
        formData.append('files', svg_lst[cnt].file, (svg_lst[cnt].type == 'custom_shape' ? 'cs_' : 'sv_') + svg_lst[cnt].name);
      else
        formData.append('files', new Blob([svg_lst[cnt].str], { type: "image/svg+xml;charset=utf-8" }), (svg_lst[cnt].type == 'custom_shape' ? 'cs_' : 'sv_') + svg_lst[cnt].name);
    }
    let opts: any = { headers: tmp_http_head };
    if (view_id && path)
      opts.params = { view_id: view_id, path: path.reduce((acc, cur) => acc + ',' + cur, '').slice(1), preview: preview ? 'p' : 'n' };
    else if (view_id)
      opts.params = { view_id: view_id, preview: preview ? 'n' : 'u' };
    else
      opts.params = { preview: preview ? 'n' : 'u' };
    return (this.http.post<string>(environment.baseURL + '/api/ProjectView/SVG/', formData, opts)
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }
  saveHMIViewSetting(view_id: string, path: number[], type: string, name: string): Promise<any> {
    return (this.http.post<string>(environment.baseURL + '/api/ProjectView/SVGView/', null, { headers: this.httpHeaders, params: { view_id, path: path.reduce((acc, cur) => acc + ',' + cur, '').slice(1), type, name } })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }
  getSoundList(): Promise<any> {
    return (this.http.get<any>(environment.baseURL + '/api/ProjectView/SoundList/', { headers: this.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }
  GetAllCustomShapes(): Promise<any> {
    return (this.http.get<any>(environment.baseURL + '/api/ProjectView/Allsvgcs/', { headers: this.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }
  GetAllHmiViews(view_id: string): Promise<any> {
    return (this.http.get<any>(environment.baseURL + '/api/ProjectView/Allsvghmiview/' + view_id, { headers: this.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }
  GetCustomShape(id: string, path: string, name: string): Promise<any> {
    return (this.http.get<any>(environment.baseURL + '/api/ProjectView/svgcs/' + encodeURIComponent(name), { headers: this.httpHeaders, params: { id, path } })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }
  GetHMIShape(view_id: string, name: string, id: string, path: string): Promise<any> {
    return (this.http.get<any>(environment.baseURL + '/api/ProjectView/svghmishape/' + view_id + '/' + encodeURIComponent(name), { headers: this.httpHeaders, params: { id, path } })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }
  GetAllAutomaticReports(): Promise<any> {
    return (this.http.get<any>(environment.baseURL + '/api/ProjectView/AllAutomaticReports/', { headers: this.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }
  GetAutomaticReport(id: string): Promise<any> {
    return (this.http.get<any>(environment.baseURL + '/api/ProjectView/AutomaticReport/' + id, { headers: this.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }
  AddAutomaticReportSettings(settings: any, heading: string): Promise<any> {
    return (this.http.post<any>(environment.baseURL + '/api/ProjectView/AutomaticReport', { settings, heading }, { headers: this.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }
  UpdateAutomaticReportSettings(id: string, settings: any, heading: string): Promise<any> {
    return (this.http.put<any>(environment.baseURL + '/api/ProjectView/AutomaticReport/' + id, { settings, heading }, { headers: this.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }
  DeleteAutomaticReportSettings(id: string): Promise<string> {
    return (this.http.delete<any>(environment.baseURL + '/api/ProjectView/AutomaticReport/' + id, { headers: this.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return data; }));
  }

  GetObjectStandardsList(): Promise<any> {
    return (this.http.get<any>(environment.baseURL + '/api/ProjectView/ObjectStandards/', { headers: this.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }
  GetAllGroupStandardNames(): Promise<any> {
    return (this.http.get<any>(environment.baseURL + '/api/ProjectView/GetGroupStandards/', { headers: this.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }
  GetObjectCategoriesList(): Promise<any> {
    return (this.http.get<any>(environment.baseURL + '/api/ProjectView/ObjectCategories/', { headers: this.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }

  GetGroupObjectStandards(): Promise<any> {
    return (this.http.get<any>(environment.baseURL + '/api/ProjectView/GroupObjectStandards/', { headers: this.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }
  GetSoftwareFunctions(): Promise<any> {
    return (this.http.get<any>(environment.baseURL + '/api/ProjectView/GetSoftwareFunctions/', { headers: this.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }
  GetAllMappingChanges(): Promise<any> {
    return (this.http.get<any>(environment.baseURL + '/api/ProjectView/GetAllMappingChanges/', { headers: this.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }

  AddSound(sound: File, file_name: string): Promise<string> {
    const formData: FormData = new FormData();
    let tmp_http_head = new HttpHeaders({
      'enctype': 'multipart/form-data',
      'accept': 'application/json',
      'Authorization': this.httpHeaders.get('Authorization')
    });
    formData.append('file', sound, file_name);
    return (this.http.post<string>(environment.baseURL + '/api/ProjectView/Sound/', formData, { headers: tmp_http_head })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return data; }));
  }
  UpdateSound(sound: File, file_name: string): Promise<string> {
    const formData: FormData = new FormData();
    let tmp_http_head = new HttpHeaders({
      'enctype': 'multipart/form-data',
      'accept': 'application/json',
      'Authorization': this.httpHeaders.get('Authorization')
    });
    formData.append('file', sound, file_name);
    return (this.http.put<string>(environment.baseURL + '/api/ProjectView/Sound/', formData, { headers: tmp_http_head })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return data; }));
  }
  DeleteSound(name: string): Promise<string> {
    return (this.http.delete(environment.baseURL + '/api/ProjectView/Sound/' + name, { headers: this.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => {
        return "";
      }).catch(data => { return data; }));
  }
  private _initial_pro_data: any = null;
  setProjectInitialValues(data: any) {
    this._initial_pro_data = data;
  }
  getAlarmSettings(): any {
    return this._initial_pro_data ? this._initial_pro_data.alarmTemplate : null;
  }
  setAlarmSettings(settings: any): Promise<string> {
    //let tmp_http_head = new HttpHeaders({
    //  'Content-Type': 'application/json',
    //  'accept': 'application/json',
    //  'Authorization': this.httpHeaders.get('Authorization')
    //});
    return (this.http.post<string>(environment.baseURL + '/api/ProjectView/Alarm/', settings, { headers: this.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => {
        if (data != null && data == '')
          this._initial_pro_data.alarmTemplate = settings;
        return data;
      }).catch(data => { return data; }));
  }
  getElementSettings(path: string): any {
    return (this.http.get<any>(environment.baseURL + '/api/ProjectView/ElementTemplate/', { headers: this.httpHeaders, params: { path } })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }
  getEventSettings(path: string): any {
    return (this.http.get<any>(environment.baseURL + '/api/ProjectView/EventTemplate/', { headers: this.httpHeaders, params: { path } })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }
  setElementSettings(settings: any, path: string): Promise<string> {
    return (this.http.post<string>(environment.baseURL + '/api/ProjectView/ElementTemplate/', settings, { headers: this.httpHeaders, params: { path } })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => {
        return data;
      }).catch(data => { return data; }));
  }
  setEventSettings(settings: any, path: string): Promise<string> {
    return (this.http.post<string>(environment.baseURL + '/api/ProjectView/EventTemplate/', settings, { headers: this.httpHeaders, params: { path } })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => {
        return data;
      }).catch(data => { return data; }));
  }
  saveProjectSettings(settings: any): Promise<string> {
    return (this.http.post<string>(environment.baseURL + '/api/ProjectView/ProjectSettings/', settings, { headers: this.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => {
        return data;
      }).catch(data => { return data; }));
  }
  //getProjectViewDetails(id: number, path: string, view: string): Observable<ProjectViewData> {
  //    if (path == null || path == '') {
  //        path = sessionStorage.getItem('ProjectPath');
  //        if (path == null)
  //            path = '';
  //    }
  //    if (view == null || view == '') {
  //        view = sessionStorage.getItem('ProjectView');
  //        if (view == null)
  //            view = '';
  //    }
  //    let cfg: any = JSON.parse(sessionStorage.getItem('ProjectConfig'));
  //    if (cfg == null || cfg.id != id) {
  //        cfg = null;
  //    }
  //    if (path != '')
  //        path = '/' + path;
  //    return this.http.get<ProjectViewData>('/api/Projects/' + id + '/Details' + path, {
  //        headers: this.httpHeaders, params: {
  //            'view': view, 'cfg': (cfg == null) ? 'true' : 'false'
  //        },
  //    }).pipe(map(data => {
  //        if (cfg == null) {
  //            cfg = data.cfg;
  //            cfg.id = id;
  //            sessionStorage.setItem('ProjectConfig', JSON.stringify(cfg));
  //        }
  //        else
  //            data.cfg = cfg;
  //        if (data.group_path != null)
  //            sessionStorage.setItem('ProjectPath', data.group_path.join('/'));
  //        else
  //            sessionStorage.removeItem('ProjectPath');
  //        if (data.view != null)
  //            sessionStorage.setItem('ProjectView', data.view);
  //        else
  //            sessionStorage.removeItem('ProjectView');
  //        return data;
  //    }), catchError(this.handleLoggedInError));
  //}
  getConfigDetails(tid: string, pid: string): Observable<any> {
    let comman_str = '';
    if (tid == null) {
      let roles = (sessionStorage.getItem("roles") || '').split(';');
      if (roles.length == 1 && roles[0].charAt(0) == 'S')
        comman_str = '/api/SuperUsers/ConfigAdmin';
      else
        comman_str = '/api/Tenants';
    }
    else if (pid == null)
      comman_str = '/api/Tenants/ConfigAdmin/' + tid;
    else
      comman_str = '/api/Projects/ConfigAdmin/' + tid + '/' + pid;
    return this.http.get<any>(environment.baseURL + comman_str, { headers: this.httpHeaders }).pipe(map(data => {
      if (comman_str == '/api/Tenants')
        data = {
          tenants: this.filterTenants(data, true)
        };
      else
        data.tenants = this.filterTenants(data.tenants, true);
      return data;
    }), catchError(this.handleLoggedInError));
  }
  getConfigDetailsNonAdmins(id: string, path: string): Promise<any> {
    return this.http.get<any>(environment.baseURL + '/api/ProjectView/ConfigNonAdmin/' + id, { headers: this.httpHeaders, params: { id, path } })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; });
  }
  editUser(apicall: string, data: any, path: string) {
    return this.http.put(environment.baseURL + apicall, data, { headers: this.httpHeaders, params: { path } }).pipe(catchError(this.handleLoggedInError));
  }
  addUser(apicall: string, data: any, path: string) {
    return this.http.post(environment.baseURL + apicall, data, { headers: this.httpHeaders, params: { path } }).pipe(catchError(this.handleLoggedInError));
  }
  deleteUser(apicall: string, user_id: string, rev: string, path: string) {
    return this.http.delete(environment.baseURL + apicall, { headers: this.httpHeaders, params: { 'user_id': user_id, 'rev': rev, 'path': path } }).pipe(catchError(this.handleLoggedInError));
  }
  addTenant(data: any) {
    return this.http.post(environment.baseURL + '/api/Tenants', data, { headers: this.httpHeaders }).pipe(catchError(this.handleLoggedInError));
  }
  editTenant(data: any) {
    return this.http.put(environment.baseURL + '/api/Tenants', data, { headers: this.httpHeaders }).pipe(catchError(this.handleLoggedInError));
  }
  deleteTenant(tenant_id: string, rev: string) {
    return this.http.delete(environment.baseURL + '/api/Tenants', { headers: this.httpHeaders, params: { 'tenant_Id': tenant_id, 'rev': rev } }).pipe(catchError(this.handleLoggedInError));
  }
  addProject(tenant_id: string, data: any) {
    return this.http.post(environment.baseURL + '/api/Projects/' + tenant_id, data, { headers: this.httpHeaders }).pipe(catchError(this.handleLoggedInError));
  }
  copyProjectView(view_id: string, name: string, title: string, interval: number, clonetype: string, path: string, type: string, user_access: string[], view_group: string): Promise<any> { // 
    return (this.http.post<any>(environment.baseURL + '/api/ProjectView/CopyView/' + view_id, user_access, { headers: this.httpHeaders, params: { name, title, interval: interval.toString(), clonetype, path, type, view_group } })
      .pipe(catchError(this.handleLoggedInError)).toPromise());
  }
  addProjectView(projview: any, type: string, path: string, view_Group: string) {
    return this.http.post(environment.baseURL + '/api/ProjectView/View', projview, { headers: this.httpHeaders, params: { type, path, view_Group } }).pipe(catchError(this.handleLoggedInError));
  }
  getViewMainDetails(view_id: string, id: string, path: string): Promise<any> {
    return (this.http.get<any>(environment.baseURL + '/api/ProjectView/GetViewMain/' + view_id, { headers: this.httpHeaders, params: { id, path } })
      .pipe(catchError(this.handleLoggedInError)).toPromise());
  }
  getGroupViewList(group: string): Promise<any> {
    return (this.http.get<any>(environment.baseURL + '/api/ProjectView/GroupView', { headers: this.httpHeaders, params: { group: group } })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }

  editViewMainDetails(view_id: string, id: string, path: string, name: string, title: string, interval: number, type: string, view_icon: string, user_access: string[], old_group: string, view_group: string): Promise<any> {// , view_group_name: string
    return (this.http.put<any>(environment.baseURL + '/api/ProjectView/ViewMain/' + view_id, user_access, { headers: this.httpHeaders, params: { id, path, name, title, interval: interval.toString(), type, view_icon, old_group, view_group } })// , view_group_name
      .pipe(catchError(this.handleLoggedInError)).toPromise());
  }
  deleteView(view_id: string, type: string, path: string) {
    return this.http.delete<string>(environment.baseURL + '/api/ProjectView/View/' + view_id, { headers: this.httpHeaders, params: { type, path } }).pipe(catchError(this.handleLoggedInError));
  }
  editProject(tenant_id: string, data: any) {
    sessionStorage.removeItem('ProjectConfig');
    return this.http.put(environment.baseURL + '/api/Projects/' + tenant_id, data, { headers: this.httpHeaders }).pipe(catchError(this.handleLoggedInError));
  }
  deleteProject(tenant_id: string, project_id: string, rev: string) {
    return this.http.delete(environment.baseURL + '/api/Projects/' + tenant_id, { headers: this.httpHeaders, params: { 'project_Id': project_id, 'rev': rev } }).pipe(catchError(this.handleLoggedInError));
  }

  private handleLoggedInError = (error: HttpErrorResponse) => {
    // A 2xx status can still land here if the response body fails to parse
    // (e.g. empty body with responseType: 'json'). That's not a session
    // problem — never log the user out for a successful HTTP status.
    if (error.status >= 200 && error.status < 300) {
      return throwError('api');
    }
    if (error.error instanceof ErrorEvent || error.status == 404) {
      return throwError('api');
    }
    else if (error.status == 404) {
      return throwError('notfound');
    }
    else if (error.status == 400) {
      return throwError('syntax');
    }
    else {
      console.warn('[Session] handleLoggedInError logging out due to', {
        url: error.url,
        status: error.status,
        statusText: error.statusText
      });
      this.UpdateLogout();
      this.router.navigateByUrl('/login', { replaceUrl: true });
      return throwError('session');
    }
  }

  stringToIP(address: string): any {
    let main_vals = address.split(':');
    let ip_vals = main_vals[0].split('.');
    return {
      address: parseInt(ip_vals[3]) * 256 * 256 * 256 + parseInt(ip_vals[2]) * 256 * 256 + parseInt(ip_vals[1]) * 256 + parseInt(ip_vals[0]),
      port: parseInt(main_vals[1])
    };

  }
  stringFromIP(address: number, port: number): string {
    return (address & 255).toString() + '.' + ((address >> 8) & 255).toString() + '.' + ((address >> 16) & 255).toString() + '.' + ((address >> 24) & 255).toString() + ':' + port.toString();
  }

  pad(num: number, size: number): string {
    let s = num + "";
    while (s.length < size) s = "0" + s;
    return s;
  }
  dateFormat(): string {
    let cfg: any = JSON.parse(sessionStorage.getItem('ProjectConfig'));
    if (cfg == null) {
      return null;
    }
    return cfg.time_settings.date_format;
  }
  dateToString(date?: number, type?: number, cfg: any = null): string {
    if (!cfg) {
      cfg = JSON.parse(sessionStorage.getItem('ProjectConfig'));
      if (!cfg) {
        return '';
      }
    }
    if (date == null)
      date = Date.now();

    if (date === 0) {
      return "----";
    }

    date += (cfg.time_settings.offset * 60000);
    let dateVal = new Date(date);
    if (type == null)
      type = cfg.time_settings.start_screen_format;
    if (type == 1)
      return cfg.time_settings.date_format.replace('dd', this.pad(dateVal.getUTCDate(), 2)).replace('mm', this.pad((dateVal.getUTCMonth() + 1), 2)).replace('yyyy', this.pad(dateVal.getUTCFullYear(), 4))
        + ' ' + this.pad(dateVal.getUTCHours(), 2) + ':' + this.pad(dateVal.getUTCMinutes(), 2) + ":" + this.pad(dateVal.getUTCSeconds(), 2);
    else if (type == 0)
      return this.pad(dateVal.getUTCHours(), 2) + ':' + this.pad(dateVal.getUTCMinutes(), 2) + ":" + this.pad(dateVal.getUTCSeconds(), 2);
    else if (type == 3)
      return cfg.time_settings.date_format.replace('dd', this.pad(dateVal.getUTCDate(), 2)).replace('mm', this.pad((dateVal.getUTCMonth() + 1), 2)).replace('yyyy', this.pad(dateVal.getUTCFullYear(), 4))
        + ' ' + this.pad(dateVal.getUTCHours(), 2) + ':' + this.pad(dateVal.getUTCMinutes(), 2);
    else if (type == 2)
      return this.pad(dateVal.getUTCHours(), 2) + ':' + this.pad(dateVal.getUTCMinutes(), 2);
    else if (type == 4)
      return cfg.time_settings.date_format.replace('dd', this.pad(dateVal.getUTCDate(), 2)).replace('mm', this.pad((dateVal.getUTCMonth() + 1), 2)).replace('yyyy', this.pad(dateVal.getUTCFullYear(), 4));
    else if (type == 5)
      return cfg.time_settings.date_format.replace('dd', this.pad(dateVal.getUTCDate(), 2)).replace('mm', this.pad((dateVal.getUTCMonth() + 1), 2)).replace('yyyy', this.pad(dateVal.getUTCFullYear(), 4));
    else if (type == 10)
      return cfg.time_settings.date_format.replace('dd', this.pad(dateVal.getUTCDate(), 2)).replace('mm', this.pad((dateVal.getUTCMonth() + 1), 2)).replace('yyyy', this.pad(dateVal.getUTCFullYear(), 4))
        + ' ' + this.pad(dateVal.getUTCHours(), 2) + ':' + this.pad(dateVal.getUTCMinutes(), 2) + ":" + this.pad(dateVal.getUTCSeconds(), 2) + "." + this.pad(dateVal.getUTCMilliseconds(), 3);
    else if (type == 11)
      return cfg.time_settings.date_format.replace('dd', this.pad(dateVal.getUTCDate(), 2)).replace('mm', this.pad((dateVal.getUTCMonth() + 1), 2)).replace('yyyy', this.pad(dateVal.getUTCFullYear(), 4))
        + ' ' + this.pad(dateVal.getUTCHours(), 2) + ':' + this.pad(dateVal.getUTCMinutes(), 2) + ":" + this.pad(dateVal.getUTCSeconds(), 2);
    return '';
  }
  //loadHmiDetails(path_type: string, name: string): Observable<any>  {
  //    let folder = '';
  //    if (path_type == 'group')
  //        folder = "svg/" + sessionStorage.getItem('ProjectPath');
  //    else
  //        folder = "svg";
  //    return this.http.get('/api/ProjectView/GetSvg/' + this.GetLoginModeDetails().project_id, {
  //        headers: new HttpHeaders({
  //            'Content-Type': 'application/json',
  //            'accept': 'image/svg+xml',
  //            'Authorization': this.httpHeaders.get('Authorization'),
  //        })
  //        , params: { folder, name }, responseType: "text"
  //    }).pipe(catchError(this.handleLoggedInError));
  //}

  public soundControlToggle() {
    this.soundControl = !this.soundControl;
    localStorage.setItem("rssSoundControl", this.soundControl ? 't' : 'f');
  }
  public tempsoundControlToggle() {
    this.tempsoundControlSet(!this.tempsoundControl);

  }
  public tempsoundControlSet(enable: boolean) {
    if (this.tempsoundControl != enable) {
      this.tempsoundControl = !this.tempsoundControl;
      sessionStorage.setItem("tempsoundControl", this.tempsoundControl ? 't' : 'f');
    }
  }
  public UpdateDashboardTiles(view_id: string, id: string, path: string, view: any): Promise<any> {
    return (this.http.put<any>(environment.baseURL + '/api/ProjectView/DashboardTiles/' + view_id, view, { headers: this.httpHeaders, params: { id, path } })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }
  public editFaultDetail(view_id: string, id: string, path: string, title: string, interval: number, aggregation_heading: string, aggregation_type: string, trip_id: number, trip_type: string, reverse_report: boolean, custom_param: any, column_names: any, updatedColumnsOrder: any, enable_filter: boolean /*, start_value: number[]*/): Promise<any> {
    return (this.http.put<any>(environment.baseURL + '/api/ProjectView/FaultReport/' + view_id, { id, path, custom_param, title, interval, aggregation_heading, aggregation_type, trip_id, trip_type, reverse_report, updatedColumnsOrder, enable_filter }, {
      headers: this.httpHeaders

    })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }
  openFullscreen() {
    if (this.elem.requestFullscreen) {
      this.elem.requestFullscreen();
    } else if (this.elem.mozRequestFullScreen) {
      /* Firefox */
      this.elem.mozRequestFullScreen();
    } else if (this.elem.webkitRequestFullscreen) {
      /* Chrome, Safari and Opera */
      this.elem.webkitRequestFullscreen();
    } else if (this.elem.msRequestFullscreen) {
      /* IE/Edge */
      this.elem.msRequestFullscreen();
    }
    //document.addEventListener("keydown", e => {
    //  if (e.key == "F11" || e.keyCode == 27 || e.keyCode == 122) e.preventDefault();
    //});
    //this.elem.onkeydown = function (evt) {
    //  var charCode = evt.charCode || evt.keyCode || evt.which;
    //  if (charCode == 27 || charCode == 122) {
    //    return false;
    //evt.preventDefault();
    //  }
    //}
  }
  updateGlobalViewOrder(payload: any): Observable<any> {
    return this.http.post<any>(
      `${environment.baseURL}/api/ProjectView/UpdateViewOrderGlobal`,
      payload,
      { headers: this.httpHeaders }
    ).pipe(
      catchError(this.handleLoggedInError)
    );
  }
  updateSingleViewOrder(_id: string, order: number): Observable<any> {
    return this.http.post(
      `${environment.baseURL}/api/ProjectView/UpdateSingleViewOrderGlobal`,
      {},
      {
        headers: this.httpHeaders,
        params: { _id, order: order.toString() }
      }
    ).pipe(
      catchError(this.handleLoggedInError)
    );
  }

  UpdateDefaultView(views: any): Observable<any> {
    return this.http.post<any>(
      `${environment.baseURL}/api/ProjectView/UpdateDefaultView`,
      views,
      { headers: this.httpHeaders }
    ).pipe(
      catchError(this.handleLoggedInError)
    );
  }
  AddLinkView(settings: any) {
    return (this.http.post<string>(environment.baseURL + '/api/ProjectView/ViewLink/', settings, { headers: this.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)));
  }
  DeleteLinkView(name: string, projgrp: string, detail: string, path: string, view_id: string = '') {
    return this.http.delete<string>(environment.baseURL + '/api/ProjectView/ViewLink/' + name, { headers: this.httpHeaders, params: { name, projgrp, detail, path, view_id } }).pipe(catchError(this.handleLoggedInError));
  }
  editLinkView(old_grp_name: string, projgrp: string, old_view: string, old_path: string, old_name: string, new_name: string) {
    return (this.http.put<any>(environment.baseURL + '/api/ProjectView/ViewLink/' + old_grp_name, null, { headers: this.httpHeaders, params: { old_grp_name, projgrp, old_view, old_path, old_name, new_name } })
      .pipe(catchError(this.handleLoggedInError)).toPromise());
  }
  SaveUserrolesSettings(settings: any, user_id: string, path: string) {
    return (this.http.post<any>(environment.baseURL + '/api/ProjectView/UserRoles/' + user_id, settings, { headers: this.httpHeaders, params: { user_id, settings, path } })
      .pipe(catchError(this.handleLoggedInError)));
  }
  GetProjectViewGroupList(): Promise<any> {
    return (this.http.get<any>(environment.baseURL + '/api/ProjectView/ProjectViewGroupList/', { headers: this.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }
  AddProjectViewGroup(settings, path: string): Promise<string> {
    return (this.http.post<string>(environment.baseURL + '/api/ProjectView/ProjectViewGroup/', settings, { headers: this.httpHeaders, params: { path } })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return data; }));
  }
  UpdateProjectViewGroup(old_name, new_name, path: string): Promise<string> {
    return (this.http.put<string>(environment.baseURL + '/api/ProjectView/ProjectViewGroup/', old_name, { headers: this.httpHeaders, params: { old_name, new_name, path } })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return data; }));
  }
  UpdateProjectViewGroupFromPVG(projectViewGroup): Promise<string> {
    return (this.http.put<string>(environment.baseURL + '/api/ProjectView/UpdateProjectViewGroup', projectViewGroup, { headers: this.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return data; }));
  }
  DeleteProjectViewGroup(name: string, path: string): Promise<string> {
    return (this.http.delete(environment.baseURL + '/api/ProjectView/ProjectViewGroup/' + name, { headers: this.httpHeaders, params: { path } })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => {
        return "";
      }).catch(data => { return data; }));
  }

  BackupDB(options: any): Promise<any> {
    let tmp_http_head = new HttpHeaders({
      'accept': 'application/zip',
      'Authorization': this.httpHeaders.get('Authorization')
    });

    // Dynamically build parameters from the options object
    let params = new HttpParams();
    for (const key in options) {
      if (options.hasOwnProperty(key)) {
        params = params.set(key, options[key].toString());
      }
    }

    // Use the params object in the request
    return this.http.get(environment.baseURL + '/api/ProjectView/Bakupdb/', {
      headers: tmp_http_head,
      params: params,
      responseType: 'blob'
    })
      .pipe(catchError(this.handleLoggedInError))
      .toPromise()
      .then(data => { return { data: data }; })
      .catch(data => { return { code: data }; });
  }
  RestoreDB(file: File, isScratch: boolean): Promise<string> {
    const formData: FormData = new FormData();
    let tmp_http_head = new HttpHeaders({
      'enctype': 'multipart/form-data',
      'accept': 'application/json',
      'Authorization': this.httpHeaders.get('Authorization')
    });
    formData.append('file', file, "restore.zip");
    return (this.http.post<string>(environment.baseURL + '/api/ProjectView/Bakupdb/', formData, { headers: tmp_http_head, params: { 'isScratch': isScratch } })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return data; }));
  }
  ControlAuthentication(password: string): Promise<void> {
    //await this.signalRService.destroy();
    return (this.http.post(environment.baseURL + '/api/Users/ControlAuth', null, { headers: this.httpHeaders, params: { password } }).pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return data; }));
  }

  CreateBackupTemplate(group_path: string, recursive: string): Promise<any> {
    let tmp_http_head = new HttpHeaders({
      'accept': 'application/zip',
      'Authorization': this.httpHeaders.get('Authorization')
    });
    return (this.http.get(environment.baseURL + '/api/ProjectView/BackupTemplate/', { headers: tmp_http_head, params: { 'group_path': group_path, 'recursive': recursive }, responseType: 'blob' })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return { data: data }; }).catch(data => { return { code: data }; }));
  }


  ImportTemplate(file: File, group_path: string): Promise<string> {
    const formData: FormData = new FormData();
    let tmp_http_head = new HttpHeaders({
      'enctype': 'multipart/form-data',
      'accept': 'application/json',
      'Authorization': this.httpHeaders.get('Authorization')
    });
    formData.append('file', file, "restore.zip");
    return (this.http.post<string>(environment.baseURL + '/api/ProjectView/BackupTemplate/', formData, { headers: tmp_http_head, params: { 'group_path': group_path } })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return data; }));
  }

  windowListenEvent(e, router, parent_tab, response_counter) {
    if (e.data && e.data.type === "RBH_ITX") {
      if (this.saved_tab) {
        if (e.source == this.saved_tab) {
          if (e.data.msg === 'started')
            console.log('Dublicate tab connected');
          else if (e.data.msg === 'timer') {
            response_counter = 0;
            //console.log(response_counter, 'duplicate');
            this.saved_tab.postMessage({ type: "RBH_ITX", msg: 'timer' });
          }
          else if (e.data.msg === 'link') {
            //console.log([e.data.path], { queryParams: { view: e.data.view_type.toUpperCase() + e.data.name } })
            router.navigate([e.data.path], { queryParams: { view: e.data.view_type.toUpperCase() + e.data.name } });
          }
        }

      }
      else if (parent_tab) {
        if (e.source == parent_tab) {
          if (e.data.msg === 'timer') {
            response_counter = 0;
            //console.log(response_counter, 'parent');
          }
          else if (e.data.msg === 'link') {
            //console.log([e.data.path], { queryParams: { view: e.data.view_type.toUpperCase() + e.data.name } })

            router.navigate([e.data.path], { queryParams: { view: e.data.view_type.toUpperCase() + e.data.name } });
          }
        }

      }
      //else
      // alert(e.data.msg);
    };
  }
  duplicateClick(parent_tab, veiwDetail, type: string, parentPath) {
    if (this.saved_tab)
      this.saved_tab.postMessage({ type: "RBH_ITX", msg: 'link', name: veiwDetail.name, view_type: type, path: parentPath });
    else if (parent_tab) {
      //console.log("hii", { type: "RBH_ITX", msg: 'link', name: veiwDetail.name, view_type: type, path: parentPath });
      parent_tab.postMessage({ type: "RBH_ITX", msg: 'link', name: veiwDetail.name, view_type: type, path: parentPath });
    }
  }
  duplicateInterval(response_counter, currentTime) {
    return setInterval(() => {
      if (this.saved_tab && response_counter++ >= 20) {
        response_counter = 0;
        this.setSavedTab(null);
        return;
      }
      currentTime = this.dateToString();
    }, 1000);
  }
  duplicateInit(parent_tab, response_counter, parent_timer) {
    if (window.opener) {
      parent_tab = window.opener;
      parent_tab.postMessage({ type: "RBH_ITX", msg: 'started' });
      parent_timer = setInterval(() => {
        //console.log(response_counter);
        if (response_counter++ >= 20) {
          window.close();
        }
        parent_tab.postMessage({ type: "RBH_ITX", msg: 'timer' });
      }, 1000);
    }
  }

  public IconLists: any = null;
  async getIconList() {
    if (this.IconLists == null || this.IconLists == undefined) {
      await this.iconFileRead().toPromise().then((data: any) => { this.IconLists = data; }, error => { this.IconLists = null; });
    }
  }
  private iconFileRead(): any {
    let locale = localStorage.getItem("LOCALE_ID");
    if (locale == null || locale == undefined) {
      return this.http.get('../assets/fonts/material-icons.json');
    }
  }
  saveShiftSettings(shifts: any, path: string): Promise<any> {
    return (this.http.post<any>(environment.baseURL + '/api/ProjectView/Shifts/', shifts, { headers: this.httpHeaders, params: { path } })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => {
        return data;
      }).catch(data => { return data; }));
  }
  updateShiftSettings(shifts: any, path: string): Promise<any> {
    return (this.http.put<any>(environment.baseURL + '/api/ProjectView/Shifts/', shifts, { headers: this.httpHeaders, params: { path } })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }
  getSiftSettings(id, group_path): any {
    return (this.http.get<any>(environment.baseURL + '/api/ProjectView/Shifts/' + id, { headers: this.httpHeaders, params: { group_path } })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }
  getAllShiftSets(path: string): Promise<any> {
    return (this.http.get<any>(environment.baseURL + '/api/ProjectView/ShiftSets/', { headers: this.httpHeaders, params: { path } })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }
  deleteShiftSet(id: string, path: string): Promise<string> {
    return (this.http.delete<any>(environment.baseURL + '/api/ProjectView/Shifts/' + id, { headers: this.httpHeaders, params: { path } })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return data; }));
  }

  GetRosterById(req_id: string, id: string, path: string): Promise<any> {
    return (this.http.get<any>(environment.baseURL + '/api/ProjectView/Roster/' + req_id, { headers: this.httpHeaders, params: { req_id, id, path } })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }
  SaveRosters(add_update_roasters: any[], del_roasters: any[], path: string): Promise<any> {
    return (this.http.post<any>(environment.baseURL + '/api/ProjectView/BulkSaveRoster', { add_update_roasters, del_roasters }, { headers: this.httpHeaders, params: { path } })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }
  //AddRoster(roster: any, path: string): Promise<any> {
  //  return (this.http.post<any>(environment.baseURL + '/api/ProjectView/Roster', roster, { headers: this.httpHeaders, params: { path } })
  //    .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  //}
  //UpdateRoster(roster: any, path: string): Promise<any> {
  //  return (this.http.put<any>(environment.baseURL + '/api/ProjectView/Roster/', roster, { headers: this.httpHeaders, params: { path } })
  //    .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  //}
  //DeleteRoster(rep_id: string, path: string): Promise<string> {
  //  return (this.http.delete<any>(environment.baseURL + '/api/ProjectView/Roster/' + rep_id, { headers: this.httpHeaders, params: { path } })
  //    .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return data; }));
  //}
  GetAllRosters(path: string): Promise<any> {
    return (this.http.get<any>(environment.baseURL + '/api/ProjectView/AllRostersAbsolute/', { headers: this.httpHeaders, params: { path } })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }
  getGroupChilds(group_path): any {
    return (this.http.get<any>(environment.baseURL + '/api/ProjectView/GetGroupChilds/', { headers: this.httpHeaders, params: { group_path: group_path } })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }
  AddShiftClose(shiftClose: any): Promise<any> {
    return (this.http.post<any>(environment.baseURL + '/api/ProjectView/shiftClose', shiftClose, { headers: this.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }
  GetAllShiftClose(path: string, shift_start_time: number): Promise<any> {
    return (this.http.get<any>(environment.baseURL + '/api/ProjectView/AllShiftClose', { headers: this.httpHeaders, params: { path: path, shift_start_time: shift_start_time } })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }
  //-------------------- User Roles -------------------------

  GetAllUserRoles(): Promise<any> {
    return (this.http.get<any>(environment.baseURL + '/api/ProjectView/UserRole', { headers: this.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }
  AddUpdateUserRole(groupright: any): Promise<any> {
    return (this.http.post<any>(environment.baseURL + '/api/ProjectView/UserRole', groupright, { headers: this.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }
  GetUserRoleById(id: string): Promise<any> {
    return (this.http.get<any>(environment.baseURL + '/api/ProjectView/UserRole/' + id, { headers: this.httpHeaders, params: { id } })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }
  GetUserRoleByIds(ids: string[]): Promise<any> {
    let req_id = ids.join("|");
    return (this.http.get<any>(environment.baseURL + '/api/ProjectView/GetUserRoleByIds', { headers: this.httpHeaders, params: { req_id } })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }
  DeleteUserRole(id: string): Promise<string> {
    return (this.http.delete<any>(environment.baseURL + '/api/ProjectView/UserRole/' + id, { headers: this.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return data; }));
  }


  GetAllUserPosition(): Promise<any> {
    return (this.http.get<any>(environment.baseURL + '/api/ProjectView/UserPosition', { headers: this.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }

  GetAllUserPositionByPath(path: string): Promise<any> {
    return (this.http.get<any>(environment.baseURL + '/api/ProjectView/UserPositionByPath', {
      params: { 'path': path },
      headers: this.httpHeaders
    })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }

  AddUpdateUserPosition(position: any): Promise<any> {
    return (this.http.post<any>(environment.baseURL + '/api/ProjectView/UserPosition', position, { headers: this.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }
  GetUserPositionById(id: string): Promise<any> {
    return (this.http.get<any>(environment.baseURL + '/api/ProjectView/UserPosition/' + id, { headers: this.httpHeaders, params: { id } })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }
  DeleteUserPosition(id: string): Promise<string> {
    return (this.http.delete<any>(environment.baseURL + '/api/ProjectView/UserPosition/' + id, { headers: this.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return data; }));
  }
  GetUserNamesFromIds(ids: any): Promise<any> {
    return (this.http.get<any>(environment.baseURL + '/api/ProjectView/UserNamesFromIds/' + ids, { headers: this.httpHeaders, params: { ids } })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return data; }));
  }
  GetUsedShiftset(shiftsetname: string, checkRootUser: boolean): Promise<any> {
    return (this.http.get<any>(environment.baseURL + '/api/ProjectView/GetUsedShiftset', { headers: this.httpHeaders, params: { shiftsetname, checkRootUser } })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return data; }));
  }
  CheckConnectedPosition(id: string): Promise<any> {
    return (this.http.get<any>(environment.baseURL + '/api/ProjectView/ConnectedPosition/' + id, { headers: this.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }

  CheckConnectedRole(id: string): Promise<any> {
    return (this.http.get<any>(environment.baseURL + '/api/ProjectView/ConnectedRole/' + id, { headers: this.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }

  addEscapeChar(data: any): any {
    if (!data)
      return data;
    data = data.replace(/[&\/\\.$'"]/g, match => ({
      '&': '&a',
      '/': '&s',
      '\\': '&b',
      '.': '&d',
      '$': '&r',
      "'": '&u',
      '"': '&q'
    })[match]);
    return data;
  }

  unescapedName(ev: string): string {
    if (ev) {
      try {
        let _unescapped_name: string = ev
          .replace(/&[asbdrqu]/g, match => ({
            '&a': '&',
            '&s': '/',
            '&b': '\\',
            '&d': '.',
            '&r': '$',
            '&u': "'",
            '&q': '"'
          }[match]))
        return _unescapped_name;
      } catch (ex) {
        return "";
      }

    }
    return "";
  }

  GetPositionUser(positionIds: string[]) {
    let positionId = positionIds.join("|");
    return (this.http.get<any>(environment.baseURL + '/api/ProjectView/GetPositionUser', { headers: this.httpHeaders, params: { positionId } })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return data; }));
  }

  GetAllDatabaseMapping(): Promise<any> {
    return (this.http.get<any>(environment.baseURL + '/api/ProjectView/GetAllDatabaseMapping', { headers: this.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }
  GetDatabaseMapping(id: string): Promise<any> {
    return (this.http.get<any>(environment.baseURL + '/api/ProjectView/GetDatabaseMapping/', { headers: this.httpHeaders, params: { id } })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }
  AddDatabaseMapping(data: any): Promise<any> {
    return (this.http.post<any>(environment.baseURL + "/api/ProjectView/AddDatabaseMapping/", data, { headers: this.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }
  AddDatabaseObject(data: any): Promise<any> {
    return (this.http.post<any>(environment.baseURL + "/api/ProjectView/AddDatabaseObject/", data, { headers: this.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }
  SaveObjectOrder(data: any): Promise<any> {
    return (this.http.post<any>(environment.baseURL + "/api/ProjectView/SaveObjectOrder/", data, { headers: this.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }
  DeleteDatabaseObject(id: string): Promise<string> {
    return (this.http.delete<any>(environment.baseURL + '/api/ProjectView/DeleteDatabaseObject/' + id, { headers: this.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return data; }));
  }

  unescapechange(): Promise<any> {
    return (this.http.get<any>(environment.baseURL + "/api/ProjectView/unescapechange", { headers: this.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }


  AddProjectViewGroups(allgroups): Promise<string> {
    return (this.http.post<string>(environment.baseURL + '/api/ProjectView/ProjectViewGroups', allgroups, { headers: this.httpHeaders, params: { allgroups } })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return data; }));
  }
  DeleteConfigChanges(id: string): Promise<string> {
    return (this.http.delete<any>(environment.baseURL + '/api/ProjectView/DeleteConfigChanges/' + id, { headers: this.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return data; }));
  }
  savemappingchanges(data: any): Promise<any> {
    return (this.http.post<any>(environment.baseURL + "/api/ProjectView/savemappingchanges/", data, { headers: this.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }
  GetUserById(hrmsid: string, isforget: boolean): Promise<any> {
    return (this.http.get<any>(environment.baseURL + '/api/ProjectUsers/GetUserById', { headers: this.httpHeaders, params: { hrmsid, isforget } })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return data; }));
  }

  ForgotPassword(data: object): Promise<any> {
    return (this.http.put<any>(environment.baseURL + '/api/ProjectUsers/ForgotPassword', data, { headers: this.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return data; }));
  }

  GetTextstandardslist(path: string) {
    return (this.http.get<any>(environment.baseURL + '/api/ProjectView/GetTextstandardslist/', { headers: this.httpHeaders, params: { path } })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }

  VerifyOtp(hrmsid: string, otp: number): Promise<any> {
    return (this.http.get<any>(environment.baseURL + '/api/ProjectUsers/VerifyOtp', { headers: this.httpHeaders, params: { hrmsid, otp } })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return data; }));
  }

  generateUUID() {
    // Generate UUID v4
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0,
        v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }


  GetUserDetailsById(userid: string): Promise<any> {
    return (this.http.post<any>(environment.baseURL + '/api/ProjectUsers/GetUserDetailsById', userid, { headers: this.httpHeaders, params: { userid } })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return data; }));
  }

  DeleteUserLoggedDevice(id: string, userid: string): Promise<any> {
    return (this.http.delete<any>(environment.baseURL + '/api/ProjectUsers/DeleteLoggedDevice', { headers: this.httpHeaders, params: { id, userid } })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return data; }));
  }

  //GetMyIpAddress():Promise<any>{
  //  return this.http.get<any>('https://api.ipify.org?format=json', { headers: this.httpHeaders, })
  //    .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => {return data;}).catch(data => {return data;});
  //}
  GetMyIpAddress(): Promise<any> {
    return fetch('https://api.ipify.org?format=json')
      .then(response => response.json());
  }

  GetMyIpAddress1(): Promise<string> {
    return new Promise((resolve, reject) => {
      const rtc = new RTCPeerConnection({ iceServers: [] });
      rtc.createDataChannel(''); // needed to trigger candidate gathering

      rtc.onicecandidate = (event) => {
        if (event && event.candidate) {
          const ipMatch = event.candidate.candidate.match(/([0-9]{1,3}(\.[0-9]{1,3}){3})/);
          if (ipMatch) {
            resolve(ipMatch[1]);
            rtc.close();
          }
        } else if (event === null || event.candidate === null) {
          reject('No IP found (likely blocked by browser)');
        }
      };

      rtc.createOffer()
        .then(offer => rtc.setLocalDescription(offer))
        .catch(reject);
    });
  }
  sendNotificationDetails(data: any, msg: string, connected_substations: string[], receivingUsers: UserInfo[], uniqueCode: string = '') {
    const line_bay_or_tl_mnt = data.shutdown_required && data.maintenance_type == "Bay" && data.backcharging_id;
    if (!line_bay_or_tl_mnt)
      return;
    const substation = data.device_name.split("/")[4];

    this.sendNotification({ id: null, name: substation, loginId: null }, receivingUsers, connected_substations, msg, uniqueCode);
  }
  sendNotification(sender: UserInfo, receivingUsers: UserInfo[], receivingGroups: string[], msg: string, uniqueCode: string = '') {

    const notification_msg: Notice = {
      _id: null,
      _rev: null,
      sender: sender,
      receivingUsers: receivingUsers ?? [],
      receivingGroups: receivingGroups ?? [],
      messageText: msg,
      uniqueCode: uniqueCode,
      timestamp: new Date().getMilliseconds(),                      // new Date().toISOString(),
      isUrgent: true,
      readBy: [],
      isNotification: true
    };

    this.SendMessagePath(notification_msg).then(() => { }).catch((error) => {
      console.error('Error sending message:', error);
    });
  }

  sendActionableNotification(
    sender: UserInfo,
    receivingUsers: UserInfo[],
    receivingGroups: string[],
    messageText: string,
    uniqueCode: string,
    actionType: string,
    actionMetadata: {
      maintenance_id?: string,
      target_view?: string,
      target_tab?: string,
      route_params?: any,
      expectedCompletionStatus?: string | string[],
      currentStatus?: string,
      [key: string]: any
    },
    actionButtonText?: string
  ) {
    const notification_msg: Notice = {
      _id: null,
      _rev: null,
      sender: sender,
      receivingUsers: receivingUsers ?? [],
      receivingGroups: receivingGroups ?? [],
      messageText: messageText,
      uniqueCode: uniqueCode,
      timestamp: new Date().getMilliseconds(),
      isUrgent: true,
      readBy: [],
      isNotification: true,
      isActionable: true,
      actionType: actionType,
      actionMetadata: {
        ...actionMetadata,
        expectedCompletionStatus: actionMetadata.expectedCompletionStatus ||
          this.getDefaultCompletionStatus(actionType)
      },
      actionButtonText: actionButtonText || "Take Action"
    };

    this.SendMessagePath(notification_msg).then(() => { }).catch((error) => {
      console.error('Error sending actionable notification:', error);
    });
  }

  private getDefaultCompletionStatus(actionType: string): string | string[] {
    const statusMap: { [key: string]: string | string[] } = {
      'ptw_request': 'ptw_issued',
      'ptw_issue': 'in_progress',
      'sldc_shutdown_request': 'sldc_shutdown_code_issued',
      'sldc_charging_request': 'sldc_charging_code_issued',
      'backcharging_request': 'backcharging_issued',
      'xen_approval_request': 'xen_maintainance_approved'
    };

    return statusMap[actionType] || '';
  }

  async isActionCompleted(notice: any): Promise<boolean> {
    if (!notice.isActionable || !notice.actionMetadata?.maintenance_id) {
      return false;
    }

    try {
      const mntservice = this.injector.get(MaintenanceService);
      const maintenance = await mntservice.GetPlanMntById(
        notice.actionMetadata.maintenance_id
      );

      if (!maintenance || maintenance.code) {
        return false;
      }

      const currentStatus = maintenance.current_status;
      const expectedStatus = notice.actionMetadata.expectedCompletionStatus;

      if (!expectedStatus) {
        return false;
      }

      if (Array.isArray(expectedStatus)) {
        return expectedStatus.includes(currentStatus);
      }

      return currentStatus === expectedStatus;
    } catch (error) {
      console.error('Error checking action completion:', error);
      return false;
    }
  }

  GetIccpDetails(id: string): Promise<any> {
    return (this.http.get<any>(environment.baseURL + '/api/ProjectView/GetIccpDetails', { headers: this.httpHeaders, params: { id } })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }
  getVersionDetails(): Observable<AppVersionDetails> {
    return this.http.get<AppVersionDetails>('../assets/version.json');
  }


  GetBayCtOptions(subname: string, bayname: string): Promise<any> {
    return (this.http.get<any>(environment.baseURL + '/api/ProjectView/GetBayCtOptions', { headers: this.httpHeaders, params: { subname, bayname } })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return data; }));
  }
  SaveUpdateDeleteObject(baytype: string, obj: any, oldobjname: string, operation: string): Promise<any> {
    return (this.http.put<any>(environment.baseURL + "/api/ProjectView/SaveUpdateDeleteObject/", obj, { headers: this.httpHeaders, params: { baytype, oldobjname, operation } })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }
  BulkSaveobject(baytype: string, obj: any): Promise<any> {
    return (this.http.put<any>(environment.baseURL + "/api/ProjectView/BulkSaveobject/", obj, { headers: this.httpHeaders, params: { baytype } })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }

  GetProjectViewbyPathandType(path: string, viewtype: string): Promise<any> {
    return (this.http.get<any>(environment.baseURL + "/api/ProjectView/GetProjectViewbyPathandType", { headers: this.httpHeaders, params: { path, viewtype } })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }
  GetBayGroup(path: string, viewtype: string): Promise<any> {
    return (this.http.get<any>(environment.baseURL + "/api/ProjectView/GetBayGroup", { headers: this.httpHeaders, params: { path, viewtype } })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }
  saveTripParameter(bayTypeId: string, tripParameters: string[]) {
    return (this.http.put<any>(environment.baseURL + "/api/ProjectView/SaveTripParameter", { BayTypeId: bayTypeId, TripParameters: tripParameters }, { headers: this.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }

  bulkAddProtectionObjects(objectList: any[], baytype: string): Promise<any> {
    return (this.http.put<any>(environment.baseURL + "/api/ProjectView/bulkAddProtectionObjects/", objectList, { headers: this.httpHeaders, params: { baytype } })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }
  GetIccpStatusBay(path: string): Promise<any> {
    return (this.http.get<any>(environment.baseURL + '/api/ProjectView/GetIccpStatusBay', { headers: this.httpHeaders, params: { path } })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }
  saveStateOfSubstationInfo(current_view_id: string, roster_view_id: string): Promise<any> {
    return (this.http.put<any>(environment.baseURL + '/api/ProjectView/saveStateOfSubstationInfo', {}, { headers: this.httpHeaders, params: { current_view_id, roster_view_id } })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }
  UpdateBayGrouping(view_id: string, groups: any): Promise<any> {
    return (this.http.put<any>(environment.baseURL + "/api/ProjectView/UpdateBayGrouping/", groups, { headers: this.httpHeaders, params: { view_id } })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }
  getTodaysShifts(path: string): Promise<any> {
    return (this.http.get<any>(environment.baseURL + '/api/ProjectView/TodaysShifts', { headers: this.httpHeaders, params: { path } })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }

  saveLogStartupView(view_id: string, viewDetail: any): Promise<any> {
    return (this.http.put<any>(environment.baseURL + '/api/ProjectView/LogStartupView/' + view_id, viewDetail, { headers: this.httpHeaders })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }

  changeVoltageDependancy(data: any, sub_name: string): Promise<any> {
    return (this.http.put<any>(environment.baseURL + "/api/ProjectView/changeVoltageDependancy", data, { headers: this.httpHeaders, params: { sub_name } })
      .pipe(catchError(this.handleLoggedInError)).toPromise().then(data => { return data; }).catch(data => { return { code: data }; }));
  }

  // Counter
  private unreadCountSubject = new BehaviorSubject<number>(0);
  unreadCount$ = this.unreadCountSubject.asObservable();

  private actionableUnreadCountSubject = new BehaviorSubject<number>(0);
  actionableUnreadCount$ = this.actionableUnreadCountSubject.asObservable();


  setUnreadCount(count: number) {
    this.unreadCountSubject.next(count);
  }

  setActionableUnreadCount(count: number) {
    this.actionableUnreadCountSubject.next(count);
  }

  incrementUnreadCount() {
    this.unreadCountSubject.next(this.unreadCountSubject.value + 1);
  }

  incrementActionableUnreadCount() {
    this.actionableUnreadCountSubject.next(this.actionableUnreadCountSubject.value + 1);
  }

  decrementUnreadCount() {
    this.unreadCountSubject.next(
      Math.max(0, this.unreadCountSubject.value - 1)
    );
  }

  decrementActionableUnreadCount() {
    this.actionableUnreadCountSubject.next(
      Math.max(0, this.actionableUnreadCountSubject.value - 1)
    );
  }

  decrementUnreadCountBy(amount: number) {
    if (amount <= 0) return;
    this.unreadCountSubject.next(
      Math.max(0, this.unreadCountSubject.value - amount)
    );
  }

  decrementActionableUnreadCountBy(amount: number) {
    if (amount <= 0) return;
    this.actionableUnreadCountSubject.next(
      Math.max(0, this.actionableUnreadCountSubject.value - amount)
    );
  }

  private currentMaintenanceTab: string = '';
  private pendingMaintenanceTab: string | null = null;
  private pendingMaintenanceId: string | null = null;
  switchMaintenanceTab: ((tabLabel: string) => void) | null = null;
  openMaintenanceById: ((id: string) => void) | null = null;

  setCurrentMaintenanceTab(tab: string): void {
    this.currentMaintenanceTab = tab;
  }

  getCurrentMaintenanceTab(): string {
    return this.currentMaintenanceTab;
  }

  setPendingMaintenanceTab(tab: string | null): void {
    this.pendingMaintenanceTab = tab;
  }

  consumePendingMaintenanceTab(): string | null {
    const tab = this.pendingMaintenanceTab;
    this.pendingMaintenanceTab = null;
    return tab;
  }

  setPendingMaintenanceId(id: string | null): void {
    this.pendingMaintenanceId = id;
  }

  consumePendingMaintenanceId(): string | null {
    const id = this.pendingMaintenanceId;
    this.pendingMaintenanceId = null;
    return id;
  }

  resetMaintenanceTabState(): void {
    this.currentMaintenanceTab = '';
    this.switchMaintenanceTab = null;
    this.openMaintenanceById = null;
  }
}
