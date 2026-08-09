import { Component, ViewChild, ComponentFactoryResolver, ChangeDetectorRef, OnInit, OnDestroy, ElementRef, HostListener, AfterViewInit, Input } from '@angular/core';
import { AlertController, MenuController, ModalController, Platform } from '@ionic/angular';
import { AboutConfigurationDlgComponent } from '../../shared/components/about-configuration-dlg/about-configuration-dlg.component';
import { Location } from '@angular/common';
import { Subscription, Observable } from 'rxjs';
// import { MatExpansionPanel } from '@angular/material/expansion';
// import { MatDialog } from '@angular/material/dialog';
// import { MatSnackBar } from '@angular/material/snack-bar';
// import { MatIconRegistry } from '@angular/material/icon';

import { DynamicViewDirective } from '../../core/services/dynamic-view.directive';
import { AppService } from '../../core/services/app.service';
import { Router, ActivatedRoute } from '@angular/router';
import { LocaleService } from '../../core/services/locale/locale.service';
import { ProjectViewData, ProjectResolverService, GroupAccessRight } from '../../core/services/project-resolver.service';
// import { PVEventComponent } from '../pvevent/pvevent.component';
// import { PVAlarmComponent } from '../pvalarm/pvalarm.component';
// import { DashBoardComponent } from '../pvdashboard/dash-board/dash-board.component';
// import { ShiftSummaryComponent } from '../shift-summary/shift-summary.component'
// import { ConfirmationDlgComponent } from '../../common/confirmation-dlg/confirmation-dlg.component';
// import { PasswordDlgComponent } from '../../common/password-dlg/password-dlg.component';
// import { isBoolean, isNullOrUndefined } from 'util';
//import { LoginSelectorComponent } from '../../login/login-selector/login-selector.component';
//import { LoadsheddingComponent } from '../../loadshedding/loadshedding.component';
import { SignalRService } from '../../core/services/signal-r.service';
import { DomSanitizer, Title } from '@angular/platform-browser';
import { environment } from '../../../environments/environment';
// import { LoadSheddingEditorComponent } from '../loadshedding/load-shedding-editor/load-shedding-editor.component';
// import { LoadSheddingMainComponent } from '../loadshedding/load-shedding-main/load-shedding-main.component';
// import { PVStatusComponent } from '../pvstatus/pvstatus.component';
// import { PVHistoryComponent } from '../pvhistory/pvhistory.component';
// import { PveditorComponent } from '../pveditor/pveditor.component';
// import { PvShapeDlgComponent } from '../pveditor/pv-shape-dlg/pv-shape-dlg.component';
// import { ObjectControlService } from '../object-control.service';
// import { PVLiveTrendComponent } from '../pvlive-trend/pvlive-trend.component';
// import { PVTrippingReportComponent } from '../pvtripping-report/pvtripping-report.component';
// import { ProjectSettingsComponent } from '../project-settings/project-settings.component';
import { map } from 'rxjs/operators';
// import { PvAddUpdateViewDetailDlg } from '../pvdashboard/pv-add-update-view-detail-dlg/pv-add-update-view-detail-dlg.component';
// import { DashViewMylinksDlgComponent } from '../pvdashboard/dash-view-mylinks-dlg/dash-view-mylinks-dlg.component';
// import { ResizeEvent } from 'angular-resizable-element';
// import { MatSidenav } from '@angular/material/sidenav';
// import { LoadSheddingReportComponent } from '../loadshedding/load-shedding-report/load-shedding-report.component';
// import { PVBinaryReportComponent } from '../pvbinary-report/pvbinary-report.component';
//import { GroupObjectSelectionComponent, OSObjectRecordingType } from '../group-object-selection/group-object-selection.component';
// import { CdkDragEnd, CdkDragMove } from '@angular/cdk/drag-drop';
// import { MatMenu, MatMenuTrigger } from '@angular/material/menu';
// import { PvOperationalViewComponent } from '../pv-operational-view/pv-operational-view.component';
// import { EventLogViewComponent } from '../event-log-view/event-log-view.component';
// import { LogStartupValueComponent } from '../log-startup-value/log-startup-value.component';
// import { GroupOperationalViewComponent } from '../group-operational-view/group-operational-view.component';
// import { TemplateMaintenanceComponent } from '../maintenance-schedule/template-maintenance/template-maintenance.component';
import { PvPlanMaintenanceComponent } from '../maintenance-schedule/pv-plan-maintenance/pv-plan-maintenance.component';
// import { RosterManagementComponent } from '../project-settings/roster-management/roster-management.component';
// import { ProjectGroupDlgComponent } from '../project-settings/project-group/project-group-dlg/project-group-dlg.component';
// import { AboutConfigurationComponent } from '../../common/about-configuration/about-configuration.component';
import { ToastService } from 'src/app/core/services/toast.service';
import { App } from '@capacitor/app';
import { MaintenanceDashboardComponent } from '../maintenance-schedule/maintenance-dashboard/maintenance-dashboard.component';
// import { PvMaintenanceCompletedDashboardComponent } from '../maintenance-schedule/pv-maintenance-dashboard/pv-maintenance-completed-dashboard/pv-maintenance-completed-dashboard.component';
// import { CutoffScheduleComponent } from '../maintenance-schedule/cutoff-schedule/cutoff-schedule.component';
// import { PvGroupOrderComponent } from '../pv-group-order/pv-group-order.component';
//import { LinkedDevicesComponent } from '../linked-devices/linked-devices.component';
//import { SnackbarStackComponent } from '../../common/snackbar-stack/snackbar-stack.component';

// for stacking snackbar notices
interface Notice {
  sender: UserInfo;
  receivingUsers: UserInfo[];
  receivingGroups: string[];
  messageText: string;
  timestamp: string;
  isUrgent: boolean;
  isNotification: boolean;
  isActionable?: boolean;
}

interface UserInfo {
  id: string;
  name: string;
}

@Component({
  selector: 'app-pvmain',
  templateUrl: './pvmain.component.html',
  styleUrls: ['./pvmain.component.scss']
})

