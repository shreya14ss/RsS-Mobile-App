import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, Input, OnInit, ViewChild, HostListener } from '@angular/core';
// import { MatDialog } from '@angular/material/dialog';
import { MatMenuTrigger } from '@angular/material/menu';
// import { MatSnackBar } from '@angular/material/snack-bar';
// import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
// import { MatTabChangeEvent, MatTabGroup } from '@angular/material/tabs';
import { ActivatedRoute } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { LoadingController } from '@ionic/angular';
import { AppService } from '../../../core/services/app.service';
import { LocaleService } from '../../../core/services/locale/locale.service';
import { MaintenanceService, MaintenanceStatus, MaintenanceStatusToString, OtherPTWStatus, OtherPTWStatusLegacyRestored } from '../../../core/services/maintenance.service';
import { SignalRService } from '../../../core/services/signal-r.service';
// import { BackchargingActionDlgComponent } from '../../action-dlg/backcharging-action-dlg/backcharging-action-dlg.component';
// import { ObservationDlgComponent } from '../../action-dlg/observation-dlg/observation-dlg.component';
// import { ManualObservationCreationDlgComponent } from '../../action-dlg/manual-observation-creation-dlg/manual-observation-creation-dlg.component';
// import { PtwOtherActionDlgComponent } from '../../action-dlg/ptw-other-action-dlg/ptw-other-action-dlg.component';
// import { QrDialogComponent, QrDialogData } from '../../action-dlg/qr-dialog/qr-dialog.component';
// import { SldcActionDlgComponent } from '../../action-dlg/sldc-action-dlg/sldc-action-dlg.component';
// import { TlMaintenanceSetupDlgComponent } from '../../action-dlg/tl-maintenance-setup-dlg/tl-maintenance-setup-dlg.component';
// import { ConditionalMaintenanceSetupDlgComponent } from '../conditional-maintenance-setup-dlg/conditional-maintenance-setup-dlg.component';
// import { MaintenanceDetailsDlgComponent } from './maintenance-details/maintenance-details.component';
import { ProjectResolverService } from '../../../core/services/project-resolver.service';
// import { Loader } from '../../../../loader'

@Component({
  selector: 'app-maintenance-dashboard',
  templateUrl: './maintenance-dashboard.component.html',
  styleUrls: ['./maintenance-dashboard.component.scss']
})

export class MaintenanceDashboardComponent implements OnInit, AfterViewInit {
  /*@HostListener('document:click', ['$event'])*/
  @ViewChild('input') Filter: ElementRef;
  @ViewChild('tlinput') tlFilter: ElementRef;
  @ViewChild('bayinput') bayFilter: ElementRef;
  @ViewChild('eqpinput') eqpFilter: ElementRef;
  @ViewChild('condinput') condFilter: ElementRef;
  @ViewChild('otherptwinput') otherFilter: ElementRef;
  @ViewChild('codeReqinput') codereqFilter: ElementRef;
  @ViewChild('mplannedinput') mplannedFilter: ElementRef;
  @ViewChild('xenappreqinput') xenappreqFilter: ElementRef;
  @ViewChild('xenapprovedinput') xenapprovedFilter: ElementRef;
  @ViewChild('obinput') obFilter: ElementRef;
  @ViewChild('obslstinput') obslstFilter: ElementRef;
  @ViewChild('tlConnectedBayinput') tlConnectedBayFilter: ElementRef;
  // @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatMenuTrigger) menuTrigger!: MatMenuTrigger;
  @ViewChild('menuPanel') menuPanel!: ElementRef;
  @ViewChild('bottomTabBar') bottomTabBar!: ElementRef;
  // @ViewChild('filterMenuTrigger') filterMenuTrigger: MatMenuTrigger;


  displayed_sc_TLColumns: string[] = ['zone', 'circle', 'division', 'line_name', 'tower_range', 'maintenancetype', 'cutoffDate', 'plannedDate', 'status', 'action']
  displayed_pt_TLColumns: string[] = ['zone', 'circle', 'division', 'line_name', 'tower_range', 'maintenancetype', 'last_patrolling_date', 'status', 'action']
  displayed_Hotline_TLColumns: string[] = ['zone', 'circle', 'division', 'substation', 'maintenancetype', 'plannedDate', 'status', 'action']
  displayedColumns: string[] = ['zone', 'circle', 'division', 'substation', 'maintenancetype', 'cutoffDate', 'plannedDate', 'status', 'action'];
  displayedEColumns: string[] = ['zone', 'circle', 'division', 'substation', 'maintenanceEtype', 'cutoffDate', 'plannedDate', 'status', 'action'];
  displayed_XEN_SLDC_Req_Columns: string[] = ['zone', 'circle', 'division', 'substation', 'baytype', 'bay', 'status', 'action'];
  displayedbayColumns: string[] = ['zone', 'circle', 'division', 'substation', 'baytype', 'bay', 'mnt_device_type', 'maintenancetype', 'cutoffDate', 'plannedDate', 'status', 'action'];
  displayedObsMntColumns: string[] = ['zone', 'circle', 'division', 'substation', 'baytype', 'bay', 'mnt_on_tower_or_range', 'maintenancetype', 'cutoffDate', 'plannedDate', 'status', 'action'];
  displayedeqpColumns: string[] = ['zone', 'circle', 'division', 'substation', 'baytype', 'bay', 'eqptype', 'eqp', 'maintenancetype', 'cutoffDate', 'plannedDate', 'status', 'action'];
  observationColumnsTL: string[] = ['time', 'zone', 'circle', 'division', 'ob_line_name', 'device_type', 'description', 'observations', 'lineno', 'remarks', 'maintenance_type', 'observationstatus', 'observation_maintenance_status', 'observation_Type', 'observaction']
  observationColumnsOther: string[] = ['time', 'zone', 'circle', 'division', 'ob_line_name', 'device_type', 'description', 'observations', 'remarks', 'maintenance_type', 'observationstatus', 'observation_maintenance_status', 'observation_Type', 'observaction']
  EventsColumns: string[] = ['zone', 'circle', 'division', 'substation', 'bay', 'datetime', 'reason', 'status', 'action'];
  otherPTW = ['ptwzone', 'ptwcircle', 'ptwdivision', 'ptwsubstation', 'ptwbay', 'issuedto', 'permittype', 'issue_datetime', 'ptwstatus', 'ptwaction'];
  backfeedingColumns = ['zone', 'circle', 'division', 'substation', 'bay', 'maintenancetype', 'plannedDate', 'status', 'action'] //Add Column
  displayedtlConnectedBayColumns: string[] = ['zone', 'circle', 'division', 'substation', 'bay', 'line_name_w_tower_range', 'maintenancetype', 'cutoffDate', 'plannedDatetimeDuration', 'status', 'con_bay_action'];
  displayed_bayConnectedTL_columns: string[] = ['zone', 'circle', 'division', 'line_name', 'tower_range', 'maintenancetype', 'cutoffDate', 'plannedDatetimeDuration', 'status', 'con_bay_action']

  @Input() viewData: any;
  private update_counter = 0;
  saving: boolean;

  group_path: string[];
  current_sel_path: string[];
  conditional_bay_DS = {};
  connected_bays: any;

  excluded_sc_tlDatasource: MatTableDataSource<any> = new MatTableDataSource<any>();
  sc_tlDatasource: MatTableDataSource<any> = new MatTableDataSource<any>();
  pt_tlDatasource: MatTableDataSource<any> = new MatTableDataSource<any>();
  subDatasource: MatTableDataSource<any> = new MatTableDataSource<any>();
  hotlineDatasource: MatTableDataSource<any> = new MatTableDataSource<any>();
  hotlineTLDatasource: MatTableDataSource<any> = new MatTableDataSource<any>();
  bayDatasource: MatTableDataSource<any> = new MatTableDataSource<any>();
  excluded_bayDatasource: MatTableDataSource<any> = new MatTableDataSource<any>();
  eqpDatasource: MatTableDataSource<any> = new MatTableDataSource<any>();
  plannedDatasource: MatTableDataSource<any> = new MatTableDataSource<any>();
  backfeedingDatasource: MatTableDataSource<any> = new MatTableDataSource<any>();
  requestedDatasource: MatTableDataSource<any> = new MatTableDataSource<any>();
  xenApprovalrqstDataSource: MatTableDataSource<any> = new MatTableDataSource<any>();
  xenApprovedDataSource: MatTableDataSource<any> = new MatTableDataSource<any>();
  otherDatasource: MatTableDataSource<any> = new MatTableDataSource<any>();
  eventsDataSource: MatTableDataSource<any> = new MatTableDataSource<any>();
  obMaintenanceDatasource: MatTableDataSource<any> = new MatTableDataSource<any>();
  observationDatasource: MatTableDataSource<any> = new MatTableDataSource<any>();
  hotlineObservationDatasource: MatTableDataSource<any> = new MatTableDataSource<any>();
  tlConnectedBayDatasource: MatTableDataSource<any> = new MatTableDataSource<any>();
  bayConnectedBayDatasource: MatTableDataSource<any> = new MatTableDataSource<any>();
  bayConnectedTLDatasource: MatTableDataSource<any> = new MatTableDataSource<any>();
  debounceSearch: Function;
  selectedTabIndex = 0;
  selectedTabLabel: string = "";
  opened_dlg_details: any = null;
  // Bay paths with an active locked damage report — used to show the
  // "damage report pending" warning icon on maintenance cards. Mirrors
  // ClientApp maintenance-dashboard.component.ts:105.
  lockedDamageBayPaths: Set<string> = new Set<string>();
  private bayLockSubscription: Subscription | null = null;
  opened_tl_setup_dlg: any = null;
  opened_observation_dlg: any = null;
  opened_breakdown_setup_dlg: any = null;
  private mnt_details_trigger = new Subject<void>();
  new_ptw_id: number = null;
  private colorCache: Map<string, string> = new Map<string, string>();
  private tl_shutdown_mnt_exists: boolean = false;
  isOtherPtwQrInProgress = false;
  isTrialRunQrInProgress = false;

  columnMap = new Map<MatTableDataSource<any>, string[]>([
    [this.sc_tlDatasource, this.displayed_sc_TLColumns],
    [this.pt_tlDatasource, this.displayed_pt_TLColumns],
    [this.subDatasource, this.displayedColumns],
    [this.hotlineDatasource, this.displayed_Hotline_TLColumns],
    [this.hotlineTLDatasource, this.displayed_Hotline_TLColumns],
    [this.bayDatasource, this.displayedbayColumns],
    [this.eqpDatasource, this.displayedeqpColumns],
    [this.otherDatasource, this.otherPTW],
    [this.eventsDataSource, this.EventsColumns],
    [this.obMaintenanceDatasource, this.displayedObsMntColumns],
    [this.hotlineObservationDatasource, this.displayedColumns],
    [this.observationDatasource, this.observationColumnsTL], // or dynamic later
    [this.backfeedingDatasource, this.backfeedingColumns],
    [this.requestedDatasource, this.displayed_XEN_SLDC_Req_Columns],
    [this.xenApprovalrqstDataSource, this.displayed_XEN_SLDC_Req_Columns],
    [this.xenApprovedDataSource, this.displayed_XEN_SLDC_Req_Columns],
    [this.plannedDatasource, this.displayedColumns],
    [this.tlConnectedBayDatasource, this.displayedtlConnectedBayColumns],
    [this.bayConnectedBayDatasource, this.displayedbayColumns],
    [this.bayConnectedTLDatasource, this.displayed_bayConnectedTL_columns],
    [this.excluded_sc_tlDatasource, this.displayed_sc_TLColumns],
    [this.excluded_bayDatasource, this.displayedbayColumns],
  ]);


  //private tabAccess = { // to do 
  //  Substation: this.resolver.MaintenanceAccessRights.sub_bay_eqp_tab_view,
  //  Bay: this.resolver.MaintenanceAccessRights.sub_bay_eqp_tab_view,
  //  Equipment: this.resolver.MaintenanceAccessRights.sub_bay_eqp_tab_view,
  //  "Scheduled TL": this.resolver.MaintenanceAccessRights.tl_tab_view,
  //  "Patrolling TL": this.resolver.MaintenanceAccessRights.tl_tab_view,
  //  "Conditional Maintenance": this.resolver.MaintenanceAccessRights.conditional_maintenance_tab_view,
  //  "Observations List": [...this.observationDatasource.data],
  //  "XEN Approved": [...this.xenApprovedDataSource.data],
  //  "Maintenance Planned": [...this.plannedDatasource.data],
  //  "Observation Maintenance": [...this.obMaintenanceDatasource.data]
  //};

  //filter
  // @ViewChild('tabGroup') tabGroup!: MatTabGroup;

  // @HostListener('window:resize', ['$event'])
  // onResize(event: any) {
  //   this.checkIfMobile();
  // }

  FilterCategories: any = [];
  filteredData: any = []; // Stores filtered results
  originalData: any = []; //Stores original datasource
  selectedFilters: any = {
    Substation: { maintenanceTypes: [] },
    Bay: { maintenanceTypes: [], baytype: [] }
  }


  /*filter_dashboard: any;*/

  // Per-category search text for the filter menu, keyed by the filter's
  // property name (e.g. 'status', 'bay', 'mnttype'). Mirrors the pattern
  // already in pv-plan-maintenance so the two dashboards behave the same.
  filter_search_text: { [key: string]: string } = {};

  filter_dashboard: any = {
    Substation: {
      mnttype: {
        name: "Maintenance Type",
        unique_opts: {},
        options: [],
        selected: {}
      },
      status: {
        name: "Status",
        unique_opts: {},
        options: [],
        selected: {}
      }
    },

    "HotLine TL": {
      mnttype: {
        name: "Maintenance Type",
        unique_opts: {},
        options: [],
        selected: {}
      },
      status: {
        name: "Status",
        unique_opts: {},
        options: [],
        selected: {}
      }
    },


    Bay: {
      mnttype: {
        name: "Maintenance Type",
        unique_opts: {},
        options: [],
        selected: {}
      },
      baytype: {
        name: "Bay Type",
        unique_opts: {},
        options: [],
        selected: {}
      },
      bay: {
        name: "Bay Name",
        unique_opts: {},
        options: [],
        selected: {}
      },
      status: {
        name: "Status",
        unique_opts: {},
        options: [],
        selected: {}
      }
    },
    Equipment: {
      mnttype: {
        name: "Maintenance Type",
        unique_opts: {},
        options: [],
        selected: {}
      },
      bay: {
        name: "Bay Name",
        unique_opts: {},
        options: [],
        selected: {}
      },
      baytype: {
        name: "Bay Type",
        unique_opts: {},
        options: [],
        selected: {}
      },
      eqp: {
        name: "Equipment Name",
        unique_opts: {},
        options: [],
        selected: {}
      },
      eqptype: {
        name: "Equipment Type",
        unique_opts: {},
        options: [],
        selected: {}
      },
      status: {
        name: "Status",
        unique_opts: {},
        options: [],
        selected: {}
      }


    },
    "Scheduled TL": {
      mnttype: {
        name: "Maintenance Type",
        unique_opts: {},
        options: [],
        selected: {}
      },
      line_name: {
        name: "Line Name",
        unique_opts: {},
        options: [],
        selected: {}
      },
      status: {
        name: "Status",
        unique_opts: {},
        options: [],
        selected: {}
      }
    },
    "Patrolling TL": {
      mnttype: {
        name: "Maintenance Type",
        unique_opts: {},
        options: [],
        selected: {}
      },
      line_name: {
        name: "Line Name",
        unique_opts: {},
        options: [],
        selected: {}
      },
      status: {
        name: "Status",
        unique_opts: {},
        options: [],
        selected: {}
      }
    },
    TL: {
      mnttype: {
        name: "Maintenance Type",
        unique_opts: {},
        options: [],
        selected: {}
      },
    },
    "Breakdown Maintenance": {
      reason: {
        name: "Reason",
        unique_opts: {},
        options: [],
        selected: {}
      },
      current_status: {
        name: "Status",
        unique_opts: {},
        options: [],
        selected: {}
      }
    },
    OtherPTW: {
      ptwbay: {
        name: "Bay",
        unique_opts: {},
        options: [],
        selected: {}
      },
      current_status: {
        name: "Status",
        unique_opts: {},
        options: [],
        selected: {}
      },
      issuedto: {
        name: "Issued To",
        unique_opts: {},
        options: [],
        selected: {}
      },
      status: {
        name: "Status",
        unique_opts: {},
        options: [],
        selected: {}
      }
    },
    "Observations List": {
      device_type: {
        name: "Device Type",
        unique_opts: {},
        options: [],
        selected: {}
      },
      ob_line_name: {
        name: "Device Name",
        unique_opts: {},
        options: [],
        selected: {}
      },
      maintenance_type: {
        name: "Maintenance Type",
        unique_opts: {},
        options: [],
        selected: {}
      },
      user_role_based: {
        name: "User Role Based",
        unique_opts: {},
        options: [],
        selected: {}
      }
      /*      status: {
              name: "Status",
              unique_opts: {},
              options: [],
              selected: {}
            }*/
    },
    "Backfeeding Requests": {

      status: {
        name: "Status",
        unique_opts: {},
        options: [],
        selected: {}
      }
    },
    "Code Requested": {
      bay: {
        name: "Bay Name",
        unique_opts: {},
        options: [],
        selected: {}
      },
      baytype: {
        name: "Bay Type",
        unique_opts: {},
        options: [],
        selected: {}
      },
    },
    "Maintenance Planned": {
      mnttype: {
        name: "Maintenance Type",
        unique_opts: {},
        options: [],
        selected: {}
      },
      status: {
        name: "Status",
        unique_opts: {},
        options: [],
        selected: {}
      }
    },
    "XEN Approve Requests": {
      mnttype: {
        name: "Maintenance Type",
        unique_opts: {},
        options: [],
        selected: {}
      },
      status: {
        name: "Status",
        unique_opts: {},
        options: [],
        selected: {}
      }
    },
    "XEN Approved": {
      mnttype: {
        name: "Maintenance Type",
        unique_opts: {},
        options: [],
        selected: {}
      },
      status: {
        name: "Status",
        unique_opts: {},
        options: [],
        selected: {}
      }
    },
    "Observation Maintenance": {
      baytype: {
        name: "Bay Type",
        unique_opts: {},
        options: [],
        selected: {}
      },
      status: {
        name: "Status",
        unique_opts: {},
        options: [],
        selected: {}
      }
    },
    "Hotline Observation Maintenance": { mnttype: { name: "Maintenance Type", unique_opts: {}, options: [], selected: {} } },
    "Connected Bays": {
      mnttype: {
        name: "Maintenance Type",
        unique_opts: {},
        options: [],
        selected: {}
      },
      bay: {
        name: "Bay Name",
        unique_opts: {},
        options: [],
        selected: {}
      },
      line_name: {
        name: "Line Name",
        unique_opts: {},
        options: [],
        selected: {}
      }
    },
    "Asst. Mnt. Elmnt": {
      mnttype: {
        name: "Maintenance Type",
        unique_opts: {},
        options: [],
        selected: {}
      }
    },
    "Connected TL": {
      maintenancename: {
        name: "Maintenance Type",
        unique_opts: {},
        options: [],
        selected: {}
      }
    }
  };

  /*Datetime Filter*/

  time_settings: any = {
    rangeselection: 'mnt_db', //to show time range input in case of null time
    range: {
      start: null,
      end: null
    }
  };
  mnt_dashboard_tabs = [];
  getMaintenanceDashboardTabDetails = () => [ // to do //make dashboard html dynamic
    {
      label: this.locale_service.Locale.language.project.maintenancesettings.heading.substation,
      ngIf: this.resolver.MaintenanceAccessRights.sub_bay_eqp_tab_view || this.resolver.MaintenanceAccessRights.substation_tab_view,
      ds_length: this.subDatasource?.filteredData?.length,
      filter_text: "substation",
      input_variable: "input",
      dataSource: this.subDatasource,
      displayedColumns: this.displayedColumns
    },
    {
      label: this.locale_service.Locale.language.project.maintenancesettings.heading.hotline_substation,
      ngIf: this.resolver.MaintenanceAccessRights.hotline_tab_view,
      ds_length: this.hotlineDatasource?.filteredData?.length,
      filter_text: "hotline",
      input_variable: "hotlineinput",
      dataSource: this.hotlineDatasource,
      displayedColumns: this.displayed_Hotline_TLColumns
    },
    {
      label: this.locale_service.Locale.language.project.maintenancesettings.heading.hotline_tl,
      ngIf: this.resolver.MaintenanceAccessRights.hotline_tab_view,
      ds_length: this.hotlineTLDatasource?.filteredData?.length,
      filter_text: "hotline_tl",
      input_variable: "hotlinetlinput",
      dataSource: this.hotlineTLDatasource,
      displayedColumns: this.displayed_Hotline_TLColumns
    },
    {
      label: this.locale_service.Locale.language.project.maintenancesettings.heading.bay,
      ngIf: this.resolver.MaintenanceAccessRights.sub_bay_eqp_tab_view || this.resolver.MaintenanceAccessRights.bay_tab_view,
      ds_length: this.bayDatasource?.filteredData?.length,
      filter_text: "bay",
      input_variable: "bayinput",
      dataSource: this.bayDatasource,
      displayedColumns: this.displayedbayColumns
    },
    {
      label: this.locale_service.Locale.language.project.maintenancesettings.heading.eqp,
      ngIf: this.resolver.MaintenanceAccessRights.sub_bay_eqp_tab_view || this.resolver.MaintenanceAccessRights.equipment_tab_view,
      ds_length: this.eqpDatasource?.filteredData?.length,
      filter_text: "equipment",
      input_variable: "eqpinput",
      dataSource: this.eqpDatasource,
      displayedColumns: this.displayedeqpColumns
    },
    {
      label: this.locale_service.Locale.language.project.maintenancesettings.heading.sc_transmission,
      ngIf: this.resolver.MaintenanceAccessRights.tl_tab_view,
      ds_length: this.sc_tlDatasource?.filteredData?.length,
      filter_text: "sc_tl",
      input_variable: "tlinput",
      dataSource: this.sc_tlDatasource,
      displayedColumns: this.displayed_sc_TLColumns
    },
    {
      label: this.locale_service.Locale.language.project.maintenancesettings.heading.pt_transmission,
      ngIf: this.resolver.MaintenanceAccessRights.tl_tab_view,
      ds_length: this.pt_tlDatasource?.filteredData?.length,
      filter_text: "pt_tl",
      input_variable: "tlinput",
      dataSource: this.pt_tlDatasource,
      displayedColumns: this.displayed_pt_TLColumns
    },
    {
      label: this.locale_service.Locale.language.project.maintenancesettings.heading.conditionalmaintenance,
      ngIf: this.resolver.MaintenanceAccessRights.conditional_maintenance_tab_view,
      ds_length: this.eventsDataSource?.filteredData?.length,
      filter_text: "conditional",
      input_variable: "condinput",
      dataSource: this.eventsDataSource,
      displayedColumns: this.EventsColumns
    },
    {
      label: this.locale_service.Locale.language.project.maintenancesettings.heading.obslst,
      ngIf: this.resolver.MaintenanceAccessRights.observation_list_tab_view,
      ds_length: this.observationDatasource?.filteredData?.length,
      filter_text: "observation",
      input_variable: "obslstinput",
      dataSource: this.observationDatasource,
      displayedColumns: this.resolver.MaintenanceAccessRights.tl_tab_view ? this.observationColumnsTL : this.observationColumnsOther
    },
    {
      label: this.locale_service.Locale.language.project.maintenancesettings.heading.backfeedingrqst,
      ngIf: this.resolver.MaintenanceAccessRights.backfeeding_request_tab_view,
      ds_length: this.backfeedingDatasource?.filteredData?.length,
      filter_text: "other",
      input_variable: "backfeedinput",
      dataSource: this.backfeedingDatasource,
      displayedColumns: this.backfeedingColumns
    },
    {
      label: this.locale_service.Locale.language.project.maintenancesettings.heading.coderqst,
      ngIf: this.resolver.MaintenanceAccessRights.sldc_code_request_tab_view,
      ds_length: this.requestedDatasource?.filteredData?.length,
      filter_text: "requested",
      input_variable: "codeReqinput",
      dataSource: this.requestedDatasource,
      displayedColumns: this.displayed_XEN_SLDC_Req_Columns
    },
    {
      label: this.locale_service.Locale.language.project.maintenancesettings.heading.mntPlanned,
      ngIf: this.resolver.MaintenanceAccessRights.all_maintenance_tab_view,
      ds_length: this.plannedDatasource?.filteredData?.length,
      filter_text: "planned",
      input_variable: "mplannedinput",
      dataSource: this.plannedDatasource,
      displayedColumns: this.displayedColumns
    },
    {
      label: this.locale_service.Locale.language.project.maintenancesettings.heading.xenapproverqst,
      ngIf: this.resolver.MaintenanceAccessRights.xen_approval_request_tab_view,
      ds_length: this.xenApprovalrqstDataSource?.filteredData?.length,
      filter_text: "xen_approve_requested",
      input_variable: "xenappreqinput",
      dataSource: this.xenApprovalrqstDataSource,
      displayedColumns: this.displayed_XEN_SLDC_Req_Columns
    },
    {
      label: this.locale_service.Locale.language.project.maintenancesettings.heading.xenapprove,
      ngIf: this.resolver.MaintenanceAccessRights.xen_approved_request_tab_view,
      ds_length: this.xenApprovedDataSource?.filteredData?.length,
      filter_text: "xen_maintainance_approved",
      input_variable: "xenapprovedinput",
      dataSource: this.xenApprovedDataSource,
      displayedColumns: this.displayedEColumns
    },
    {
      label: this.locale_service.Locale.language.project.maintenancesettings.heading.obsmaintenance,
      ngIf: this.resolver.MaintenanceAccessRights.tl_tab_view,
      ds_length: this.obMaintenanceDatasource?.filteredData?.length,
      filter_text: "obs",
      input_variable: "obinput",
      dataSource: this.obMaintenanceDatasource,
      displayedColumns: this.displayedObsMntColumns
    },
    {
      label: this.locale_service.Locale.language.project.maintenancesettings.heading.otherPTW,
      ngIf: this.resolver.MaintenanceAccessRights.other_ptw_tab_view,
      ds_length: this.otherDatasource?.filteredData?.length,
      filter_text: "other",
      input_variable: "otherptwinput",
      dataSource: this.otherDatasource,
      displayedColumns: this.otherPTW
    },
    {
      label: this.locale_service.Locale.language.project.maintenancesettings.heading.connected_tl_tab,
      ngIf: this.resolver.MaintenanceAccessRights.connected_bay_for_tl_maintenance_tab_view,
      ds_length: this.tlConnectedBayDatasource?.filteredData?.length,
      filter_text: "tlConnectedBay",
      input_variable: "tlConnectedBayinput",
      dataSource: this.tlConnectedBayDatasource,
      displayedColumns: this.displayedtlConnectedBayColumns
    },
    {
      label: this.locale_service.Locale.language.project.maintenancesettings.heading.connected_bay,
      ngIf: this.resolver.MaintenanceAccessRights.connected_bay_for_substation_maintenance_tab_view,
      ds_length: this.bayConnectedBayDatasource?.filteredData?.length,
      filter_text: "tlConnectedBay",
      input_variable: "tlConnectedBayinput",
      dataSource: this.bayConnectedBayDatasource,
      displayedColumns: this.displayedtlConnectedBayColumns
    },
    {
      label: this.locale_service.Locale.language.project.maintenancesettings.heading.connected_tl,
      ngIf: this.resolver.MaintenanceAccessRights.connected_tl_tab_view,
      ds_length: this.bayConnectedTLDatasource?.filteredData?.length,
      filter_text: "tlConnectedBay",
      input_variable: "tlConnectedBayinput",
      dataSource: this.bayConnectedTLDatasource,
      displayedColumns: this.displayed_bayConnectedTL_columns
    },
    {
      label: this.locale_service.Locale.language.project.maintenancesettings.heading.hotline_observation,
      ngIf: this.resolver.MaintenanceAccessRights.hotline_observation_tab_view,
      ds_length: this.hotlineObservationDatasource?.filteredData?.length,
      filter_text: "hotline_observation",
      input_variable: "hotlineobinput",
      dataSource: this.hotlineObservationDatasource,
      displayedColumns: this.displayedColumns
    },

  ]

  user = {
    SLDC: false,
    XEN: false,
    SSE: false,
    JE: false,
    MNP: false,
    OPERATOR: false,
    BCOPERATOR: false,
    JETL: false,
    AETL: false,
    HotLineJE: false,
    HotLineSSE: false,
    TLUSER: false,
    OTHERUSER: false,
    AdminUser: false
  }
  //ongoingConnectedLineBayTL: any = {};
  maintenanceSkipXENSLDCStep = true;

  allLables = [];
  isMobileWindow: boolean = false;
  disabledColumnOnMobileView = ['division', 'circle', 'zone'];
  disabledColumnOnMobileViewForPTW = ['ptwdivision', 'ptwcircle', 'ptwzone'];
  selectedTab = null;
  // Breakdown Maintenance can have 1000+ event rows; rendering all cards at once freezes the WebView.
  // Show first N and grow on infinite-scroll. Reset per tab-change to N.
  readonly breakdownPageSize = 50;
  breakdownDisplayLimit = 50;

  constructor(public mntservice: MaintenanceService,
    private cdRef: ChangeDetectorRef,
    public appservice: AppService,
    private signalr: SignalRService,
    public resolver: ProjectResolverService,
    public locale_service: LocaleService,
    //public dialog: MatDialog,
    private route: ActivatedRoute,
    //private _snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef,
    //private loader: Loader
    private loadingCtrl: LoadingController,
  ) { }

  ngOnInit(): void {

    this.resolver.mnt_dashboard = this;
    this.saving = true;
    this.resolver.checkMaintenanceAccess(this.route.snapshot); // assign rights object
    this.setUserRights();
    this.group_path = this.appservice.viewData?.group_path ?? this.route.snapshot.root.firstChild?.firstChild?.data['viewData']?.group_path ?? [];
    this.current_sel_path = this.group_path.slice(1, 5);
    this.current_sel_path.push('');

    this.columnMap.forEach((columns, datasource) => {
      datasource.filterPredicate = this.createPredicate(columns);
    });

    const breakdownLabel = this.locale_service.Locale.language.project.maintenancesettings.heading.conditionalmaintenance;
    this.allLables = this.getMaintenanceDashboardTabDetails().filter(tab => tab.ngIf && ['Substation', 'Bay', 'Equipment', 'Scheduled TL', 'Patrolling TL', 'Asst. Mnt. Elmnt', 'Connected TL', 'Observations List', 'Other Permits', breakdownLabel].includes(tab.label));
    // If no tab rights are configured, grant the standard dashboard tab rights so the view is usable
    if (this.allLables.length === 0) {
      ['sub_bay_eqp_tab_view', 'substation_tab_view', 'bay_tab_view', 'equipment_tab_view', 'tl_tab_view', 'conditional_maintenance_tab_view'].forEach(r => {
        this.resolver.MaintenanceAccessRights[r] = true;
      });
      this.setUserRights();
      this.allLables = this.getMaintenanceDashboardTabDetails().filter(tab => tab.ngIf && ['Substation', 'Bay', 'Equipment', 'Scheduled TL', 'Patrolling TL', 'Asst. Mnt. Elmnt', 'Connected TL', 'Observations List', 'Other Permits', breakdownLabel].includes(tab.label));
    }
    console.log('[MaintenanceDashboard] allLables tabs:', this.allLables.map(t => t.label));

    this.appservice.switchMaintenanceTab = (tabLabel: string) => {
      const found = this.allLables.findIndex(t => t.label === tabLabel);
      const index = found !== -1 ? found : 0; // fall back to first tab when label is not available
      if (this.allLables.length === 0) return;
      this.selectedTabIndex = index;
      this.selectedTab = this.allLables[index];
      this.selectedTabLabel = this.selectedTab?.label || '';
      this.appservice.setCurrentMaintenanceTab(this.selectedTabLabel);
    };

    this.appservice.openMaintenanceById = (id: string) => {
      this.tryOpenMaintenanceById(id);
    };

    // Pending tab (set by message-alert-dlg before navigation) wins over the URL param,
    // because pvmain.resolve() rewrites the URL and strips `?tab=`.
    const pendingTab = this.appservice.consumePendingMaintenanceTab();
    const tabParam = pendingTab ?? this.route.snapshot.root.queryParams["tab"];
    if (tabParam) { // if opened from redirection
      const index = this.allLables.findIndex(t => t.label === tabParam);
      this.selectedTabIndex = index !== -1 ? index : 0;
    } else if (this.selectedTabIndex >= this.allLables.length) {
      this.selectedTabIndex = 0;
    }

    this.selectedTab = this.allLables[this.selectedTabIndex];
    this.selectedTabLabel = this.selectedTab?.label || '';
    this.appservice.setCurrentMaintenanceTab(this.selectedTabLabel);

    void this.loadLockedDamageBayPaths();
    // Live updates — matches ClientApp maintenance-dashboard.component.ts:2160-2166.
    this.bayLockSubscription = this.signalr.damageBayLockChanged$.subscribe(({ bayPath, locked }) => {
      if (locked) {
        this.lockedDamageBayPaths.add(bayPath);
      } else {
        this.lockedDamageBayPaths.delete(bayPath);
      }
    });
  }

  /** Fetches bay paths with active locked damage reports and stores them for
   *  the damage indicator on maintenance cards. Mirrors ClientApp
   *  maintenance-dashboard.component.ts:1525-1533. */
  private async loadLockedDamageBayPaths(): Promise<void> {
    try {
      const bayPaths = await this.mntservice.getLockedDamageBayPaths();
      this.lockedDamageBayPaths = new Set(bayPaths);
    } catch {
      this.lockedDamageBayPaths = new Set();
    }
  }

  /** True when the given card refers to a bay currently locked by an active
   *  damage report. Checks both the bay path and the maintenance's device_name,
   *  matching the ClientApp maintenance-common-table checks. */
  isDamagedBay(item: any): boolean {
    if (!this.lockedDamageBayPaths?.size) return false;
    return this.lockedDamageBayPaths.has(item?.bay_path)
      || this.lockedDamageBayPaths.has(item?.device_name);
  }

  ngOnDestroy(): void {
    // Preserve the selected tab across component recreation. pvmain.resolve()
    // destroys and re-creates this component on every SignalR reconnect
    // (fires after screen-unlock past the 60s threshold) — without this the
    // new instance ngOnInit finds no pending tab and defaults to index 0,
    // bouncing the user from Bay/Equipment/etc. back to Substation ~1s after
    // the resume modal-dismiss. Consumed by consumePendingMaintenanceTab()
    // in ngOnInit.
    if (this.selectedTabLabel) {
      this.appservice.setPendingMaintenanceTab(this.selectedTabLabel);
    }
    this.appservice.switchMaintenanceTab = null;
    this.appservice.resetMaintenanceTabState();
    this.bayLockSubscription?.unsubscribe();
    this.bayLockSubscription = null;
  }

  // refreshOpenedDlg(_id, _rev) {
  //   if (this.opened_dlg_details && this.opened_dlg_details._id == _id && this.opened_dlg_details._rev != _rev) {
  //     this.opened_dlg_details._rev = _rev;
  //     this.mnt_details_trigger.next();
  //   }
  // }

  refreshOpenedDlg(_id, _rev) {
    if (this.opened_dlg_details &&
        this.opened_dlg_details.device_details._id == _id &&
        this.opened_dlg_details.device_details._rev != _rev) {
      this.opened_dlg_details.device_details._rev = _rev;
      this.mnt_details_trigger.next();
    }
  }