export class PVMainComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild(DynamicViewDirective, { static: true }) proj_view_comp: DynamicViewDirective;
  // @ViewChild('sidenavsetting', { static: true }) sidenavsetting: MatSidenav;
  // @ViewChild('drawer') sidenav: MatSidenav;
  @ViewChild('showDragBtn') DragMenu: ElementRef;

  //@ViewChild('userviewmenupanel', { static: true }) usersidemenupanel: MatExpansionPanel;
  //@ViewChild('mylinksmenupanel', { static: true }) mylinksmenupanel: MatExpansionPanel;
  //@ViewChild('projectsidemenupanel', { static: true }) projectsidemenupanel: MatExpansionPanel;
  //@ViewChild('lssidemenupanel', { static: true }) lssidemenupanel: MatExpansionPanel;

  innerHeight: any;
  dragPosition: object = { x: 0, y: 0 };
  ifPinnedLeftSidenav: boolean = true;
  onLoadLeftSidenavSettings: boolean;
  sidenavMode: boolean = false;
  isAlaramShow: boolean = false;
  SwitchProjectText: string = '';
  SwitchAccess: string = '';
  sub: Subscription[] = [];
  currentTime: string = '---';
  viewData: ProjectViewData = null;

  get hasRenderableView(): boolean {
    const type = this.viewData?.viewData?.detail?.type;
    if (!type) return false;
    return type === 'maintenance_dashboard' || type.includes('plan_');
  }

  newProject: ProjectViewData;
  project_Id: string;
  myParentPath: string = "";
  productName: string = environment.productName;
  showAlarmText: boolean;
  menuAllExpnaded: boolean;
  maintenanceModule: boolean;
  projectLogo: string = null;
  isSideMenuAsIcon: boolean = false;
  public checkAccessViewShift$: boolean = this.resolver.checkAccess(GroupAccessRight.ViewShift, this.route.snapshot, false);
  public checkAccess$: boolean = this.resolver.checkAccess(GroupAccessRight.Admin, this.route.snapshot, false);
  public checkScheduleTLPatrollingAccess: boolean = this.resolver.checkAccess(GroupAccessRight.ScheduleTLPatrolling, this.route.snapshot, false);
  public checkAdminAccess: boolean = this.resolver.checkAccess(GroupAccessRight.Admin, this.route.snapshot, false);
  public checkAccessPA$: boolean = this.resolver.checkAccess(GroupAccessRight.ProjectAdmin, this.route.snapshot, false);
  public umacStatus: any = {};
  public DbStatus: boolean = false;
  public ringing: number = 0;
  public opr_setting_data: any = null;
  public grp_opr_setting_data: any = null;
  public log_setting_data: any = null;
  public setting_data: any = null;
  public tile_setting_data: any = null;
  public map_setting_data: any = null;
  parent_tab: Window = null;
  private parent_timer: any;
  private response_counter = 0;
  //projectOptions = this.checkAccessPA$ ? ["basic", "image", "alarm", "sound", "element", "userroles", "projectgroup", "backupdb", "automaticreport", "shiftset", "rostertab"]
  //  : ["element", "userroles", "shiftset", "rostertab"];
  projectOptions = {};
  projectSettings = [];
  projectSettingView: boolean = false;
  maintenanceOptions = {};
  maintenanceSettings = [];
  maintenanceView: boolean = false;
  mnttab: string = '';
  lastBreadCrumb = null;
  dashSelect: string = 'basic';
  validViewGroups: any = [];
  ungroupedProjectViews: any[] = [];
  logInDeviceData: any = null;

  // For snackbar stacking urgent notices
  private group_path: string;
  private userId: string;
  private messageSubscription!: Subscription;
  private noticesRemovedSubscription!: Subscription;
  private urgentDlgSubscription!: Subscription;
  private activeNotices: Notice[] = [];
  latestNotice: Notice = null;
  //private snackBarRef: any = null;
  norder = (a, b) => a;
  // Urgent Dlg
  listCount: number = 0;
  unreadCount = 0;
  showUrgent = false;
  selectedNotificationType: 'actionable' | 'non-actionable' = 'non-actionable';
  unreadCount$: Observable<number>;
  actionableUnreadCount$: Observable<number>;

  ngAfterViewInit() {
    if (window.opener) {
      this.parent_tab = window.opener;
      this.parent_tab.postMessage({ type: "RBH_ITX", msg: 'started' });
      this.parent_timer = setInterval(() => {
        //console.log(this.response_counter);
        if (this.response_counter++ >= 10) {
          window.close();
        }
        else {
          if (window.opener && !window.opener.closed) {
            window.opener.postMessage({ type: "RBH_ITX", msg: "duplicate_alive" }, "*");
          }
        }
        this.parent_tab.postMessage({ type: "RBH_ITX", msg: 'timer' });
      }, 1000);
    }

    let ev = { target: { innerHeight: null } };
    ev.target.innerHeight = this.ref.nativeElement.clientHeight;
    this.onResize(ev);



  }
  private getCoreStatusText(status): string {
    if (status == 0)
      return this.locale_service.Locale.language.common.umacCoreConnectionDisconnection.disconnected;
    else if (status == 2)
      return this.locale_service.Locale.language.common.umacCoreConnectionDisconnection.maintenance;
    else if (status == 3)
      return this.locale_service.Locale.language.common.umacCoreConnectionDisconnection.resuming;
    else if (status == 4)
      return this.locale_service.Locale.language.common.umacCoreConnectionDisconnection.fault;
    else if (status == 5)
      return this.locale_service.Locale.language.common.umacCoreConnectionDisconnection.hault;
    else if (status == 6)
      return this.locale_service.Locale.language.common.umacCoreConnectionDisconnection.switchFault;
    else if (status == 7)
      return this.locale_service.Locale.language.common.umacCoreConnectionDisconnection.switchmaintenance;
    else if (status == 8)
      return this.locale_service.Locale.language.common.umacCoreConnectionDisconnection.switchhault;
    else if (status == 19)
      return this.locale_service.Locale.language.common.umacCoreConnectionDisconnection.inRunMode;
    else if (status == 35)
      return this.locale_service.Locale.language.common.umacCoreConnectionDisconnection.inStandMode;
    else
      return this.locale_service.Locale.language.common.umacCoreConnectionDisconnection.init;
  }
  //public iconDetails: any = {};
  constructor(
    private componentFactoryResolver: ComponentFactoryResolver,
    private titleService: Title,
    public appservice: AppService,
    public locale_service: LocaleService,
    private router: Router,
    private route: ActivatedRoute,
    private location: Location,
    // private dialog: MatDialog,
    // private _snackBar: MatSnackBar,
    private toast: ToastService,
    private _signalr: SignalRService,
    // private matIconRegistery: MatIconRegistry,
    //private objectcontrolService: ObjectControlService,
    private domSanitizer: DomSanitizer,
    public resolver: ProjectResolverService,
    public ref: ElementRef,
    private alertCtrl: AlertController,
    private platform: Platform,
    private modalController: ModalController,
    private menuCtrl: MenuController
  ) {
    this.resolver.pvmain = this;
    //this.appservice.iconFileRead().toPromise().then((data: any) => { this.iconDetails = data; console.log(this.iconDetails + "2" ); }, error => { this.iconDetails = null; });
    //this.iconDetails = this.appservice.getIconList();
    this.sub.push(_signalr.coreConnection.subscribe(data => {
      let text = '';
      if (data.is_red) {
        if (data.core1_status != this.umacStatus.core1_status)
          text += this.locale_service.Locale.language.common.umacCoreConnectionDisconnection.mainumacCore + this.getCoreStatusText(data.core1_status);
        if (data.core2_status != this.umacStatus.core2_status)
          text += this.locale_service.Locale.language.common.umacCoreConnectionDisconnection.redumacCore + this.getCoreStatusText(data.core2_status);
      }
      else {
        if (data.core_status != this.umacStatus.core_status)
          text += this.locale_service.Locale.language.common.umacCoreConnectionDisconnection.umacCore + this.getCoreStatusText(data.core_status);
      }

      this.umacStatus = data;
      if (text != '') {
        this.toast.show(text, 'warning');
      }
    }));
    this.sub.push(_signalr.dbConnection.subscribe(data => {
      this.DbStatus = data;
      this.toast.show(
        this.locale_service.Locale.language.common[this.DbStatus ? 'db_connected' : 'db_disconnected'],
        this.DbStatus ? 'success' : 'danger'
      );
    }));
  }

  openOprSetting(data: any) {
    this.opr_setting_data = data;
    this.log_setting_data = null;
    this.setting_data = null;
    this.tile_setting_data = null;
    this.map_setting_data = null;
    // this.sidenavsetting.open();
  }
  openlogsettings(data: any) {
    this.log_setting_data = data;
    this.opr_setting_data = null;
    this.setting_data = null;
    this.tile_setting_data = null;
    this.map_setting_data = null;
    // this.sidenavsetting.open();
  }
  opensetting(data: any) {
    this.setting_data = data;
    this.opr_setting_data = null;
    this.tile_setting_data = null;
    this.log_setting_data = null;
    this.map_setting_data = null;
    this.grp_opr_setting_data = null;
    // this.sidenavsetting.open();
  }
  openTileSettings(data: any) {
    this.tile_setting_data = data;
    this.opr_setting_data = null;
    this.setting_data = null;
    this.log_setting_data = null;
    this.map_setting_data = null;
    this.grp_opr_setting_data = null;
    // this.sidenavsetting.open();
  }
  openMapSettings(data: any) {
    this.map_setting_data = data;
    this.opr_setting_data = null;
    this.log_setting_data = null;
    this.tile_setting_data = null;
    this.setting_data = null;
    this.grp_opr_setting_data = null;
    // this.sidenavsetting.open();
  }
  sidenavsettingClose() {
    this.tile_setting_data = null;
    this.opr_setting_data = null;
    this.setting_data = null;
    this.log_setting_data = null;
    this.map_setting_data = null;
    this.grp_opr_setting_data = null;
    // this.sidenavsetting.close();
  }
  grpOpenOprSetting(data: any) {
    this.grp_opr_setting_data = data;
    this.opr_setting_data = null;
    this.setting_data = null;
    this.log_setting_data = null;
    this.tile_setting_data = null;
    this.map_setting_data = null;
    // this.sidenavsetting.open();
  }
  timer: any = null;
  onlyCutoffTLPatrolling = false;

  ngOnInit() {
    this._signalr.pvmain = this;
    //this.appservice.iconFileRead().toPromise().then((data: any) => { this.iconDetails = data; console.log(this.iconDetails + "1") }, error => { this.iconDetails = null; });
    //this.iconDetails = this.appservice.IconLists;

    this.onlyCutoffTLPatrolling = !this.checkAdminAccess && this.checkScheduleTLPatrollingAccess;
    //this.appservice.openFullscreen();
    this.dragPosition = JSON.parse(localStorage.getItem("lastDragMenuPos"));
    //environment.defaultStateSidemenu = JSON.parse(localStorage.getItem("pinLeftSidenav"));
    //this.ifPinnedLeftSidenav = JSON.parse(localStorage.getItem("pinLeftSidenav")) == null ? environment.defaultStateSidemenu : JSON.parse(localStorage.getItem("pinLeftSidenav"));
    this.ifPinnedLeftSidenav = JSON.parse(localStorage.getItem("pinLeftSidenav")) == null ? true : JSON.parse(localStorage.getItem("pinLeftSidenav"));
    this.ifPinnedLeftSidenav = JSON.parse(localStorage.getItem("setLeftIconmenu")) == null ? true : JSON.parse(localStorage.getItem("setLeftIconmenu"));
    this.onLoadLeftSidenavSettings = this.ifPinnedLeftSidenav;
    this.isAlaramShow = localStorage.getItem("alarmShow") == "true";
    //this.objectcontrolService.svgiconRegistry();
    this.titleService.setTitle(environment.productName);
    // this.matIconRegistery.addSvgIcon("database", this.domSanitizer.bypassSecurityTrustResourceUrl("../assets/images/database.svg"));
    // this.matIconRegistery.addSvgIcon("push_pin", this.domSanitizer.bypassSecurityTrustResourceUrl("../../../assets/images/push_pin.svg"));
    this.appservice.InProgress = false;
    this.SwitchAccess = this.appservice.checkSwitchAccess();
    if (this.SwitchAccess == 'P')
      this.SwitchProjectText = this.locale_service.Locale.language.loginselect.projectswitch;
    else if (this.SwitchAccess == 'B')
      this.SwitchProjectText = this.locale_service.Locale.language.loginselect.baseswitch;
    this.sub.push(this.route.data.subscribe(data => { this.resolve(data); }));
    this.timer = setInterval(() => {
      if (this.appservice.saved_tab && this.response_counter++ >= 10) {
        this.response_counter = 0;
        this.appservice.setSavedTab(null);
        return;
      }
      this.currentTime = this.appservice.dateToString();
    }, 1000);

    this.appservice.setAllEnvironmentVariables(this.route.snapshot.root.firstChild.firstChild.data.viewData.environmentVariables);
    this.setupEnvironmentDependentFeatures();

    //this.isProjectViewActive();
    // Snackbar Stacking for notices
    const groupPathArray: string[] = this.route.snapshot.root.firstChild.firstChild.data.viewData.group_path;
    this.group_path = groupPathArray.join('/');
    this.userId = this.route.snapshot.data.viewData.user_id;
    this.unreadCount$ = this.appservice.unreadCount$;
    this.actionableUnreadCount$ = this.appservice.actionableUnreadCount$;

    if (this.group_path) {
      this.refreshUnreadCounts();
    }

    this.messageSubscription = this._signalr.GetMessages().subscribe((message: any) => {
      const notice = {
        _id: message._id,
        _rev: message._rev,
        sender: message.sender,
        receivingUsers: message.receivingUsers,
        receivingGroups: message.receivingGroups,
        messageText: message.messageText,
        timestamp: message.timestamp,
        isUrgent: message.isUrgent,
        isNotification: message.isNotification,
        isActionable: message.isActionable
      };

      if (
        //notice.isUrgent &&
        notice.sender.id !== this.userId &&
        (notice.receivingUsers.some(user => user.id === this.userId) ||
          notice.receivingGroups.includes(this.group_path))
      ) {
        this.addNoticeToQueue(notice);
        this.latestNotice = notice;
        if (notice.isActionable) {
          this.appservice.incrementActionableUnreadCount();
        } else {
          this.appservice.incrementUnreadCount();
        }
        /*this.showStackedNotifications();*/
      }
    });
    // this.appservice.showUrgentDlg$.subscribe(urgentDlgShow => {
    //   this.showUrgent = urgentDlgShow;
    // })

    this.urgentDlgSubscription = this.appservice.showUrgentDlg$.subscribe(data => {
      this.showUrgent = data.show;
      this.selectedNotificationType = data.type;
    });

    this.noticesRemovedSubscription = this._signalr.GetNoticesRemoved().subscribe((payload) => {
      // Also strip removed notices from the shared cache so they don't briefly
      // reappear when the user next opens the notification panel — the panel
      // reads from AppService.cachedNotices before its fresh fetch completes.
      if (payload?.maintenanceId) {
        this.appservice.removeCachedNoticesByMaintenanceId(payload.maintenanceId);
      }
      if (this.group_path) {
        this.refreshUnreadCounts();
      }
    });

    this.sub.push(
      this.platform.resume.subscribe(() => {
        if (this.group_path) {
          this.refreshUnreadCounts();
        }
      })
    );

    // Back from the main/home page: minimize (move to background) instead of
    // exitApp() — exitApp() kills the process and drops the login session, so
    // the user lands on the login screen the next time they open the app.
    // minimizeApp() matches the Android home-gesture behaviour: state and
    // session are preserved, and the app resumes exactly where it was.
    this.sub.push(
      this.platform.backButton.subscribeWithPriority(10, () => {
        App.minimizeApp();
      })
    );


  }

  private refreshUnreadCounts(): void {
    this.appservice.GetAllUnreadNotices(this.group_path)
      .then((data: any) => {
        if (data?.views) {
          const baseUnreadMessages = data.views
            .filter(message =>
              message.receivingUsers?.some(user => user.id === this.userId) ||
              message.receivingGroups?.includes(this.group_path)
            )
            .filter(message => !message.readBy?.includes(this.userId))
            .filter(message => !message.actionMetadata?.status || message.actionMetadata.status !== 'resolved');

          const unreadMessages = baseUnreadMessages.filter(message => !message.isActionable);
          const actionableMessages = baseUnreadMessages.filter(message => message.isActionable);

          this.appservice.setUnreadCount(unreadMessages.length);
          this.appservice.setActionableUnreadCount(actionableMessages.length);
        } else {
          this.appservice.setUnreadCount(0);
          this.appservice.setActionableUnreadCount(0);
        }
      })
      .catch(() => {
        this.appservice.setUnreadCount(0);
        this.appservice.setActionableUnreadCount(0);
      });
  }

  private setupEnvironmentDependentFeatures(): void {
    // All the environment-dependent code from your original ngOnInit goes here
    if (this.appservice.getEnvironmentValue("reloadPage") == true) {
      window.addEventListener('beforeunload', (event) => {
        event.returnValue = `Are you sure you want to leave?`;
      });
    }

    this.showAlarmText = this.appservice.getEnvironmentValue("showAlarmText");
    this.menuAllExpnaded = this.appservice.getEnvironmentValue("menuAllExpnaded");
    this.maintenanceModule = this.appservice.getEnvironmentValue("maintenanceModule");


    if (this.checkAccessPA$) {
      if (this.appservice.getEnvironmentValue("operationalModule")) {
        this.projectOptions = {
          basic: "view_day",
          image: "photo_library",
          alarm: "notifications_active",
          event: "event_note",
          sound: "sound_detection_loud_sound",
          element: "grid_view",
          usergrouprights: "people_outline",
          userposition: "how_to_reg",
          userroles: "manage_accounts",
          projectgroup: "supervised_user_circle",
          backupdb: "cloud_download",
          automaticreport: "autorenew",
          shiftset: "group_work",
          rostertab: "location_city"
        };
      } else {
        this.projectOptions = {
          basic: "view_day",
          image: "photo_library",
          alarm: "notifications_active",
          event: "event_note",
          sound: "sound_detection_loud_sound",
          element: "grid_view",
          usergrouprights: "people_outline",
          userposition: "how_to_reg",
          userroles: "manage_accounts",
          projectgroup: "supervised_user_circle",
          backupdb: "cloud_download",
          automaticreport: "autorenew",
        };
      }
    } else {
      this.dashSelect = "element";

      if (this.checkAccess$)
        this.projectOptions = {
          element: "grid_view",
          usergrouprights: "people_outline",
          userposition: "how_to_reg",
          userroles: "manage_accounts",
          shiftset: "group_work",
          rostertab: "location_city"
        };
      else
        this.projectOptions = {
          element: "grid_view",
          shiftset: "group_work",
          rostertab: "location_city"
        };

    }

    this.projectSettings = Object.keys(this.projectOptions);
    if (this.onlyCutoffTLPatrolling) {
      this.maintenanceOptions = {
        cutoff: "grid_view"
      };
    } else {
      this.maintenanceOptions = {
        frqnc: "alarm",
        actp: "local_activity",
        actpmap: "local_activity",
        tlmnt: "view_day",
        ssmnt: "photo_library",
        hmnt: "laptop",
        baymnt: "notifications_active",
        eqmnt: "sound_detection_loud_sound",
        cutoff: "grid_view",
        add_update_device: "cloud_download",
        database_mapping: "open_with",
        manual_doc: "storage"
      };
    }

    this.maintenanceSettings = Object.keys(this.maintenanceOptions);
    this.mnttab = this.maintenanceSettings[0];
  }

  private addNoticeToQueue(notice: Notice): void {
    this.activeNotices.push(notice);

    /*if (this.activeNotices.length > 5) {
      this.activeNotices.shift();
    }*/
  }

  /*showStackedNotifications() {
console.log("called", this.activeNotices);

if (this.snackBarRef) {
  this.snackBarRef.instance.updateNotices([...this.activeNotices]);
} else {
  this.snackBarRef = this._snackBar.openFromComponent(SnackbarStackComponent, {
    duration: 0,
    verticalPosition: 'top',
    horizontalPosition: 'end',
    panelClass: ['transparent-snackbar', 'custom-snackbar-position'],
    data: [...this.activeNotices]
  });

  // Subscribe to the close event
  this.snackBarRef.instance.noticeClose.subscribe((index: number) => {
    // Remove the notice from activeNotices array
    if (index >= 0 && index < this.activeNotices.length) {
      this.activeNotices.splice(index, 1);
    }
  });
}
}*/

  isProjectViewActive() {
    if (this.viewData.menu.projectViews.find(view => view.name == this.viewData.viewData.name)) {
      return true;
    }
    return false;
  }
  lockViewCondi(rights: any): boolean {
    /*viewData.menu.usr.rights[0].group_rights != undefined && (viewData.menu.usr.rights[0].group_rights[index].lockViews == undefined || viewData.menu.usr.rights[0].group_rights[0].lockViews == false)*/
    if (rights.group_rights != undefined) {
      for (let cnt = 0; cnt < rights.group_rights.length; cnt++) {
        if (rights.group_rights[cnt].lockViews == true)
          return false;
        else
          return true;
      }
    }
    else {
      return true;
    }
  }
  alaramShowToggle() {
    this.isAlaramShow = !this.isAlaramShow;
    localStorage.setItem("alarmShow", this.isAlaramShow.toString());
  }
  usrDetails: any;
  public queryParams: any = null;
  resolve(data) {
    //console.log(this.iconDetails + "3");
    this.project_Id = this.route.snapshot.paramMap.get('id');
    this.checkAccess$ = this.resolver.checkAccess(GroupAccessRight.Admin, this.route.snapshot, false);
    this.checkAccessPA$ = this.resolver.checkAccess(GroupAccessRight.ProjectAdmin, this.route.snapshot, false);
    this.viewData = data.viewData;
    this.umacStatus = data.viewData.umac_client_status;
    this.DbStatus = data.viewData.db_connected;
    this.titleService.setTitle(environment.productName + " - " + this.viewData.cfg.title);
    this.myParentPath = "/project/" + this.project_Id;
    if (this.viewData.cfg.logo)
      this.projectLogo = this.appservice.GetImagePathById(this.project_Id) + this.viewData.cfg.logo;
    /*if (this.viewData.view != null) {
      if (this.viewData.view.startsWith('_P') || this.viewData.view.charAt(0) == 'P')
        this.projectsidemenupanel.open();
      else if (this.viewData.view.charAt(0) == 'U')
        this.usersidemenupanel.open();
      //  else if (this.viewData.view.startsWith('_L'))
      //    this.lssidemenupanel.open();
    }*/

    if (this.viewData.group_path != null) {
      this.myParentPath += '/' + this.viewData.group_path.join('/');
      let query_params: any = null;
      if (this.viewData.view != null && this.viewData.view != "") {
        query_params = { view: this.viewData.view };
        if (this.viewData.parameters != null) {
          query_params.params = this.viewData.parameters;
          this.location.replaceState(this.myParentPath, 'view=' + encodeURIComponent(this.viewData.view) + "&params=" + encodeURIComponent(JSON.stringify(this.viewData.parameters)));
        }
        else
          this.location.replaceState(this.myParentPath, 'view=' + encodeURIComponent(this.viewData.view));
      }
      else
        this.location.replaceState(this.myParentPath);
      this.queryParams = query_params;
    }
    // If no view is selected (e.g. first login), navigate to the first available view
    if (!this.viewData.viewData) {
      const firstView: any = this.viewData.menu?.userViews?.[0]
        ?? this.viewData.menu?.projectViews?.[0];
      if (firstView) {
        const prefix = this.viewData.menu?.userViews?.[0] ? 'U' : 'P';
        this.router.navigate([this.myParentPath], {
          queryParams: { view: prefix + firstView.name },
          replaceUrl: true
        });
        return;
      }
    }
    try {
      this.loadComponent();
    } catch (e) {
      console.error('loadComponent failed:', e);
    }

    const getValidViewGroups = (viewgroups, projectViews, cur_group_path, viewData) => {

      let grps = [];
      const changedViews = [];
      if (viewgroups)
        viewgroups.forEach(el => {
          if (!el.isshortcut) {
            if (!el.viewlist)
              el.viewlist = [];
            let match = false;
            if (el.path == cur_group_path)
              for (let viewind = 0; viewind < projectViews.length; viewind++) {
                let provw = projectViews[viewind]
                //if (el.views.includes(provw.view_id)) {
                if (el.views.includes(provw.name)) {
                  el.viewlist.push(provw);
                  projectViews.splice(viewind, 1); // remove from main list
                  if (viewData.viewData._id == provw.view_id)
                    viewData.viewData.viewgroup = el.name;
                  viewind--;
                  match = true;
                }
              }
            if (match)
              grps.push(el);  // to show on html
          }
        });
      const assignOrderIfMissing = (list) => {
        list.forEach((v, index) => {
          if (v.order == null || v.order !== index) {
            v.order = index;
            changedViews.push({ _id: v.view_id, order: v.order });
          }
        });
      };

      grps.forEach((grp) => {
        if (grp.viewlist && grp.viewlist.length > 0) assignOrderIfMissing(grp.viewlist);
      });

      if (projectViews && projectViews.length > 0) assignOrderIfMissing(projectViews);


      if (changedViews.length > 0) {
        this.updateExistingViewsOrder(changedViews);
      }

      return grps;
    }
    this.validViewGroups = getValidViewGroups(this.viewData.viewgroups, this.viewData.menu.projectViews, this.viewData.group_path.join('/'), this.viewData)
    // Exclude views that are already shown inside a group to avoid duplication
    const groupedNames = new Set<string>(this.validViewGroups.flatMap((g: any) => (g.viewlist || []).map((v: any) => v.name)));
    this.ungroupedProjectViews = (this.viewData.menu.projectViews || []).filter((v: any) => !groupedNames.has(v.name));

    this.appservice.InProgress = false;
    //console.log(this.iconDetails + "4");
  }
  ngOnDestroy() {
    //console.log(this.iconDetails + "5");
    for (let subs of this.sub)
      subs.unsubscribe();
    clearInterval(this.timer);
    if (this.parent_tab)
      clearInterval(this.parent_timer);
    if (this.messageSubscription) {
      this.messageSubscription.unsubscribe();
    }
    if (this.noticesRemovedSubscription) {
      this.noticesRemovedSubscription.unsubscribe();
    }
    if (this.urgentDlgSubscription) {
      this.urgentDlgSubscription.unsubscribe();
    }
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    //  if (this.snackBarRef) {
    //    this.snackBarRef.dismiss();
    //  }
  }

  popupComponent(type, viewData) {
    this.loadComponentInternal(type, viewData);
  }

  // dragEnd($event: CdkDragEnd) {

  //   this.dragPosition = $event.source.getFreeDragPosition();
  //   localStorage.setItem("lastDragMenuPos", JSON.stringify(this.dragPosition));
  // }


  @HostListener('window:resize', ['$event'])
  onResize(event) {
    this.innerHeight = event.target.innerHeight;
    //console.log(this.innerHeight);
    let lastDragMenuPosY = localStorage.getItem("lastDragMenuPos") ? JSON.parse(localStorage.getItem("lastDragMenuPos")).y : 0;

    if (this.innerHeight <= 900 && (lastDragMenuPosY >= 352 || lastDragMenuPosY <= -352)) {
      this.dragPosition = { x: 0, y: 0 };
      localStorage.setItem("lastDragMenuPos", JSON.stringify(this.dragPosition));
    }

    if (this.innerHeight <= 800 && (lastDragMenuPosY >= 302 || lastDragMenuPosY <= -302)) {
      this.dragPosition = { x: 0, y: 0 };
      localStorage.setItem("lastDragMenuPos", JSON.stringify(this.dragPosition));
    }

    if (this.innerHeight <= 700 && (lastDragMenuPosY >= 252 || lastDragMenuPosY <= -252)) {
      this.dragPosition = { x: 0, y: 0 };
      localStorage.setItem("lastDragMenuPos", JSON.stringify(this.dragPosition));
    }
  }
  pinLeftSidenav() {
    this.ifPinnedLeftSidenav = !this.ifPinnedLeftSidenav;
    localStorage.setItem("pinLeftSidenav", this.ifPinnedLeftSidenav.toString());
  }

  loadComponent() {
    if (!this.viewData?.viewData) return;
    this.loadComponentInternal(this.viewData.viewData.detail.type, this.viewData.viewData);

    // if (this.ifPinnedLeftSidenav == false) {
    //   this.sidenav?.close();
    // }
    // this.resolver.isHandset$.subscribe((res) => {
    //   if (res) {
    //     this.sidenav?.close();
    //   }
    //   else if (!res && this.ifPinnedLeftSidenav == true) {
    //     this.sidenav?.open();
    //   }
    // });

  }
  private loadComponentInternal(type, viewData) {
    const viewContainerRef = this.proj_view_comp.viewContainerRef;
    viewContainerRef.clear();
    // if (this.projectSettingView) {
    //   viewContainerRef.createComponent(this.componentFactoryResolver.resolveComponentFactory(ProjectSettingsComponent));
    //   return;
    // }
    // if (this.maintenanceView) {
    //   viewContainerRef.createComponent(this.componentFactoryResolver.resolveComponentFactory(TemplateMaintenanceComponent));
    //   return;
    // }
    if (viewData != null) {
      //if (this.viewData.view != null && this.viewData.view.charAt(0) == 'L') {
      //    let componentFactory;
      //    componentFactory = this.componentFactoryResolver.resolveComponentFactory(LoadSheddingMainComponent);
      //    let componentRefInst: any = viewContainerRef.createComponent(componentFactory).instance;
      //    componentRefInst.viewData = this.viewData.viewData;

      //}
      //else
      //if (viewData.viewData != null) {
      let componentFactory;
      if (type == 'maintenance_dashboard') {
        componentFactory = this.componentFactoryResolver.resolveComponentFactory(MaintenanceDashboardComponent);
      } else if (type.includes('plan_')) {
        componentFactory = this.componentFactoryResolver.resolveComponentFactory(PvPlanMaintenanceComponent);
      }
      // else if (type == 'grouporder')
      //   componentFactory = this.componentFactoryResolver.resolveComponentFactory(PvGroupOrderComponent);
      // else if (type == 'cutoff')
      //   componentFactory = this.componentFactoryResolver.resolveComponentFactory(CutoffScheduleComponent);
      // else if (type.charAt(0) == 'd' || type == "mnt_opr_dashboard")
      //   componentFactory = this.componentFactoryResolver.resolveComponentFactory(DashBoardComponent);
      // else if (type.charAt(0) == 'r' && type.charAt(7) == 'v')
      //   componentFactory = this.componentFactoryResolver.resolveComponentFactory(RosterManagementComponent);
      // else if (type.charAt(0) == 'r')
      //   componentFactory = this.componentFactoryResolver.resolveComponentFactory(DashBoardComponent);
      // else if (type.charAt(0) == 'o')
      //   componentFactory = this.componentFactoryResolver.resolveComponentFactory(PvOperationalViewComponent); //PvOperationalViewComponent
      // else if (type.charAt(0) == 'g' && type.charAt(2) == 'p')
      //   //componentFactory = this.componentFactoryResolver.resolveComponentFactory(GroupOperationalViewComponent); //PvGroupOperationalViewComponent
      //   componentFactory = this.componentFactoryResolver.resolveComponentFactory(PvOperationalViewComponent); //PvOperationalViewComponent
      // else if (type.charAt(0) == 'f')
      //   componentFactory = this.componentFactoryResolver.resolveComponentFactory(PVTrippingReportComponent);
      // else if (type.charAt(0) == 'e' && type.charAt(5) == 'l')
      //   componentFactory = this.componentFactoryResolver.resolveComponentFactory(EventLogViewComponent);
      // else if (type.charAt(0) == 'e')
      //   componentFactory = this.componentFactoryResolver.resolveComponentFactory(PVEventComponent);
      // else if (type.charAt(0) == 'l')
      //   componentFactory = this.componentFactoryResolver.resolveComponentFactory(LogStartupValueComponent);
      // else if (type.charAt(0) == 'a')
      //   componentFactory = this.componentFactoryResolver.resolveComponentFactory(PVAlarmComponent);
      // else if (type.charAt(1) == 'e') {
      //   if (type.charAt(8) == 'e')
      //     componentFactory = this.componentFactoryResolver.resolveComponentFactory(PVTrippingReportComponent);
      //   else
      //     componentFactory = this.componentFactoryResolver.resolveComponentFactory(LoadSheddingMainComponent);
      // }
      // else if (type.charAt(0) == 's')
      //   if (type.charAt(1) == 'h')
      //     componentFactory = this.componentFactoryResolver.resolveComponentFactory(ShiftSummaryComponent);
      //   else
      //     componentFactory = this.componentFactoryResolver.resolveComponentFactory(PVStatusComponent);
      // else if (type.charAt(0) == 't')
      //   componentFactory = this.componentFactoryResolver.resolveComponentFactory(PVLiveTrendComponent);
      // else if (type.charAt(0) == 'h')
      //   componentFactory = this.componentFactoryResolver.resolveComponentFactory(PVHistoryComponent);
      // else if (type.charAt(0) == 'g')
      //   componentFactory = this.componentFactoryResolver.resolveComponentFactory(PveditorComponent);

      else
        return;
      // Set viewtype on resolver so updateDataReceived can route data to the right component
      this.resolver.viewtype = type;
      let componentRefInst: any = viewContainerRef.createComponent(componentFactory).instance;
      componentRefInst.viewData = viewData;
      //}
    }
  }
  signout() {
    this.appservice.InProgress = true;
    this.projectSettingView = false;
    this.maintenanceView = false;
    this.appservice.LogoutUser().finally(() => { this.router.navigateByUrl('/login'); });
  }
  routeLastFirstChiild = null;
  routerLastSnapshot = null;
  toggleProjectView() {
    this.viewData.menu.breadCrumbSelection = this.lastBreadCrumb;
    this.projectSettingView = false;
    setTimeout(() => {
      this.resolver.reloadMain(this.routeLastFirstChiild, this.routerLastSnapshot);
    }, 500)
    this.loadComponent();
  }

  toggleMaintenanceView() {
    this.viewData.menu.breadCrumbSelection = this.lastBreadCrumb;
    this.maintenanceView = false;
    setTimeout(() => {
      this.resolver.reloadMain(this.routeLastFirstChiild, this.routerLastSnapshot);
    }, 500)
    this.loadComponent();
  }

  async openAbout() {
    await this.menuCtrl.close();
    const modal = await this.modalController.create({
      component: AboutConfigurationDlgComponent,
      cssClass: 'about-config-modal',
      backdropDismiss: false
    });
    await modal.present();
  }

  async confirmsignout() {
    const alert = await this.alertCtrl.create({
      header: 'Logout',
      message: 'Are you sure you want to logout?',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Logout', role: 'destructive', handler: () => { this.signout(); } }
      ]
    });
    await alert.present();
  }

  @HostListener('window:message', ['$event'])
  oneventmessage(e: MessageEvent) {
    if (e.data && e.data.type === "RBH_ITX") {
      if (this.appservice.saved_tab) {
        if (e.source == this.appservice.saved_tab) {
          if (e.data.msg === 'started')
            console.log('Dublicate tab connected');
          else if (e.data.msg === 'timer') {
            this.response_counter = 0;
            console.log(this.response_counter, 'duplicate');
            this.appservice.saved_tab.postMessage({ type: "RBH_ITX", msg: 'timer' });
          }
          else if (e.data.msg === 'link') {
            //console.log([e.data.path], { queryParams: { view: e.data.view_type.toUpperCase() + e.data.name } })
            this.router.navigate([e.data.path], { queryParams: { view: e.data.view_type.toUpperCase() + e.data.name } });
          }
        }
      }
      else if (e.data.msg === 'duplicate_alive') {
        console.log('Duplicate tab is alive trying to reconnect.');

        if (!this.appservice.saved_tab) {
          const child = window.open("", "duplicate_a_tab");
          if (child && !child.closed) {
            this.appservice.setSavedTab(child);
          }
        }
        this.appservice.saved_tab?.postMessage({ type: "RBH_ITX", msg: "timer" });
      }
      else if (this.parent_tab) {
        if (e.source == this.parent_tab) {
          if (e.data.msg === 'timer') {
            this.response_counter = 0;
            //console.log(this.response_counter, 'parent');
          }
          else if (e.data.msg === 'link') {
            //console.log([e.data.path], { queryParams: { view: e.data.view_type.toUpperCase() + e.data.name } })

            this.router.navigate([e.data.path], { queryParams: { view: e.data.view_type.toUpperCase() + e.data.name } });
          }
        }

      }
      //else
      // alert(e.data.msg);
    };
  }

  duplicateTab() {
    //if (link == null) {
    this.appservice.setSavedTab(window.open(window.location.href, "duplicate_a_tab"));
  }

  onrightClick(event: MouseEvent) {
    event.preventDefault();
    (event.target as any).nextElementSibling.click();
  }

  onDupliClick(veiwDetail, type: string, myParentPath) {
    if (this.appservice.saved_tab)
      this.appservice.saved_tab.postMessage({ type: "RBH_ITX", msg: 'link', name: veiwDetail.name, view_type: type, path: myParentPath });
    else if (this.parent_tab) {
      console.log("hii", { type: "RBH_ITX", msg: 'link', name: veiwDetail.name, view_type: type, path: myParentPath });
      this.parent_tab.postMessage({ type: "RBH_ITX", msg: 'link', name: veiwDetail.name, view_type: type, path: myParentPath });
    }
  }

  // switchProjectConfig(formVal?: any) {
  //   const dialogRef = this.dialog.open(LoginSelectorComponent, {
  //     width: '350px', closeOnNavigation: true, disableClose: true, autoFocus: true,
  //     data: { start: false, switchDialog: this.SwitchAccess, formVal }
  //   });
  //   dialogRef.afterClosed().subscribe(result => {
  //     if (!isNullOrUndefined(result)) {
  //       if (result.error != null)
  //         this.signout();
  //       else if (result.switch == 'P' || result.switch == 'C') {
  //         this.appservice.InProgress = true;
  //         let cur_mode = this.appservice.GetLoginModeDetails();
  //         if (result.switch == cur_mode.mode && (result.switch != 'P' || cur_mode.project_id == result.formVal.projectID)) {
  //           this.appservice.InProgress = false;
  //           this._snackBar.open(this.locale_service.Locale.language.login.alreadylogin, "",
  //             {
  //               duration: 2000
  //             });
  //           return;
  //         }

  //         this.appservice.SetLoginMode(result.switch, result.switch == 'P' ? result.formVal.projectID : 0, result.formVal.password).then(() => {
  //           this._snackBar.open(this.locale_service.Locale.language.login.logsuccess, "",
  //             {
  //               duration: 2000
  //             });
  //           if (result.switch == 'P') {
  //             let proj_id = result.formVal.projectID;
  //             this.router.navigateByUrl('/project/' + proj_id);
  //           }
  //           else
  //             this.router.navigateByUrl('/config');
  //         }).catch((ret) => {

  //           this._snackBar.open(this.locale_service.Locale.language.errorcode[ret], this.locale_service.Locale.language.common.failed,
  //             {
  //               duration: 2000
  //             });
  //           if (ret == 'pass') {
  //             this.appservice.InProgress = false;
  //             this.switchProjectConfig(result.formVal);
  //           }
  //           else
  //             this.signout();
  //         });
  //       }
  //     }
  //   });
  // }

  // changePassword() {
  //   this.dialog.open(PasswordDlgComponent,
  //     {
  //       width: '350px', closeOnNavigation: true, disableClose: false, autoFocus: true,
  //       data: { type: null }
  //     });
  // }
  // editorCustomShape() {
  //   this.dialog.open(PvShapeDlgComponent,
  //     {
  //       closeOnNavigation: true, disableClose: true, autoFocus: true, height: "50%", width: "30%",
  //       data: { project_id: this.route.snapshot.root.firstChild.firstChild.data.viewData.viewData.project, edit: true }
  //     });
  // }
  // binaryReportClick() {
  //   this.dialog.open(PVBinaryReportComponent, {
  //     closeOnNavigation: true, autoFocus: true, height: "100%", width: "100%"
  //   });
  // }
  projectSettingClick() {
    if (this.maintenanceView) {
      this.maintenanceView = false;
    }
    this.projectSettingView = true;
    this.routeLastFirstChiild = this.route.snapshot.root.firstChild.firstChild;
    this.routerLastSnapshot = this.router.routerState.snapshot;
    this.lastBreadCrumb = this.viewData.menu.breadCrumbSelection;
    //this.resolver.selOptions = this.projectOptions;
    this.loadComponent()
    //this.dialog.open(ProjectSettingsComponent, {
    //  width: '1000px', closeOnNavigation: true, disableClose: true, autoFocus: true,
    //})
  }

  maintenanceClick() {
    if (this.projectSettingView) {
      this.projectSettingView = false;
    }
    this.maintenanceView = true;
    this.routeLastFirstChiild = this.route.snapshot.root.firstChild.firstChild;
    this.routerLastSnapshot = this.router.routerState.snapshot;
    this.lastBreadCrumb = this.viewData.menu.breadCrumbSelection;
    //this.resolver.selOptions = this.projectOptions;
    this.loadComponent()
    //this.dialog.open(ProjectSettingsComponent, {
    //  width: '1000px', closeOnNavigation: true, disableClose: true, autoFocus: true,
    //})
  }

  //for adding new view
  // viewAddClick(type: string) {
  //   this.dialog.open(PvAddUpdateViewDetailDlg, {
  //     width: '650px', height: '650px', closeOnNavigation: true, disableClose: true, autoFocus: true,
  //     data: { type }
  //   });
  // }
  // viewEditClick(veiwDetail, type: string) {
  //   this.dialog.open(PvAddUpdateViewDetailDlg, {
  //     width: '650px', height: '550px', closeOnNavigation: true, disableClose: true, autoFocus: true,
  //     data: { obj: veiwDetail, type }
  //   });
  // }
  // viewCopyDashboard(veiwDetail, type: string) {
  //   this.dialog.open(PvAddUpdateViewDetailDlg, {
  //     width: '650px', height: '550px', closeOnNavigation: true, disableClose: true, autoFocus: true,
  //     data: { obj: veiwDetail, type, copy: true }
  //   });
  // }
  // viewRemoveClick(veiwDetail, index, type: string, viewgroups = false) {
  //   this.dialog.open(ConfirmationDlgComponent, {
  //     width: '270px', closeOnNavigation: true, disableClose: false, autoFocus: true,
  //     data: {
  //       Question: this.locale_service.Locale.language.project.projectsettings.deleteviewask,
  //       YesText: this.locale_service.Locale.language.common.yes,
  //       NoText: this.locale_service.Locale.language.common.no
  //     }
  //   }).afterClosed().subscribe(data => {
  //     if (data) {
  //       this.appservice.InProgress = true;
  //       let deletedViewId = veiwDetail.name;
  //       this.sub.push(this.appservice.deleteView(veiwDetail.view_id, type, this.viewData.group_path.join('/')).subscribe(data => {
  //         if (data === '') {
  //           //this.viewData.menu.projectViews.splice(index, 1);
  //           if (this.viewData.viewData._id == veiwDetail.view_id) {
  //             if (this.viewData.menu.projectViews.length > 0)
  //               this.router.navigate(['/project/' + this.project_Id + '/' + this.viewData.group_path.join('/')], { queryParams: { view: 'P' + this.viewData.menu.projectViews[0].name } });
  //             else
  //               this.router.navigate(['/project/' + this.project_Id + '/' + this.viewData.group_path.join('/')], { queryParams: { view: '_PE' } });
  //             //console.log("hiii")
  //           }
  //           else {
  //             if (type == 'p') {
  //               this._snackBar.open(this.locale_service.Locale.language.project.addview.viewdelSucc, null,
  //                 {
  //                   duration: 2000
  //                 });
  //               this.viewData.menu.projectViews.splice(index, 1);
  //               this.viewData.menu.projectViews = this.viewData.menu.projectViews.slice();
  //             }
  //             else {
  //               this._snackBar.open(this.locale_service.Locale.language.project.addview.usrviewdelSucc, null,
  //                 {
  //                   duration: 2000
  //                 });
  //               this.viewData.menu.userViews.splice(index, 1);
  //               this.viewData.menu.userViews = this.viewData.menu.userViews.slice();
  //             }
  //           }
  //         }
  //         else if (!data)
  //           this._snackBar.open(this.locale_service.Locale.language.errorcode.api, this.locale_service.Locale.language.common.failed,
  //             {
  //               duration: 2000
  //             });
  //         else {
  //           this._snackBar.open(this.locale_service.Locale.language.errorcode[this.locale_service.Locale.language.common.failed], this.locale_service.Locale.language.common.failed,
  //             {
  //               duration: 2000
  //             });
  //         }

  //         this.appservice.InProgress = false;
  //       }));
  //       if (viewgroups) { // delete group if all views within are deleted
  //         const current_path = this.route.snapshot.root.firstChild.firstChild.data.viewData.group_path.join('/');
  //         if (this.viewData.viewgroups != null || this.viewData.viewgroups != undefined) {
  //           for (let grp of this.viewData.viewgroups) {
  //             let updateGrp = false;
  //             if (!grp.isshortcut)
  //               if (grp.path == current_path && grp.views.includes(deletedViewId)) {
  //                 updateGrp = true;
  //                 grp.views.splice(grp.views.indexOf(deletedViewId), 1);
  //                 if (grp.views.length == 0) {
  //                   this.appservice.DeleteProjectViewGroup(grp.name, this.viewData.group_path.join('/')).then(data => {
  //                     if (this.viewData.menu.projectViews.length > 0)
  //                       this.router.navigate(['/project/' + this.project_Id + '/' + this.viewData.group_path.join('/')], { queryParams: { view: 'P' + this.viewData.menu.projectViews[0].name } });
  //                     else
  //                       this.router.navigate(['/project/' + this.project_Id + '/' + this.viewData.group_path.join('/')], { queryParams: { view: '_PE' } });
  //                     this.viewData.viewgroups = this.viewData.viewgroups.slice();
  //                   })
  //                 }
  //                 if (updateGrp) {
  //                   this.appservice.UpdateProjectViewGroupFromPVG(grp).then((data: any) => {
  //                     if (data.code && data.code != '') {
  //                       this._snackBar.open(this.locale_service.Locale.language.errorcode[data.code], this.locale_service.Locale.language.common.failed,
  //                         {
  //                           duration: 2000
  //                         });
  //                     }
  //                   });
  //                 }
  //                 break;
  //               }
  //           }
  //         }
  //       }
  //     }
  //   });
  // }
  // setAsMyLink(veiwDetail) {
  //   this.dialog.open(DashViewMylinksDlgComponent, {
  //     width: '430px', closeOnNavigation: true, disableClose: false, autoFocus: true,
  //     data: { obj: veiwDetail }
  //   })
  // }
  // editMyLink(viewDetail, projgrp) {
  //   this.dialog.open(DashViewMylinksDlgComponent, {
  //     width: '430px', closeOnNavigation: true, disableClose: false, autoFocus: true,
  //     data: { obj: viewDetail, type: "edit", projgrp: projgrp }
  //   })
  // }
  //   private moveInList(list: any[], viewId: string, direction: 'up' | 'down', group?: any): boolean {
  //   const index = list.findIndex(v => v.view_id === viewId);
  //   if (index === -1) return false;

  //   let swapIndex = -1;
  //   if (direction === 'up' && index > 0) {
  //     swapIndex = index - 1;
  //   } else if (direction === 'down' && index < list.length - 1) {
  //     swapIndex = index + 1;
  //   }
  //   if (swapIndex === -1) return false;
  //   const dialogRef = this.dialog.open(ConfirmationDlgComponent, {
  //     data: {
  //       Question: this.locale_service.Locale.language.common.questionForSave,
  //       YesText: this.locale_service.Locale.language.common.yes,
  //       NoText: this.locale_service.Locale.language.common.no
  //     }
  //   });
  //     dialogRef.afterClosed().subscribe((confirmed: boolean) => {
  //       if (!confirmed) return; 

  //       [list[index], list[swapIndex]] = [list[swapIndex], list[index]];

  //       this.updateOrdersAndSync(list);

  //       if (group) {
  //         group.viewlist = [...group.viewlist];
  //       } else if (list === this.viewData.menu.userViews) {
  //         this.viewData.menu.userViews = [...this.viewData.menu.userViews];
  //       } else if (list === this.viewData.menu.projectViews) {
  //         this.viewData.menu.projectViews = [...this.viewData.menu.projectViews];
  //       }
  //     });

  //   return true;
  // }

  // moveViewUp(viewId: string): void {
  //   if (this.validViewGroups) {
  //     const group = this.validViewGroups.find(g =>
  //       (g.viewlist || []).some(v => v.view_id === viewId)
  //     );
  //     if (group?.viewlist && this.moveInList(group.viewlist, viewId, 'up', group)) return;
  //   }
  //   const userGroup = { viewlist: this.viewData.menu.userViews };
  //   if (this.moveInList(this.viewData.menu.userViews, viewId, 'up', userGroup)) {
  //     return;
  //   }
  //   const projectGroup = { viewlist: this.viewData.menu.projectViews };
  //   if (this.moveInList(this.viewData.menu.projectViews, viewId, 'up', projectGroup)) {
  //     return;
  //   }
  // }

  // moveViewDown(viewId: string): void {
  //   if (this.validViewGroups) {
  //     const group = this.validViewGroups.find(g =>
  //       (g.viewlist || []).some(v => v.view_id === viewId)
  //     );
  //     if (group?.viewlist && this.moveInList(group.viewlist, viewId, 'down', group)) return;
  //   }
  //   const userGroup = { viewlist: this.viewData.menu.userViews };
  //   if (this.moveInList(this.viewData.menu.userViews, viewId, 'down', userGroup)) {
  //     return;
  //   }
  //   const projectGroup = { viewlist: this.viewData.menu.projectViews };
  //   if (this.moveInList(this.viewData.menu.projectViews, viewId, 'down', projectGroup)) {
  //     return;
  //   }
  // }

  updateOrdersAndSync(views: any[]): void {
    const changedViews = [];

    views.forEach((view, i) => {
      const newOrder = i;
      if (view.order == null || view.order !== newOrder) {
        changedViews.push({
          _id: view.view_id,
          order: newOrder,
        });
      }
    });

    if (changedViews.length > 0) {
      const payload = { changedViews };

      this.appservice.updateGlobalViewOrder(payload).subscribe({
        next: (res) => {
          if (res._rev) {
            this.viewData.menu.projectConfig._rev = res._rev;
          }
        },
        error: (err) => {
          console.error('Failed to update order', err);
        }
      });
    }
  }



  setAsDefault(viewId: string) {
    const updatedViews = [...this.viewData.menu.userViews, ...this.viewData.menu.projectViews, ...this.validViewGroups.flatMap(g => g.viewlist || [])]
      .map(v => {
        return {
          _id: v.view_id,
          is_default: v.view_id === viewId
        };
      });

    this.appservice.UpdateDefaultView(updatedViews).subscribe(res => {
      console.log("Default view updated", res);
      [...this.viewData.menu.userViews, ...this.viewData.menu.projectViews, ...this.validViewGroups.flatMap(g => g.viewlist || [])].forEach(v => {
        v.is_default = (v.view_id === viewId);
      });
    });
  }
  // deleteMyLink(viewDetail, projgrp) {
  //   this.dialog.open(ConfirmationDlgComponent, {
  //     width: '275px', closeOnNavigation: true, disableClose: true, autoFocus: true,
  //     data: {
  //       Question: this.locale_service.Locale.language.project.projectsettings.deleteviewask,
  //       YesText: this.locale_service.Locale.language.common.yes,
  //       NoText: this.locale_service.Locale.language.common.no
  //     }
  //   }).afterClosed().subscribe(data => {
  //     if (data) {
  //       this.appservice.InProgress = true;
  //       this.sub.push(this.appservice.DeleteLinkView(viewDetail.name, projgrp, viewDetail.view, viewDetail.path).subscribe((data: any) => {
  //         if (!data)
  //           this._snackBar.open(this.locale_service.Locale.language.errorcode.api, this.locale_service.Locale.language.common.failed,
  //             {
  //               duration: 2000
  //             });
  //         else if (data.code && data.code != '') {
  //           this._snackBar.open(this.locale_service.Locale.language.errorcode[data.code], this.locale_service.Locale.language.common.failed,
  //             {
  //               duration: 2000
  //             });
  //         }
  //         else {
  //           //let index = this.viewData.menu.projectConfig.links.findIndex(data => data.name == viewDetail.name);
  //           //this.viewData.menu.projectConfig.links.splice(index, 1);
  //           //this.viewData.menu.projectConfig.links = this.viewData.menu.projectConfig.links.slice();
  //           this.resolver.reloadMain(this.route.snapshot.root.firstChild.firstChild, this.router.routerState.snapshot);
  //           this._snackBar.open(this.locale_service.Locale.language.project.mylinkdeletesuccess, null, {
  //             duration: 2000
  //           });
  //         }
  //         this.appservice.InProgress = false;

  //         //    if (data != null) {
  //         //      if (data == "") {
  //         //        let index = this.viewData.menu.projectConfig.links.findIndex(detail => detail.name == viewDetail.name);
  //         //        this.viewData.menu.projectConfig.links.splice(index, 1);
  //         //        this.viewData.menu.projectConfig.links = this.viewData.menu.projectConfig.links.slice();
  //         //        this._snackBar.open(this.locale_service.Locale.language.project.mylinkdeletesuccess, null, {
  //         //          duration: 2000
  //         //        });
  //         //      }
  //         //      else
  //         //        this._snackBar.open(this.locale_service.Locale.language.errorcode[data], this.locale_service.Locale.language.common.failed,
  //         //          {
  //         //            duration: 2000
  //         //          });
  //         //    //}
  //         //    //else
  //         //    //  this._snackBar.open(this.locale_service.Locale.language.errorcode.api, this.locale_service.Locale.language.common.failed,
  //         //    //    {
  //         //    //      duration: 2000
  //         //    //    });
  //         //      this.appservice.InProgress = false;
  //       }));
  //     }
  //   });
  // }
  getUserLinkParam(viewDetail) {
    return { view: viewDetail.view, params: JSON.stringify(viewDetail.params) }
  }
  public style: object = {};

  // validate(event: ResizeEvent): boolean {
  //   const MIN_DIMENSIONS_PX: number = 310;
  //   if (event.rectangle.width && event.rectangle.width < MIN_DIMENSIONS_PX)
  //     return false;
  //   return true;
  // }
  setting_width: string = '700px';
  // onResizeEnd(event: ResizeEvent): void {
  //   this.setting_width = `${event.rectangle.width}px`;
  // }
  //duringResize(event: ResizeEvent): void {
  //  this.setting_width = `${event.rectangle.width}px`;
  //}
  // openEditorSettings(data: any) {
  //   this.dialog.open(PveditorComponent, {

  //     closeOnNavigation: true, autoFocus: true, height: "88%", width: "150%", panelClass: 'custom-dialog-container', data
  //   });
  // }  
  viewProVwMenuUpdate(viewData): boolean {
    if (viewData.viewgroups != null || viewData.viewgroups != undefined) {
      for (let cnt = 0; cnt < viewData.viewgroups.length; cnt++) {
        if (viewData.viewgroups[cnt].links != undefined) {
          for (let cntin = 0; cntin < viewData?.viewgroups[cnt]?.links.length; cntin++) {
            for (let provwcnt = 0; provwcnt < viewData.menu.projectViews.length; provwcnt++) {
              if (viewData?.viewgroups[cnt]?.links[cntin]?.params?.view_id == viewData.menu.projectViews[provwcnt].view_id) {
                viewData.menu.projectViews.splice(provwcnt, 1);
                return true;
              }
            }
          }
        }
      }
      return false;
    }
  }
  viewGroupShow(viewgroup, viewData) {
    let path = viewData.group_path.join('/');
    let links = viewgroup.links;
    if (links && links.length > 0) {
      links = links.filter((view) => view.path == path)
      viewgroup.links = links;
      if (links.length > 0 && links[0].path == path)
        return true;
      else
        return false;
    }
    else
      return false;
  }
  // aboutConfig() {
  //   this.dialog.open(AboutConfigurationComponent, {
  //     width: '500px', height: '520px', disableClose: true, closeOnNavigation: true, autoFocus: true,
  //   });
  // }
  // for open the Linked Device section
  //devicelogs() {
  //  this.dialog.open(LinkedDevicesComponent, {
  //    width: '700px', height: '480px', closeOnNavigation: true, autoFocus: true,
  //    data: { logInDeviceData: this.logInDeviceData, user_id: this.viewData.menu.projectConfig.user }
  //  });
  //}

  //extracting the browser and OS name from the user agent
  //getBrowserAndOS(userAgent) {
  //  // Browser detection
  //  let browser = 'Unknown';
  //  if (userAgent.includes('Chrome') && !userAgent.includes('Edg') && !userAgent.includes('OPR')) {
  //    browser = 'Chrome';
  //  } else if (userAgent.includes('Edg')) {
  //    browser = 'Edge';
  //  } else if (userAgent.includes('Firefox')) {
  //    browser = 'Firefox';
  //  } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
  //    browser = 'Safari';
  //  } else if (userAgent.includes('OPR') || userAgent.includes('Opera')) {
  //    browser = 'Opera';
  //  }

  //  let os = 'Unknown';
  //  if (userAgent.includes('Win')) {
  //    os = 'Windows';
  //  } else if (userAgent.includes('Mac')) {
  //    os = 'macOS';
  //  } else if (userAgent.includes('Linux')) {
  //    os = 'Linux';
  //  } else if (userAgent.includes('Android')) {
  //    os = 'Android';
  //  } else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
  //    os = 'iOS';
  //  }
  //  return `${browser} ( ${os} )`;
  //}

  private intervalId: any = null;

  StartSendingdata() {
    if (this.intervalId) {
      this._signalr.StartSendingdata();
      clearInterval(this.intervalId);
      this.intervalId = setInterval(() => this._signalr.StartSendingdata(), 10000); // initial func execution starts after 10 sec
      return;
    }
    this._signalr.StartSendingdata();
    this.intervalId = setInterval(() => this._signalr.StartSendingdata(), 10000);

  }
  onexpand(viewname: any) {
    if (viewname.length)
      this.listCount = viewname.length - 1;
    else {
      this.listCount = viewname.viewlist?.length - 1;
    }
  }

  updateExistingViewsOrder(views: any[]): void {
    views.forEach((view) => {
      this.appservice.updateSingleViewOrder(view._id, view.order).subscribe({
        next: (res) => console.log('Order updated', res),
        error: (err) => console.error('Error updating order:', err)
      });
    });
  }

  async logout() {
    try {
      await this.appservice.LogoutUser();
      this.router.navigate(['/login'], { replaceUrl: true });
    } catch (error) {
      console.error('Logout failed', error);
    }
  }

  openNotifications(type) {
    if (this.showUrgent && this.selectedNotificationType === type) {
      this.appservice.urgentDlgHide();
      return;
    }
    this.appservice.urgentDlgShow(type);
  }
}