  getIndexFromTabLabel(label: string) {
    let count = 0;
    let mnt_dashboard_tabs = this.getMaintenanceDashboardTabDetails();
    for (let dashboard of mnt_dashboard_tabs) {

      if (dashboard.ngIf) {
        if (dashboard.label == label)
          return count;
        count++;
      }
    }
    return -1;
  }

  getTabCount(tab: { dataSource?: { filteredData?: unknown[]; data?: unknown[] } }): number {
    if (!tab?.dataSource) return 0;
    const ds = tab.dataSource;
    return (ds.filteredData?.length ?? ds.data?.length) ?? 0;
  }

  getDataSourceFromTabLabel(label: string = this.selectedTabLabel) {
    let mnt_dashboard_tabs = this.getMaintenanceDashboardTabDetails();
    for (let dashboard of mnt_dashboard_tabs) {
      if (dashboard.ngIf) {
        if (dashboard.label == label)
          return dashboard.dataSource;
      }
    }
    return [];
  }

  setUserRights() {
    this.user = {
      SLDC: this.resolver.MaintenanceAccessRights.issue_sldc_code,
      XEN: this.resolver.MaintenanceAccessRights.approve_maintenance,
      SSE: this.resolver.MaintenanceAccessRights.maintenence_parameter_approve_revert,
      JE: this.resolver.MaintenanceAccessRights.start_unscheduled_maintenance && this.resolver.MaintenanceAccessRights.rqst_ptw_Button && this.resolver.MaintenanceAccessRights.maintenence_input_save_submit,
      MNP: this.resolver.MaintenanceAccessRights.mnp_input_save_submit,
      OPERATOR: this.resolver.MaintenanceAccessRights.issue_ptw_button,
      BCOPERATOR: this.resolver.MaintenanceAccessRights.backfeeding_request_tab_view,
      JETL: this.resolver.MaintenanceAccessRights.start_unscheduled_maintenance && this.resolver.MaintenanceAccessRights.tl_maintenance_parameter_input_save_submit,
      AETL: this.resolver.MaintenanceAccessRights.tl_maintenance_parameter_approve_revert,
      HotLineJE: this.resolver.MaintenanceAccessRights.hotline_input_save_submit,
      HotLineSSE: this.resolver.MaintenanceAccessRights.hotline_observation_close,
      TLUSER: this.resolver.MaintenanceAccessRights.tl_tab_view,
      OTHERUSER: this.resolver.MaintenanceAccessRights.sub_bay_eqp_tab_view
        || this.resolver.MaintenanceAccessRights.substation_tab_view
        || this.resolver.MaintenanceAccessRights.bay_tab_view
        || this.resolver.MaintenanceAccessRights.equipment_tab_view,
      AdminUser: this.resolver.MaintenanceAccessRights.tl_tab_view && this.resolver.MaintenanceAccessRights.bay_tab_view
    }
  }

  //getLatestMaintenanceFromList(all_mnt_in_tl, tower_range, default_pmp) {
  //  let frst_mnt_item, cnt = 0, default_mnt = all_mnt_in_tl[tower_range][default_pmp];

  //  for (let tower_range in all_mnt_in_tl) {
  //    for (let pmp in all_mnt_in_tl[tower_range]) {
  //      let indv_cnt = 0
  //      Object.values(all_mnt_in_tl[tower_range][pmp].requests_approves_datetime).forEach(date => { if (date > 0) indv_cnt++ });
  //      if (indv_cnt > cnt) {
  //        frst_mnt_item = all_mnt_in_tl[tower_range][pmp];
  //        cnt = indv_cnt;
  //      }
  //    }
  //  }
  //  if (!frst_mnt_item)
  //    return default_mnt;
  //  return frst_mnt_item;
  //}
  groupTLMntListRangeWise(type: string, mnt_item: any, tl_mnt_list_range_wise: any, sldc_bay_wise: any, sc_tdatasource: any[], excluded_bayDatasource: any[], bdatasource: any[], pdatasource: any[], xenApproveddatasource: any[], bayConnectedTLDatasource: any[]) {
    const key = mnt_item.line_name + mnt_item.maintenance_list._id;
    if (!tl_mnt_list_range_wise[key]) {
      tl_mnt_list_range_wise[key] = {};
      mnt_item.maintenance_list.total_partitioned_tower_ranges.forEach(tower_range => tl_mnt_list_range_wise[key][tower_range] = {});
    }

    else if (Object.values(tl_mnt_list_range_wise[key]).every(value => Object.keys(value).length > 0)) {
      // if duplicate tower_range reset value, assign pmp ids to mnt_item (1st pmp)
      // do not push anything for shutdown continue everything
      // create pmp_of_ranges property for 1st mnt_item with all pmp ids

      // when another interval of same line comes then push 1st mnt_item & empty existing list

      let pmps = [];
      let frst_mnt_item: any;

      // 1st push initiator pmp
      Object.keys(tl_mnt_list_range_wise[key]).forEach(tower_range => {
        Object.keys(tl_mnt_list_range_wise[key][tower_range]).forEach(pmp => {
          let mnt = tl_mnt_list_range_wise[key][tower_range][pmp];
          if (mnt.block_till_connected_bay_shutdown
            && mnt.block_till_connected_bay_shutdown[mnt.device_name].isInitiator)
            pmps.push(pmp);
        })
      })
      // then rest of the pmps
      Object.keys(tl_mnt_list_range_wise[key]).forEach(tower_range => {
        Object.keys(tl_mnt_list_range_wise[key][tower_range]).forEach(pmp => {
          if (!pmps.includes(pmp))
            pmps.push(pmp);
        })
      })
      if (pmps.length == 0)
        return true;

      // getLatestMaintenanceFromList ?? purpose ??
      //frst_mnt_item = this.getLatestMaintenanceFromList(tl_mnt_list_range_wise[key], mnt_item.maintenance_list.tower_range, pmps[0]);

      frst_mnt_item.pmp_of_ranges = []
      for (let tower_range in tl_mnt_list_range_wise[key]) {
        const id = Object.keys(tl_mnt_list_range_wise[key][tower_range])[0]; // future check for multiple mnt on same range
        if (!id) // undefined if range not exists on that device name, might be on some other device name
          continue;
        frst_mnt_item.pmp_of_ranges.push(tower_range + "|" + Object.keys(tl_mnt_list_range_wise[key][tower_range])[0]);
        // merged_tower_range = full range of TL
        let sorted_range = frst_mnt_item.maintenance_list.total_partitioned_tower_ranges.sort();
        frst_mnt_item.merged_tower_range = sorted_range[0].split("-")[0] + "-" + sorted_range[sorted_range.length - 1].split("-").slice(-1)[0];

        const excl_mnt = tl_mnt_list_range_wise[key][tower_range][id];

        if (id == pmps[0])
          continue;
        if (type == "sc_tl" || type == "c_tl") {
          this.push_Excld_Bay_Datasource(excl_mnt, excluded_bayDatasource);
        }
        else if (type == "b") {
          this.push_Excld_Bay_Datasource(excl_mnt, excluded_bayDatasource);
          this.checkPush_SLDC_Datasource(excl_mnt, sldc_bay_wise, pdatasource);
        }
      }
      if (type == "sc_tl")
        this.push_SC_TL_Datasource(frst_mnt_item, sc_tdatasource);
      else if (type == "b") {
        this.push_Bay_Datasource(frst_mnt_item, bdatasource);
        this.checkPush_SLDC_Datasource(frst_mnt_item, sldc_bay_wise, pdatasource);
        this.checkPush_XEN_ApprovedDatasource(frst_mnt_item, xenApproveddatasource);
      }
      else if (type == "c_tl") {
        //disable_action
        if (!(this.user.SSE || this.user.AETL || this.group_path.length < 5))
          frst_mnt_item.disable_action = true;
        this.push_Bay_Connected_TL_Datasource(frst_mnt_item, bayConnectedTLDatasource)
      }

      Object.keys(tl_mnt_list_range_wise[key]).forEach(tower_range => tl_mnt_list_range_wise[key][tower_range] = {}); // emtpy all ranges at last
    }

    tl_mnt_list_range_wise[key][mnt_item.maintenance_list.tower_range] = { [mnt_item._id]: mnt_item }
    return true;
  }
  groupRemainingTLMntListRangeWise(type: string, tl_mnt_list_range_wise: any, sldc_bay_wise: any, sc_tdatasource: any[], excluded_bayDatasource: any[], bdatasource: any[], pdatasource: any[], xenApproveddatasource: any[], bayConnectedTLDatasource: any[]) {
    for (let path_id in tl_mnt_list_range_wise) {
      for (let _tower_range in tl_mnt_list_range_wise[path_id]) {

        let pmps = [];
        let frst_mnt_item: any;
        // 1st push initiator pmp
        Object.keys(tl_mnt_list_range_wise[path_id]).forEach(tower_range => {
          Object.keys(tl_mnt_list_range_wise[path_id][tower_range]).forEach(pmp => {
            let mnt = tl_mnt_list_range_wise[path_id][tower_range][pmp];
            if (mnt.block_till_connected_bay_shutdown
              && mnt.block_till_connected_bay_shutdown[mnt.device_name].isInitiator) {
              pmps.push(pmp);
              frst_mnt_item = mnt;
            }
          })
        })
        // then rest of the pmps
        Object.keys(tl_mnt_list_range_wise[path_id]).forEach(tower_range => {
          Object.keys(tl_mnt_list_range_wise[path_id][tower_range]).forEach(pmp => {
            if (!pmps.includes(pmp))
              pmps.push(pmp);
          })
        })

        if (pmps.length == 0 || !frst_mnt_item)
          continue;

        // getLatestMaintenanceFromList ?? purpose ??
        //frst_mnt_item = this.getLatestMaintenanceFromList(tl_mnt_list_range_wise[path_id], tower_range, pmps[0]);

        frst_mnt_item.pmp_of_ranges = []
        for (let tower_range in tl_mnt_list_range_wise[path_id]) {
          const id = Object.keys(tl_mnt_list_range_wise[path_id][tower_range])[0]; // future check for multiple mnt on same range
          if (!id) // undefined if range not exists on that device name, might be on some other device name
            continue;
          frst_mnt_item.pmp_of_ranges.push(tower_range + "|" + Object.keys(tl_mnt_list_range_wise[path_id][tower_range])[0]);
          // merged_tower_range = full range of TL
          let sorted_range = frst_mnt_item.maintenance_list.total_partitioned_tower_ranges.sort();
          frst_mnt_item.merged_tower_range = sorted_range[0].split("-")[0] + "-" + sorted_range[sorted_range.length - 1].split("-").slice(-1)[0];

          const excl_mnt = tl_mnt_list_range_wise[path_id][tower_range][id];

          if (id == pmps[0])
            continue;
          if (type == "sc_tl" || type == "c_tl") {
            this.push_Excld_Bay_Datasource(excl_mnt, excluded_bayDatasource);
          }
          else if (type == "b") {
            this.push_Excld_Bay_Datasource(excl_mnt, excluded_bayDatasource);
            this.checkPush_SLDC_Datasource(excl_mnt, sldc_bay_wise, pdatasource);
          }
        }
        if (type == "sc_tl") {
          this.push_SC_TL_Datasource(frst_mnt_item, sc_tdatasource)
        }
        else if (type == "b") {
          this.push_Bay_Datasource(frst_mnt_item, bdatasource);
          this.checkPush_SLDC_Datasource(frst_mnt_item, sldc_bay_wise, pdatasource);
          this.checkPush_XEN_ApprovedDatasource(frst_mnt_item, xenApproveddatasource);
        }
        else if (type == "c_tl") {
          //disable_action
          if (!(this.user.SSE || this.user.AETL || this.group_path.length < 5))
            frst_mnt_item.disable_action = true;
          this.push_Bay_Connected_TL_Datasource(frst_mnt_item, bayConnectedTLDatasource)
        }
        tl_mnt_list_range_wise[path_id] = {};
        break;
      }
    }
  }
  checkPush_SLDC_Datasource(mnt_item: any, sldc_bay_wise: any, pdatasource: any[]) {
    if (mnt_item.current_status == MaintenanceStatus.SLDCChargingCodeRequested || mnt_item.current_status == MaintenanceStatus.SLDCShutDownCodeRequested) {
      //if (mnt_item.block_till_connected_bay_shutdown
      //  && !mnt_item.block_till_connected_bay_shutdown[mnt_item.device_name].isInitiator)
      //  // excluding the 1st mnt started on Line Bay isInitiator = true, for conncted bays isInitiator = false
      //  return;

      if (!sldc_bay_wise[mnt_item.device_name])
        sldc_bay_wise[mnt_item.device_name] = [];
      if (!sldc_bay_wise[mnt_item.device_name].includes(mnt_item))
        sldc_bay_wise[mnt_item.device_name].push(mnt_item);
    }
    if (mnt_item.requests_approves_datetime?.sldc_shutdown_code_issued_datetime > 0) {  // only sldc issued will show like xen approved
      pdatasource.push(mnt_item);
      this.getFilterOptions(mnt_item, 'Maintenance Planned');
    }
  }
  checkPush_XEN_ApprovedDatasource(mnt_item: any, xenApproveddatasource: any[]) {
    if (mnt_item.requests_approves_datetime?.xen_maintainance_approved_datetime > 0) {
      xenApproveddatasource.push(mnt_item);
      this.getFilterOptions(mnt_item, 'XEN Approved');
    }
  }
  push_Code_requested_Datasource(mnt_item: any, coderequestedDatasource: any[]) {
    coderequestedDatasource.push(mnt_item);
    this.getFilterOptions(mnt_item, 'Code Requested')
  }
  push_Bay_Datasource(mnt_item: any, bdatasource: any[]) {
    bdatasource.push(mnt_item);
    this.getFilterOptions(mnt_item, 'Bay');
  }
  push_Excld_Bay_Datasource(mnt_item: any, excluded_bayDatasource: any[]) {
    excluded_bayDatasource.push(mnt_item);
    this.getFilterOptions(mnt_item, 'Bay');
  }
  push_Equipment_Datasource(mnt_item: any, edatasource: any[]) {
    edatasource.push(mnt_item);
    this.getFilterOptions(mnt_item, 'Equipment');
  }
  push_SC_TL_Datasource(mnt_item: any, sc_tdatasource: any[]) {
    sc_tdatasource.push(mnt_item);
    this.getFilterOptions(mnt_item, 'Scheduled TL');
  }
  push_PT_TL_Datasource(mnt_item: any, sc_tdatasource: any[]) {
    sc_tdatasource.push(mnt_item);
    this.getFilterOptions(mnt_item, 'Patrolling TL');
  }
  push_Substation_Datasource(mnt_item: any, sdatasource: any[]) {
    sdatasource.push(mnt_item);
    this.getFilterOptions(mnt_item, 'Substation');
  }
  push_Hotline_Datasource(mnt_item: any, hdatasource: any[]) {
    hdatasource.push(mnt_item);
    this.getFilterOptions(mnt_item, "HotLine");
  }
  checkpush_Hotline_Observation_Maintenance_Datasource(mnt_item: any, hmntdatasource: any) {
    if (mnt_item.maintenance_list.hotline && mnt_item.maintenance_list._id.startsWith('pov')) {
      const clonedItem = {
        ...mnt_item,
        disable_action: true
      };
      hmntdatasource.push(clonedItem);
    }
    //this.getFilterOptions
  }
  push_HotlineTL_Datasource(mnt_item: any, htldatasource: any[]) {
    htldatasource.push(mnt_item);
    this.getFilterOptions(mnt_item, "HotLine TL");
  }
  push_Bay_Connected_TL_Datasource(mnt_item: any, bayConnectedTLDatasource: any[]) {
    bayConnectedTLDatasource.push(mnt_item);
    this.getFilterOptions(mnt_item, 'Connected TL');
  }
  checkPush_Observation_Maintenance_Datasource(mnt_item: any, obmaintenancedatasource: any[]) {
    if (mnt_item.maintenance_list._id.startsWith('pov')) {
      obmaintenancedatasource.push(mnt_item);
      this.getFilterOptions(mnt_item, 'Observation Maintenance');
    }
  }

  getFilterOptions = (mnt_item, cur_tab) => {
    if (!this.filter_dashboard[cur_tab]) return;
    Object.keys(this.filter_dashboard[cur_tab]).forEach(column => {
      const val = mnt_item[column];
      if (val !== undefined && val !== null && val !== '') {
        this.filter_dashboard[cur_tab][column].unique_opts[val] = "";
      }
      this.filter_dashboard[cur_tab][column].options = Object.keys(this.filter_dashboard[cur_tab][column].unique_opts);
    });
  }

  getVals(plannedMaintenance) {
    //this.ongoingConnectedLineBayTL = plannedMaintenance.ongoingConnectedLineBayTL;
    this.conditional_bay_DS = {};
    let sdatasource = [],
      hdatasource = [],
      hobsmntdatasource = [], //hotline observation maintenance
      bdatasource = [],
      htldatasource = [],
      excluded_bayDatasource = [],
      edatasource = [],
      pdatasource = [],
      rdatasource = [],
      pt_tdatasource = [],
      excluded_sc_tlDatasource = [],
      sc_tdatasource = [],
      bcdatasource = [],
      other_ptw_datasource = [],
      obdatasource = [],
      xenApproveddatasource = [],
      xenApprovalrqstdatasource = [],
      obmaintenancedatasource = [],
      tlconnectedbaydatasource = [],
      bayConnectedBayDatasource = [],
      bayConnectedTLDatasource = [],
      sldc_bay_wise = {};


    this.new_ptw_id = plannedMaintenance.new_ptw_id;

    this.connected_bays = plannedMaintenance.connectedBays;
    const destructureMntInfo = (mnt, type) => {
      return {
        ...mnt.Item2,
        zone: this.appservice.unescapedName(mnt.Item2.device_name.split('/')[1]),
        circle: this.appservice.unescapedName(mnt.Item2.device_name.split('/')[2]),
        division: this.appservice.unescapedName(mnt.Item2.device_name.split('/')[3]),
        substation: this.appservice.unescapedName(mnt.Item2.device_name.split('/')[4]),
        bay: this.appservice.unescapedName(mnt.Item2.device_name.split('/')[5]),
        eqp: this.appservice.unescapedName(mnt.Item2.device_name.split('/')[6]),
        ob_line_name: this.appservice.unescapedName(mnt.Item2.device_name?.split('/')?.pop()),
        mnttype: this.appservice.unescapedName(mnt.Item2.maintenance_list?.maintenancename),
        baytype: this.appservice.unescapedName(type == 'b' ? mnt.Item2.maintenance_list?.devicetype : mnt.Item2.maintenance_list?.baytype), // check later
        eqptype: mnt.Item2.maintenance_list?.devicetype,
        cutoffDate: mnt.Item2.maintenance_list?.cutoff_date,
        line_name: this.appservice.unescapedName(mnt.Item2.maintenance_list?.line_name || mnt.Item2.line_name),
        // For observations (type 'o'), status is a raw enum ('open', 'fixed', …)
        // rendered by getObsStatusLabel. For everything else, route through
        // getActivityStatusType so the same two display-time derivations that
        // the web dashboard applies also apply here:
        //   1) planned + (patrolling|hotline) + cutoff==0 → "-"
        //   2) ptw_cancellation_requested + ptw_work_completed → work-complete/incomplete variant
        // Otherwise it falls through to MaintenanceStatusToString[current_status].
        status: type == 'o'
          ? mnt.Item2.status
          : (mnt.Item2.current_status
              ? this.getActivityStatusType(
                  mnt.Item2.current_status,
                  mnt.Item2.ptw_work_completed,
                  mnt.Item2.maintenance_list?.cutoff_date,
                  mnt.Item2.shutdown_required,
                  mnt.Item2.maintenance_list,
                  mnt.Item2.cancel_info
                )
              : undefined)
      }
    };

    let tl_mnt_list_range_wise = {};
    let tmntlst = Object.keys(plannedMaintenance.tmntlst);
    for (let tl of tmntlst) {
      let mnt = plannedMaintenance.tmntlst[tl];
      let mnt_item = destructureMntInfo(mnt, 't');

      //if (mnt_item.maintenance_type == "Bay" && (this.user.XEN || this.user.SLDC) && !mnt_item.maintenance_list._id.startsWith("pov")) {
      //  // group TL maintenance rows for TL
      //  if (this.groupTLMntListRangeWise("sc_tl", mnt_item, tl_mnt_list_range_wise, sldc_bay_wise, sc_tdatasource, excluded_bayDatasource, bdatasource, pdatasource, xenApproveddatasource, bayConnectedTLDatasource))
      //    continue;
      //}

      //if (mnt_item.maintenance_type == "Bay")
      //  this.tl_shutdown_mnt_exists = true;
      this.checkpush_Hotline_Observation_Maintenance_Datasource(mnt_item, hobsmntdatasource);
      this.checkPush_Observation_Maintenance_Datasource(mnt_item, obmaintenancedatasource);
      if (mnt_item.maintenance_list.scheduled_patrolling) {
        if (mnt_item.maintenance_list.scheduled_patrolling == "scheduled") {
          // ongoingConnectedLineBayTL has line_name // keep whole object
          //if (plannedMaintenance.ongoingConnectedLineBayTL.hasOwnProperty(mnt_item.line_name)
          //  && plannedMaintenance.ongoingConnectedLineBayTL[mnt_item.line_name].hasOwnProperty("B")) {
          //  mnt_item.block_till_connected_bay_shutdown = plannedMaintenance.ongoingConnectedLineBayTL[mnt_item.line_name]["B"];
          //}
          this.push_SC_TL_Datasource(mnt_item, sc_tdatasource);
        }
        else {
          this.push_PT_TL_Datasource(mnt_item, pt_tdatasource);
        }
      }

      this.refreshOpenedDlg(mnt.Item2._id, mnt.Item2._rev);
    }

    let htlmntlst = Object.keys(plannedMaintenance.htlmntlst)
    for (let tl of htlmntlst) {
      let mnt = plannedMaintenance.htlmntlst[tl];
      let mnt_item = destructureMntInfo(mnt, 'htl');

      //this.checkPush_Observation_Maintenance_Datasource(mnt_item, obmaintenancedatasource);       
      this.push_HotlineTL_Datasource(mnt_item, htldatasource);

      this.refreshOpenedDlg(mnt.Item2._id, mnt.Item2._rev);
    }

    // group remaining TL maintenance rows
    //this.groupRemainingTLMntListRangeWise("sc_tl", tl_mnt_list_range_wise, sldc_bay_wise, sc_tdatasource, excluded_bayDatasource, bdatasource, pdatasource, xenApproveddatasource, bayConnectedTLDatasource);
    console.log("get vals 3");
    let smntlst = Object.keys(plannedMaintenance.smntlst);
    for (let sstn of smntlst) {
      let mnt = plannedMaintenance.smntlst[sstn];
      let mnt_item = destructureMntInfo(mnt, 's');
      if ((this.user.MNP && !this.user.JE) && !mnt_item.hasMNP && !mnt_item.maintenance_list.is_mnp_observation_maintenance) // !JE to show admin users
        continue;

      this.push_Substation_Datasource(mnt_item, sdatasource);
      this.checkpush_Hotline_Observation_Maintenance_Datasource(mnt_item, hobsmntdatasource);
      this.checkPush_Observation_Maintenance_Datasource(mnt_item, obmaintenancedatasource);
      this.refreshOpenedDlg(mnt.Item2._id, mnt.Item2._rev);
    };

    let hmntlst = Object.keys(plannedMaintenance.hmntlst);
    for (let hmtn of hmntlst) {
      let mnt = plannedMaintenance.hmntlst[hmtn];
      let mnt_item = destructureMntInfo(mnt, 'h');
      if ((this.user.MNP && !this.user.JE) && !mnt_item.hasMNP && !mnt_item.maintenance_list.is_mnp_observation_maintenance) // !JE to show admin users
        continue;

      this.push_Hotline_Datasource(mnt_item, hdatasource)
      this.checkPush_Observation_Maintenance_Datasource(mnt_item, obmaintenancedatasource);
      this.refreshOpenedDlg(mnt.Item2._id, mnt.Item2._rev);
    };

    tl_mnt_list_range_wise = {};
    let bmntlst = Object.keys(plannedMaintenance.bmntlst)
    for (let bay of bmntlst) {
      let mnt = plannedMaintenance.bmntlst[bay];
      let mnt_item = destructureMntInfo(mnt, 'b');

      if (this.user.MNP && !this.user.JE && !mnt_item.hasMNP && !mnt_item.maintenance_list.is_mnp_observation_maintenance) { // !JE to show admin users
        continue;
      }

      // either ptt (tl shutdown) or line_name + shutdown_required (line bay shutdown)
      // ongoingConnectedLineBayTL has line_name // keep whole object
      //if ((mnt_item.maintenance_list._id.startsWith("ptt") || (mnt_item.line_name && mnt_item.shutdown_required)) && plannedMaintenance.ongoingConnectedLineBayTL.hasOwnProperty(mnt_item.line_name)
      //  && plannedMaintenance.ongoingConnectedLineBayTL[mnt_item.line_name].hasOwnProperty("B")) {
      //  mnt_item.block_till_connected_bay_shutdown = plannedMaintenance.ongoingConnectedLineBayTL[mnt_item.line_name]["B"];
      //}

      //if (mnt_item.maintenance_list._id.startsWith("ptt") && (this.user.XEN || this.user.SLDC)) {
      //  // group TL maintenance rows for Bay
      //  if (this.groupTLMntListRangeWise("b", mnt_item, tl_mnt_list_range_wise, sldc_bay_wise, sc_tdatasource, excluded_bayDatasource, bdatasource, pdatasource, xenApproveddatasource, bayConnectedTLDatasource))
      //    continue;
      //}

      this.conditional_bay_DS[mnt.Item1] = mnt.Item2.maintenance_list._id + "|" + mnt.Item2._id;

      this.push_Bay_Datasource(mnt_item, bdatasource);
      this.checkPush_SLDC_Datasource(mnt_item, sldc_bay_wise, pdatasource);
      this.checkPush_Observation_Maintenance_Datasource(mnt_item, obmaintenancedatasource);
      this.checkPush_XEN_ApprovedDatasource(mnt_item, xenApproveddatasource);

      this.refreshOpenedDlg(mnt.Item2._id, mnt.Item2._rev);
    }

    //this.groupRemainingTLMntListRangeWise("b", tl_mnt_list_range_wise, sldc_bay_wise, sc_tdatasource, excluded_bayDatasource, bdatasource, pdatasource, xenApproveddatasource, bayConnectedTLDatasource);

    let emntlst = Object.keys(plannedMaintenance.emntlst);
    if (emntlst.length > 0)
      for (let eqp of emntlst) {
        let mnt = plannedMaintenance.emntlst[eqp]
        let mnt_item = destructureMntInfo(mnt, 'e');
        if ((this.user.MNP && !this.user.JE) && !mnt_item.hasMNP && !mnt_item.maintenance_list.is_mnp_observation_maintenance)  // !JE to show admin users
          continue;

        this.push_Equipment_Datasource(mnt_item, edatasource);
        this.checkPush_Observation_Maintenance_Datasource(mnt_item, obmaintenancedatasource);
        this.checkPush_SLDC_Datasource(mnt_item, sldc_bay_wise, pdatasource);
        this.checkPush_XEN_ApprovedDatasource(mnt_item, xenApproveddatasource);

        this.refreshOpenedDlg(mnt.Item2._id, mnt.Item2._rev);
      };
    console.log("get vals 2");
    let bcmntlst = Object.keys(plannedMaintenance.backcharging)
    if (bcmntlst.length > 0)
      bcmntlst.forEach(bc => {
        let mnt = plannedMaintenance.backcharging[bc]
        bcdatasource.push(destructureMntInfo(mnt, 'bc'));
      });

    let other_ptw = Object.keys(plannedMaintenance.other_ptw);
    if (other_ptw.length > 0)
      other_ptw.forEach(oth => {
        let mnt = plannedMaintenance.other_ptw[oth];
        const item = mnt.Item2;
        const issueDatetime = item.ptw_issue_datetime ?? item.issue_datetime ?? item.plannedDate;
        const plannedDate = item.ptw_request_datetime ?? item.ptw_issue_datetime ?? item.plannedDate;
        const oth_item = {
          bay_path: mnt.Item1,
          ...item,
          issue_datetime: issueDatetime,
          plannedDate,
          ptwcircle: this.appservice.unescapedName(mnt.Item1.split("/")[2]),
          ptwbay: this.appservice.unescapedName(mnt.Item1.split("/")[5]),
          ptwzone: this.appservice.unescapedName(mnt.Item1.split("/")[1]),
          ptwdivision: this.appservice.unescapedName(mnt.Item1.split("/")[3]),
          ptwsubstation: this.appservice.unescapedName(mnt.Item1.split("/")[4]),
          permittype: item?._id.startsWith("clr") ? "Clearance Certificate" : "Other PTW"
        };
        other_ptw_datasource.push(oth_item);
        this.getFilterOptions(oth_item, 'OtherPTW');
      });
    let temp_obdatasource = [];
    //show only hotline observation to hotline users
    if (this.user.AdminUser) {
      temp_obdatasource = [...plannedMaintenance.other_observation, ...plannedMaintenance.tl_observation, ...plannedMaintenance.hotline_observation];
    }
    else if (this.user.TLUSER) {
      temp_obdatasource = [...plannedMaintenance.tl_observation, ...plannedMaintenance.hotline_observation]
    }
    else if (this.user.HotLineJE || this.user.HotLineSSE) {
      temp_obdatasource = [...plannedMaintenance.hotline_observation];
    }
    else if (this.user.OTHERUSER) {
      temp_obdatasource = [...plannedMaintenance.other_observation, ...plannedMaintenance.hotline_observation];
    }
    else {
      temp_obdatasource = [];
    }

    //temp_obdatasource = this.resolver.MaintenanceAccessRights.sub_bay_eqp_tab_view && this.resolver.MaintenanceAccessRights.tl_tab_view
    //  ? [...plannedMaintenance.other_observation, ...plannedMaintenance.tl_observation]
    //  : this.resolver.MaintenanceAccessRights.sub_bay_eqp_tab_view ?
    //    plannedMaintenance.other_observation
    //    : this.resolver.MaintenanceAccessRights.tl_tab_view ? plannedMaintenance.tl_observation : [];
    plannedMaintenance.other_observation.forEach(obs => {
      if (obs.Item2.device_type == 'Bay' && obs.Item2.observationtype === 'je_tl')
        temp_obdatasource.push(obs);
    })
    temp_obdatasource.forEach(mnt => {
      let mnt_item = destructureMntInfo(mnt, 'o');
      //show only mnp observation to mnp
      if (this.user.MNP && !this.user.JE && !mnt_item.require_mnp && mnt_item.observationtype !== 'mnp') {
        return;
      }
      //if (!this.user.HotLineJE && !this.user.HotLineSSE && mnt_item)
      this.getFilterOptions(mnt_item, 'Observations List');
      obdatasource.push(mnt_item)
      obdatasource.sort((a, b) => {
        const order = ["requireshutdown", "open", "inprogress", "fixed"];
        return order.indexOf(a.status) - order.indexOf(b.status);
      })
    });

    let tlConnectedBay = Object.keys(plannedMaintenance.tlConnectedBay)
    if (tlConnectedBay.length > 0)
      tlConnectedBay.forEach(bay => {
        let mnt = plannedMaintenance.tlConnectedBay[bay];
        let mnt_item = destructureMntInfo(mnt, 'b');
        this.getFilterOptions(mnt_item, 'Asst. Mnt. Elmnt');
        //disable_action
        if (!(this.user.SSE || this.user.AETL || this.group_path.length < 5))
          mnt_item.disable_action = true;
        tlconnectedbaydatasource.push(mnt_item);

      });
    let bayConnectedBay = Object.keys(plannedMaintenance.bayConnectedBay)
    if (bayConnectedBay.length > 0)
      bayConnectedBay.forEach(bay => {
        let mnt = plannedMaintenance.bayConnectedBay[bay];
        let mnt_item = destructureMntInfo(mnt, 'b');
        this.getFilterOptions(mnt_item, 'Connected Bays');
        //disable_action
        if (!(this.user.SSE || this.user.AETL || this.group_path.length < 5))
          mnt_item.disable_action = true;
        bayConnectedBayDatasource.push(mnt_item);

      });
    tl_mnt_list_range_wise = {};
    let bayConnectedTL = Object.keys(plannedMaintenance.bayConnectedTL)
    if (bayConnectedTL.length > 0)
      for (let bay of bayConnectedTL) {
        let mnt = plannedMaintenance.bayConnectedTL[bay];
        let mnt_item = destructureMntInfo(mnt, 'b');

        // just to get block_till_connected_bay_shutdown inside groupTLMntListRangeWise() 
        //if ((mnt_item.maintenance_list._id.startsWith("ptt") || (mnt_item.line_name && mnt_item.shutdown_required)) && plannedMaintenance.ongoingConnectedLineBayTL.hasOwnProperty(mnt_item.line_name)
        //  && plannedMaintenance.ongoingConnectedLineBayTL[mnt_item.line_name].hasOwnProperty("B")) {
        //  mnt_item.block_till_connected_bay_shutdown = plannedMaintenance.ongoingConnectedLineBayTL[mnt_item.line_name]["B"];
        //}

        //if (mnt_item.maintenance_list.total_partitioned_tower_ranges.length > 1 && !mnt_item.maintenance_list._id.startsWith("pov")) {
        //  if (this.groupTLMntListRangeWise("c_tl", mnt_item, tl_mnt_list_range_wise, sldc_bay_wise, sc_tdatasource, excluded_bayDatasource, bdatasource, pdatasource, xenApproveddatasource, bayConnectedTLDatasource))
        //    continue;
        //}
        //disable_action
        if (!(this.user.SSE || this.user.AETL || this.group_path.length < 5))
          mnt_item.disable_action = true;
        this.push_Bay_Connected_TL_Datasource(mnt_item, bayConnectedTLDatasource)

      };
    //this.groupRemainingTLMntListRangeWise("c_tl", tl_mnt_list_range_wise, sldc_bay_wise, sc_tdatasource, excluded_bayDatasource, bdatasource, pdatasource, xenApproveddatasource, bayConnectedTLDatasource);

    for (let bay in sldc_bay_wise) {
      const first_mnt = sldc_bay_wise[bay][0];
      first_mnt.all_mnt_on_sldc_request = sldc_bay_wise[bay];
      this.push_Code_requested_Datasource(first_mnt, rdatasource);
    }

    console.log("get vals 1");
    this.otherDatasource.data = other_ptw_datasource;
    this.excluded_sc_tlDatasource.data = this.sortDatasource(excluded_sc_tlDatasource);
    this.sc_tlDatasource.data = this.sortDatasource(sc_tdatasource);
    this.pt_tlDatasource.data = this.sortDatasource(pt_tdatasource, true);
    this.subDatasource.data = this.sortDatasource(sdatasource);
    this.hotlineDatasource.data = this.sortDatasource(hdatasource, true);
    this.hotlineTLDatasource.data = this.sortDatasource(htldatasource, true);
    this.bayDatasource.data = this.sortDatasource(bdatasource);
    this.excluded_bayDatasource.data = this.sortDatasource(excluded_bayDatasource);
    this.eqpDatasource.data = this.sortDatasource(edatasource);
    this.plannedDatasource.data = this.sortDatasource(pdatasource);
    this.requestedDatasource.data = this.sortDatasource(rdatasource);
    this.backfeedingDatasource.data = this.sortDatasource(bcdatasource);
    this.xenApprovalrqstDataSource.data = this.sortDatasource(xenApprovalrqstdatasource);
    this.xenApprovedDataSource.data = this.sortDatasource(xenApproveddatasource);
    this.observationDatasource.data = obdatasource;
    this.obMaintenanceDatasource.data = obmaintenancedatasource;
    this.tlConnectedBayDatasource.data = this.sortDatasource(tlconnectedbaydatasource);
    this.bayConnectedBayDatasource.data = this.sortDatasource(bayConnectedBayDatasource);
    this.bayConnectedTLDatasource.data = this.sortDatasource(bayConnectedTLDatasource);
    this.hotlineObservationDatasource.data = this.sortDatasource(hobsmntdatasource);
    //this.generateFilterCategories();
    //this.reapplyFilters();

    this.originalData = {
      Substation: [...this.subDatasource.data],
      Hotline: [...this.hotlineDatasource.data],
      "HotLine TL": [...this.hotlineTLDatasource.data],
      Bay: [...this.bayDatasource.data],
      Equipment: [...this.eqpDatasource.data],
      "Scheduled TL": [...this.sc_tlDatasource.data],
      "Patrolling TL": [...this.pt_tlDatasource.data],
      "Observations List": [...this.observationDatasource.data],
      "XEN Approved": [...this.xenApprovedDataSource.data],
      "Maintenance Planned": [...this.plannedDatasource.data],
      "Observation Maintenance": [...this.obMaintenanceDatasource.data],
      "Asst. Mnt. Elmnt": [...this.tlConnectedBayDatasource.data],
      "Connected TL": [...this.bayConnectedTLDatasource.data],
      "Code Requested": [...this.requestedDatasource.data],
      "Hotline Observation Maintenance": [...this.hotlineObservationDatasource.data],
      OtherPTW: [...this.otherDatasource.data],
      "Breakdown Maintenance": [...this.eventsDataSource.data]
    };
    const otherPTWLabel = this.locale_service.Locale.language.project.maintenancesettings.heading.otherPTW;
    this.originalData[otherPTWLabel] = [...this.otherDatasource.data];
    this.filter_dashboard[otherPTWLabel] = this.filter_dashboard['OtherPTW'];
    this.applyFilters();
    console.log("saving false");
    this.saving = false;

    // If we landed here via an actionable notification carrying a maintenance_id,
    // open that maintenance's details now that the data sources are populated.
    const pendingId = this.appservice.consumePendingMaintenanceId();
    if (pendingId) {
      setTimeout(() => this.tryOpenMaintenanceById(pendingId), 0);
    }
  }

  private tryOpenMaintenanceById(id: string): void {
    if (!id) return;
    const sources: any[][] = [
      this.selectedTab?.dataSource?.data,
      this.bayDatasource?.data,
      this.eqpDatasource?.data,
      this.subDatasource?.data,
      this.sc_tlDatasource?.data,
      this.pt_tlDatasource?.data,
    ];
    for (const source of sources) {
      if (!source) continue;
      const row = source.find((r: any) => r?._id === id);
      if (row) {
        this.openDetails(row);
        return;
      }
    }
  }

  sortDatasource(datasource: any[], reverse = false) {
    reverse ? datasource.sort((a, b) => b.plannedDate - a.plannedDate) : datasource.sort((a, b) => a.plannedDate - b.plannedDate);
    return datasource;
  }


  getStatusColor = (row: any): string => {
    const cacheKey = `${row._id}-${row._rev}-${row.current_status ?? ''}`;

    // Return cached value if available
    if (this.colorCache.has(cacheKey)) {
      return this.colorCache.get(cacheKey);
    }

    const color = {
      GREEN: "#32de84",
      RED: "#f88379",
      YELLOW: "yellow",
      WHITE: "white"
    };

    const otherPtwStatuses = [
      OtherPTWStatus.PTWRequested,
      OtherPTWStatus.PTWIssued,
      OtherPTWStatus.PTWCancellationRequested,
      OtherPTWStatus.PTWCancelled,
      OtherPTWStatus.TrialRequested,
      OtherPTWStatus.TrialSucceed,
      OtherPTWStatus.TrialFailed,
      OtherPTWStatusLegacyRestored
    ];
    if (otherPtwStatuses.includes(row.current_status)) {
      const otherPtwColorMap: Record<string, string> = {
        [OtherPTWStatus.PTWRequested]: color.RED,
        [OtherPTWStatus.PTWIssued]: color.GREEN,
        [OtherPTWStatus.PTWCancellationRequested]: color.RED,
        [OtherPTWStatus.PTWCancelled]: color.RED,
        [OtherPTWStatus.TrialRequested]: color.RED,
        [OtherPTWStatus.TrialSucceed]: color.GREEN,
        [OtherPTWStatus.TrialFailed]: color.RED,
        [OtherPTWStatusLegacyRestored]: color.GREEN
      };
      const result = otherPtwColorMap[row.current_status] ?? color.WHITE;
      this.colorCache.set(cacheKey, result);
      return result;
    }

    let status: MaintenanceStatus = row.current_status, cutoffDate: number = row.cutoffDate;

    if (!status || (!row?.backcharging_id ? cutoffDate == 0 : false)) {
      this.colorCache.set(cacheKey, color.WHITE);
      return color.WHITE;
    }
    const user = {
      SLDC: this.user.SLDC,
      XEN: this.user.XEN,
      SSE: this.user.SSE,
      JE: this.user.JE,
      MNP: this.user.MNP && row.hasMNP && row.requests_approves_datetime && row.requests_approves_datetime.mnp_parameter_datetime == 0,
      OPERATOR: this.user.OPERATOR,
      BCOPERATOR: this.user.BCOPERATOR && row.backcharging_doc,

      JETL: this.user.JETL,
      AETL: this.user.AETL
    }

    //if (row.maintenance_list?.maintenance_on_bay
    //  && !(user.XEN || user.SLDC)) {  // works only for readonly Line Bay or TL Shutdown, XEN/SLDC requests skipped because of no need to check these
    //  this.colorCache.set(cacheKey, color.YELLOW);
    //  return color.YELLOW;
    //}

    const is_tl_shutdown = (row?.maintenance_type === "Bay" && row?.maintenance_list?._id?.startsWith('ptt'))
      || row?.maintenance_list?.bay_maintenance_on_tl_observation;

    user.JE = user.JE && !is_tl_shutdown; // in TL Maintenance JE has no work;

    // RED = status > in_progress, if mnt parameter submitted & not approved SSE & AETL (exclude SSE only in TL Shutdown)
    // RED = status > in_progress, if mnt parameter not submitted JE & M&P & JETL (exclude JE only in TL Shutdown)
    if (row.requests_approves_datetime && row.requests_approves_datetime.in_progress_datetime > 0 && row.hasMaintenance
      && ((((user.SSE && !is_tl_shutdown) || user.AETL) && row.requests_approves_datetime.maintenance_parameter_datetime > 0 && row.requests_approves_datetime.parameter_approval_datetime == 0)
        ||
        ((user.JE && row.hasMaintenance && row.requests_approves_datetime.maintenance_parameter_datetime == 0 && !is_tl_shutdown)
          || (user.MNP && row.requests_approves_datetime.mnp_parameter_datetime == 0)
          || (user.JETL && row.hasMaintenance && row.requests_approves_datetime.maintenance_parameter_datetime == 0)))) {
      this.colorCache.set(cacheKey, color.RED);
      return color.RED;
    }

    let result: string;
    switch (status) {
      case MaintenanceStatus.Planned:
        result = (user.JE || user.JETL)
          ? color.RED
          : color.YELLOW;
        break;

      case MaintenanceStatus.XenApprovalRequested:
        result = user.XEN
          ? color.RED
          : color.YELLOW;
        break;

      case MaintenanceStatus.SLDCShutDownCodeRequested:
        result = user.SLDC
          ? color.RED
          : (user.XEN
            ? color.GREEN
            : color.YELLOW);
        break;

      case MaintenanceStatus.SLDCShutDownCodeIssued:
        result = user.SLDC
          ? color.GREEN
          : (user.JE
            ? color.RED
            : color.YELLOW);
        break;

      case MaintenanceStatus.RequestPTW:
        result = (user.JE || user.JETL)
          ? color.RED
          : color.YELLOW;
        break;

      case MaintenanceStatus.PTWRequested:
        result = (user.JE || user.JETL)
          ? color.GREEN
          : (user.OPERATOR
            ? color.RED
            : color.YELLOW);
        break;

      case MaintenanceStatus.BCCertificateRequested:
      case MaintenanceStatus.BCCancelCertificateRequested:
        result = user.BCOPERATOR
          ? color.RED
          : (user.OPERATOR
            ? color.GREEN
            : color.YELLOW);
        break;

      case MaintenanceStatus.BCCertificateIssued:
      case MaintenanceStatus.BCCancelCertificateIssued:
        result = user.BCOPERATOR
          ? color.GREEN
          : (user.OPERATOR
            ? color.RED
            : color.YELLOW);
        break;

      case MaintenanceStatus.InProgress:
        result = user.JE
          || user.MNP
          || (user.JETL && ((row.hasMaintenance && row.requests_approves_datetime.maintenance_parameter_datetime == 0) || (row.maintenance_list.scheduled_patrolling == 'patrolling')))
          ? color.RED
          : color.YELLOW;
        break;

      case MaintenanceStatus.PTWCancelRequested:
        result = user.OPERATOR
          ? color.RED
          : ((user.JE || user.JETL)
            ? color.GREEN
            : color.YELLOW);
        break;

      case MaintenanceStatus.PTWCancellationIssued:
        result = user.OPERATOR && ((row.isVoltagelevelNoSLDCExists == "11" || row.isVoltagelevelNoSLDCExists == "33") || row.requests_approves_datetime.backcharging_issued_datetime == 0)
          ? color.RED
          : color.YELLOW;
        break;


      case MaintenanceStatus.SLDCChargingCodeRequested:
        result = user.SLDC
          ? color.RED
          : (user.OPERATOR
            ? color.GREEN
            : color.YELLOW);
        break;

      case MaintenanceStatus.SLDCChargingCodeIssued:
        result = user.SLDC
          ? color.GREEN
          : (user.OPERATOR
            ? color.RED
            : color.YELLOW);
        break;

      case MaintenanceStatus.ParameterSubmitPending:

        result = (user.JE && row.hasMaintenance && row.requests_approves_datetime.maintenance_parameter_datetime == 0 && !is_tl_shutdown)
          || (user.MNP && row.requests_approves_datetime.mnp_parameter_datetime == 0)
          || (user.JETL && row.hasMaintenance && row.requests_approves_datetime.maintenance_parameter_datetime == 0)
          ? color.RED
          : color.YELLOW;
        break;

      case MaintenanceStatus.ParameterApprovalPending:
        result = ((user.SSE && !is_tl_shutdown) || user.AETL)
          ? color.RED
          : color.YELLOW;
        break;

      case MaintenanceStatus.PatrollingCompleted:
        result = user.JETL
          ? color.RED
          : color.YELLOW;
        break;

      case MaintenanceStatus.RestorationRequired:
        result = user.OPERATOR
          ? color.RED
          : color.YELLOW;
        break;

      default: // Restoration Completed
        result = color.YELLOW;
        break;
    }

    this.colorCache.set(cacheKey, result);  // Store the computed new result in cache
    return result;
  }

  async openDetails(device_details: any) {
    // Show an Ionic loading overlay immediately so the user gets feedback
    // while the two potentially-slow network calls run: GetPlanMntByDeviceNames
    // (connected bays) and GetPlanMntById. Without this, the app looked frozen
    // on card tap. Matches client app's `this.loader.show()` pattern.
    const loading = await this.loadingCtrl.create({
      message: 'Loading maintenance details...',
      spinner: 'crescent',
      duration: 15000,   // hard cap so a stuck request can't strand the overlay
    });
    await loading.present();
    try {
    let all_connected_bays: any = {};
    let all_bay_mnts = [...this.bayDatasource.data, ...this.excluded_bayDatasource.data];
    let mnt_on_same_bay = all_bay_mnts.filter(bay => {
      if (bay.device_name == device_details.device_name && bay._id != device_details._id && bay.shutdown_required) {

        // to check if any other mnt is active & has connected bays
        if (bay.backcharging_id)
          Object.keys(bay.backcharging_id).forEach(bc_bay => all_connected_bays[bc_bay] = "");
        return true;
      }
      return false;
    });
    // to check if clicked mnt has connected bays
    if (device_details.backcharging_id)
      Object.keys(device_details.backcharging_id).forEach(bc_bay => all_connected_bays[bc_bay] = "");

    // fetch all connected bays mnt
    if (Object.keys(all_connected_bays).length > 0) {
      all_connected_bays = await this.mntservice.GetPlanMntByDeviceNames(Object.keys(all_connected_bays));
      if (all_connected_bays.code && all_connected_bays.code != null) {
        // todo mobile
        // this._snackBar.open(this.locale_service.Locale.language.errorcode.maintenance[all_connected_bays.code], this.locale_service.Locale.language.common.failed,
        //   {
        //     duration: 2000
        //   });
      }
      else {
        mnt_on_same_bay = mnt_on_same_bay.concat(all_connected_bays.filter(bay => {
          if (bay.shutdown_required) {
            bay.requests_approves_datetime = bay.requests_approves;
            bay.maintenance_list.maintenancename = bay.maintenance_list.template.maintenancename;
            bay.from_all_connected_bays = true;
            return true;
          }
          return false;
        }));
      }
    }


    if ((this.resolver.MaintenanceAccessRights.conditional_maintenance_tab_view || this.resolver.MaintenanceAccessRights.conditional_maintenance_event_log) && this.selectedTabLabel == this.locale_service.Locale.language.project.maintenancesettings.heading.conditionalmaintenance) {
      this.opened_breakdown_setup_dlg = {
        path: device_details.device_name,
        bay: device_details.bay,
        obj_id: device_details.event_details?.id,
        datetime: device_details.datetime,
        current_status: device_details.current_status,
        connected_mnt_id: device_details.connected_mnt_id,
        reason: this.locale_service.Locale.language.project.eventview.reason_vals[device_details.reason] ?? device_details.reason,
        mnt_dlg_details: {
          user_id: this.appservice.getUserName(),
          tripingStatus: this.eventsDataSource,
          obdata: this.observationDatasource.data,
          updateTrigger$: this.mnt_details_trigger.asObservable(),
          new_ptw_id: this.new_ptw_id,
          mnt_on_same_bay
        }
      };
      this.cdr.detectChanges();
    } else {
      //this.saving = true;
      let plan_mnt = await this.mntservice.GetPlanMntById(device_details._id);
      //this.saving = false;
      if (plan_mnt.code && plan_mnt.code != null) {
        return;
      }

      // check if HV or LV bay mnts search for PTW
      //let hv_lv_ptw = null; let hv_lv_mnts = null
      //if (device_details.maintenance_list.devicetype && (device_details.maintenance_list.devicetype.toLowerCase().includes("hv bay") || device_details.maintenance_list.devicetype.toLowerCase().includes("lv bay"))) {
      //  hv_lv_mnts = all_bay_mnts.filter(bay => plan_mnt.connected_hv_lv_bay && plan_mnt.connected_hv_lv_bay.some(b => b == bay.device_name));
      //  if (hv_lv_mnts && hv_lv_mnts.length > 0) {
      //    //mnt_on_same_bay ??= [];
      //    mnt_on_same_bay = (mnt_on_same_bay ?? []).concat(hv_lv_mnts);
      //    if (hv_lv_mnts[0].ptw_ids.length > 0)
      //      hv_lv_ptw = hv_lv_mnts[0].ptw_ids[0];
      //  }
      //}

      if (this.selectedTabLabel == "Connected Bays"
        && (this.user.SSE || this.user.AETL)) { // SSE/AETL only see the dlg
        let mnt_on_same_tl_bay = (this.user.SSE ? this.bayDatasource.data : this.sc_tlDatasource.data).filter(bay => bay.device_name == device_details.device_name && bay._id != device_details._id && bay.shutdown_required);
        // find which bay is supposed to be planned for the live TL maintenance
        // array of backcharging keys (connected bays) & device name (self bay), which ever is in my substation
        let my_line_bay = [...Object.keys(plan_mnt.backcharging_id), plan_mnt.device_name].find(path => path.split("/").slice(-2)[0] == this.group_path[4]);
        // this.dialog.open(TlMaintenanceSetupDlgComponent, {
        //   height: 'auto', width: '750px', maxHeight: "80vw", minHeight: "150px", closeOnNavigation: true, disableClose: true, autoFocus: true,
        //   data: {
        //     ObservationList: this.observationDatasource.data,
        //     connected_bay_mnt_details: device_details,
        //     my_line_bay,
        //     mnt_on_same_tl_bay,
        //     is_tl_planning: this.user.AETL,
        //     group_path: this.group_path
        //   }
        // })
      }
      else if (this.selectedTabLabel == "Backfeeding Requests" && this.resolver.MaintenanceAccessRights.backfeeding_request_tab_view) {
        //this.saving = true;
        let backfeedingData: any = {};
        if (plan_mnt?.backcharging_id && plan_mnt.backcharging_id[device_details.device_name]) {
          backfeedingData = await this.mntservice.GetBackChargingByID(plan_mnt?.backcharging_id[device_details.device_name].split("|")[0])
          if (backfeedingData.code && backfeedingData.code != null) {
            // todo mobile
            // this._snackBar.open(this.locale_service.Locale.language.errorcode[backfeedingData.code], this.locale_service.Locale.language.common.failed,
            //   {
            //     duration: 2000
            //   });
            // return;
          }
        }
        //this.saving = false;
        plan_mnt.connected_bay = device_details.device_name; // changed connected_bay to the requested backcgarging bay path
        backfeedingData.backcharging_id = plan_mnt.ptw_ids.slice(-1)[0];
        backfeedingData.workpurpose = plan_mnt.maintenance_list.template.maintenancename;
        // this.dialog.open(BackchargingActionDlgComponent, {
        //   height: '100%', width: '700px', closeOnNavigation: true, disableClose: true, autoFocus: true,
        //   data: { device_details: plan_mnt, backchargingDetails: backfeedingData, mnt_on_same_bay }
        // })
      }
      else if ((device_details.all_mnt_on_xen_request || device_details.all_mnt_on_sldc_request) && (this.selectedTabLabel == this.locale_service.Locale.language.project.maintenancesettings.heading.xenapproverqst || this.selectedTabLabel == this.locale_service.Locale.language.project.maintenancesettings.heading.coderqst)) {

        // this.dialog.open(SldcActionDlgComponent, {
        //   height: 'auto', width: '750px', maxHeight: "80vw", minHeight: "160px", closeOnNavigation: true, disableClose: true, autoFocus: true,
        //   data: {
        //     all_mnt_on_this_request: this.selectedTabLabel == this.locale_service.Locale.language.project.maintenancesettings.heading.xenapproverqst ? device_details.all_mnt_on_xen_request : device_details.all_mnt_on_sldc_request,
        //     isXEN: this.selectedTabLabel == this.locale_service.Locale.language.project.maintenancesettings.heading.xenapproverqst ? true : false,
        //     isApprovalReq: device_details.current_status == MaintenanceStatus.XenApprovalRequested,
        //     isShutdownReq: device_details.current_status == MaintenanceStatus.SLDCShutDownCodeRequested,
        //     isChargingReq: device_details.current_status == MaintenanceStatus.SLDCChargingCodeRequested,
        //     //ongoingConnectedLineBayTL: this.ongoingConnectedLineBayTL
        //   }
        // });
      }
      else {
        plan_mnt.current_status = device_details.current_status;
        this.opened_dlg_details = {
          device_details: plan_mnt,
          user_id: this.appservice.getUserName(),
          tripingStatus: this.eventsDataSource,
          obdata: this.observationDatasource.data,
          updateTrigger$: this.mnt_details_trigger.asObservable(),
          new_ptw_id: this.new_ptw_id,
          mnt_on_same_bay,
          bay_maintenance_on_tl_observation: device_details.maintenance_list?.bay_maintenance_on_tl_observation,
          pmp_of_ranges: device_details.pmp_of_ranges
        };
        //let backcharging_cb = {};

        //if (plan_mnt.backcharging_id && Object.keys(plan_mnt.backcharging_id).length > 0) {
        //  for (let bc_path of Object.keys(plan_mnt.backcharging_id)) {
        //    backcharging_cb[bc_path] = await this.mntservice.GetObjectDetailsByPath(ObjectStandard.CBSTATUS, bc_path);
        //    if (backcharging_cb[bc_path] && backcharging_cb[bc_path].length > 0)
        //      backcharging_cb[bc_path] = backcharging_cb[bc_path][0];
        //    else
        //      backcharging_cb[bc_path] = { value: false }; // false = CB OPEN, if CB details not found assume it's OPEN, skip backcharging
        //  }
        //}

        // todo mobile
        // this.dialog.open(MaintenanceDetailsDlgComponent, {
        //   height: '100vh', width: '90vw', maxWidth: "90vw", closeOnNavigation: true, disableClose: true, autoFocus: true,
        //   data: {
        //     device_details: plan_mnt,
        //     user_id: this.appservice.getUserName(),
        //     tripingStatus: this.eventsDataSource,
        //     obdata: this.observationDatasource.data,
        //     updateTrigger$: this.mnt_details_trigger.asObservable(),
        //     new_ptw_id: this.new_ptw_id[plan_mnt._id],
        //     mnt_on_same_bay,
        //     bay_maintenance_on_tl_observation: device_details.maintenance_list.bay_maintenance_on_tl_observation,
        //     pmp_of_ranges: device_details.pmp_of_ranges
        //   }
        // }).afterClosed().subscribe(data => {
        //   this.opened_dlg_details = null;
        // })

      }
    }

    this.cdr.detectChanges();
    } finally {
      // Always dismiss the loading overlay — including on the early `return`
      // when GetPlanMntById fails and if the modal open path throws.
      await loading.dismiss();
    }
  }

  async openPlanMaintenance(device_details: any) {
    if ((this.selectedTabLabel === 'Asst. Mnt. Elmnt' || this.selectedTabLabel === 'Connected TL')
      && (this.user.SSE || this.user.AETL)) {
      let plan_mnt = await this.mntservice.GetPlanMntById(device_details._id);
      if (plan_mnt.code && plan_mnt.code != null) return;

      let mnt_on_same_tl_bay = (this.user.SSE ? this.bayDatasource.data : this.sc_tlDatasource.data)
        .filter(bay => bay.device_name == device_details.device_name && bay._id != device_details._id && bay.shutdown_required);
      let my_line_bay = [...Object.keys(plan_mnt.backcharging_id ?? {}), plan_mnt.device_name]
        .find(path => path.split('/').slice(-2)[0] == this.group_path[4]);

      this.opened_tl_setup_dlg = {
        ObservationList: this.observationDatasource.data,
        connected_bay_mnt_details: device_details,
        my_line_bay,
        mnt_on_same_tl_bay,
        is_tl_planning: this.user.AETL,
        group_path: this.group_path
      };
    } else {
      this.openDetails(device_details);
    }
  }

  observaction(value: any, index: any) {
    this.saving = true;
    this.mntservice.GetObservationById(value._id).then(data => {
      if (data.code && data.code != null) {
        // todo mobile
        // this._snackBar.open(this.locale_service.Locale.language.project.projectsettings.reopendialog, null,
        //   {
        //     duration: 2000
        //   });
      }
      else {
        // this.dialog.open(ObservationDlgComponent, {
        //   height: '100%', width: '100%', closeOnNavigation: true, disableClose: true, autoFocus: true,
        //   data: {
        //     observationDetails: data,
        //     index: index,
        //     type: 'sse',
        //     openDetails: 'dashboard',
        //     connectedBayDS: this.bayConnectedBayDatasource.data,
        //     connectedTLDS: this.tlConnectedBayDatasource.data,
        //     connecedBayTLDS: this.bayConnectedTLDatasource.data,
        //     observationtype: data.observationtype,
        //     device_type: data.device_type,
        //     obdata: this.observationDatasource.data,
        //     obMaintenance: this.obMaintenanceDatasource.data,
        //     bayDatasource: this.bayDatasource.data,
        //     user_id: this.appservice.getUserName(),
        //     tripingStatus: this.eventsDataSource,
        //     updateTrigger$: this.mnt_details_trigger.asObservable(),
        //     view_id: this.route.snapshot.root.firstChild.firstChild.data.viewData.viewData._id
        //   }
        // }).afterClosed().subscribe((data) => {
        //   if (data != null) {
        //     this.observationDatasource.data.splice(index, 1, data);
        //     this.observationDatasource.data = this.observationDatasource.data.slice();

        //   }
        // })
      }
      this.saving = false;
    })
  }

  /**
   * Text search that lives in the shared search-filter-bar. Applied to the
   * currently-visible tab's datasource — filterPredicate is already set for
   * every datasource in ngOnInit (see columnMap loop).
   */
  dashboardSearchText = '';

  onDashboardSearch(text: string) {
    this.dashboardSearchText = text ?? '';
    const q = this.dashboardSearchText.trim().toLowerCase();
    const ds = this.selectedTab?.dataSource;
    if (ds) ds.filter = q;
  }

  applyFilter(type: string, event: Event) {
    const filterValue = (event.target as HTMLInputElement).value ?? '';

    switch (type) {
      case 'substation': this.subDatasource.filter = filterValue.trim().toLowerCase();
        break;
      case 'bay': this.bayDatasource.filter = filterValue.trim().toLowerCase();
        break;
      case 'equipment': this.eqpDatasource.filter = filterValue.trim().toLowerCase();
        break;
      case 'sc_tl': this.sc_tlDatasource.filter = filterValue.trim().toLowerCase();
        break;
      case 'pt_tl': this.pt_tlDatasource.filter = filterValue.trim().toLowerCase();
        break;
      case 'hotline': this.hotlineDatasource.filter = filterValue.trim().toLowerCase();
        break;
      case 'hotline_tl':
        this.hotlineTLDatasource.filter = filterValue.trim().toLowerCase();
        break;
      case 'hotline_observation':
        this.hotlineObservationDatasource.filter = filterValue.trim().toLowerCase();
        break;
      case 'conditional': this.eventsDataSource.filter = filterValue.trim().toLowerCase();
        break;
      case 'observation': this.observationDatasource.filter = filterValue.trim().toLowerCase();
        break;
      case 'back_feeding_request': this.backfeedingDatasource.filter = filterValue.trim().toLowerCase();
        break;
      case 'requested': this.requestedDatasource.filter = filterValue.trim().toLowerCase();
        break;
      case 'planned': this.plannedDatasource.filter = filterValue.trim().toLowerCase();
        break;
      case 'xen_approve_requested': this.xenApprovalrqstDataSource.filter = filterValue.trim().toLowerCase();
        break;
      case 'xen_maintainance_approved': this.xenApprovedDataSource.filter = filterValue.trim().toLowerCase();
        break;
      case 'obs': this.obMaintenanceDatasource.filter = filterValue.trim().toLowerCase();
        break;
      case 'other': this.otherDatasource.filter = filterValue.trim().toLowerCase();
        break;
      case 'tlConnectedBay': this.tlConnectedBayDatasource.filter = filterValue.trim().toLowerCase();
        break;
      case 'bayConnectedBay': this.bayConnectedBayDatasource.filter = filterValue.trim().toLowerCase();
        break;
      case 'bayConnectedTL': this.bayConnectedTLDatasource.filter = filterValue.trim().toLowerCase();
        break;
    }
  }
  // mobile specific
  onTabChange(label: string = null): void {
    console.log(label, this.selectedTab)
    // this.selectedTabIndex = this.getIndexFromTabLabel(label); // Update selected index
    // console.log(this.selectedTabIndex)
    // this.selectedTab = this.getMaintenanceDashboardTabDetails()[this.selectedTabIndex];
    // console.log(label, this.selectedTab)
    const index = this.allLables.findIndex(t => t.label === label);
    if (index === -1) return;
    this.selectedTabIndex = index;
    this.selectedTab = this.allLables[index];
    this.selectedTabLabel = label;
    console.log(this.selectedTabIndex, this.selectedTab);
    this.selectedTabLabel = this.selectedTab.label; // Get the label of the selected tab
    // Reset paged-render window so leaving and re-entering Breakdown Maintenance starts at page 1.
    this.breakdownDisplayLimit = this.breakdownPageSize;
    // Reset the shared search input — cross-tab filter values are usually
    // meaningless (e.g. a substation name doesn't match observations).
    this.dashboardSearchText = '';
    /*    console.log('Selected Tab Label:', this.selectedTabLabel);*/
    this.appservice.setCurrentMaintenanceTab(this.selectedTabLabel);

    Object.keys(this.filter_dashboard).forEach(selectedTabLabel => {
      Object.keys(this.filter_dashboard[selectedTabLabel]).forEach(filter => {
        this.filter_dashboard[selectedTabLabel][filter].selected = {}; // Clear all selected filters
      });
    });

    if (this.tlFilter && this.tlFilter.nativeElement) {
      this.tlFilter.nativeElement.value = '';
      this.pt_tlDatasource.filter = '';
      this.pt_tlDatasource.data = this.pt_tlDatasource.data.slice();
    }

    if (this.tlFilter && this.tlFilter.nativeElement) {
      this.tlFilter.nativeElement.value = '';
      this.sc_tlDatasource.filter = '';
      this.sc_tlDatasource.data = this.sc_tlDatasource.data.slice();
    }

    if (this.Filter && this.Filter.nativeElement) {
      this.Filter.nativeElement.value = '';
      this.subDatasource.filter = '';
      this.subDatasource.data = this.subDatasource.data.slice();
    }

    if (this.Filter && this.Filter.nativeElement) {
      this.Filter.nativeElement.value = '';
      this.hotlineDatasource.filter = '';
      this.hotlineDatasource.data = this.hotlineDatasource.data.slice();
    }
    if (this.Filter && this.Filter.nativeElement) {
      this.Filter.nativeElement.value = '';
      this.hotlineObservationDatasource.filter = '';
      this.hotlineObservationDatasource.data = this.hotlineObservationDatasource.data.slice();
    }

    if (this.Filter && this.Filter.nativeElement) {
      this.Filter.nativeElement.value = '';
      this.hotlineTLDatasource.filter = '';
      this.hotlineTLDatasource.data = this.hotlineTLDatasource.data.slice();
    }

    if (this.bayFilter && this.bayFilter.nativeElement) {
      this.bayFilter.nativeElement.value = '';
      this.bayDatasource.filter = '';
      this.bayDatasource.data = this.bayDatasource.data.slice();
    }

    if (this.eqpFilter && this.eqpFilter.nativeElement) {
      this.eqpFilter.nativeElement.value = '';
      this.eqpDatasource.filter = '';
      this.eqpDatasource.data = this.eqpDatasource.data.slice();
    }

    if (this.mplannedFilter && this.mplannedFilter.nativeElement) {
      this.mplannedFilter.nativeElement.value = '';
      this.plannedDatasource.filter = '';
      this.plannedDatasource.data = this.plannedDatasource.data.slice();
    }

    if (this.codereqFilter && this.codereqFilter.nativeElement) {
      this.codereqFilter.nativeElement.value = '';
      this.requestedDatasource.filter = '';
      this.requestedDatasource.data = this.requestedDatasource.data.slice();
    }

    if (this.xenappreqFilter && this.xenappreqFilter.nativeElement) {
      this.xenappreqFilter.nativeElement.value = '';
      this.xenApprovalrqstDataSource.filter = '';
      this.xenApprovalrqstDataSource.data = this.xenApprovalrqstDataSource.data.slice();
    }

    if (this.xenapprovedFilter && this.xenapprovedFilter.nativeElement) {
      this.xenapprovedFilter.nativeElement.value = '';
      this.xenApprovedDataSource.filter = '';
      this.xenApprovedDataSource.data = this.xenApprovedDataSource.data.slice();
    }

    if (this.obFilter && this.obFilter.nativeElement) {
      this.obFilter.nativeElement.value = '';
      this.obMaintenanceDatasource.filter = '';
      this.obMaintenanceDatasource.data = this.obMaintenanceDatasource.data.slice();
    }

    if (this.obslstFilter && this.obslstFilter.nativeElement) {
      this.obslstFilter.nativeElement.value = '';
      this.observationDatasource.filter = '';
      this.observationDatasource.data = this.observationDatasource.data.slice();
    }
    //this.checkIfMobile();
    this.cdr.detectChanges();
    this.scrollActiveTabIntoView();
  }

  formatName(name: string) {
    return name.split('/').slice(-2).join('/');
  }

  private scrollActiveTabIntoView() {
    setTimeout(() => {
      const bar = this.bottomTabBar?.nativeElement as HTMLElement;
      if (!bar) return;
      const active = bar.querySelector<HTMLElement>('.bottom-tab-btn.active');
      active?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }, 50);
  }

  ngAfterViewInit() {
    // this.sc_tlDatasource.sort = this.sort;
    // this.pt_tlDatasource.sort = this.sort;
    // this.subDatasource.sort = this.sort;
    // this.bayDatasource.sort = this.sort;
    // this.eqpDatasource.sort = this.sort;
    // this.plannedDatasource.sort = this.sort;
    // this.requestedDatasource.sort = this.sort;
    // const selectedTab = this.tabGroup._tabs.get(this.selectedTabIndex);
    // if (selectedTab) {
    //   const tabChangeEvent: any = { index: this.selectedTabIndex, tab: selectedTab };
    //   this.onTabChange(tabChangeEvent);
    // }
    setTimeout(() => {
      this.update_counter = 0;
      this.signalr.StartSendData();
    });
    this.scrollActiveTabIntoView();
  }

  getActivityStatusType(status: MaintenanceStatus, ptw_work_completed: boolean, cutoff: number, shutdown_required: boolean, maintenance_list: any, cancel_info: any): string {
    if (status == MaintenanceStatus.Planned && (maintenance_list?.scheduled_patrolling == "patrolling" || maintenance_list?.hotline) && cutoff == 0)
      return "-";
    if (status == MaintenanceStatus.PTWCancelRequested) {
      if (ptw_work_completed)
        return MaintenanceStatusToString[MaintenanceStatus.PTWCancelRequestedWorkComplete].show;
      return MaintenanceStatusToString[MaintenanceStatus.PTWCancelRequestedWorkNotComplete].show
    }
    return MaintenanceStatusToString[status]?.show ?? status;
  }

  async createOtherPTW() {
    if (this.isOtherPtwQrInProgress) return;
    this.isOtherPtwQrInProgress = true;

    const groupPath = this.group_path?.length ? this.group_path.join('/') : undefined;
    let substationCode: string | undefined;
    if (this.group_path?.length >= 5) {
      const substationId = this.group_path[4];
      try {
        const substation = await this.mntservice.GetSubstationById(substationId);
        if (substation && !('code' in substation && substation.code != null)) {
          const code = substation.substationcode ?? substation.substation_code;
          if (code != null && String(code).trim()) substationCode = String(code).trim();
        }
      } catch {
        // proceed without substation code; token will use legacy PTW number
      }
    }

    // try {
    //   const data = await this.mntservice.GenerateOtherPtwQrToken(groupPath, substationCode);
    //   if ('code' in data && data.code != null) {
    //     // this._snackBar.open(
    //     //   this.locale_service.Locale.language.errorcode[data.code] || this.locale_service.Locale.language.common.failed,
    //     //   this.locale_service.Locale.language.common.failed,
    //     //   { duration: 2000 }
    //     // );
    //     this.isOtherPtwQrInProgress = false;
    //     return;
    //   }
    //   const success = data as { token: string; url: string; expiresAt: string };
    //   const dialogRef = this.dialog.open(QrDialogComponent, {
    //     width: '400px',
    //     closeOnNavigation: true,
    //     disableClose: false,
    //     autoFocus: true,
    //     data: { url: success.url, expiresAt: success.expiresAt, type: this.locale_service.Locale.language.project.maintenancesettings.OtherPermits.otherPTW.other_ptw_request_qr_title } as QrDialogData
    //   });
    //   dialogRef.afterClosed().subscribe(() => {
    //     this.isOtherPtwQrInProgress = false;
    //   });
    // } catch {
    //   this._snackBar.open(
    //     this.locale_service.Locale.language.project.maintenancesettings.maintenancebutton.qr_generation_failed,
    //     this.locale_service.Locale.language.common.failed,
    //     { duration: 2000 }
    //   );
    //   this.isOtherPtwQrInProgress = false;
    // }
  }

  async createTrialRunRequest() {
    if (this.isTrialRunQrInProgress) return;
    this.isTrialRunQrInProgress = true;

    const groupPath = this.group_path?.length ? this.group_path.join('/') : undefined;
    let substationCode: string | undefined;
    if (this.group_path?.length >= 5) {
      const substationId = this.group_path[4];
      try {
        const substation = await this.mntservice.GetSubstationById(substationId);
        if (substation && !('code' in substation && substation.code != null)) {
          const code = substation.substationcode ?? substation.substation_code;
          if (code != null && String(code).trim()) substationCode = String(code).trim();
        }
      } catch {
        // proceed without substation code; token will use legacy PTW number fallback
      }
    }

    // try {
    //   const data = await this.mntservice.GenerateTrialRunQrToken(groupPath, substationCode);
    //   if ('code' in data && data.code != null) {
    //     this._snackBar.open(
    //       this.locale_service.Locale.language.errorcode[data.code] || this.locale_service.Locale.language.common.failed,
    //       this.locale_service.Locale.language.common.failed,
    //       { duration: 2000 }
    //     );
    //     this.isTrialRunQrInProgress = false;
    //     return;
    //   }

    //   const success = data as { token: string; url: string; expiresAt: string };
    //   const dialogRef = this.dialog.open(QrDialogComponent, {
    //     width: '400px',
    //     closeOnNavigation: true,
    //     disableClose: false,
    //     autoFocus: true,
    //     data: { url: success.url, expiresAt: success.expiresAt, type: this.locale_service.Locale.language.project.maintenancesettings.OtherPermits.clearanceCertificate.clearance_request_qr_title } as QrDialogData
    //   });
    //   dialogRef.afterClosed().subscribe(() => {
    //     this.isTrialRunQrInProgress = false;
    //   });
    // } catch {
    //   this._snackBar.open(
    //     this.locale_service.Locale.language.project.maintenancesettings.maintenancebutton.qr_generation_failed,
    //     this.locale_service.Locale.language.common.failed,
    //     { duration: 2000 }
    //   );
    //   this.isTrialRunQrInProgress = false;
    // }
  }

  async openPTWOther(row: any, index: number) {
    // Trial request docs use a different id prefix.
    let loaded: any = null;
    if (row?._id?.startsWith('clr-') || String(row?.current_status ?? '').startsWith('clr_')) {
      loaded = await this.mntservice.GetClearancePTWByID(row._id);
    } else {
      loaded = await this.mntservice.GetOtherPTWByID(row._id);
    }

    row = loaded;
    // if (row.code && row.code != null) {
    //   this._snackBar.open(this.locale_service.Locale.language.errorcode[row.code] ?? this.locale_service.Locale.language.common.failed,
    //     this.locale_service.Locale.language.common.failed, { duration: 2000 });
    //   return;
    // }
    // const dialogRef = this.dialog.open(PtwOtherActionDlgComponent, {
    //   height: '100%', width: '70%', closeOnNavigation: true, disableClose: true, autoFocus: true, data: {
    //     maintenanceDetails: row
    //   }
    // });
    // dialogRef.afterClosed().subscribe((result: any) => {
    //   if (result) {
    //     if ((result?.restoration_datetime ?? 0) > 0 || result.current_status === 'ptw_rejected') {
    //       this.otherDatasource.data.splice(index, 1);
    //     } else {
    //       this.otherDatasource.data.splice(index, 1, result);
    //     }
    //     this.otherDatasource.data = this.otherDatasource.data.slice();
    //   }
    // });
  }

  async updateEventsData(eventsDataSource: any, details: any) {
    console.log("Entered UpdateEventData", details)
    if (!details) {
      this.saving = false;
      return;
    }
    let eventKeyVal = {};

    this.getVals(details);
    this.eventsDataSource.data = [];

    // Real-time PTW No. sync: when the backend broadcasts an event update
    // right after a Request PTW, details.new_ptw_id contains the fresh map
    // { maintenance_id → assigned PTW number }. Forward it to whichever
    // PTW dialog is currently open so its "PTW No." field patches from
    // "" / "PTW/undefined" to the real value in real time (matches the
    // client app flow — see maintenance-dashboard.component.ts on web).
    if (this.resolver.mnt_ptw_form)
      this.resolver.mnt_ptw_form.updatePTWData(details.new_ptw_id, details.backcharging_ids);

    eventsDataSource.sort((a: any, b: any) => b.s_time - a.s_time);

    // Reset funnel option buckets — events get wiped on each push, so the option list should reflect only what's in this push.
    if (this.filter_dashboard["Breakdown Maintenance"]) {
      Object.keys(this.filter_dashboard["Breakdown Maintenance"]).forEach(col => {
        this.filter_dashboard["Breakdown Maintenance"][col].unique_opts = {};
        this.filter_dashboard["Breakdown Maintenance"][col].options = [];
      });
    }

    for (let event of eventsDataSource) {
      if (!event.value && event.cot != 'MAINTENANCE') {
        let mnt_list_id = this.conditional_bay_DS[event.path.join('/')]; // contains mnt_list id + mnt id
        //console.log(this.time_settings)
        if (this.time_settings != null) {
          const start = this.time_settings.range.start || 0;
          const end = this.time_settings.range.end || Number.MAX_VALUE;
          if (event.s_time >= start && event.s_time <= end) {
            const eventRow = {
              event_details: event,
              zone: this.appservice.unescapedName(event.path[1]),
              bay: this.appservice.unescapedName(event.path[5]),
              division: this.appservice.unescapedName(event.path[3]),
              circle: this.appservice.unescapedName(event.path[2]),
              substation: this.appservice.unescapedName(event.path[4]),
              device_name: event.path.join('/'),
              current_status: (mnt_list_id && mnt_list_id.startsWith("conditional")) ? MaintenanceStatus.Planned : MaintenanceStatus.Critical,
              datetime: event.s_time,
              connected_mnt_id: (mnt_list_id && mnt_list_id.startsWith("conditional")) ? mnt_list_id : "",
              reason: event.cot
            };
            this.eventsDataSource.data.push(eventRow);
            this.getFilterOptions(eventRow, "Breakdown Maintenance");
          }
        }

        eventKeyVal[event.path.join('/')] = "";

      }
    }

    // The events tab has its own update path that bypasses fetchData/applyFilters:
    // events are pushed directly into eventsDataSource AFTER getVals() already
    // snapshotted a stale (or empty) eventsDataSource into originalData. Refresh
    // the snapshot AND re-apply the Breakdown Maintenance filter — without the
    // re-apply, any active filter (e.g. Status=critical) gets wiped by the fresh
    // event push and the user sees the full unfiltered list until they touch
    // the filter menu again. Matches client app (applyFiltersForTab).
    this.originalData["Breakdown Maintenance"] = [...this.eventsDataSource.data];
    this.applyFilters("Breakdown Maintenance");
    this.eventsDataSource.data = this.eventsDataSource.data.slice();
    let xen_req_ds = [], xen_updated = false, xen_bay_wise = {};
    const changeStatusOnDashboard = (ref_this, original_ds, skip_xen = false) => {
      let updated = false;

      const updateStatus = (newStatus: MaintenanceStatus, ind) => {
        updated = true;
        original_ds[ind].current_status = newStatus;
        // Keep the derived label (used by card pill + filter matching/options) in
        // sync with current_status. Without this, `.status` retains the pre-
        // transition label and the pill shows e.g. "Planned" while backend logic
        // has already moved to "Request For PTW".
        original_ds[ind].status = MaintenanceStatusToString[newStatus]?.show || newStatus;
      };

      for (let ind in original_ds) {
        const { current_status, shutdown_required, device_name, isVoltagelevelNoSLDCExists, hasMaintenance, hasMNP, requests_approves_datetime, block_till_connected_bay_shutdown } = original_ds[ind];
        //if (block_till_connected_bay_shutdown) {
        //  if (block_till_connected_bay_shutdown[device_name][0] != "1") { // not considering the 1st mnt started on Line Bay [0] == "1", [1] = "pmp-id"
        //    if (!block_till_connected_bay_shutdown[device_name][1] || current_status == MaintenanceStatus.Planned) {     // not initiator
        //      // 1st time "", in betn status available, after initiator reaches PTW Requested then keep RequestPTW till last (distinguish below by comparing current status)
        //      // when connected bays reaches RequestPTW, if one pmp PTWRequested then status is not planned,
        //      // exclude that & only keep RequestPTW for other pmps
        //      if (block_till_connected_bay_shutdown[device_name][2])
        //        updateStatus(block_till_connected_bay_shutdown[device_name][2], ind); // [2] contains initiator status // keep it sync till RequestPTW
        //      continue;
        //    }
        //else if (block_till_connected_bay_shutdown[device_name][0] == "1") {
        //  updateStatus(MaintenanceStatus.RequestPTW, ind);
        //  continue; // if planned make it to RequestPTW
        //}

        if (shutdown_required) {
          let voltageLessThan66KV = isVoltagelevelNoSLDCExists == '11' || isVoltagelevelNoSLDCExists == '33'
            , temp_device_name = device_name; // bay name


          if (original_ds[ind].maintenance_list._id.slice(0, 3) == "pet") { //eqp name
            temp_device_name = device_name.split("/").slice(0, 7).join("/");
          } else if (original_ds[ind].maintenance_list._id.slice(0, 3) == "pov") { // pov
            if (temp_device_name.split("/").length > 6) {
              temp_device_name = temp_device_name.split("/").slice(0, 7).join("/");
            }
          }

          const isShutdown = (temp_device_name in eventKeyVal) || !(details.connectedBays[temp_device_name] ?? true);

          if (voltageLessThan66KV && current_status == MaintenanceStatus.Planned) {
            updateStatus(MaintenanceStatus.RequestPTW, ind);
          }
          else {
            if ((current_status == MaintenanceStatus.Planned
              || (current_status == MaintenanceStatus.RequestPTW && requests_approves_datetime.xen_maintainance_approved_datetime == 0)
              || current_status == MaintenanceStatus.XenApprovalRequested) && !skip_xen) {
              if (isShutdown || this.maintenanceSkipXENSLDCStep) {
                if (current_status != MaintenanceStatus.RequestPTW) {
                  updateStatus(MaintenanceStatus.RequestPTW, ind);
                  let index = xen_req_ds.findIndex(el => el._id == original_ds[ind]._id);
                  if (index >= 0)
                    xen_req_ds.splice(index, 1);
                  xen_updated = true;
                }
              } else if (current_status != MaintenanceStatus.XenApprovalRequested) {
                updateStatus(MaintenanceStatus.XenApprovalRequested, ind);
                if (xen_req_ds.length == 0 || !xen_req_ds.some(el => el._id == original_ds[ind]._id))
                  xen_req_ds.push(original_ds[ind]);
                xen_updated = true;
              }
            }
            else if (current_status === MaintenanceStatus.SLDCShutDownCodeRequested) {
              if (isShutdown) {
                if (current_status != MaintenanceStatus.RequestPTW) {
                  updateStatus(MaintenanceStatus.RequestPTW, ind);
                }
              }
              //else if (current_status !== MaintenanceStatus.SLDCShutDownCodeRequested)
              //  updateStatus(MaintenanceStatus.SLDCShutDownCodeRequested, ind);

            }
            else if (current_status === MaintenanceStatus.SLDCShutDownCodeIssued) {
              if (isShutdown) {
                if (current_status != MaintenanceStatus.RequestPTW) {
                  updateStatus(MaintenanceStatus.RequestPTW, ind);
                }
              }
              //else if (current_status !== MaintenanceStatus.SLDCShutDownCodeIssued)
              //  updateStatus(MaintenanceStatus.SLDCShutDownCodeIssued, ind);
            }
          }
        }

        if ((!shutdown_required && requests_approves_datetime.in_progress_datetime > 0)
          || (shutdown_required
            && (current_status == MaintenanceStatus.RestorationCompleted || current_status == MaintenanceStatus.ParameterSubmitPending || current_status == MaintenanceStatus.ParameterApprovalPending))) {
          const isMNP_submit_pending = ref_this.resolver.MaintenanceAccessRights.mnp_input_save_submit && requests_approves_datetime.mnp_parameter_datetime == 0;

          if ((requests_approves_datetime.parameter_revert_datetime > requests_approves_datetime.maintenance_parameter_datetime)) {
            if (current_status != MaintenanceStatus.ParameterSubmitPending)
              updateStatus(MaintenanceStatus.ParameterSubmitPending, ind);    // change back to Submission Pending after Revert
          }
          else if (hasMaintenance && !isMNP_submit_pending && (requests_approves_datetime.maintenance_parameter_datetime !== 0 &&
            (requests_approves_datetime.parameter_revert_datetime < requests_approves_datetime.maintenance_parameter_datetime)
            && requests_approves_datetime.parameter_approval_datetime == 0)) {
            if (current_status != MaintenanceStatus.ParameterApprovalPending)
              updateStatus(MaintenanceStatus.ParameterApprovalPending, ind);  // after submission Approval Pending
          }
          else if (isMNP_submit_pending) {
            if (current_status != MaintenanceStatus.ParameterSubmitPending)
              updateStatus(MaintenanceStatus.ParameterSubmitPending, ind);    // M&P Parameter submission pending to only M&P user if Maintenance Parameter has been submitted
          }
          else if ((hasMaintenance || hasMNP)
            && (requests_approves_datetime.maintenance_parameter_datetime == 0 || requests_approves_datetime.mnp_parameter_datetime == 0)) {
            if (current_status != MaintenanceStatus.ParameterSubmitPending)
              updateStatus(MaintenanceStatus.ParameterSubmitPending, ind);    // No Parameter has been submitted Maintenance or M&P
          }
        }
      }
      if (updated) {
        original_ds = original_ds.slice();
      }
    }

    //Backcharging Manual Status Check
    const changeStatusonBCDashboard = (data) => {
      data.forEach((item) => {
        let matchedValue = item.backcharging_id[item.device_name] ? true : null;
        if (matchedValue && item.current_status == MaintenanceStatus.BCCertificateRequested) {
          item.current_status = MaintenanceStatus.BCCertificateIssued;
          // Keep derived label in sync with current_status — same reason as
          // updateStatus above: template binds to item.status.
          item.status = MaintenanceStatusToString[MaintenanceStatus.BCCertificateIssued]?.show
            ?? MaintenanceStatus.BCCertificateIssued;
        }
      });
    }
    changeStatusOnDashboard(this, this.subDatasource.data);
    changeStatusOnDashboard(this, this.bayDatasource.data);
    changeStatusOnDashboard(this, this.excluded_bayDatasource.data, true);
    changeStatusOnDashboard(this, this.eqpDatasource.data);
    changeStatusOnDashboard(this, this.obMaintenanceDatasource.data);



    // execute only if atleast 1 TL Shutdown exists
    //if (this.tl_shutdown_mnt_exists) {
    changeStatusOnDashboard(this, this.sc_tlDatasource.data);
    changeStatusOnDashboard(this, this.excluded_sc_tlDatasource.data);
    //}

    // execute only if Backcharging Tab access
    if (this.resolver.MaintenanceAccessRights.backfeeding_request_tab_view)
      changeStatusonBCDashboard(this.backfeedingDatasource.data)

    // Status labels were transitioned above (Planned → Request For PTW, etc.).
    // The 'status' filter dropdown was built during load (in push_*_Datasource)
    // from pre-transition labels, so it would show options that no longer
    // exist on any item. Rebuild that filter's options tab-by-tab from the
    // updated datasets so filter dropdown ↔ card pill ↔ filter matching all agree.
    const rebuildStatusFilter = (tabName: string, data: any[]) => {
      const filter = this.filter_dashboard[tabName]?.status;
      if (!filter) return;
      filter.unique_opts = {};
      for (const item of data) {
        const val = item.status;
        if (val !== undefined && val !== null && val !== '')
          filter.unique_opts[val] = '';
      }
      filter.options = Object.keys(filter.unique_opts);
    };
    rebuildStatusFilter('Substation', this.subDatasource.data);
    rebuildStatusFilter('Bay', this.bayDatasource.data);
    rebuildStatusFilter('Scheduled TL', this.sc_tlDatasource.data);
    rebuildStatusFilter('Observation Maintenance', this.obMaintenanceDatasource.data);

    if (xen_updated) {
      // this.xenApprovalrqstDataSource.data = xen_req_ds; individual
      for (let mnt_item of xen_req_ds) {
        //if (mnt_item.block_till_connected_bay_shutdown
        //  && !mnt_item.block_till_connected_bay_shutdown[mnt_item.device_name].isInitiator)
        //  // excluding the 1st mnt started on Line Bay isInitiator = true, for conncted bays isInitiator = false
        //  continue;

        if (!xen_bay_wise[mnt_item.device_name])
          xen_bay_wise[mnt_item.device_name] = [];
        xen_bay_wise[mnt_item.device_name].push(mnt_item);
      }
      for (let bay in xen_bay_wise) {
        const first_mnt = xen_bay_wise[bay][0];
        first_mnt.all_mnt_on_xen_request = xen_bay_wise[bay];
        this.xenApprovalrqstDataSource.data.push(first_mnt)
      }
    }
  }

  onMenuClose() {
    // If clicked inside the menu, prevent closing
    // setTimeout(() => {
    //   if (document.activeElement?.classList.contains('cdk-overlay-container')) {
    //     this.filterMenuTrigger.openMenu();  // Reopen if closed by mistake
    //   }
    // }, 50);
  }

  getFilterDetails(tabName: string) {
    this.FilterCategories = [];

    if (!this.filter_dashboard[tabName]) return;

    Object.keys(this.filter_dashboard[tabName]).forEach((key) => {
      this.FilterCategories.push({
        name: this.filter_dashboard[tabName][key].name,
        key: key,
        options: this.filter_dashboard[tabName][key].options.map(option => ({
          name: option,
          selected: this.selectedFilters[tabName]?.[key]?.includes(option) || false
        }))
      });
    });
  }

  applyFilters(tabLabel: string = this.selectedTabLabel) {
    const tabConfig = {
      Substation: { dataSource: this.subDatasource, original: this.originalData.Substation, filters: ['mnttype', 'status'] },
      Hotline: { dataSource: this.hotlineDatasource, original: this.originalData.Hotline, filters: ['mnttype'] },
      "HotLine TL": {
        dataSource: this.hotlineTLDatasource,
        original: this.originalData["HotLine TL"],
        filters: ['mnttype', 'status']
      },
      Bay: { dataSource: this.bayDatasource, original: this.originalData.Bay, filters: ['mnttype', 'baytype', 'bay', 'status'] },
      Equipment: { dataSource: this.eqpDatasource, original: this.originalData.Equipment, filters: ['mnttype', 'baytype', 'eqptype', 'eqp', 'bay'] },
      "Scheduled TL": { dataSource: this.sc_tlDatasource, original: this.originalData["Scheduled TL"], filters: ['mnttype', 'line_name', 'status'] },
      "Patrolling TL": { dataSource: this.pt_tlDatasource, original: this.originalData["Patrolling TL"], filters: ['mnttype', 'line_name', 'status'] },
      "Observations List": { dataSource: this.observationDatasource, original: this.originalData["Observations List"], filters: ['ob_line_name', 'device_type', 'maintenance_type', 'user_role_based'] },
      "XEN Approved": { dataSource: this.xenApprovedDataSource, original: this.originalData["XEN Approved"], filters: ['mnttype', 'status'] },
      "Maintenance Planned": { dataSource: this.plannedDatasource, original: this.originalData["Maintenance Planned"], filters: ['mnttype', 'status'] },
      "Observation Maintenance": { dataSource: this.obMaintenanceDatasource, original: this.originalData["Observation Maintenance"], filters: ['mnttype', 'status'] },
      "Code Requested": { dataSource: this.requestedDatasource, original: this.originalData["Code Requested"], filters: ['bay', 'baytype'] },
      "Hotline Observation Maintenance": { dataSource: this.hotlineObservationDatasource, original: this.originalData["Hotline Observation Maintenance"], filters: ['mnttype'] },
      "Asst. Mnt. Elmnt": { dataSource: this.tlConnectedBayDatasource, original: this.originalData["Asst. Mnt. Elmnt"], filters: ['mnttype'] },
      "Connected TL": { dataSource: this.bayConnectedTLDatasource, original: this.originalData["Connected TL"], filters: ['maintenancename'] },
      "Breakdown Maintenance": { dataSource: this.eventsDataSource, original: this.originalData["Breakdown Maintenance"], filters: ['reason', 'current_status'] },
      OtherPTW: {
        dataSource: this.otherDatasource,
        original: this.originalData.OtherPTW,
        filters: ['ptwbay', 'current_status', 'issuedto', 'status']
      }
    };
    const otherPTWLabel = this.locale_service.Locale.language.project.maintenancesettings.heading.otherPTW;
    if (otherPTWLabel && this.originalData[otherPTWLabel]) {
      tabConfig[otherPTWLabel] = { dataSource: this.otherDatasource, original: this.originalData[otherPTWLabel], filters: ['ptwzone', 'ptwcircle', 'ptwdivision', 'ptwsubstation', 'ptwbay', 'current_status', 'issuedto', 'status'] };
    }

    const config = tabConfig[tabLabel];
    if (!config) return;

    const selectedFilters: Record<string, string[]> = config.filters.reduce((acc, filterKey) => {
      acc[filterKey] = Object.keys(this.filter_dashboard[tabLabel]?.[filterKey]?.selected || {});
      return acc;
    }, {} as Record<string, string[]>); // Explicitly typing selectedFilters as Record<string, string[]>

    // Reset if no filters are selected
    if (Object.values(selectedFilters).every((filter: string[]) => filter.length === 0)) {
      config.dataSource.data = [...config.original];
      return;
    }

    // Apply filters dynamically
    config.dataSource.data = config.original.filter(item =>
      Object.entries(selectedFilters).every(([filterKey, selectedValues]) =>
        selectedValues.length === 0 || selectedValues.includes(item[filterKey] || item.maintenance_list?.maintenancename)
      )
    );
  }

  onCheckboxChange(option: string, selected: Record<string, any>) {
    if (!this.selectedTabLabel) return;

    if (selected[option]) {
      delete selected[option]; // Remove if already selected
    } else {
      selected[option] = "1"; // Add if not selected
    }
    this.applyFilters();
  }

  clearAllFilters() {
    const tab = this.filter_dashboard[this.selectedTabLabel];
    if (!tab) return;
    Object.values(tab).forEach((f: any) => { f.selected = {}; });
    // Also wipe the per-category search text, otherwise the searchbars keep
    // their query strings after the user hits the reset button.
    Object.keys(tab).forEach(k => { this.filter_search_text[k] = ''; });
    const dataSourceKey = this.getDatasourceKey(this.selectedTabLabel);
    if (dataSourceKey && this.originalData[this.selectedTabLabel]) {
      this[dataSourceKey].data = [...this.originalData[this.selectedTabLabel]];
    }
    this.filter_dashboard = { ...this.filter_dashboard };
    this.cdRef.detectChanges();
  }

  // Case-insensitive substring match against the current search query for
  // the given filter category. Empty query returns the full option list.
  filteredCategoryOptions(category_key: string, options: any[]): any[] {
    const q = (this.filter_search_text[category_key] || '').trim().toLowerCase();
    if (!q) return options || [];
    return (options || []).filter(o => (o ?? '').toString().toLowerCase().includes(q));
  }

  getDatasourceKey(tabLabel: string): string | null {
    const datasourceMapping = {
      'Substation': 'subDatasource',
      'HotLine': 'hotlineDatasource',
      'HotLine TL': 'hotlineTLDatasource',
      'Bay': 'bayDatasource',
      'Equipment': 'eqpDatasource',
      'TL': 'tlDatasource',
      'Observations List': 'observationDatasource',
      'XEN Approved': 'xenApprovedDataSource',
      'Code Requested': 'requestedDatasource',
      'XEN Approve Requests': 'xenApprovalrqstDataSource',
      'Maintenance Planned': 'plannedDatasource',
      'Observation Maintenance': 'obMaintenanceDatasource',
      'Hotline Observation Maintenance': 'hotlineObservationDatasource',
      'Asst. Mnt. Elmnt': 'tlConnectedBayDatasource',
      'Connected TL': 'bayConnectedTLDatasource',
      'Breakdown Maintenance': 'eventsDataSource',
      'OtherPTW': 'otherDatasource'
    };
    if (tabLabel === this.locale_service.Locale.language.project.maintenancesettings.heading.otherPTW) {
      return 'otherDatasource';
    }
    return datasourceMapping[tabLabel] || null;
  }

  get filterTypeForCurrentTab(): string {
    const allTabs = this.getMaintenanceDashboardTabDetails();
    const tab = allTabs.find(t => t.label === this.selectedTabLabel);
    return (tab as any)?.filter_text ?? '';
  }

  dateTimeChanged(ev) {
    // Send 'custom' to server so it uses the explicit range.start/end values,
    // but keep the original rangeselection (e.g. 'single_date') in time_settings for display.
    const serverPayload = { ...ev, rangeselection: 'custom' };
    this.signalr.UpdateMaintenanceDashboardTimeSettings(serverPayload).then(data => {
      if (data == null || data !== '') {
        console.error('[MaintenanceDashboard] dateTimeChanged error:', data);
      } else {
        this.time_settings = JSON.parse(JSON.stringify(ev));
      }
    });
  }

  clearAllSelections() {
    const ret_value: any = { range: { start: 0, end: 0 } };
    this.signalr.UpdateMaintenanceDashboardTimeSettings(ret_value).then(data => {
      if (data == null || data !== '') {
        console.error('[MaintenanceDashboard] clearAllSelections error:', data);
      } else {
        this.time_settings = {
          rangeselection: 'mnt_db',
          range: { start: null, end: null }
        };
      }
    });
  }

  createPredicate(visibleColumns: string[]) {
    // The mat-table `visibleColumns` are the columns rendered on desktop, but
    // on mobile the same data source drives a card layout that surfaces a
    // slightly different (and often broader) set of fields — observationtype
    // rendered as "JETL", substation as the location line, mnttype as the
    // title fallback, formatted date via appservice.dateToString, etc.
    // Searching only the mat-table columns therefore misses fields the user
    // can actually see on the card. Widen the searchable set with the fields
    // referenced in the card templates, and additionally scan all primitive
    // (string/number) row values as a catch-all so the search behaves the way
    // users expect on a card view: "what I see is what I can search."
    const keyMap: any = {
      maintenancetype: 'mnttype',
      status: 'current_status'
    };

    const normalized = visibleColumns.map(col => keyMap[col] || col);
    // Fields visible on the mobile cards that aren't always present in the
    // mat-table column list. Kept explicit so the search predicate is
    // predictable — the catch-all below still covers anything else.
    const cardFields = [
      'ob_line_name', 'mnttype', 'device_type', 'device_name',
      'description', 'observations', 'observationtype', 'remarks',
      'substation', 'bay', 'lineno', 'line_name',
      'mnt_device_type', 'equipment_name', 'scheduled_status',
      'status', 'current_status',
      'zone', 'circle', 'division',
    ];

    // Also expose the human-readable observation user type ("JE", "JETL",
    // "MNP", "Hotline JE", ...) so typing what the user sees on the card
    // matches. Mirrors getObservationUserTypeLabel().
    const obsUserTypeMap: Record<string, string> = {
      je: 'JE', mnp: 'MNP', je_tl: 'JETL',
      hotline: 'Hotline JE', alarm: 'Alarm', na: 'NA',
    };

    return (row: any, filter: string) => {
      const term = filter.trim().toLowerCase();
      if (!term) return true;

      // 1. Explicit column set (existing behaviour).
      const primary = normalized.map(col => (row[col] ?? '').toString().toLowerCase());
      // 2. Card-visible fields.
      const cards = cardFields.map(col => (row[col] ?? '').toString().toLowerCase());
      // 3. Observation user type label (raw value maps to what's rendered).
      const rawObsType = (row['observationtype'] ?? '').toString().toLowerCase();
      const obsLabel = (obsUserTypeMap[rawObsType] ?? '').toLowerCase();
      // 4. Catch-all — any other primitive value on the row.
      const catchAll: string[] = [];
      for (const k in row) {
        const v = row[k];
        if (v == null) continue;
        const t = typeof v;
        if (t === 'string' || t === 'number' || t === 'boolean') {
          catchAll.push(String(v).toLowerCase());
        }
      }

      return [...primary, ...cards, obsLabel, ...catchAll].join(' ').includes(term);
    };
  }

  CreateObservation() {
    let current_path = this.group_path.join('/');
    let type = "";
    if (this.resolver?.MaintenanceAccessRights?.maintenence_input_save_submit)
      type = "je"
    else if (this.resolver?.MaintenanceAccessRights?.tl_maintenance_parameter_input_save_submit)
      type = "je_tl";
    else if (this.resolver?.MaintenanceAccessRights?.mnp_input_save_submit)
      type = "mnp";

    // this.dialog
    //   .open(ManualObservationCreationDlgComponent, {
    //     disableClose: true,
    //     autoFocus: true,
    //     width: '45vw',
    //     closeOnNavigation: true,
    //     data: {
    //       observationtype: type,
    //       path: current_path
    //     }
    //   })
    //   .afterClosed()
    //   .subscribe(result => {
    //     if (result) {
    //       // handle saved observation
    //       console.log(result);
    //     }
    //   });

  }

  private checkIfMobile() {
    // Common phone breakpoint: 600px or less (Material uses 600px for xs/sm)
    this.isMobileWindow = window.innerWidth <= 600;
    let columnsDS = this.allLables[this.selectedTabIndex].displayedColumns;
    let disabledColumns = this.disabledColumnOnMobileView;

    if (columnsDS[0].startsWith('ptw')) {
      disabledColumns = this.disabledColumnOnMobileViewForPTW;
    }

    if (this.isMobileWindow == true) {
      disabledColumns.forEach((ele, i) => {
        if (columnsDS.includes(ele)) {
          columnsDS.splice(columnsDS.findIndex(lb => lb == ele), 1);
        }
      })
    }
    else {
      disabledColumns.forEach(ele => {
        if (!columnsDS.includes(ele)) {
          columnsDS.unshift(ele);
        }
      })
    }
  }

  //getAlllabels() {
  //  this.checks = this.getMaintenanceDashboardTabDetails();
  //}

  getStatusKey(status: string): string {
    return status?.toLowerCase()?.replace(/\s/g, '');
  }

  getObsStatusLabel(status: string): string {
    const map: Record<string, string> = {
      open: 'Open',
      fixed: 'Fixed',
      inprogress: 'In Progress',
      requireshutdown: 'Requires Shutdown',
      planned: 'Planned',
      scheduled: 'Scheduled',
    };
    return map[status?.toLowerCase()] ?? status ?? '';
  }

  // Mirrors ClientApp's OBSERVATION_USER_TYPE_OPTIONS mapping so the mobile
  // card renders "JE" (not raw "je"), "MNP" (not "mnp"), etc.
  getObservationUserTypeLabel(type: string): string {
    const map: Record<string, string> = {
      je: 'JE',
      mnp: 'MNP',
      je_tl: 'JETL',
      hotline: 'Hotline JE',
      alarm: 'Alarm',
      na: 'NA',
    };
    return map[type?.toLowerCase()] ?? type ?? '';
  }

  async openObservationDetails(item: any) {
    let obs = await this.mntservice.GetObservationById(item._id);
    if (obs.code && obs.code != null) return;
    this.opened_observation_dlg = {
      observationDetails: obs,
      observationtype: obs.observationtype,
      device_type: obs.device_type,
      openDetails: 'dashboard',
      connectedBayDS: this.bayConnectedBayDatasource.data,
      connectedTLDS: this.tlConnectedBayDatasource.data,
      connecedBayTLDS: this.bayConnectedTLDatasource.data,
      obdata: this.observationDatasource.data,
      obMaintenance: this.obMaintenanceDatasource.data,
      bayDatasource: this.bayDatasource.data,
      user_id: this.appservice.getUserName(),
    };
    this.cdr.detectChanges();
  }

  /**
   * Handles dismiss from the Breakdown Maintenance setup dialog. When the dialog
   * dismisses with { action: 'openMaintenance', maintenanceId }, this loads that
   * plan_mnt and opens the maintenance details modal — mirrors the ClientApp's
   * `openDetails()` path inside ConditionalMaintenanceSetupDlgComponent.
   */
  async onBreakdownSetupDismiss(event: any) {
    this.opened_breakdown_setup_dlg = null;
    const data = event?.detail?.data;
    if (data?.action === 'openMaintenance' && data?.maintenanceId) {
      const plan_mnt: any = await this.mntservice.GetPlanMntById(data.maintenanceId);
      if (!plan_mnt || (plan_mnt.code && plan_mnt.code != null)) return;
      plan_mnt.current_status = plan_mnt.current_status ?? plan_mnt.maintenance_status;
      this.opened_dlg_details = {
        device_details: plan_mnt,
        user_id: this.appservice.getUserName(),
        tripingStatus: this.eventsDataSource,
        obdata: this.observationDatasource.data,
        updateTrigger$: this.mnt_details_trigger.asObservable(),
        new_ptw_id: this.new_ptw_id?.[plan_mnt._id] ?? this.new_ptw_id,
        mnt_on_same_bay: [],
      };
      this.cdr.detectChanges();
    }
  }

  async onObservationDlgDismiss(event: any) {
    this.opened_observation_dlg = null;
    const data = event?.detail?.data;
    if (data?.action === 'openMaintenance' && data?.maintenanceId) {
      const plan_mnt = await this.mntservice.GetPlanMntById(data.maintenanceId);
      if (plan_mnt.code && plan_mnt.code != null) return;
      plan_mnt.current_status = plan_mnt.current_status ?? plan_mnt.maintenance_status;
      this.opened_dlg_details = {
        device_details: plan_mnt,
        user_id: this.appservice.getUserName(),
        tripingStatus: this.eventsDataSource,
        obdata: this.observationDatasource.data,
        updateTrigger$: this.mnt_details_trigger.asObservable(),
        new_ptw_id: this.new_ptw_id,
        mnt_on_same_bay: [],
      };
      this.cdr.detectChanges();
    }
  }

  trackByMntCard(_index: number, item: any): string {
    return (item._id ?? '') + '|' + (item.mnt ?? item.mnttype ?? '') + '|' + (item.path ?? '');
  }

  loadMoreBreakdown(event?: any) {
    const total = this.eventsDataSource?.filteredData?.length ?? 0;
    if (this.breakdownDisplayLimit < total) {
      this.breakdownDisplayLimit = Math.min(this.breakdownDisplayLimit + this.breakdownPageSize, total);
    }
    if (event?.target?.complete) event.target.complete();
  }

}
