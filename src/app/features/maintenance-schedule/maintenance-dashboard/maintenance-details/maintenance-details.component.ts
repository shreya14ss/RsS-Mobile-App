import { Component, OnInit, Input, ChangeDetectorRef, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { AppService } from '../../../../core/services/app.service';
import { LocaleService } from '../../../../core/services/locale/locale.service';
import { ObservationDlgComponent } from '../action-dlg/observation-dlg/observation-dlg.component';
import { MaintenanceService, MaintenanceStatus } from '../../../../core/services/maintenance.service';
import { ActivatedRoute } from '@angular/router';
import { AddUpdatePatrollingInfoComponent } from '../action-dlg/add-update-patrolling-info/add-update-patrolling-info.component';
import { ConfirmationDlgComponent } from '../../../../shared/components/confirmation-dlg/confirmation-dlg.component';
import { ProjectResolverService } from '../../../../core/services/project-resolver.service';
import { Subscription, Subject } from 'rxjs';
import { BreakpointObserver } from '@angular/cdk/layout';
// import { MaintenancePdfComponent } from './maintenance-pdf/maintenance-pdf.component';
import { PtwActionDlgComponent } from '../action-dlg/ptw-action-dlg/ptw-action-dlg.component';
import { ConfirmationRemarksDlgComponent } from '../action-dlg/confirmation-remarks-dlg/confirmation-remarks-dlg.component';
import { DateTimeSelectionDlgComponent } from '../../../../shared/components/date-time-selection/date-time-selection-dlg/date-time-selection-dlg.component';
import { ModalController, ToastController, AlertController, IonContent } from '@ionic/angular';

@Component({
  selector: 'app-maintenance-details',
  templateUrl: './maintenance-details.component.html',
  styleUrls: ['./maintenance-details.component.scss'],
})

//type ObservationType = 'je' | 'je_tl' | 'mnp';
//interface ObservationVM {
//  id: string;
//  type: ObservationType;
//  status: 'open' | 'close';
//  createdBy: string;
//  canView: boolean;
//  canEdit: boolean;
//  canDelete: boolean;
//  raw: unknown;
//}

export class MaintenanceDetailsDlgComponent implements OnInit, AfterViewInit {

  get isPatrollingTL(): boolean {
    return this.dialogData?.device_details?.maintenance_type === 'TL' &&
      this.dialogData?.device_details?.maintenance_list?.template?.scheduled_patrolling === 'patrolling';
  }

  get patrollingPlannedDateISO(): string {
    const val = this.form?.value?.plannedDate;
    return val ? new Date(val).toISOString() : new Date().toISOString();
  }

  get patrollingPlannedDateDisplay(): string {
    const val = this.form?.value?.plannedDate;
    if (!val) return '--/--/----';
    const d = new Date(val);
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
  }

  get patrollingPlannedTimeDisplay(): string {
    const val = this.form?.value?.plannedDate;
    if (!val) return '--:--:--';
    const d = new Date(val);
    return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;
  }

  // Mirrors ClientApp canStartPatrlling (maintenance-details-dlg.component.ts:
  // 1101-1115): patrolling can be planned for today or any future date, but
  // NOT for a past date. A past-planned patrolling means the scheduled day
  // has slipped — user must reschedule to today or later via Apply Changes
  // before START PATROLLING enables. When the user does click Start the
  // Maintenance Start Date is recorded separately from the Planned Date.
  get isPatrollingDateInPast(): boolean {
    const val = this.form?.value?.plannedDate;
    if (!val) return false;
    const selected = new Date(val);
    const today = new Date();
    selected.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return selected.getTime() < today.getTime();
  }

  onPatrollingDateTimeChange(event: any): void {
    const iso = event?.detail?.value;
    if (!iso) return;
    this.form.get('plannedDate').setValue(new Date(iso).getTime());
  }

  async openPatrollingDatePicker() {
    const current = this.form?.value?.plannedDate ?? Date.now();
    const modal = await this.modalController.create({
      component: DateTimeSelectionDlgComponent,
      componentProps: {
        dialogData: {
          selection_type: 'single_time',
          value: { range: { start: current, end: current } },
          showSeconds: true,
          showMilli: false,
          isShowRange: false,
          restrictPastDate: true
        }
      }
    });
    await modal.present();
    const { data } = await modal.onDidDismiss();
    if (data?.range?.start) {
      this.form.get('plannedDate').setValue(data.range.start);
    }
  }

  isFormDirty: boolean = false;
  observation_button_count: number;
  objectList: any[] = [];
  eventsDataSource: any;
  plnmntDetails: any;
  isRestorationCodeReadonly = false;
  ptwDialogData: any;
  backchargingDialogData: any;
  backchargingSkippedMissingSubstation: boolean = false;
  missingSubstationNames: string[] = [];

  // ── Asset Damage lock state — mirrors ClientApp maintenance-details-dlg.
  // Server tells us whether the bay is locked by an unresolved damage report;
  // when locked, every action button/input in this dialog must be disabled.
  assetDamageFeatureOn: boolean = false;
  assetDamageBayLocked: boolean = false;
  assetDamageLockBanner: string = '';
  assetDamageBayPath: string = '';
  assetDamageSubstationId: string = '';
  assetDamageLvBayPath: string = '';
  activeDamageReport: any = null;
  activeDamageReportEquipments: any[] = [];
  mpDataSource: any
  maintenanceDataSource: any
  form: FormGroup;
  completedStepsIndex: number = 0;
  debounceSearch: Function;
  mnpSearch: Function;
  mntEQList = [];
  mnpEQList = [];
  mntBAYList = [];
  closeTime: string | null = null;
  InProgress = false;
  filteredmpDataSource: any;
  filteredmaintenanceDataSource: any;
  maintenanceDetails: any;
  pendingObservationDatasource = [];
  //isDataReady: boolean = false;
  selectedTabIndex = 0;
  selectedTabLabel = "";
  //ptwData: any;
  //mnpTabIndex: number = -1;
  linkedObservationCount: number = 0;
  maintenanceData: any;

  tlPendingObservationCount: number = 0;

  AllLinkedObservation: MatTableDataSource<any> = new MatTableDataSource<any>();
  isActionBtnParameterDisabled: boolean;
  isCancelBtnParameterDisabled: boolean;
  isActionBtnMnpDisabled: boolean;
  isCancelBtnMnpDisabled: boolean;

  isActionBtnHotlineDisabled: boolean;
  isCancelBtnHotlineDisabled: boolean;

  isSLDCCancelButtonDisabled: boolean = false;
  isSubmitDisabled: boolean = true;
  isPatrollingSubmitDisabled: boolean = true;
  isXenCancelButtonDisabled: boolean = false;
  isXenApprovedButtonDisabled: boolean = false;
  observationDatasource: MatTableDataSource<any> = new MatTableDataSource<any>();
  filterObservationDatasource: MatTableDataSource<any> = new MatTableDataSource<any>();
  // ion-list can't drive MatTableDataSource.filteredData (no connect() on ion-list),
  // so we run the search predicate ourselves and let the template read this getter.
  obsSearchTerm: string = '';

  TLmaintenanceobservationDatasource: MatTableDataSource<any> = new MatTableDataSource<any>();
  othermaintenanceobservationDatasource: MatTableDataSource<any> = new MatTableDataSource<any>();
  MNPobservationDatasource: MatTableDataSource<any> = new MatTableDataSource<any>();
  obsListobservationDatasource: MatTableDataSource<any> = new MatTableDataSource<any>();
  completeDashboardPendingObservationDatasource: MatTableDataSource<any> = new MatTableDataSource<any>();
  completeDashboardObservationDatasource: MatTableDataSource<any> = new MatTableDataSource<any>();
  //pendingobservationDatasource: MatTableDataSource<any> = new MatTableDataSource<any>();

  MaintenanceStatus = MaintenanceStatus;
  isMobileView = false;
  private breakpointSub?: Subscription;
  check_obs_status: boolean = false;
  below66KVVoltageLevel: boolean = false;
  ptw_is_active_on_same_bay: boolean = false;
  mnt_to_be_restored_exists: boolean = false;
  ptw_cancellation_requested_on_all_same_bay: boolean = false;
  maintenanceOfConnectedTLInBay = false; //bay maintenance with TL template 
  maintenanceOfConnectedTLInBayAccess = false;
  maintenanceOnConnectedBay: boolean = false;
  isDateAndTimeChanged: boolean = false;
  isParameterFilled: string;
  buttonColors: { [key: string]: boolean } = {};

  //Observation Action Buttons
  isAddObservationButtonDisabled: boolean = false;
  isMaintenanceParameterAddObservationButtonDisabled: boolean = false;
  isHotlineParameterAddObservationButtonDisabled: boolean = false;
  isMNPParameterAddObservationButtonDisabled: boolean = false;
  isObsListAddObservationButtonDisabled: boolean = false;
  isTLMaintenanceParameterAddObservationButtonDisabled: boolean = false;

  isEditMaintenanceOBDisabled: boolean = false;
  isEditMNPOBDisabled: boolean = false;
  isDeleteMaintenanceOBDisabled: boolean = false;
  isDeleteMNPOBDisabled: boolean = false;
  isEditTLMaintenanceOBDisabled: boolean = false;
  isDeleteTLMaintenanceOBDisabled: boolean = false;
  isEditObservationListOBDisabled: boolean = false;
  isDeleteObservationListOBDisabled: boolean = false;
  isConditionalMaintenance: boolean = false;

  //isMaintenanceParameterEditObservationButtonDisabled: boolean = false;
  //isMNPParameterEditObservationButtonDisabled: boolean = false;
  //isObsListEditObservationButtonDisabled: boolean = false;
  //isTLMaintenanceParameterEditObservationButtonDisabled: boolean = false;

  filledMntActivityParams = [];

  filledMnpActivityParams = [];
  activeTab: string = 'maintenance';
  displayedColumns: string[] = [
    'observation',
    'remarks',
    'status',
    'description',
    'user_name',
    'action'
  ];
  hasMNP: boolean;
  hasMaintenance: boolean;
  isHotlineMaintenance: boolean;
  hideCancelButtonForNonSD: boolean;
  allActivityParams: any;
  clicked_device_type: string = "";
  temp_catagorized_param_list: any = null;
  ifAnyMaintenanceParamExists = true;
  ifAnyMnPParamExists = true;
  ifAnyHotlineParamExists = true;
  patrolling_details: any[] = [];
  isCompleteDashboard: boolean;
  patrolling_warning = "";
  private updateDlgSubscription: Subscription;
  _rev = "";
  group_path = [];
  work_not_complete = false;
  stepper: any;
  initStepper() {
    return {
      planned: { label: this.locale_service.Locale.language.project.maintenancesettings.maintenancestepper.planned, datetime: 0, id: '', hidden: false },
      maintenance_rescheduled: { label: this.locale_service.Locale.language.project.maintenancesettings.maintenancestepper.maintenance_rescheduled, datetime: 0, id: '', hidden: true },
      maintainance_cancelled: { label: this.locale_service.Locale.language.project.maintenancesettings.maintenancestepper.maintainance_cancelled, datetime: 0, id: '', hidden: true },
      xen_maintainance_approved: { label: this.locale_service.Locale.language.project.maintenancesettings.maintenancestepper.xen_maintainance_approved, datetime: 0, id: '', hidden: false },
      sldc_shutdown_code_requested: { label: this.locale_service.Locale.language.project.maintenancesettings.maintenancestepper.sldc_shutdown_code_requested, datetime: 0, id: '', hidden: false },
      sldc_shutdown_code_issued: { label: this.locale_service.Locale.language.project.maintenancesettings.maintenancestepper.sldc_shutdown_code_issued, datetime: 0, id: '', hidden: false },
      ptw_requested: { label: this.locale_service.Locale.language.project.maintenancesettings.maintenancestepper.ptw_requested, datetime: 0, id: '', hidden: false },
      backcharging_requested: { label: this.locale_service.Locale.language.project.maintenancesettings.maintenancestepper.backcharging_requested, datetime: 0, id: '', hidden: false },
      backcharging_issued: { label: this.locale_service.Locale.language.project.maintenancesettings.maintenancestepper.backcharging_issued, sub_steps: [], datetime: 0, id: '', hidden: false },
      ptw_issued: { label: this.locale_service.Locale.language.project.maintenancesettings.maintenancestepper.ptw_issued, datetime: 0, id: '', hidden: false },
      in_progress: { label: this.locale_service.Locale.language.project.maintenancesettings.maintenancestepper.in_progress, datetime: 0, id: '', hidden: false },
      patrolling_completed: { label: this.locale_service.Locale.language.project.maintenancesettings.maintenancestepper.patrolling_done, datetime: 0, id: '', hidden: true, tl: true },
      maintenance_parameter: { label: this.locale_service.Locale.language.project.maintenancesettings.maintenancestepper.maintenance_parameter, datetime: 0, id: '', hidden: false, no_skip: true },
      hotline_parameter: { label: this.locale_service.Locale.language.project.maintenancesettings.maintenancestepper.hotline_parameter, datetime: 0, id: '', hidden: true, no_skip: true },
      parameter_approval_pending: { label: this.locale_service.Locale.language.project.maintenancesettings.maintenancestepper.maintenance_parameter, datetime: 0, id: '', hidden: true, no_skip: true },
      mnp_parameter: { label: this.locale_service.Locale.language.project.maintenancesettings.maintenancestepper.mnp_parameter, datetime: 0, id: '', hidden: false, no_skip: true },
      ptw_cancellation_requested: { label: this.locale_service.Locale.language.project.maintenancesettings.maintenancestepper.ptw_cancellation_requested, datetime: 0, id: '', hidden: false },
      ptw_cancellation_issued: { label: this.locale_service.Locale.language.project.maintenancesettings.maintenancestepper.ptw_cancellation_issued, datetime: 0, id: '', hidden: false },
      sldc_charging_code_requested: { label: this.locale_service.Locale.language.project.maintenancesettings.maintenancestepper.sldc_charging_code_requested, datetime: 0, id: '', hidden: false },
      sldc_charging_code_issued: { label: this.locale_service.Locale.language.project.maintenancesettings.maintenancestepper.sldc_charging_code_issued, datetime: 0, id: '', hidden: false },
      backcharging_cancel_requested: { label: this.locale_service.Locale.language.project.maintenancesettings.maintenancestepper.backcharging_cancel_requested, datetime: 0, id: '', hidden: false },
      backcharging_cancel_issued: { label: this.locale_service.Locale.language.project.maintenancesettings.maintenancestepper.backcharging_cancel_issued, sub_steps: [], datetime: 0, id: '', hidden: false },
      restoration_completed: { label: this.locale_service.Locale.language.project.maintenancesettings.maintenancestepper.restoration_completed, datetime: 0, id: '', hidden: false },
      parameter_approval: { label: this.locale_service.Locale.language.project.maintenancesettings.maintenancestepper.parameter_approval, datetime: 0, id: '', hidden: false, no_skip: true },
      maintenance_complete: { label: this.dialogData.device_details.maintenance_list.template.scheduled_patrolling == "patrolling" ? this.locale_service.Locale.language.project.maintenancesettings.maintenancestepper.patrolling_completed : this.locale_service.Locale.language.project.maintenancesettings.maintenancestepper.maintenance_complete, datetime: 0, id: '', hidden: false },
    }
  };
  @Input() dialogData: any = null;
  maintenanceSkipXENSLDCStep = true;
  show_start_maintenance_btn = false;

  @ViewChild('sldcChargCode') sldcChargCode!: ElementRef;
  @ViewChild('sldcInput') sldcInput!: ElementRef;
  matstepper: any;
  @ViewChild('tableft') tableft: ElementRef;
  @ViewChild('mntparam') mntparam: ElementRef;
  @ViewChild('leftcontainer') leftcontainer: ElementRef;
  // @ViewChild('pdfExporter') pdfExporter!: MaintenancePdfComponent;
  @ViewChild(PtwActionDlgComponent) ptwActionDlgComponent!: PtwActionDlgComponent;
  @ViewChild('detailsContent') detailsContent!: IonContent;
  pdfData: any = {};

  async exportToPdf() {
    this.InProgress = true;
    const activityParams: any[] = [];
    if (this.maintenanceDetails && this.maintenanceDetails.activity_parameters) {
      this.maintenanceDetails.activity_parameters.forEach((p: any) => {
        activityParams.push({
          name: p.parametername,
          category: p.category,
          uom: p.unit,
          min: p.display_min,
          max: p.display_max,
          value: p.value,
          remarks: p.remarks,
          managedby: p.managedby
        });
      });
    }

    // Capture the stepper for the PDF
    const stepperData: any[] = [];
    if (this.stepper) {
      Object.keys(this.stepper).forEach(key => {
        const step = (this.stepper as any)[key];
        if (!step.hidden) {
          stepperData.push({
            key: key,
            label: step.label,
            datetime: step.datetime,
            completed: step.datetime > 0
          });
        }
      });
    }

    let ptwDetailsToExport: any = this.maintenanceDetails?.ptw_work || null;

    // If the component is rendered, we can try to use its form directly.
    if (this.ptwActionDlgComponent && this.ptwActionDlgComponent.form) {
      ptwDetailsToExport = {
        ...ptwDetailsToExport,
        _id: this.ptwActionDlgComponent.form.value.ptw_id,
        ssename: this.ptwActionDlgComponent.form.value.ssename,
        issuedto: this.ptwActionDlgComponent.form.value.issuedto,
        issuedby: this.ptwActionDlgComponent.form.value.issuedby,
        cancelledby: this.ptwActionDlgComponent.form.value.cancelledby,
        workpurpose: this.ptwActionDlgComponent.form.value.workpurpose,
        remarks: this.ptwActionDlgComponent.form.value.remarks,
      };
    } else if (this.maintenanceDetails?.ptw_ids?.length > 0) {
      // If the PTW component hasn't been rendered yet, but there is a PTW, fetch it manually for the PDF
      try {
        const ptwData = await this.mntservice.GetPTWByID(this.maintenanceDetails.ptw_ids.slice(-1)[0]);
        if (ptwData && !ptwData.code) {
          ptwDetailsToExport = {
            ...ptwDetailsToExport,
            _id: ptwData._id,
            ssename: ptwData.ssename,
            issuedto: ptwData.issuedto,
            issuedby: ptwData.issuedby,
            cancelledby: ptwData.cancelledby,
            workpurpose: ptwData.workpurpose || this.maintenanceDetails.maintenance_list?.template?.maintenancename,
            remarks: ptwData.remarks,
          };
        }
      } catch (err) {
        console.error("Error fetching PTW data for PDF export:", err);
      }
    }

    // this.pdfData = {
    //   substationName: this.maintenanceDetails?.substation_code || '',
    //   bayName: this.appservice.unescapedName(this.form.value?.device_name?.split('/').slice(-2).join('/') ?? ''),
    //   maintenanceName: this.form.value.maintenancename,
    //   plannedDate: this.form.value.plannedDate,
    //   timeRangeValue: this.form.value.time_range_value,
    //   timeRangeType: this.form.value.time_range_type,
    //   plannedBy: this.form.value.sse || 'Auto Planned',
    //   delayedReason: this.form.value.delayed_reason,
    //   cancelReason: this.maintenanceDetails?.cancel_info?.reason,
    //   completeReason: this.maintenanceDetails?.complete_reason,

    //   ptwDetails: ptwDetailsToExport,
    //   ptwRemarks: ptwDetailsToExport?.remarks || this.maintenanceDetails?.ptw_work?.remarks,
    //   connectionBay: this.maintenanceDetails?.connected_hv_lv_bay ? this.maintenanceDetails.connected_hv_lv_bay[0]?.split('/').slice(-1)[0] : null,
    //   towerRange: this.maintenanceDetails?.maintenance_list?.tower_range,
    //   sldcShutdownCode: this.form.value.sldcshutdowncode,
    //   sldcChargingCode: this.form.value.sldcchargingcode,

    //   activityParameters: activityParams,
    //   patrollingDetails: this.form.value.patrolling_details || [],

    //   observations: this.completeDashboardObservationDatasource.data || [],
    //   pendingObservations: this.completeDashboardPendingObservationDatasource.data || [],

    //   stepper: stepperData
    // };

    // setTimeout(() => {
    //   if (this.pdfExporter) {
    //     this.pdfExporter.exportPdf().then(() => {
    //       this.InProgress = false;
    //     }).catch(err => {
    //       console.error('PDF Export Error:', err);
    //       this.InProgress = false;
    //     });
    //   } else {
    //     this.InProgress = false;
    //   }
    // }, 100);
  }

  constructor(
    private route: ActivatedRoute,
    public mntservice: MaintenanceService,
    public resolver: ProjectResolverService,
    public appservice: AppService,
    private formBuilder: FormBuilder,
    private cdr: ChangeDetectorRef,
    public locale_service: LocaleService,
    private toastController: ToastController,
    private modalController: ModalController,
    private alertController: AlertController,
    private breakpointObserver: BreakpointObserver,
  ) {
    this.form = this.formBuilder.group({});
  }

  async showToast(message: string, _action?: string, config?: any) {
    const toast = await this.toastController.create({
      message,
      duration: config?.duration ?? 3000,
      position: 'bottom',
    });
    await toast.present();
  }
  keepOriginalOrder = () => 0;
  isSLDCPending: boolean = false;
  isMainPending: boolean = false;
  isSLDCCodeIssued: boolean = false;
  isPTWRequested: boolean = false;
  isPTWIssued: boolean = false;
  isPTWCanRequested: boolean = false;
  isPTWCanIssued: boolean = false;
  isSLDCChrgCodeReq: boolean = false;
  isSLDCChrgCodeIssued: boolean = false;
  isMainParameterFilled: boolean = false;
  isMNPFilled: boolean = false;
  isHOTLINEFilled: boolean = false;
  isObservationAndCompleteAccess: boolean = false;
  isPatrollingFilled: boolean = false;

  catagorized_param_list = {};
  public ptwIntervalDestroy$ = new Subject<void>();

  //Observation Functions

  //private allObservationVMs: ObservationVM[] = [];

  //private buildObservationVM(obs: any): ObservationVM {
  //  const rights = this.resolver.MaintenanceAccessRights;
  //  const currentStatus = this.form.value.current_status;
  //  const type: ObservationType = obs.observation_type;
  //  const isClosed = obs.status === 'close';
  //  const isCompleteDashboard = this.isCompleteDashboard;
  //  const isLockedStatus = currentStatus === MaintenanceStatus.Planned ||
  //    currentStatus === MaintenanceStatus.XenApprovalRequested;

  //  let canView = false;
  //  let canEdit = false;

  //  if (type === 'je_tl') {
  //    canView = rights.tl_maintenance_parameter_input_save_submit
  //      || rights.tl_maintenance_parameter_approve_revert;

  //    canEdit = rights.tl_maintenance_parameter_input_save_submit;
  //  }

  //  if (type === 'je') {
  //    canView = rights.maintenence_input_save_submit
  //      || rights.maintenence_parameter_approve_revert;

  //    canEdit = rights.maintenence_input_save_submit;
  //  }

  //  if (type === 'mnp') {
  //    canView = rights.mnp_input_save_submit;
  //    canEdit = rights.mnp_input_save_submit;
  //  }

  //  if (isClosed || isCompleteDashboard || isLockedStatus) {
  //    canEdit = false;
  //  }

  //  return {
  //    id: obs._id,
  //    type,
  //    status: obs.status,
  //    createdBy: obs.history?.[0]?.user_id,
  //    canView,
  //    canEdit,
  //    canDelete: false,
  //    raw: obs
  //  };
  //}

  async reloadConnectedTowerRange(_id: string, tower_range: string) {
    if (_id == this.dialogData.device_details._id)
      return;
    if (!_id.startsWith('p')) {
      this.showToast("Maintenance Not started yet for " + tower_range, this.locale_service.Locale.language.common.ok,
        {
          duration: 4000
        });
      return;
    }
    this.InProgress = true;
    let plan_mnt = await this.mntservice.GetPlanMntById(_id);
    if (plan_mnt.code && plan_mnt.code != null) {
      this.showToast(this.locale_service.Locale.language.errorcode.maintenance[plan_mnt.code], this.locale_service.Locale.language.common.failed,
        {
          duration: 4000
        });
      this.InProgress = false;
      return;
    }
    this.dialogData.device_details = plan_mnt;
    this.ngOnInit();
    this.InProgress = false;
  }

  //getPendingObservationCount(ds: MatTableDataSource) {
  //  return ds.data.length;
  //}

  async ngOnInit() {
    if (!this.dialogData?.device_details?.maintenance_list?.template) return;
    this.assetDamageFeatureOn = this.appservice.getEnvironmentValue<boolean>('assetDamageManagementEnabled') ?? false;
    this.stepper = this.initStepper();
    this.isMobileView = this.breakpointObserver.isMatched('(max-width: 599px)');
    this.breakpointSub = this.breakpointObserver.observe('(max-width: 599px)').subscribe(state => {
      this.isMobileView = state.matches;
      this.cdr.markForCheck();
    });
    this.group_path = this.route.snapshot.root.firstChild.firstChild.data.viewData.group_path;
    let mnt_type = this.dialogData.device_details.maintenance_type;
    this.isCompleteDashboard = this.dialogData.device_details.current_status == MaintenanceStatus.Complete || this.dialogData.device_details.current_status == MaintenanceStatus.Cancel || this.dialogData.device_details.current_status == MaintenanceStatus.TLPartiallyComplete
    this.hasMaintenance = this.dialogData.device_details.activity_parameters ? this.dialogData.device_details.activity_parameters.some(managedby => managedby.managedby == "je") : false;
    this.hasMNP = this.dialogData.device_details.activity_parameters ? this.dialogData.device_details.activity_parameters.some(managedby => managedby.managedby == "mnp") : false;

    this.maintenanceData = this.mntservice.GetPlanMntById(this.dialogData.device_details._id);
    this.show_start_maintenance_btn = this.showStartMntBtn();

    // if (this.isCompleteDashboard) {

    //   // Observation datasource
    //   this.completeDashboardObservationDatasource.data =
    //     this.dialogData?.device_details?.observation_details ?? [];

    //   // Pending datasource
    //   this.completeDashboardPendingObservationDatasource.data =
    //     this.dialogData?.device_details?.pending_observations_detail ?? [];

    //   // Safe checks
    //   const containsTower =
    //     Array.isArray(this.completeDashboardObservationDatasource.data) &&
    //     this.completeDashboardObservationDatasource.data.some(o => o?.tower_type != null);

    //   const PendingContainsTower =
    //     Array.isArray(this.completeDashboardPendingObservationDatasource.data) &&
    //     this.completeDashboardPendingObservationDatasource.data.some(o => o?.tower_type != null);

    //   if ((containsTower || PendingContainsTower) && mnt_type !== 'Substation')
    //     this.displayedColumns.splice(0, 0, 'lineno');
    // }
    let isTLMntInBay = this.dialogData.device_details.maintenance_list.template._id.startsWith('ptt');

    const bay_maintenance_on_tl_observation = this.dialogData.bay_maintenance_on_tl_observation;
    if (this.dialogData.device_details.current_status != MaintenanceStatus.Complete) {
      if (mnt_type === "Bay" && isTLMntInBay) {
        this.maintenanceOfConnectedTLInBay = true;
        this.maintenanceOfConnectedTLInBayAccess = this.isPathMatching(this.group_path, this.dialogData.device_details.maintenance_list.maintenance_on_bay)
      }
    }

    if (mnt_type == "Bay" && !isTLMntInBay && !bay_maintenance_on_tl_observation && !this.isPathMatching(this.group_path, this.dialogData.device_details.device_name)) {
      this.maintenanceOnConnectedBay = true;
    }

    const { approve_maintenance, issue_sldc_code, rqst_ptw_Button, issue_ptw_button, mnp_input_save_submit, hotline_input_save_submit,
      tl_maintenance_parameter_approve_revert, tl_maintenance_parameter_input_save_submit, start_unscheduled_maintenance,
      tl_patrolling_complete_maintenance_button, tl_patrolling_input, maintenence_parameter_approve_revert } = this.resolver.MaintenanceAccessRights;
    const { requests_approves, current_status, maintenance_list, backcharging_id } = this.dialogData.device_details;

    const voltageLevel = this.dialogData.device_details.maintenance_list.voltage_level?.trim().slice(0, 2);
    if (voltageLevel === "11" || voltageLevel === "33" || this.dialogData.device_details.maintenance_list.template._id.startsWith("con")) {
      this.below66KVVoltageLevel = true;
    }

    if ((maintenence_parameter_approve_revert || tl_maintenance_parameter_approve_revert) && ((mnt_type == 'Bay') ? !isTLMntInBay : true)) { // SSE && AETL
      if (requests_approves.maintenance_parameter_datetime !== 0 && requests_approves.parameter_approval_datetime === 0) {
        this.isMainParameterFilled = true;
      }
      //if (requests_approves.maintenance_parameter_datetime !== 0 && requests_approves.maintenance_parameter_approval_datetime === 0) {
      //  this.isMainParameterFilled = true;
      //}
      if ((current_status === MaintenanceStatus.Planned && requests_approves.xen_maintainance_approved_datetime === 0) ||
        (current_status === MaintenanceStatus.XenApprovalRequested && requests_approves.xen_maintainance_approved_datetime === 0) ||
        current_status === MaintenanceStatus.PTWCancellationIssued || current_status === MaintenanceStatus.PTWIssued) {
        this.isMainPending = !(current_status === MaintenanceStatus.PTWCancellationIssued || current_status === MaintenanceStatus.PTWIssued);
        this.isSLDCPending = !this.isMainPending;
      }
    }

    if (tl_maintenance_parameter_input_save_submit) {
      if (requests_approves.in_progress_datetime != 0 && requests_approves.maintenance_parameter_datetime == 0) {
        this.isMainParameterFilled = true;
      }
      else
        this.isMainParameterFilled = false;
    }

    if (tl_maintenance_parameter_approve_revert) {
      //if (requests_approves.maintenance_parameter_datetime !== 0 && requests_approves.maintenance_parameter_approval_datetime === 0) {
      //  this.isMainParameterFilled = true;
      //}
      if (requests_approves.maintenance_parameter_datetime !== 0 && requests_approves.parameter_approval_datetime === 0) {
        this.isMainParameterFilled = true;
      }
      else
        this.isMainParameterFilled = false;
    }

    if (issue_sldc_code) {  // SLDC
      if ((requests_approves.sldc_shutdown_code_issued_datetime === 0 && current_status === MaintenanceStatus.SLDCShutDownCodeRequested) ||
        (requests_approves.sldc_charging_code_issued_datetime === 0 && current_status === MaintenanceStatus.SLDCChargingCodeRequested)) {
        this.isSLDCCodeIssued = true;
      }
    }

    if (rqst_ptw_Button) { // JE
      this.isPTWRequested = false;

      if (requests_approves.in_progress_datetime !== 0 && requests_approves.maintenance_parameter_datetime === 0 && (mnt_type == "Bay" ? !isTLMntInBay : true)) {
        this.isMainParameterFilled = true;
      }
      if ((current_status === MaintenanceStatus.SLDCShutDownCodeIssued || current_status === MaintenanceStatus.RequestPTW
        || current_status === MaintenanceStatus.InProgress) && (isTLMntInBay ? tl_maintenance_parameter_input_save_submit : true)) {
        this.isPTWRequested = true;
      }
    }
    if (this.maintenanceOnConnectedBay)
      this.isMainParameterFilled = false;

    if (issue_ptw_button) { // Operator
      if ([MaintenanceStatus.PTWRequested, MaintenanceStatus.PTWCancelRequested,
      MaintenanceStatus.SLDCChargingCodeIssued,
      MaintenanceStatus.PTWCancelRequestedWorkNotComplete,
      MaintenanceStatus.PTWCancellationIssued,
      MaintenanceStatus.PTWCancelRequestedWorkComplete, MaintenanceStatus.BCCertificateIssued].includes(current_status) ||
        (this.below66KVVoltageLevel && (current_status === MaintenanceStatus.PTWCancellationIssued ||
          current_status === MaintenanceStatus.BCCertificateIssued)
          || (backcharging_id ? current_status === MaintenanceStatus.BCCancelCertificateIssued : current_status === MaintenanceStatus.SLDCChargingCodeIssued)
          || (maintenance_list.voltage_level && parseInt(maintenance_list.voltage_level) < 66 ? current_status === MaintenanceStatus.PTWCancellationIssued : current_status === MaintenanceStatus.SLDCChargingCodeIssued))
      ) {
        this.isPTWIssued = true;
      }
    }

    if (mnt_type === 'TL' && current_status != MaintenanceStatus.Complete && requests_approves.in_progress_datetime !== 0) {
      if (tl_patrolling_complete_maintenance_button && requests_approves.patrolling_completed_datetime > 0)
        this.isObservationAndCompleteAccess = true;

      if (tl_patrolling_input) {
        this.isPatrollingFilled = true;
        if (requests_approves.patrolling_completed_datetime != 0)
          this.isPatrollingFilled = false;
      }
    }

    if (mnp_input_save_submit &&
      requests_approves.in_progress_datetime !== 0 &&
      requests_approves.mnp_parameter_datetime === 0) { //MNP
      this.isMNPFilled = true;
    }

    if (hotline_input_save_submit &&
      requests_approves.in_progress_datetime !== 0 &&
      requests_approves.hotline_parameter_datetime === 0) { //Hotline
      this.isHOTLINEFilled = true;
    }
    this.debounceSearch = this.resolver.debounceSearch(this.applySearchFilter.bind(this), 300);

    this.stepper = this.initStepper();

    if (this.maintenanceSkipXENSLDCStep) {
      this.removeFromStepper(["xen", "sldc"], true);
    }
    this.form = this.formBuilder.group({
      _id: [''],
      ptw_ids: [[]],
      device_name: [''],
      backcharging_id: [{}],
      maintenancename: [''],
      plannedDate: [Date.now()],
      substation_code: [''],
      dialogCloseTime: [null],
      cutoffDate: [Date.now()],
      connected_bay: true,
      closeTime: '',
      sse: '',
      je: '',
      xen: '',
      operator: '',
      time_range_value: [null, [Validators.required, Validators.min(1)]],
      time_range_type: '',
      sldcshutdowncode: [''],
      sldcchargingcode: [''],
      current_status: [this.dialogData.device_details.current_status],
      requests_approves: {},
      activity_parameters: [],
      tl_details: this.dialogData.device_details.tl_details,
      shutdown_required: this.dialogData.device_details?.shutdown_required,
      patrolling_details: [],
      maintenance_list: [],
      maintenance_type: '',
      usertype: [this.dialogData ? this.dialogData.type : ''],
      operated_observations_list: [this.dialogData?.device_details?.operated_observations_list ?? []],
      cb_operator: '',
      ptw_work: null,
      revert_history: null,
      shutdown_duration_history: null,
      cancel_info: null,
      is_initiator: this.dialogData.device_details.is_initiator,
      is_non_initiator_on_hold: this.dialogData.device_details.is_non_initiator_on_hold,
      connected_hv_lv_bay: [this.dialogData.device_details.connected_hv_lv_bay ?? null],
      delayed_reason: [this.dialogData.device_details.delayed_reason ?? null],
      //sse: '',
      //je: '',
      //operator: '',
      //cb_operator: '',
    });
    if (this.maintenanceOnConnectedBay || (this.dialogData.device_details.current_status != MaintenanceStatus.Complete && (this.maintenanceOfConnectedTLInBay ? (this.maintenanceOfConnectedTLInBay && !this.maintenanceOfConnectedTLInBayAccess) : false && this.resolver.MaintenanceAccessRights.tl_tab_view))) {
      this.form.disable();
    }
    const bcIds = this.dialogData.device_details?.backcharging_id || {};
    const bcPaths = Object.keys(bcIds);

    const hasUnresolvableBay = bcPaths.some(path => path.split("/")[0] === "undefined");
    this.dialogData.device_details.connected_bay = bcPaths.length > 0 && !hasUnresolvableBay;

    this.backchargingSkippedMissingSubstation = bcPaths.length > 0 && hasUnresolvableBay;
    this.missingSubstationNames = bcPaths
      .filter(path => path.split("/")[0] === "undefined")
      .map(path => path.split("/")[1]);

    let maintenanceDetails = this.dialogData.device_details;
    this.isHotlineMaintenance = !!this.dialogData.device_details?.maintenance_list?.template?._id.startsWith("pht-") || this.dialogData.device_details?.maintenance_list?.template?.hotline;
    if (maintenanceDetails.code && maintenanceDetails.code != null) {
      this.showToast(this.locale_service.Locale.language.errorcode.maintenance[maintenanceDetails.code], this.locale_service.Locale.language.common.failed,
        {
          duration: 4000
        });
    }
    else {
      maintenanceDetails.maintenancename = maintenanceDetails.maintenance_list.template.maintenancename;
      this.maintenanceDetails = maintenanceDetails;
      this.cacheAssetDamageContext();
      void this.refreshAssetDamageLockState();
      this._rev = maintenanceDetails._rev;
      if (maintenanceDetails.requests_approves != null) {
        if (maintenanceDetails.requests_approves?.maintenance_parameter_datetime == 0) {
          this.isActionBtnParameterDisabled = false;
          this.isCancelBtnParameterDisabled = true;
        }
        else {
          this.isActionBtnParameterDisabled = true;
          this.isCancelBtnParameterDisabled = false;
        }
        if (maintenanceDetails.requests_approves?.mnp_parameter_datetime == 0) {
          this.isActionBtnMnpDisabled = false;
          this.isCancelBtnMnpDisabled = true;
        }
        else {
          this.isActionBtnMnpDisabled = true;
          this.isCancelBtnMnpDisabled = false;
        }
        if (maintenanceDetails.requests_approves?.hotline_parameter_datetime == 0) {
          this.isActionBtnHotlineDisabled = false;
          this.isCancelBtnHotlineDisabled = true;
        }
        else {
          this.isActionBtnHotlineDisabled = true;
          this.isCancelBtnHotlineDisabled = false;
        }
      }
      if ((maintenanceDetails.maintenance_list.template.scheduled_patrolling == "patrolling" || maintenanceDetails.maintenance_list.template.hotline) && maintenanceDetails.maintenance_list.cutoff_date == 0) {
        const now = Date.now();
        maintenanceDetails.cutoffDate = now;
        maintenanceDetails.plannedDate = now;
        maintenanceDetails.maintenance_list.cutoff_date = now;
        maintenanceDetails.maintenance_list.cutoff_date = now;
        maintenanceDetails.requests_approves.planned_datetime = now;
        //maintenanceDetails.maintenance_list.frequency.maintenanceCount = 1;
        maintenanceDetails["first_as_n_when"] = "";
      }
      this.form.patchValue({
        _id: maintenanceDetails._id,
        device_name: maintenanceDetails.device_name ?? '',
        maintenancename: maintenanceDetails.maintenance_list.template.maintenancename,
        plannedDate: maintenanceDetails.plannedDate ?? Date.now(),
        substation_code: maintenanceDetails.substation_code ?? '',
        // Some records have top-level cutoffDate = 0 while maintenance_list.cutoff_date
        // holds the real Scheduled Date (that's the field the dashboard cards read
        // from — see maintenance-dashboard.component.ts:1181). Fall back to the
        // nested value so the detail's Scheduled Date matches the card and doesn't
        // render 01/01/1970. Uses || (not ??) so a stored 0 also falls back.
        cutoffDate: maintenanceDetails.cutoffDate || maintenanceDetails.maintenance_list?.cutoff_date || Date.now(),
        connected_bay: maintenanceDetails.connected_bay ?? false,
        sldcshutdowncode: maintenanceDetails.sldcshutdowncode ?? '',
        sldcchargingcode: maintenanceDetails.sldcchargingcode ?? '',
        current_status: this.dialogData.device_details.current_status ?? '',
        ptw_ids: maintenanceDetails.ptw_ids ?? [],
        backcharging_id: maintenanceDetails.backcharging_id ?? {},
        requests_approves: maintenanceDetails.requests_approves ?? {},
        time_range_value: maintenanceDetails.time_range_value ?? 0,
        time_range_type: maintenanceDetails.time_range_type ?? 'Hour',
        maintenance_list: maintenanceDetails.maintenance_list ?? [],
        maintenance_type: maintenanceDetails.maintenance_type ?? '',
        sse: maintenanceDetails.sse ?? '',
        je: maintenanceDetails.je ?? '',
        xen: maintenanceDetails.xen ?? '',
        operator: maintenanceDetails.operator ?? '',
        cb_operator: maintenanceDetails.cb_operator ?? '',
        activity_parameters: maintenanceDetails.activity_parameters,
        shutdown_required: maintenanceDetails.shutdown_required,
        //ptwaction
        tl_details: maintenanceDetails && maintenanceDetails.tl_details ? maintenanceDetails.tl_details : this.dialogData.device_details.tl_details,
        patrolling_details: maintenanceDetails && maintenanceDetails.patrolling_details ? maintenanceDetails.patrolling_details : [],
        ptw_work: maintenanceDetails.ptw_work,
        issuedto: [maintenanceDetails ? maintenanceDetails.issuedto : this.dialogData.je_user_id],
        issuedby: [maintenanceDetails ? maintenanceDetails.issuedby : this.dialogData.user_id],
        revert_history: maintenanceDetails && maintenanceDetails.revert_history ? maintenanceDetails.revert_history : null,
        shutdown_duration_history: maintenanceDetails && maintenanceDetails.shutdown_duration_history ? maintenanceDetails.shutdown_duration_history : null,
        cancel_info: maintenanceDetails && maintenanceDetails.cancel_info ? maintenanceDetails.cancel_info : null,
      });

      this.updateHideCancelButtonForNonSD();
      this.patrolling_warning = this.mntservice.unassignedTLTowers(this.form.value.patrolling_details, this.form.value.maintenance_list.tower_range);
      //this.catagorizeParameters(maintenanceDetails);

      if (maintenanceDetails.ptw_work != null && maintenanceDetails.ptw_work?.completed === false)
        this.work_not_complete = true;

      //change value to float for display
      maintenanceDetails.activity_parameters.forEach((parameter) => {
        if ((parameter.valuetype === "Float" || parameter.valuetype === "Number") && parameter.value === 'NaN') {
          parameter.value = 'NA';
        }
        if (parameter.valuetype == "Float") {

          if (parameter.value && parameter.value !== 'NA' && !parameter.value.toString().includes('.')) {
            const numericValue = Number(parameter.value);
            parameter.value = numericValue.toFixed(2);
          }
        }
      })

      this.form.patchValue({
        activity_parameters: maintenanceDetails.activity_parameters
      });
      //console.log(this.dialogData);
      //if (this.dialogData?.device_details?.self_backcharging !== undefined) {       
      //  this.form.value.self_backcharging = this.dialogData.device_details.self_backcharging;
      //  }


      //if (this.dialogData?.device_details?.self_backcharging) {
      //  this.form.addControl(
      //    'self_backcharging',
      //    new FormControl(this.dialogData?.device_details?.self_backcharging)
      //  );
      //}



      this.patrolling_details = maintenanceDetails.patrolling_details;
      this.currentStatusIndex(this.dialogData.device_details.current_status);

      this.form.get('time_range_value')?.valueChanges.subscribe(() => {
        this.isDateAndTimeChanged = true;
      });

      this.form.get('time_range_type')?.valueChanges.subscribe(() => {
        this.isDateAndTimeChanged = true;
      });

      if (maintenanceDetails.current_status == MaintenanceStatus.RestorationRequired) {
        this.stepper.restoration_completed.label = "Restoration Required";
        //this.stepper.restoration_completed.datetime = Date.now();
        this.currentStatusIndex(MaintenanceStatus.RestorationCompleted)
      }
      else if (maintenanceDetails.requests_approves[maintenanceDetails.current_status + "_datetime"] == 0) { // status changed because of CB
        if (this.dialogData.device_details.current_status == MaintenanceStatus.RequestPTW) {
          this.stepper.ptw_requested.label = "Request PTW";
          this.stepper.ptw_requested.datetime = Date.now();
          this.currentStatusIndex(MaintenanceStatus.PTWRequested)
        } else {
          this.stepper[maintenanceDetails.current_status].datetime = Date.now();
        }
      } else if (!maintenanceDetails.requests_approves[maintenanceDetails.current_status + "_datetime"]) {
        if (this.dialogData.device_details.current_status == MaintenanceStatus.ParameterApprovalPending || this.dialogData.device_details.current_status == MaintenanceStatus.ParameterSubmitPending)
          this.currentStatusIndex(MaintenanceStatus.RestorationCompleted)
      }

      if (this.maintenanceDetails.maintenance_type == "Substation" || this.maintenanceDetails.maintenance_type == "TL" || !this.maintenanceDetails?.shutdown_required)
        this.stepperHideShow(); // works only for TL & Substation


      if (maintenanceDetails.current_status == MaintenanceStatus.Cancel || maintenanceDetails.current_status == MaintenanceStatus.MaintainanceRescheduled)
        this.updateStepperCancel(maintenanceDetails)
      else
        this.updateStepper(maintenanceDetails);

      // if maintenance has is_non_initiator_on_hold; true/false it should be blocked
      if (this.maintenanceDetails.hasOwnProperty("is_non_initiator_on_hold")
        || this.stepper["backcharging_issued"].datetime == -1) {
        this.form.patchValue({ connected_bay: false });
        this.dialogData.device_details.connected_bay = false;
        this.removeFromStepper(["backcharging"]);
      }
    }


    this.ifAnyMaintenanceParamExists = maintenanceDetails.activity_parameters?.some(param => param.managedby == 'je');
    this.ifAnyMnPParamExists = maintenanceDetails.activity_parameters?.some(param => param.managedby == 'mnp');
    this.ifAnyHotlineParamExists = maintenanceDetails.activity_parameters?.some(param => param.managedby == 'hotline');
    if (!this.ifAnyMaintenanceParamExists) {
      this.stepper["maintenance_parameter"].datetime = -1
      this.stepper.parameter_approval.datetime = -1;
    }
    if (!this.ifAnyHotlineParamExists) {
      this.stepper["hotline_parameter"].hidden = true;
    }

    if (this.ifAnyHotlineParamExists) {
      if (maintenanceDetails.requests_approves.hotline_parameter_datetime !== 0) {
        this.stepper.hotline_parameter.label = "Hotline Parameter Submitted";
      }
    }

    if (this.ifAnyMaintenanceParamExists) {
      if (maintenanceDetails.requests_approves.maintenance_parameter_datetime === 0 &&
        maintenanceDetails.requests_approves.parameter_revert_datetime !== 0) {
        this.stepper["maintenance_parameter"].datetime = maintenanceDetails.requests_approves.parameter_revert_datetime;
        this.stepper.maintenance_parameter.label = "Maintenance Parameter Reverted";
      } else if (maintenanceDetails.requests_approves.maintenance_parameter_datetime !== 0) {
        this.stepper.maintenance_parameter.label = "Maintenance Parameter Submitted";
      }
    }

    if (this.below66KVVoltageLevel) {
      if ((this.below66KVVoltageLevel && current_status === MaintenanceStatus.Planned)) {
        this.isMainPending = true;
      }
      if (requests_approves.restoration_completed_datetime !== 0) {
        maintenanceDetails.current_status = MaintenanceStatus.RestorationCompleted;
      }
      const stepsToReset = [
        "xen_maintainance_approved",
        "sldc_shutdown_code_requested",
        "sldc_shutdown_code_issued",
        "sldc_charging_code_requested",
        "sldc_charging_code_issued"
      ];
      stepsToReset.forEach(step => { if (this.stepper[step]) this.stepper[step].datetime = -1 });
    }

    //
    if (start_unscheduled_maintenance && current_status === MaintenanceStatus.Planned) {
      this.isMainPending = true;
    }

    if (!this.ifAnyMnPParamExists) {
      this.stepper["mnp_parameter"].datetime = -1;
    } else if (maintenanceDetails.requests_approves?.mnp_parameter_datetime !== 0) {
      this.stepper.mnp_parameter.label = "M & P Parameter Submitted";
    }

    // skip restoration in Bus bar bay

    //if (this.maintenanceDetails?.maintenance_type === 'Bay' && this.maintenanceDetails?.device_name.toLowerCase().includes("bus bar bay")) {
    //  this.stepper["restoration_completed"].datetime = -1
    //}

    if (!this.maintenanceDetails?.shutdown_required)
      this.stepper["restoration_completed"].datetime = -1
    if (!this.maintenanceDetails?.connected_bay) {
      this.stepper["backcharging_requested"].datetime = -1;
      this.stepper["backcharging_issued"].datetime = -1;
      this.stepper["backcharging_cancel_requested"].datetime = -1;
      this.stepper["backcharging_cancel_issued"].datetime = -1;
    } else {
      this.stepper["backcharging_issued"].sub_steps = Object.keys(this.maintenanceDetails.backcharging_id).map(path => {
        return {
          label: path.split("/").slice(-2).join("/\n"),
          id: this.maintenanceDetails.backcharging_id[path] ? this.maintenanceDetails.backcharging_id[path].split("|")[0].split("-").slice(-2).join("-") : "",
          datetime: this.maintenanceDetails.backcharging_id[path] ? parseInt(this.maintenanceDetails.backcharging_id[path].split("|")[1]) : 0
        }
      });
      this.stepper["backcharging_cancel_issued"].sub_steps = Object.keys(this.maintenanceDetails.backcharging_id).map(path => {
        return {
          label: path.split("/").slice(-2).join("/\n"),
          id: this.maintenanceDetails.backcharging_id[path].split("|").length == 3 ? this.maintenanceDetails.backcharging_id[path].split("|")[0].split("-").slice(-2).join("-") : "",
          datetime: this.maintenanceDetails.backcharging_id[path].split("|").length == 3 ? parseInt(this.maintenanceDetails.backcharging_id[path].split("|")[2]) : 0
        }
      });
      this.stepper.backcharging_issued.id = this.maintenanceDetails?.backcharging_id && !this.stepper.backcharging_issued.sub_steps.some(step => !step.id)
        ? this.stepper.backcharging_issued.sub_steps.reduce((ids, step) => ids ? `${ids} | ${this.appservice.dateToString(step.datetime, 1)}` : this.appservice.dateToString(step.datetime, 1), "") as string
        : "";
      this.stepper.backcharging_cancel_issued.id = this.maintenanceDetails?.backcharging_id && !this.stepper.backcharging_cancel_issued.sub_steps.some(step => !step.id)
        ? this.stepper.backcharging_cancel_issued.sub_steps.reduce((ids, step) => ids ? `${ids} | ${this.appservice.dateToString(step.datetime, 1)}` : this.appservice.dateToString(step.datetime, 1), "") as string
        : "";

    }
    await this.fetchAllObservations(maintenanceDetails);
    this.ptw_is_active_on_same_bay = this.dialogData?.mnt_on_same_bay?.some(bay =>
      bay.requests_approves_datetime.ptw_issued_datetime > 0 && bay.requests_approves_datetime.ptw_cancellation_issued_datetime == 0);
    this.ptw_cancellation_requested_on_all_same_bay = this.dialogData?.mnt_on_same_bay.length == 0
      ? (this.maintenanceDetails.requests_approves.ptw_cancellation_requested_datetime > 0)
      : (this.dialogData?.mnt_on_same_bay?.filter(bay => bay.requests_approves_datetime.ptw_issued_datetime > 0 && bay.ptw_ids.length > 0 && bay.ptw_ids[0] == this.maintenanceDetails.ptw_ids[0]).every(bay => bay.requests_approves_datetime.ptw_cancellation_requested_datetime > 0))
    this.mnt_to_be_restored_exists = this.dialogData?.mnt_on_same_bay.filter(bay =>
      bay.sldcchargingcode && bay.requests_approves_datetime.restoration_completed_datetime == 0 && this.maintenanceDetails.device_name == bay.device_name)?.length > 0;
    // Compute the Add-Observation button flags now that form + requests_approves
    // are populated. Without this, the flag stays at its default (enabled) until
    // the user switches tabs — so a user landing directly on the Observations
    // List tab after patrolling was submitted would see a stale-enabled + button.
    this.AddObservationButtonStatus();
    //this.computeParamButtonColors();
    //this.getAllPendingObservations();
    if (maintenanceDetails.maintenance_list.template.maintenancename == "Observation Maintenance" || maintenanceDetails.maintenance_list.template._id.startsWith("conditional"))
      this.isConditionalMaintenance = true;

    this.startUpdateDialogSubscription();
  }


  //start maintenance button 
  showStartMntBtn() {
    const { MaintenanceAccessRights: rights } = this.resolver;
    const { device_details } = this.dialogData;

    // 1. Basic Pre-conditions
    const isEligibleStatus = !this.isFutureMaintenance &&
      !device_details.shutdown_required &&
      device_details.current_status === MaintenanceStatus.Planned;

    if (!isEligibleStatus || !rights.start_unscheduled_maintenance) {
      return false;
    }

    // 2. Admin Bypass
    if (rights.admin) {
      return true;
    }

    // 3. Role-based Permission Logic
    const canSubmitMaintenance = rights.maintenence_input_save_submit ? this.hasMaintenance : true;

    const canSubmitMNP = rights.mnp_input_save_submit
      ? (!this.hasMaintenance && this.hasMNP)
      : true;

    return canSubmitMaintenance && canSubmitMNP;
  }

  updateHideCancelButtonForNonSD() {
    const req = this.form.value.requests_approves;

    const mntDT = req?.maintenance_parameter_datetime ?? 0;
    const mnpDT = req?.mnp_parameter_datetime ?? 0;
    const paramRevertDT = req?.parameter_revert_datetime ?? 0;

    const hasMaintenance = this.hasMaintenance;
    const hasMNP = this.hasMNP;

    // Compute the final condition
    this.hideCancelButtonForNonSD =
      hasMaintenance && hasMNP
        ? (mntDT != 0 || paramRevertDT != 0 || mnpDT != 0)
        : hasMaintenance
          ? (mntDT != 0 || paramRevertDT != 0)
          : hasMNP
            ? (mnpDT != 0)
            : false;
  }


  private setParameterPredicate(ds: MatTableDataSource<any> | null): void {
    if (!ds) return;
    ds.filterPredicate = (data: any, filter: string) => {
      const term = (filter || '').trim().toLowerCase();
      if (!term) return true;

      const fields = [
        data.parametername ?? '',
        data.category ?? '',
        data.unit ?? '',
        data.min ?? '',
        data.max ?? '',
        data.value != null ? String(data.value) : '',
        data.remarks ?? ''
      ].map(f => f.toString().toLowerCase());

      return fields.some(f => f.includes(term));
    };
  }

  private setObservationPredicate(ds: MatTableDataSource<any> | null): void {
    if (!ds) return;
    ds.filterPredicate = (data: any, filter: string) => {
      const term = (filter || '').trim().toLowerCase();
      if (!term) return true;

      const towerLine = data.tower_type
        ? (data.tower_type === 'Tower'
          ? (data.tower_s?.trim() ?? '')
          : ((data.tower_s?.trim() && data.tower_e?.trim()) ? `${data.tower_s}-${data.tower_e}` : ''))
        : '';

      const user = data.history && data.history[0]
        ? `${data.history[0].user_name ?? ''} ${data.history[0].user_id ?? ''}`
        : '';

      const fields = [
        data.description ?? '',
        data.observations ?? '',
        towerLine,
        user,
        data.remarks ?? '',
        data.status ?? ''
      ].map(f => f.toString().toLowerCase());

      return fields.some(f => f.includes(term));
    };
  }

  startUpdateDialogSubscription() {
    if (this.dialogData.updateTrigger$ != null) {
      this.updateDlgSubscription = this.dialogData?.updateTrigger$.subscribe(() => {
        this.InProgress = true;
        this.mntservice.GetPlanMntById(this.dialogData.device_details._id).then(val => {
          if (val.code && val.code != null) {
            this.showToast(this.locale_service.Locale.language.errorcode.maintenance[val.code], this.locale_service.Locale.language.common.failed,
              {
                duration: 4000
              });
          }
          else {
            if (this._rev && (this._rev !== val._rev)) {
              this._rev = val._rev;
              this.dialogData.device_details = val;
              this.ngOnInit();
              this.onTabChangeName({ tab: { textLabel: this.selectedTabLabel } });
              if (this.resolver.mnt_ptw_form)
                this.resolver.mnt_ptw_form.updatePTWData(null, null, true);
            }
          }
          this.InProgress = false;
        })
      });
    }

  }


  restrictInput(event: KeyboardEvent, type: 'Number' | 'Float', row?: any) {
    const char = event.key;
    const inputEl = event.target as HTMLInputElement;
    const value = inputEl.value;

    // Allow control keys like Backspace, Arrow keys, Tab, etc.
    if (char.length > 1) {
      return;
    }

    // Allow '-' only at start and only once
    if (char === '-') {
      if (value.length === 0 || value === 'NA' || value === 'NaN') {
        if (value === 'NA' || value === 'NaN') {
          event.preventDefault();
          inputEl.value = '-';
          if (row) {
            row.value = '-';
            this.paramInputChange('-', row);
          }
        }
        return;
      }
      event.preventDefault();
      return;
    }

    let isValid = false;
    if (type === 'Number') {
      // Allow only digits 0–9
      isValid = /^[0-9]$/.test(char);
    }
    else if (type === 'Float') {

      // Allow digits and only one decimal point
      isValid = /^[0-9.]$/.test(char) && !(char === '.' && value.includes('.'));
    }

    if (!isValid) {
      event.preventDefault();
      if (row) {
        row.value = 'NA';
        inputEl.value = 'NA';
        this.paramInputChange('NA', row);
      }
    }
    else {
      if (value === 'NA' || value === 'NaN') {
        event.preventDefault();
        inputEl.value = char;
        if (row) {
          row.value = char;
          this.paramInputChange(char, row);
        }
      }
    }
  }


  isPathMatching(currPath: string[], maintenanceOnBayPath: string) {
    const fullPathParts = maintenanceOnBayPath.split('/');

    if (currPath.length > fullPathParts.length) return false;

    for (let i = 0; i < currPath.length; i++) {
      if (currPath[i] !== fullPathParts[i]) return false;
    }

    return true;
  }


  async fetchAllObservations(maintenanceDetails: any) {
    //List out all the observations from which maintenance is started and created inside the pmp
    let obs_id_list = [...(maintenanceDetails.maintenance_list?.observations_list ?? []), ...(maintenanceDetails?.observations_list ?? [])];
    this.InProgress = true;
    if (obs_id_list && obs_id_list.length > 0) {
      let obdata = await this.mntservice.GetObservationbyLists(obs_id_list)
      if (obdata.code != null) {
        this.showToast(
          this.locale_service.Locale.language.errorcode.maintenance[obdata.code], this.locale_service.Locale.language.common.failed,
          { duration: 4000 }
        );
      }
      let filteredData = obdata.filter(obj =>
        maintenanceDetails.maintenance_list?.observations_list?.includes(obj._id)
      );

      filteredData.forEach(obj => {
        obj.disable_button = true;
      });


      if (filteredData.length > 0 && filteredData.every(obj => obj.status === 'close')) {
        this.check_obs_status = true;
      }

      //if (obdata.code && obdata.code != null) {
      //  this.showToast(this.locale_service.Locale.language.project.projectsettings.reopendialog, null, {
      //    duration: 2000
      //  });
      //}
      else {

        this.observationDatasource.data = [
          ...new Map(
            obdata.map(item => [item._id, item])
          ).values()
        ];
        //assign all the observations from maintenance list and mainlist
        this.filterObservationDatasource.data = this.observationDatasource.data.slice();
        this.othermaintenanceobservationDatasource.data = this.observationDatasource.data.filter(item => this.resolver.isJEObservation(item.observationtype));
        this.MNPobservationDatasource.data = this.observationDatasource.data.filter(item => item.observationtype == 'mnp');

        if (!this.dialogData.device_details.activity_parameters || this.dialogData.device_details.activity_parameters.length == 0)
          this.obsListobservationDatasource.data = this.observationDatasource.data.slice();
        //console.log(this.othermaintenanceobservationDatasource.data)
        this.linkedObservationCount = this.othermaintenanceobservationDatasource.data.length + this.MNPobservationDatasource.data.length;
      }
    }
    this.InProgress = false;

    this.filterObservationDatasource.data = this.observationDatasource.data.slice();
    // ensure observation predicate is set once
    this.setObservationPredicate(this.filterObservationDatasource);
  }



  catagorizeParameters(device_details) {
    let catagorized_param_list = {};
    device_details.activity_parameters.forEach(param => { // attach devicetype & connected_mnt_id

      let header_label = this.appservice.unescapedName(param.header_label);
      let head_start_label = this.appservice.unescapedName(param.head_start_label);

      if (!catagorized_param_list[head_start_label])
        catagorized_param_list[head_start_label] = {};

      if (!catagorized_param_list[head_start_label][header_label])
        catagorized_param_list[head_start_label][header_label] = [];
      catagorized_param_list[head_start_label][header_label].push(param);

    });
    this.catagorized_param_list = catagorized_param_list;
  }

  // removeFromStepper: to remove or skip steps in stepper
  // @remove => true: delete from stepper; false: skip in stepper
  removeFromStepper(remove_steps: string[], remove = false) {
    const stepper = Object.keys(this.stepper);
    for (const step of stepper) {
      if (!this.stepper[step].hidden && remove_steps.some(r_step => step.includes(r_step))) {
        if (remove)
          delete this.stepper[step];
        else
          this.stepper[step].datetime = -1;
      }
    }
  }

  updateStepper(form_val) {

    const stepper = Object.keys(this.stepper);
    let req_appr = form_val.requests_approves;
    for (const step of stepper) {
      if (req_appr[step + "_datetime"] !== undefined && this.stepper[step].datetime == 0) {
        if (form_val.current_status == MaintenanceStatus.RestorationRequired && step == MaintenanceStatus.RestorationCompleted)
          continue;
        this.stepper[step].datetime = req_appr[step + "_datetime"];
      }
    }
    const stepperReversed = stepper.reverse();

    let findLastUpdated = false;
    for (const stage of stepperReversed) {
      if (this.stepper[stage].datetime !== 0 && !("no_skip" in this.stepper[stage])) {
        findLastUpdated = true;
      }
      if (findLastUpdated && this.stepper[stage].datetime === 0 && !("no_skip" in this.stepper[stage])) {
        this.stepper[stage].datetime = -1;
      }
    }

    if (this.stepper.sldc_shutdown_code_issued) {
      this.stepper.sldc_shutdown_code_issued.id = form_val.sldcshutdowncode
      this.stepper.sldc_charging_code_issued.id = form_val.sldcchargingcode
    }
    if (this.stepper.ptw_issued)
      this.stepper.ptw_issued.id = form_val.ptw_ids ? form_val.ptw_ids.slice(-1)[0] : '';
  }

  updateStepperCancel(form_val) {
    const stepper = Object.keys(this.stepper);
    const cur_status = form_val.current_status;
    if (cur_status == MaintenanceStatus.Cancel) {
      this.stepper[cur_status].label += form_val.cancel_info.user;
    }
    this.stepper[cur_status].hidden = false;
    let findLastUpdated = false;

    let req_appr = form_val.requests_approves;
    for (const step of stepper) {

      if (findLastUpdated) {
        this.stepper[step].hidden = true;
        continue;
      }

      if (req_appr[step + "_datetime"] !== undefined) {
        this.stepper[step].datetime = req_appr[step + "_datetime"];
      }

      if (step === cur_status)
        findLastUpdated = true;
    }
  }

  async startMaintenance() {
    this.form.patchValue({
      patrolling_details: this.patrolling_details
    });
    let form_val = this.form.getRawValue();
    let now = Date.now();
    if ((form_val.maintenance_list.template.scheduled_patrolling == "patrolling" || form_val.maintenance_list.template.hotline) && this.maintenanceDetails.hasOwnProperty("first_as_n_when")) {
      form_val.requests_approves.planned_datetime = now;
      form_val.cutoffDate = now;
      form_val.plannedDate = now;
      form_val.requests_approves.planned_datetime = now;
      form_val.maintenance_list.cutoff_date = now;
      //form_val.maintenance_list.frequency.maintenanceCount = 1;
      //form_val.maintenance_list.next_maintenance_date = this.CalculateNextMaintenance(now, form_val.maintenance_list.frequency.freqnum, form_val.maintenance_list.frequency.freqtype);
    }
    this.stepper.in_progress.datetime = now;
    form_val.requests_approves.in_progress_datetime = this.stepper.in_progress.datetime;
    form_val.current_status = MaintenanceStatus.InProgress;
    this.InProgress = true;
    form_val.sse = this.getUserNameWithID();
    const data = await this.mntservice.UpdatePlanMnt(form_val, "saw");

    // Delete previous actionable notifications in this maintenance
    this.appservice.DeleteActionableNoticesByMtc(data._id).then((result) => {
      if (result.deletedCount !== undefined) {
        console.log(`Deleted ${result.deletedCount} actionable notices`);
      } else {
        console.error('Error:', result.code);
      }
    });

    // Always report "Maintenance Has Started" from startMaintenance, matching
    // ClientApp maintenance-details-dlg.component.ts:1520. The previous use of
    // snackbar.patrollingstarted misfired for Observation/Scheduled TL flows
    // (any non-pure-patrolling maintenance) — the button toast should reflect
    // the generic maintenance action, not the specific TL patrolling variant.
    const message = data.code ? this.locale_service.Locale.language.errorcode.maintenance[data.code] : this.locale_service.Locale.language.project.maintenancesettings.snackbar.maintenancestarted;
    this.InProgress = false;
    this.isMainPending = false;
    if (!(data.code && data.code != null))
      this.form.patchValue(data);
    this.maintenanceDetails = data;
    this.showToast(message, this.locale_service.Locale.language.common.ok, { duration: 3000 });
    this.currentStatusIndex(data.current_status);
    this.show_start_maintenance_btn = false
  }

  async rescheduledMaintenance() {
    let form_val = this.form.getRawValue();
    form_val.requests_approves.maintenance_rescheduled_datetime = Date.now();
    form_val.current_status = MaintenanceStatus.MaintainanceRescheduled;
    this.InProgress = true;
    const data = await this.mntservice.UpdatePlanMnt(form_val);
    const message = data.code ? this.locale_service.Locale.language.errorcode.maintenance[data.code] : this.locale_service.Locale.language.project.maintenancesettings.snackbar.maintenancerescheduled;
    this.InProgress = false;
    if (!(data.code && data.code != null)) {
      this.form.patchValue({ current_status: data.current_status, requests_approves: data.requests_approves });
      this._rev = data._rev;
    }
    this.showToast(message, this.locale_service.Locale.language.common.ok, { duration: 3000 });
    this.stepper.maintenance_rescheduled.datetime = data.requests_approves.maintenance_rescheduled_datetime;
    this.currentStatusIndex(data.current_status);
    this.updateStepperCancel(data);
  }

  //fetchActivityParams(params) {
  //  let mntlst = [];
  //  let mnplst = [];
  //  this.allActivityParams.parameterdetails.forEach(activityParams => {
  //    params.forEach(param => {
  //      if (activityParams._id == param) {
  //        if (activityParams.managedby == 'je') {
  //          //this.maintenanceDataSource.data.push(activityParams);
  //          mntlst.push(activityParams);
  //        }
  //        else
  //          //this.mpDataSource.data.push(activityParams);
  //          mnplst.push(activityParams);
  //      }
  //    })
  //  })
  //  this.mntlst.push(mntlst);
  //  this.mnplst.push(mnplst);
  //}

  onValueInputChangeValidation(row) {

    // IMPORTANT: handle empty / untouched case FIRST
    if (
      row.value === null ||
      row.value === undefined ||
      row.value === ''
    ) {
      row.value = null;   // reset properly
      return;
    }

    if (row.value === 'NA' || row.value === 'NaN') {
      return;
    }

    const inputValue = Number(row.value);

    // if still NaN after conversion, reset
    if (isNaN(inputValue)) {
      row.value = null;
      return;
    }

    // Min–Max validation
    //if (row.calculatedmin != null && inputValue < row.calculatedmin) {
    //  row.value = row.calculatedmin;
    //  return;
    //}

    //if (row.calculatedmax != null && inputValue > row.calculatedmax) {
    //  row.value = row.calculatedmax;
    //  return;
    //}

    // Type-specific formatting
    if (row.valuetype === 'Number') {
      row.value = Math.trunc(inputValue);
    }
    else if (row.valuetype === 'Float') {
      const valueStr = row.value.toString();

      // preserve user decimal input
      if (!valueStr.includes('.')) {
        row.value = `${inputValue}.00`;
      } else {
        row.value = valueStr;
      }
    }
  }

  stepperHideShow() {
    const stepsConfig = {
      TL: [
        'sldc_shutdown_code_requested',
        'sldc_shutdown_code_issued',
        'xen_maintainance_approved',
        'ptw_requested',
        'backcharging_requested',
        'backcharging_issued',
        'hotline_parameter',
        'backcharging_cancel_requested',
        'backcharging_cancel_issued',
        'ptw_issued',
        'mnp_parameter',
        'ptw_cancellation_requested',
        'ptw_cancellation_issued',
        'sldc_charging_code_requested',
        'sldc_charging_code_issued',
        'restoration_completed'
      ],
      TL_Hotline: [
        'sldc_shutdown_code_requested',
        'sldc_shutdown_code_issued',
        'xen_maintainance_approved',
        'ptw_requested',
        'maintenance_parameter',
        'parameter_approval',
        'backcharging_requested',
        'backcharging_issued',
        'backcharging_cancel_requested',
        'backcharging_cancel_issued',
        'ptw_issued',
        'mnp_parameter',
        'ptw_cancellation_requested',
        'ptw_cancellation_issued',
        'sldc_charging_code_requested',
        'sldc_charging_code_issued',
        'restoration_completed'
      ],
      Substation_NoShutdown: [
        'sldc_shutdown_code_requested',
        'sldc_shutdown_code_issued',
        'sldc_charging_code_requested',
        'sldc_charging_code_issued',
        'hotline_parameter',
        'backcharging_requested',
        'backcharging_issued',
        'backcharging_cancel_requested',
        'backcharging_cancel_issued',
        'xen_maintainance_approved',
        'ptw_requested',
        'ptw_issued',
        'ptw_cancellation_requested',
        'ptw_cancellation_issued',
        'restoration_completed'
      ],
      Substation_Hotline: [
        'sldc_shutdown_code_requested',
        'maintenance_parameter',
        'parameter_approval',
        'mnp_parameter',
        'sldc_shutdown_code_issued',
        'sldc_charging_code_requested',
        'sldc_charging_code_issued',
        'backcharging_requested',
        'backcharging_issued',
        'backcharging_cancel_requested',
        'backcharging_cancel_issued',
        'xen_maintainance_approved',
        'ptw_requested',
        'ptw_issued',
        'ptw_cancellation_requested',
        'ptw_cancellation_issued',
        'restoration_completed']
    };

    const { maintenance_type, shutdown_required, maintenance_list } = this.maintenanceDetails;

    const hideSteps = (steps) => steps.forEach(step => { if (this.stepper[step]) this.stepper[step].hidden = true });

    if (maintenance_type === 'TL') {
      if (maintenance_list.template.scheduled_patrolling == "patrolling") {
        this.stepper['patrolling_completed'].hidden = false;
        this.stepper['maintenance_parameter'].hidden = true;
        this.stepper['parameter_approval'].hidden = true;
      }
      if (this.isHotlineMaintenance) {
        hideSteps(stepsConfig.TL_Hotline)
        this.stepper['hotline_parameter'].hidden = false;
      }
      else {
        hideSteps(stepsConfig.TL);
      }
    } else if ((maintenance_type === 'Substation' || !shutdown_required) && !this.isHotlineMaintenance) {
      hideSteps(stepsConfig.Substation_NoShutdown);
    }
    else if (maintenance_type === 'Substation' && this.isHotlineMaintenance) {
      hideSteps(stepsConfig.Substation_Hotline);
      this.stepper['hotline_parameter'].hidden = false;
    }

  }

  currentStatusIndex(statusName: string): void {
    if (statusName == MaintenanceStatus.TLPartiallyComplete)
      statusName = MaintenanceStatus.Complete;
    const keys = Object.keys(this.stepper);
    const index = keys.indexOf(statusName);
    if (index !== -1) {
      this.updateCompletedSteps(index);
    }
  }

  isInputInvalid(source: string): { invalid: boolean, message: string } {
    const invalidParams = this.form.value.activity_parameters.filter(param => param.managedby === source)
      .filter(param => param.value == null || param.value > param.calculatedmax || param.value < param.calculatedmin);

    if (invalidParams.length > 0) {
      let message = 'Invalid input: ';
      invalidParams.forEach(param => {
        if (param.value == null) {
          message += `${param.parametername}: NO inputs, `;
        } else if (param.value > param.calculatedmax) {
          message += `${param.parametername}: exceeds max value., `;
        } else if (param.value < param.calculatedmin) {
          message += `${param.parametername}: is below min value., `;
        }
      });
      return { invalid: true, message };
    }
    return { invalid: false, message: '' };
  }


  getUserNameWithID() {
    const role_name = this.route.snapshot.root.firstChild.firstChild.data.viewData.access.role.role.role_name
    return role_name ? `${role_name}-${this.appservice.getUserName()} (${this.appservice.getLoginID()})` : `${this.appservice.getUserName()} (${this.appservice.getLoginID()})`
  }

  get isAutoPlannedMaintenance(): boolean {
    return !this.maintenanceDetails?.shutdown_required &&
      !this.maintenanceDetails?.maintenance_list?.template?.require_schedule;
  }

  async paramSaveSubmit(actionType: string, source: string) {
    let formData = this.form.getRawValue();
    const isMaintenance = source === 'Maintenance';
    const isMnp = source === 'M & P';
    const isHotline = source == 'Hotline';

    if ((isMaintenance || isMnp || isHotline) && actionType === 'submit') {
      //const validation = this.isInputInvalid(source);
      //if (validation.invalid) {
      //  this.showToast('Out Of Range Value', null, { duration: 3000 });
      //  return;
      //}
      formData.associated_user = this.getUserNameWithID();
      if (isMaintenance) {
        this.isActionBtnParameterDisabled = true;
        this.isCancelBtnParameterDisabled = false;
        this.stepper.maintenance_parameter.datetime = Date.now();
        formData.requests_approves.maintenance_parameter_datetime = Date.now();
        this.stepper.maintenance_parameter.label = "Maintenance Parameter Submitted";
        formData.je = this.getUserNameWithID();
      }
      else if (isHotline) {
        this.isActionBtnHotlineDisabled = true;
        this.isCancelBtnHotlineDisabled = false;
        this.stepper.hotline_parameter.datetime = Date.now();
        formData.requests_approves.hotline_parameter_datetime = Date.now();
        this.stepper.hotline_parameter.label = "Hotline Parameter Submitted";

        if (this.checkMaintenanceComplete()) {
          console.log('%c Maintenance Completed!!', 'font-weight: bold; font-size: 50px;color: red; text-shadow: 3px 3px 0 rgb(217,31,38) , 6px 6px 0 rgb(226,91,14) , 9px 9px 0 rgb(245,221,8) , 12px 12px 0 rgb(5,148,68) , 15px 15px 0 rgb(2,135,206) , 18px 18px 0 rgb(4,77,145) , 21px 21px 0 rgb(42,21,113)');
          this.stepper.maintenance_complete.datetime = Date.now();
          formData.requests_approves.maintenance_complete_datetime = this.stepper.maintenance_complete.datetime;
          formData.current_status = MaintenanceStatus.Complete;
        }
      }
      else if (isMnp) {
        this.isActionBtnMnpDisabled = true;
        this.isCancelBtnMnpDisabled = false;
        this.stepper.mnp_parameter.datetime = Date.now();
        formData.requests_approves.mnp_parameter_datetime = Date.now();
        this.stepper.mnp_parameter.label = "M & P Parameter Submitted";
        //if (!this.ifAnyMaintenanceParamExists) {
        //  formData.requests_approves.parameter_approval_datetime = formData.requests_approves.mnp_parameter_datetime;
        //  this.stepper.parameter_approval.label = "Parameter Approved";
        //  this.stepper.parameter_approval.datetime = formData.requests_approves.mnp_parameter_datetime;
        //}

        //formData = this.SSMntShouldComplete(formData);

        if (this.checkMaintenanceComplete()) {
          console.log('%c Maintenance Completed!!', 'font-weight: bold; font-size: 50px;color: red; text-shadow: 3px 3px 0 rgb(217,31,38) , 6px 6px 0 rgb(226,91,14) , 9px 9px 0 rgb(245,221,8) , 12px 12px 0 rgb(5,148,68) , 15px 15px 0 rgb(2,135,206) , 18px 18px 0 rgb(4,77,145) , 21px 21px 0 rgb(42,21,113)');
          this.stepper.maintenance_complete.datetime = Date.now();
          formData.requests_approves.maintenance_complete_datetime = this.stepper.maintenance_complete.datetime;
          formData.current_status = MaintenanceStatus.Complete;
        }
      }
    }
    this.InProgress = true;

    if (this.dialogData?.device_details?.event_logs_performed != null) {
      formData.event_logs_performed = this.dialogData.device_details.event_logs_performed;
    }

    if (formData.activity_parameters) {
      formData.activity_parameters.forEach(p => {
        if ((p.valuetype === 'Number' || p.valuetype === 'Float') && p.value === 'NA') {
          p.value = 'NaN';
        }
      });
    }

    const data = await this.mntservice.UpdatePlanMnt(formData, actionType);
    const message = data.code ? this.locale_service.Locale.language.errorcode.maintenance[data.code] : this.locale_service.Locale.language.project.maintenancesettings.snackbar.parametersaved;
    if (!(data.code && data.code != null)) {
      this.form.patchValue({ current_status: data.current_status, requests_approves: data.requests_approves, activity_parameters: data.activity_parameters });
      this._rev = data._rev;
      this.dialogData.device_details = data;
      this.ngOnInit();
    }
    this.showToast(message, this.locale_service.Locale.language.common.ok,
      {
        duration: 2000
      });
    await this.fetchAllObservations(data);
    const newObservations = this.filterObservationDatasource.data.filter(
      newItem => !this.dialogData.obdata.some(existingItem => existingItem._id === newItem._id)
    );

    /*    const updatedObservations = this.filterObservationDatasource.data.filter(newItem => {
          const existingItem = this.dialogData.obdata.find(item => item._id === newItem._id);
          return existingItem && JSON.stringify(existingItem) !== JSON.stringify(newItem);
        });
    
        updatedObservations.forEach(updatedItem => {
          const index = this.dialogData.obdata.findIndex(item => item._id === updatedItem._id);
          if (index !== -1) {
            this.dialogData.obdata[index] = updatedItem; // Replace with updated data
          }
        });*/




    // Create a Map for quick lookup of existing observations
    const obdataMap = new Map(this.dialogData.obdata.map(item => [item._id, item]));

    // Find updated observations
    const updatedObservations = this.filterObservationDatasource.data.filter(newItem => {
      const existingItem: any = obdataMap.get(newItem._id);
      return existingItem && (
        existingItem.status !== newItem.status ||
        existingItem.remarks !== newItem.remarks ||
        existingItem?.parameter_details?.value !== newItem?.parameter_details?.value // Add necessary properties
      );
    });

    // Update existing items efficiently
    updatedObservations.forEach(updatedItem => {
      obdataMap.set(updatedItem._id, updatedItem);
    });


    this.dialogData.obdata = Array.from(obdataMap.values());
    this.updateHideCancelButtonForNonSD();

    //console.log(updatedObservations);
    this.dialogData.obdata.push(...newObservations);
    this.getAllPendingObservations();

    this.isMainParameterFilled = false;
    this.isHOTLINEFilled = false;
    this.isMNPFilled = false;
    this.InProgress = false;
    this.isFormDirty = false;
  }


  async onRevert() {
    const modal_revert = await this.modalController.create({
      component: ConfirmationRemarksDlgComponent,
      componentProps: { dialogData: { heading: this.locale_service.Locale.language.project.maintenancesettings.heading.revert_heading } }
    });
    await modal_revert.present();
    const { data: result } = await modal_revert.onDidDismiss();
    if (result) {
      var formData = this.form.getRawValue();
      formData.revert_history ??= [];
      formData.revert_history.push({ reason: result.cancel_reason, user: `${this.appservice.getUserName()} (${this.appservice.getLoginID()})`, time: Date.now() });

      if (this.selectedTabLabel == 'Maintenance Parameter') {
        this.isActionBtnParameterDisabled = false;
        this.isCancelBtnParameterDisabled = true;

        formData.requests_approves.maintenance_parameter_datetime = 0;
        this.stepper.maintenance_parameter.label = "Maintenance Parameter Reverted";

        formData.requests_approves.parameter_revert_datetime = Date.now();
        this.stepper.maintenance_parameter.datetime = formData.requests_approves.parameter_revert_datetime;

        //formData.requests_approves.parameter_revert_datetime = formData.requests_approves.maintenance_parameter_cancel_datetime;
        //this.stepper.parameter_approval.label = "Parameter Reverted";
        //this.stepper.parameter_approval.datetime = formData.requests_approves.mnp_parameter_cancel_datetime;

      }
      //else if (this.selectedTabLabel == 'M & P Parameter') {
      //  this.isActionBtnMnpDisabled = false;
      //  this.isCancelBtnMnpDisabled = true;

      //  formData.requests_approves.mnp_parameter_datetime = 0;
      //  this.stepper.mnp_parameter.label = "M & P Parameter Reverted";

      //  formData.requests_approves.mnp_parameter_cancel_datetime = Date.now();
      //  this.stepper.mnp_parameter.datetime = formData.requests_approves.mnp_parameter_cancel_datetime;

      //}
      this.InProgress = true;

      this.mntservice.UpdatePlanMnt(formData).then(data => {
        if (data.code && data.code != null)
          this.showToast(this.locale_service.Locale.language.errorcode.maintenance[data.code], this.locale_service.Locale.language.common.failed,
            {
              duration: 2000
            });
        else {
          this.form.patchValue({ requests_approves: data.requests_approves, revert_history: data.revert_history });
          this._rev = data._rev;
          this.currentStatusIndex(data.current_status);
          this.showToast(this.locale_service.Locale.language.project.maintenancesettings.snackbar.parametercancel, this.locale_service.Locale.language.common.ok,
            {
              duration: 2000
            });
        }
        this.isMainParameterFilled = false;
        this.InProgress = false;
      })
    }

  }

  async onApproval() {
    var formData = this.form.getRawValue();

    if (this.selectedTabLabel == 'Maintenance Parameter') {
      this.isActionBtnParameterDisabled = true;
      this.isCancelBtnParameterDisabled = true;

      formData.requests_approves.parameter_approval_datetime = Date.now();
      this.stepper.maintenance_parameter.label = "Maintenance Parameter Approved";
      this.stepper.maintenance_parameter.datetime = formData.requests_approves.parameter_approval_datetime;


      //formData.requests_approves.parameter_approval_datetime = formData.requests_approves.maintenance_parameter_approval_datetime;
      this.stepper.parameter_approval.label = "Parameter Approved";
      this.stepper.parameter_approval.datetime = formData.requests_approves.parameter_approval_datetime;

      if (formData.maintenance_type == 'TL') {
        formData = this.TLMntShouldComplete(formData);
      }

      if (formData.maintenance_type == 'Substation') {
        formData = this.SSMntShouldComplete(formData);
      }

    }
    //else if (this.selectedTabLabel == 'M & P Parameter') {
    //  this.isActionBtnMnpDisabled = true;
    //  this.isCancelBtnMnpDisabled = true;

    //  formData.requests_approves.mnp_parameter_approval_datetime = Date.now();
    //  this.stepper.mnp_parameter.label = "M & P Parameter Approved";
    //  this.stepper.mnp_parameter.datetime = formData.requests_approves.mnp_parameter_approval_datetime;

    //  if (formData.requests_approves.maintenance_parameter_approval_datetime != 0 || !this.ifAnyMaintenanceParamExists) {
    //    formData.requests_approves.parameter_approval_datetime = formData.requests_approves.mnp_parameter_approval_datetime;
    //    this.stepper.parameter_approval.label = "Parameter Approved";
    //    this.stepper.parameter_approval.datetime = formData.requests_approves.mnp_parameter_approval_datetime;
    //  }

    //  if (formData.maintenance_type == 'Substation') {
    //    formData = this.SSMntShouldComplete(formData);
    //  }

    //}
    if (this.checkMaintenanceComplete()) {
      console.log('%c Maintenance Completed!!', 'font-weight: bold; font-size: 50px;color: red; text-shadow: 3px 3px 0 rgb(217,31,38) , 6px 6px 0 rgb(226,91,14) , 9px 9px 0 rgb(245,221,8) , 12px 12px 0 rgb(5,148,68) , 15px 15px 0 rgb(2,135,206) , 18px 18px 0 rgb(4,77,145) , 21px 21px 0 rgb(42,21,113)');
      this.stepper.maintenance_complete.datetime = Date.now();
      formData.requests_approves.maintenance_complete_datetime = this.stepper.maintenance_complete.datetime;
      formData.current_status = MaintenanceStatus.Complete;
    }
    this.InProgress = true;

    let data = await this.mntservice.UpdatePlanMnt(formData);
    if (data.code && data.code != null)
      this.showToast(this.locale_service.Locale.language.errorcode.maintenance[data.code], this.locale_service.Locale.language.common.failed,
        {
          duration: 2000
        });
    else {
      this.form.patchValue({ current_status: data.current_status, requests_approves: data.requests_approves });
      this.currentStatusIndex(data.current_status);
      this._rev = data._rev;
      this.dialogData.device_details = data;
      this.ngOnInit();
      this.showToast(this.locale_service.Locale.language.project.maintenancesettings.snackbar.parameterapprove, this.locale_service.Locale.language.common.ok,
        {
          duration: 2000
        });
      this.isMainParameterFilled = false;
      if (data.current_status == MaintenanceStatus.Complete) {
        this.showToast(this.locale_service.Locale.language.project.maintenancesettings.snackbar.maintenancecompleted, this.locale_service.Locale.language.common.ok,
          {
            duration: 2000
          });
      }

    }
    this.isMainParameterFilled = false;
    this.InProgress = false;

  }

  async updateCompletedSteps(index: number) {
    this.completedStepsIndex = index;
    while (this.matstepper && this.matstepper.selectedIndex < index) {
      this.matstepper.next();
      await this.waitForTransition();
    }
    this.cdr.detectChanges();
  }

  private waitForTransition(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, 200)); // Adjust timeout to match transition duration
  }
  isStepCompleted(stepIndex: number): boolean {
    return stepIndex <= this.completedStepsIndex;
  }

  isStepActive(stepIndex: number): boolean {
    return stepIndex === this.completedStepsIndex;
  }



  async maintenanceXenCancel(): Promise<void> {
    let actionBy = "";
    if (this.resolver.MaintenanceAccessRights.issue_sldc_code)
      actionBy = 'SLDC'
    else if (this.resolver.MaintenanceAccessRights.approve_maintenance)
      actionBy = 'XEN'
    else if (this.resolver.MaintenanceAccessRights.maintenence_parameter_approve_revert)
      actionBy = 'SSE';
    else if (this.resolver.MaintenanceAccessRights.tl_maintenance_parameter_approve_revert)
      actionBy = 'AETL';

    const modal_xencancel = await this.modalController.create({
      component: ConfirmationRemarksDlgComponent,
      componentProps: { dialogData: { heading: this.locale_service.Locale.language.project.maintenancesettings.heading.cancellation_heading } }
    });
    await modal_xencancel.present();
    const { data: result } = await modal_xencancel.onDidDismiss();
    if (result) {
      this.isXenCancelButtonDisabled = true;
      this.InProgress = true;

      // cancel LV bays when HV bays are cancelled
      if (this.dialogData.device_details?.maintenance_list?.template?.devicetype
        && this.dialogData.device_details?.maintenance_list?.template.devicetype?.toLowerCase().includes("hv bay")
        && this.dialogData.mnt_on_same_bay && this.dialogData.mnt_on_same_bay.length > 0
      ) {

        let res_mnt = await this.mntservice.GetPlanMntByIds(this.dialogData.mnt_on_same_bay.map(mnt => mnt._id));
        if (res_mnt.code && res_mnt.code != null) {
          this.showToast(this.locale_service.Locale.language.errorcode.maintenance[res_mnt.code], this.locale_service.Locale.language.common.failed,
            {
              duration: 2000
            });
        }
        else {

          let res_mnts = (Object.values(res_mnt) as any[]).filter(mnt => mnt.connected_hv_lv_bay).map(mnt => {
            mnt.cancel_info = {};
            mnt.cancel_info.user = actionBy
            mnt.current_status = MaintenanceStatus.Cancel;
            mnt.cancel_info.reason = result.cancel_reason;
            return mnt;
          });
          for (let mnt of res_mnts) {

            // delete all actionable notifications
            this.appservice.DeleteActionableNoticesByMtc(mnt._id).then((result) => {
              if (result.deletedCount !== undefined) {
                console.log(`Deleted ${result.deletedCount} actionable notices`);
              } else {
                console.error('Error:', result.code);
              }
            });

            await this.mntservice.UpdatePlanMnt(mnt, "cancellation");
          }

        }
      }

      let updatedPlanObj = Object.assign(this.form.value, {});
      updatedPlanObj.current_status = MaintenanceStatus.Cancel;
      updatedPlanObj.cancel_info = {};
      updatedPlanObj.cancel_info.user = actionBy;
      updatedPlanObj.cancel_info.reason = result.cancel_reason;

      this.mntservice.UpdatePlanMnt(updatedPlanObj, "cancellation").then(data => {
        if (data != null) {
          if (data.code && data.code != null) {
            this.showToast(this.locale_service.Locale.language.errorcode.maintenance[data.code], this.locale_service.Locale.language.common.failed,
              {
                duration: 2000
              });
          } else {
            this.form.patchValue({ current_status: data.current_status, requests_approves: data.requests_approves });
            this._rev = data._rev;
            this.updateStepperCancel(data);

            // delete all actionable notifications
            this.appservice.DeleteActionableNoticesByMtc(updatedPlanObj._id).then((result) => {
              if (result.deletedCount !== undefined) {
                console.log(`Deleted ${result.deletedCount} actionable notices`);
              } else {
                console.error('Error:', result.code);
              }
            });


            this.showToast(this.locale_service.Locale.language.project.maintenancesettings.snackbar.maintenancecancelled, this.locale_service.Locale.language.common.ok,
              {
                duration: 2000
              });
          }
        } else {
          this.showToast(this.locale_service.Locale.language.errorcode.api, this.locale_service.Locale.language.common.failed,
            {
              duration: 2000
            });
        }
        this.isMainPending = false;
        this.InProgress = false;
      });
    }
  }

  async maintenanceCancel(id: string): Promise<void> {
    const modal_cancel = await this.modalController.create({
      component: ConfirmationRemarksDlgComponent,
      componentProps: { dialogData: { heading: this.locale_service.Locale.language.project.maintenancesettings.heading.cancellation_heading } }
    });
    await modal_cancel.present();
    const { data: result } = await modal_cancel.onDidDismiss();
    if (result) {
      let form_val = this.form.value;
      form_val.current_status = MaintenanceStatus.Cancel;
      form_val.cancel_info = {};
      form_val.cancel_info.user = "SLDC";
      form_val.cancel_info.reason = result.cancel_reason;
      this.isSLDCCancelButtonDisabled = true;
      this.InProgress = true;
      this.mntservice.UpdatePlanMnt(form_val, "cancellation").then(data => {
        if (data != null) {
          if (data.code && data.code != null) {
            this.showToast(this.locale_service.Locale.language.errorcode.maintenance[data.code], this.locale_service.Locale.language.common.failed,
              {
                duration: 2000
              });
          } else {
            this.form.patchValue({ current_status: data.current_status, requests_approves: data.requests_approves });
            this._rev = data._rev;
            this.updateStepperCancel(data);
            this.showToast(this.locale_service.Locale.language.project.maintenancesettings.snackbar.maintenancecancelled, this.locale_service.Locale.language.common.ok,
              {
                duration: 2000
              });
          }
        } else {
          this.showToast(this.locale_service.Locale.language.errorcode.api, this.locale_service.Locale.language.common.failed,
            {
              duration: 2000
            });
        }
        this.InProgress = false;
      });

    }

    /*    if (this.form.value.current_status === 'sldc_shutdown_code_requested') {
          this.maintenanceService.DeletePlanMnt(id)
            .then(data => {
              //console.log(id);
              this.showToast('Maintenance plan deleted successfully', 'Close', {
                duration: 3000,
              });
            }).catch(error => {
              //console.error('Error deleting maintenance plan:', error);
              this.showToast('Failed to delete maintenance plan', 'Close', {
                duration: 3000,
              });
            });
        }
        else if (this.form.value.current_status === 'sldc_charging_code_requested') {
          //console.log('ensure ptw check');
          //console.log(this.form.value);
        }*/

  }

  async maintenanceCancelAfterPTW(_id: string): Promise<void> {

    //this.dialog.open(ConfirmationDlgComponent, {
    //  width: '300px', closeOnNavigation: true, disableClose: true, autoFocus: true,
    //  data: {
    //    Question: this.locale_service.Locale.language.project.maintenancesettings.maintenancebutton.cancelbtn,
    //    YesText: this.locale_service.Locale.language.common.yes,
    //    NoText: this.locale_service.Locale.language.common.no
    //  }
    //})
    const modal_cancelptw = await this.modalController.create({
      component: ConfirmationRemarksDlgComponent,
      componentProps: { dialogData: { heading: this.locale_service.Locale.language.project.maintenancesettings.heading.cancellation_heading } }
    });
    await modal_cancelptw.present();
    const { data: result } = await modal_cancelptw.onDidDismiss();
    if (result) {
      const form_val = this.form.value;
      this.isSLDCCancelButtonDisabled = true;
      this.mntservice.GetPTWByID(_id).then(
        ptwDetails => {
          const canStatus = ptwDetails.cancellation_details.maintenance_status;
          if (canStatus === 'ptw_c_r_work_incomplete') {
            this.form.patchValue({
              current_status: MaintenanceStatus.Cancel
            })
            form_val.cancel_info = {};
            form_val.cancel_info.user = "SLDC";
            form_val.cancel_info.reason = result.cancel_reason;

            this.mntservice.UpdatePlanMnt(form_val).then(data => {
              if (data != null) {
                if (data.code && data.code != null) {
                  this.showToast(this.locale_service.Locale.language.errorcode.maintenance[data.code], this.locale_service.Locale.language.common.failed,
                    {
                      duration: 2000
                    });
                } else {
                  this.form.patchValue({ current_status: data.current_status, requests_approves: data.requests_approves });
                  this._rev = data._rev;
                  this.showToast(this.locale_service.Locale.language.project.maintenancesettings.snackbar.maintenancecancelled, this.locale_service.Locale.language.common.ok,
                    {
                      duration: 2000
                    });
                }
              } else {
                this.showToast(this.locale_service.Locale.language.errorcode.api, this.locale_service.Locale.language.common.failed,
                  {
                    duration: 2000
                  });
              }
              this.InProgress = false;
            });

            /* //console.log("checkCan1");
             this.maintenanceService.DeletePlanMnt(this.dialogData.device_details._id)
               .then(data => {
                 //console.log(id);
                 this.showToast('Maintenance plan deleted successfully', 'Close', {
                   duration: 3000,
                 });
               }).catch(error => {             
                 this.showToast('Failed to delete maintenance plan', 'Close', {
                   duration: 3000,
                 });
               });
             //console.log("checkCan1MaintenanceCancel");*/
          }
          else if (canStatus === "ptw_c_r_work_completed") {
            //console.log("checkCan2");
            this.mntservice.GetPlanMntById(this.dialogData.device_details._id).then(
              plnmntDetails => {
                //console.log("plnmntDetails", plnmntDetails);
                this.plnmntDetails = plnmntDetails;
                const nxtMainDate = plnmntDetails.maintenance_list.next_maintenance_date;
                //console.log("nxtMainDate-", nxtMainDate);
                const cutOffDate = plnmntDetails.maintenance_list.cutoff_date;
                //console.log("cutOffDate-", cutOffDate);
              }).catch(
                error => {
                  this.showToast(this.locale_service.Locale.language.errorcode.maintenance[error.code], this.locale_service.Locale.language.common.failed,
                    {
                      duration: 4000
                    });
                }
              );

            this.mntservice.GetSubstationById(this.form.value.device_name.split('/')[4]).then(
              substationDetails => {
                //console.log(substationDetails);

                const processMaintenanceList = (details: any) => {
                  if (details.maintenance_list && Array.isArray(details.maintenance_list)) {
                    details.maintenance_list.forEach((element: any) => {
                      if (element.template._id === this.plnmntDetails.maintenance_list.template._id) {
                        let tmpCutOffDate = element.cutoff_date;
                        let tmpNextmntDate = element.next_maintenance_date;

                        //console.log(tmpCutOffDate, tmpNextmntDate);

                        element.cutoff_date = tmpNextmntDate;
                        element.next_maintenance_date = new Date(tmpNextmntDate).getTime() + (new Date(tmpNextmntDate).getTime() - new Date(tmpCutOffDate).getTime());
                        //console.table(element.cutoff_date, element.next_maintenance_date)
                      }
                    });
                  }

                  for (const key in details) {
                    if (details[key] && typeof details[key] === 'object') {
                      processMaintenanceList(details[key]);
                    }
                  }
                };

                processMaintenanceList(substationDetails);
                //console.log(substationDetails);

                const data = substationDetails;
                this.mntservice.UpdateScheduleAfterCompletion(data).then(
                  updateDSubstation => {
                    //console.log('Substation updated:', JSON.stringify(updateDSubstation, null, 2));
                    //console.log("till delete returned")
                    return this.mntservice.DeletePlanMnt(this.dialogData.device_details._id);
                  }
                )

                //console.log(substationDetails);
                //let index = substationDetails.maintenance_list.findIndex(element => element.maintenance_template_id === this.plnmntDetails.maintenance_list.maintenance_template_id);
                ////console.log(index);

                //let tmpCutOffDate = substationDetails.maintenance_list[index].cutoff_date;
                //let tmpNextmntDate = substationDetails.maintenance_list[index].next_maintenance_date;

                //console.log(tmpCutOffDate, tmpNextmntDate)

                //const cutOFF=substationDetails.maintenance_list[index].cutoff_date = tmpNextmntDate;
                ////substationDetails.maintenance_list[index].next_maintenance_date = tmpNextmntDate + (tmpNextmntDate - tmpCutOffDate);
                //const nxtCutt=substationDetails.maintenance_list[index].next_maintenance_date = new Date(tmpNextmntDate).getTime() + (new Date(tmpNextmntDate).getTime() - new Date(tmpCutOffDate).getTime());;

                //const data = substationDetails;
                ////this.maintenanceService.UpdateScheduleAfterCompletion(data).then(
                ////  updateDSubstation => {
                ////    console.log('Substation updated:', JSON.stringify(updateDSubstation, null, 2));
                ////    return this.maintenanceService.DeletePlanMnt(data.id);
                ////    //this.showToast('Substation updated successfully', 'Close', {
                ////    //  duration: 3000,
                ////    //});
                ////  })
              }).catch(error => {
                this.showToast(this.locale_service.Locale.language.errorcode.maintenance[error.code], this.locale_service.Locale.language.common.failed,
                  {
                    duration: 4000
                  });
              })
          }
        }
      ).catch(error => {
        this.showToast(this.locale_service.Locale.language.errorcode.maintenance[error.code], this.locale_service.Locale.language.common.failed,
          {
            duration: 2000
          });
      });
    }

  }

  async approveMaintainance() {

    this.isXenApprovedButtonDisabled = true;
    let form_val = this.form.getRawValue()
    form_val.current_status = MaintenanceStatus.XenApproved;
    form_val.xen = this.dialogData.user_id;
    form_val.requests_approves.xen_maintainance_approved_datetime = Date.now();

    this.stepper.xen_maintainance_approved.datetime = form_val.requests_approves.xen_maintainance_approved_datetime;
    form_val = this.requestSLDCCode(form_val); // auto request SLDC code

    this.mntservice.UpdatePlanMnt(form_val).then(data => {
      if (data != null) {
        if (data.code && data.code != null) {
          this.showToast(this.locale_service.Locale.language.errorcode.maintenance[data.code], this.locale_service.Locale.language.common.failed,
            {
              duration: 2000
            });
        } else {
          this.form.patchValue({ current_status: data.current_status, requests_approves: data.requests_approves });
          this._rev = data._rev;
          this.currentStatusIndex(data.current_status);

          this.showToast("SLDC Code Requested Successfully", this.locale_service.Locale.language.common.ok,
            {
              duration: 2000
            });
        }
      } else {
        this.showToast(this.locale_service.Locale.language.errorcode.api, this.locale_service.Locale.language.common.failed,
          {
            duration: 2000
          });
      }
      this.isMainPending = false;
      this.InProgress = false;
    });
  }

  xenApprovalRequestMaintainance() {
    this.isXenApprovedButtonDisabled = true;
    let form_val = this.form.getRawValue();
    form_val.current_status = MaintenanceStatus.XenApprovalRequested;
    form_val.sse = this.dialogData.user_id;
    form_val.requests_approves.xen_maintainance_approval_request_datetime = Date.now();
    this.mntservice.UpdatePlanMnt(form_val).then(data => {
      if (data != null) {
        if (data.code && data.code != null) {
          this.showToast(this.locale_service.Locale.language.errorcode.maintenance[data.code], this.locale_service.Locale.language.common.failed,
            {
              duration: 2000
            });
        }

        else {
          this.form.patchValue({ current_status: data.current_status, requests_approves: data.requests_approves });
          this._rev = data._rev;
          this.currentStatusIndex(data.current_status);

          this.showToast("Maintainance Approval Requested Successfully", this.locale_service.Locale.language.common.ok,
            {
              duration: 2000
            });
        }


      } else {
        this.showToast(this.locale_service.Locale.language.errorcode.api, this.locale_service.Locale.language.common.failed,
          {
            duration: 2000
          });
      }
      this.InProgress = false;
    });


  }

  requestSLDCCode(form_val) {
    form_val.current_status = MaintenanceStatus.SLDCShutDownCodeRequested;
    form_val.requests_approves.sldc_shutdown_code_requested_datetime = form_val.requests_approves.xen_maintainance_approved_datetime;
    this.stepper.sldc_shutdown_code_requested.datetime = form_val.requests_approves.sldc_shutdown_code_requested_datetime;
    return form_val
  }
  async IssueSLDCCode(action: string) {
    let form_val = this.form.getRawValue();
    let same_bay_mnts = form_val.current_status != MaintenanceStatus.Complete ? this.dialogData.mnt_on_same_bay.filter(mnt => (action == 'sldc_restore') ? (mnt.current_status == MaintenanceStatus.SLDCChargingCodeRequested) : (mnt.current_status == MaintenanceStatus.SLDCShutDownCodeRequested)) : []
    let sldc_auto_code = false;
    if (same_bay_mnts.length > 0) {
      let res_mnt = await this.mntservice.GetPlanMntByIds(same_bay_mnts.map(mnt => mnt._id))
      if (res_mnt.code && res_mnt.code != null) {
        this.showToast(this.locale_service.Locale.language.errorcode.maintenance[res_mnt.code], this.locale_service.Locale.language.common.failed,
          {
            duration: 4000
          });
      } else { // update all mnts to SLDCShutDownCodeIssued / SLDCChargingCodeIssued
        let res_mnt_status_mod: any[] = (Object.values(res_mnt) as any[]).map(mnt => {
          if (action == 'sldc_shutdown') {
            mnt.current_status = MaintenanceStatus.SLDCShutDownCodeIssued;
            mnt.requests_approves.sldc_shutdown_code_issued_datetime = Date.now();
            mnt.sldcshutdowncode = form_val.sldcshutdowncode;
            mnt.sldc_auto_code = true;
            sldc_auto_code = true;
          } else if (action == 'sldc_restore') {
            mnt.current_status = MaintenanceStatus.SLDCChargingCodeIssued;
            mnt.requests_approves.sldc_charging_code_issued_datetime = Date.now();
            mnt.sldcchargingcode = form_val.sldcchargingcode;
          }

          return mnt;
        });
        let res_update = await this.mntservice.BulkUpdatePlanMnts(res_mnt_status_mod);
        if (res_update.code && res_update.code != null) {
          this.showToast(this.locale_service.Locale.language.errorcode.maintenance[res_update.code], this.locale_service.Locale.language.common.failed,
            {
              duration: 4000
            });
        }
      }
    }

    if (action == 'sldc_shutdown') {
      form_val.current_status = MaintenanceStatus.SLDCShutDownCodeIssued;
      form_val.requests_approves.sldc_shutdown_code_issued_datetime = Date.now();
      if (sldc_auto_code) // if one sldc_auto_code applies then it applies for all in this line, it self 
        form_val.sldc_auto_code = true;
      this.mntservice.UpdatePlanMnt(form_val).then(data => {
        if (data != null) {
          if (data.code && data.code != null) {
            this.showToast(this.locale_service.Locale.language.errorcode.maintenance[data.code], this.locale_service.Locale.language.common.failed,
              {
                duration: 4000
              });
          } else {
            this.form.patchValue({ current_status: data.current_status, requests_approves: data.requests_approves });
            this.stepper.sldc_shutdown_code_issued.datetime = data.requests_approves.sldc_shutdown_code_issued_datetime
            this.stepper.sldc_shutdown_code_issued.id = data.sldcshutdowncode
            this.showToast("SLDC Shutdown Code Issued Successfully", this.locale_service.Locale.language.common.ok,
              {
                duration: 4000
              });
          }
        } else {
          this.showToast(this.locale_service.Locale.language.errorcode.api, this.locale_service.Locale.language.common.failed,
            {
              duration: 4000
            });
        }
        this.currentStatusIndex(data.current_status)
        this.isSLDCCodeIssued = false;
        this.InProgress = false;
      });

    }
    else if (action == 'sldc_restore') {

      form_val.current_status = MaintenanceStatus.SLDCChargingCodeIssued;
      form_val.requests_approves.sldc_charging_code_issued_datetime = Date.now();

      this.mntservice.UpdatePlanMnt(form_val).then(data => {
        if (data != null) {
          if (data.code && data.code != null) {
            this.showToast(this.locale_service.Locale.language.errorcode.maintenance[data.code], this.locale_service.Locale.language.common.failed,
              {
                duration: 4000
              });
          } else {
            this.form.patchValue({ current_status: data.current_status, requests_approves: data.requests_approves });
            this.stepper.sldc_charging_code_issued.datetime = data.requests_approves.sldc_charging_code_issued_datetime
            this.stepper.sldc_charging_code_issued.id = data.sldcchargingcode
            this.showToast("SLDC Charging Code Issued Successfully", this.locale_service.Locale.language.common.ok,
              {
                duration: 4000
              });
          }
        } else {
          this.showToast(this.locale_service.Locale.language.errorcode.api, this.locale_service.Locale.language.common.failed,
            {
              duration: 4000
            });
        }
        this.currentStatusIndex(data.current_status)
        this.isSLDCCodeIssued = false;
        this.InProgress = false;
      });
    }

  }

  request_SLDC_restoration() {
    let form_val = this.form.getRawValue();

    form_val.current_status = MaintenanceStatus.SLDCChargingCodeRequested;
    form_val.requests_approves.sldc_charging_code_requested_datetime = Date.now();

    this.InProgress = true;
    this.mntservice.UpdatePlanMnt(form_val).then(data => {
      if (data != null) {
        if (data.code && data.code != null) {
          this.showToast(this.locale_service.Locale.language.errorcode.maintenance[data.code], this.locale_service.Locale.language.common.failed,
            {
              duration: 4000
            });
        } else {
          this.form.patchValue({ current_status: data.current_status, requests_approves: data.requests_approves });
          this._rev = data._rev;
          this.currentStatusIndex(data.current_status);
          this.stepper.sldc_charging_code_requested.datetime = data.requests_approves.sldc_charging_code_requested_datetime

          this.showToast(this.locale_service.Locale.language.project.maintenancesettings.snackbar.sldcchargingcoderequest, this.locale_service.Locale.language.common.ok,
            {
              duration: 4000
            });
        }
      } else {
        this.showToast(this.locale_service.Locale.language.errorcode.api, this.locale_service.Locale.language.common.failed,
          {
            duration: 4000
          });
      }
      this.InProgress = false;
      this.isSLDCPending = false;
    });
  }

  async saveUpdatedDateTime() {
    let form_val = this.form.getRawValue();
    form_val.shutdown_duration_history ??= [];
    form_val.shutdown_duration_history.push({ user: `${this.appservice.getUserName()} (${this.appservice.getLoginID()})`, time: form_val.plannedDate, time_range_value: form_val.time_range_value, time_range_type: form_val.time_range_type });
    form_val.requests_approves.planned_datetime = form_val.plannedDate;

    if (this.form.value.current_status == MaintenanceStatus.XenApprovalRequested) {
      this.InProgress = true;
      form_val.current_status = MaintenanceStatus.Planned;
      form_val.sse = this.dialogData.user_id;

      this.mntservice.UpdatePlanMnt(form_val).then(data => {
        if (data != null) {
          if (data.code && data.code != null) {
            this.showToast(this.locale_service.Locale.language.errorcode.maintenance[data.code], this.locale_service.Locale.language.common.failed,
              {
                duration: 4000
              });
          }

          else {
            this.form.patchValue({ current_status: data.current_status, requests_approves: data.requests_approves });
            this._rev = data._rev;
            this.currentStatusIndex(data.current_status);
            //this.stepper.xen_approval_requested.datetime = data.requests_approves.xen_maintainance_approval_request_datetime;
            //this.stepper.planned.datetime = this.form.value.plannedDate;
            this.stepper.planned.datetime = data.plannedDate;
            // Keep dialogData in sync so isFutureMaintenance / show_start_maintenance_btn
            // re-evaluate with the new date (otherwise the future-date banner and
            // hidden Start button don't refresh until the dialog is reopened).
            this.dialogData.device_details = data;
            this.show_start_maintenance_btn = this.showStartMntBtn();
            //this.showToast("Maintainance Approval Requested Successfully", this.locale_service.Locale.language.common.ok,
            this.showToast(this.locale_service.Locale.language.project.maintenancesettings.snackbar.updatesuccess, this.locale_service.Locale.language.common.ok,
              {
                duration: 4000
              });
          }


        } else {
          this.showToast(this.locale_service.Locale.language.errorcode.api, this.locale_service.Locale.language.common.failed,
            {
              duration: 4000
            });
        }
        this.InProgress = false;
      });
    }
    else if (this.form.value.current_status == MaintenanceStatus.SLDCShutDownCodeRequested) {
      this.InProgress = true;

      form_val.current_status = MaintenanceStatus.SLDCShutDownCodeRequested;

      this.mntservice.UpdatePlanMnt(form_val).then(data => {
        if (data != null) {
          if (data.code && data.code != null) {
            this.showToast(this.locale_service.Locale.language.errorcode.maintenance[data.code], this.locale_service.Locale.language.common.failed,
              {
                duration: 4000
              });
          }

          else {
            this.form.patchValue({ current_status: data.current_status, requests_approves: data.requests_approves });
            this._rev = data._rev;
            this.currentStatusIndex(data.current_status);
            this.stepper.planned.datetime = data.plannedDate;;
            this.showToast(this.locale_service.Locale.language.project.maintenancesettings.snackbar.updatesuccess, this.locale_service.Locale.language.common.ok,
              {
                duration: 4000
              });
          }


        } else {
          this.showToast(this.locale_service.Locale.language.errorcode.api, this.locale_service.Locale.language.common.failed,
            {
              duration: 4000
            });
        }
        this.InProgress = false;
      });
    }
    else /*if ((this.form.value.maintenance_type == 'Substation') || (this.form.value.maintenance_type == 'Bay') || (this.form.value.maintenance_type == 'TL'))*/ {
      this.InProgress = true;

      form_val.current_status = MaintenanceStatus.Planned;
      form_val.sse = this.dialogData.user_id;

      this.mntservice.UpdatePlanMnt(form_val).then(data => {
        if (data != null) {
          if (data.code && data.code != null) {
            this.showToast(this.locale_service.Locale.language.errorcode.maintenance[data.code], this.locale_service.Locale.language.common.failed,
              {
                duration: 4000
              });
          }

          else {
            this.form.patchValue({ current_status: data.current_status, requests_approves: data.requests_approves });
            this._rev = data._rev;
            this.currentStatusIndex(data.current_status);
            //this.stepper.xen_approval_requested.datetime = data.requests_approves.xen_maintainance_approval_request_datetime;
            //this.stepper.planned.datetime = this.form.value.plannedDate;
            this.stepper.planned.datetime = data.plannedDate;;
            this.dialogData.device_details = data;
            this.show_start_maintenance_btn = this.showStartMntBtn();
            //this.showToast("Maintainance Approval Requested Successfully", this.locale_service.Locale.language.common.ok,
            this.showToast(this.locale_service.Locale.language.project.maintenancesettings.snackbar.updatesuccess, this.locale_service.Locale.language.common.ok,
              {
                duration: 4000
              });
          }


        } else {
          this.showToast(this.locale_service.Locale.language.errorcode.api, this.locale_service.Locale.language.common.failed,
            {
              duration: 4000
            });
        }
        this.InProgress = false;
      });
    }
    this.isDateAndTimeChanged = false;
  }

  async dateClicked(node: any, index: any) {
    const modal_datetime = await this.modalController.create({
      component: DateTimeSelectionDlgComponent,
      componentProps: {
        dialogData: {
          selection_type: 'single_time',
          value: {
            range: {
              start: this.form.value.plannedDate,
              end: this.form.value.plannedDate,
            },
          },
          showSeconds: true,
          showMilli: false,
          isShowRange: false,
          restrictPastDate: true
        }
      }
    });
    await modal_datetime.present();
    const { data } = await modal_datetime.onDidDismiss();
    if (data && data.range && data.range.start) {

      this.form.get('plannedDate').setValue(data.range.end);
      //this.form.value.requests_approves.planned_datetime = data.range.end;
      //this.form.value.current_status = MaintenanceStatus.XenApprovalRequested;
      //this.form.value.sse = this.dialogData.user_id;

      //this.saveUpdatedDateTime();
      const selectedDateTime = new Date(data.range.start);

      //if (this.form.get('plannedDate')) {
      //  this.form.get('plannedDate').setValue(selectedDateTime);
      //} else {
      //  console.error('plannedDate form control is not available.');
      //}

      const dialogCloseTime = selectedDateTime.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });

      if (this.form.get('dialogCloseTime')) {
        this.form.get('dialogCloseTime').setValue(dialogCloseTime);
      } else {
        console.error('dialogCloseTime form control is not available.');
      }

      this.closeTime = dialogCloseTime;
      this.isDateAndTimeChanged = true;

    }
  }

  getSavedDate(date: number) {
    return this.appservice.dateToString(date, 5);
  }

  getSavedTime(date: number) {
    return new Date(date).toLocaleTimeString('en-GB', { hour12: false });
  }

  getScheduleSavedDate(date: number) {
    return this.appservice.dateToString(date, 5);
  }
  getSubLabel(datetime, id) {
    return (datetime ? this.appservice.dateToString(datetime, 1) : "") + " " + (id != '' ? "   |   #" + id : '');
  }
  async openSubStepDialog(sub_step: any, event: MouseEvent) {
    const alert = await this.alertController.create({
      header: sub_step?.value?.label ?? '',
      message: this.getSubLabel(sub_step?.value?.datetime, sub_step?.value?.id),
      buttons: ['OK']
    });
    await alert.present();
  }
  getSubStepDetails(sub_step: any) {
    return `${sub_step.value.label}\n\n${this.getSubLabel(sub_step.value.datetime, sub_step.value.id)}\n\n aaa`;
  }
  disableInputForUser(row): boolean {
    return !((row.value.managedby === 'je' && this.dialogData.type === 'je') || (row.value.managedby === 'mnp' && this.dialogData.type === 'mnp'));
  }


  applySearchFilter(eventOrTerm: Event | string) {
    const filterValue = (typeof eventOrTerm === 'string'
      ? eventOrTerm
      : ((eventOrTerm as Event).target as HTMLInputElement).value || ''
    ).trim().toLowerCase();

    // If user is currently viewing observations inside a parameter tab (clicked_device_type),
    // or the selected tab is an observations list / pending observations, apply to observation datasource.
    const isObservationClick = this.clicked_device_type && this.clicked_device_type.startsWith('observation');
    const obsListLabel = this.locale_service?.Locale?.language?.project?.maintenancesettings?.maintenancedlgtabs?.dialog_heading?.observations_list;
    const pendingObsLabel = this.locale_service?.Locale?.language?.project?.maintenancesettings?.maintenancedlgtabs?.dialog_heading?.pending_observations_list;
    const selectedIsObsList = this.selectedTabLabel === obsListLabel || this.selectedTabLabel === pendingObsLabel ||
      (this.selectedTabLabel && this.selectedTabLabel.toLowerCase().includes('observation')) ||
      this.selectedTabLabel === 'Pending Observations';

    // Track the observation search term separately — ion-list can't observe
    // MatTableDataSource.filteredData, so the template reads visibleObservations
    // which applies the predicate against this term.
    this.obsSearchTerm = filterValue;

    if (isObservationClick || selectedIsObsList) {
      if (this.filterObservationDatasource) {
        this.filterObservationDatasource.filter = filterValue;
      }
      return;
    }

    // If on Maintenance Parameter tab -> apply to maintenance parameter data sources
    if (this.selectedTabLabel === 'Maintenance Parameter') {
      if (Array.isArray(this.filteredmaintenanceDataSource)) {
        for (const grp of this.filteredmaintenanceDataSource) {
          if (grp && grp.ds) {
            grp.ds.filter = filterValue;
          }
        }
      }
      // also keep observations filter in sync if user typed search while not explicitly viewing obs
      if (this.filterObservationDatasource) {
        this.filterObservationDatasource.filter = filterValue;
      }
      return;
    }

    // If on M & P Parameter tab -> apply to M&P parameter data sources
    if (this.selectedTabLabel === 'M & P Parameter' || this.selectedTabLabel == 'Hotline Parameter') {
      if (Array.isArray(this.filteredmpDataSource)) {
        for (const grp of this.filteredmpDataSource) {
          if (grp && grp.ds) {
            grp.ds.filter = filterValue;
          }
        }
      }
      // keep observations filter in sync as well
      if (this.filterObservationDatasource) {
        this.filterObservationDatasource.filter = filterValue;
      }
      return;
    }

    // Fallback: apply search to any known datasources so the search input works in any area.
    if (Array.isArray(this.filteredmaintenanceDataSource)) {
      for (const grp of this.filteredmaintenanceDataSource) {
        if (grp && grp.ds) grp.ds.filter = filterValue;
      }
    }
    if (Array.isArray(this.filteredmpDataSource)) {
      for (const grp of this.filteredmpDataSource) {
        if (grp && grp.ds) grp.ds.filter = filterValue;
      }
    }
    if (this.filterObservationDatasource) {
      this.filterObservationDatasource.filter = filterValue;
    }
  }

  get visibleObservations(): any[] {
    const ds = this.filterObservationDatasource;
    const data = ds?.data ?? [];
    const term = (this.obsSearchTerm || '').trim().toLowerCase();
    if (!term || !ds?.filterPredicate) return data;
    return data.filter(row => ds.filterPredicate(row, term));
  }


  applyFilterOnActParams(event: Event) {
    this.applySearchFilter(event);
  }

  ngAfterViewInit() {
    if (this.tableft?.nativeElement && this.leftcontainer?.nativeElement) {
      this.tableft.nativeElement.style.minHeight = (this.leftcontainer.nativeElement.clientHeight - 50) + 'px';
    }
  }

  setFocusOnInput() {

    if (this.resolver.MaintenanceAccessRights.issue_sldc_code && this.form.value.current_status === MaintenanceStatus.SLDCShutDownCodeRequested) {

      this.sldcInput.nativeElement.focus();
    }

    if (this.resolver.MaintenanceAccessRights.issue_sldc_code && this.form.value.current_status === MaintenanceStatus.SLDCChargingCodeRequested) {

      this.sldcChargCode.nativeElement.focus();
    }
  }

  onTabChange(index: number) {
    let form_val = this.form.getRawValue();
    this.selectedTabIndex = index;
    this.resetSearchFilters();
    if (index == 0) {
      setTimeout(() => {
        this.setFocusOnInput();
      }, 200);
    }
    this.AddObservationButtonStatus();
  }

  onTabChangeName(ev: any) {
    this.resetSearchFilters();
    this.selectedTabLabel = ev.tab.textLabel;
    if (this.selectedTabLabel == 'Maintenance Parameter' || this.selectedTabLabel == 'M & P Parameter' || this.selectedTabLabel == 'Hotline Parameter') {
      this.computeParamButtonColors();
      // act param catagorize
      if (this.ifAnyMaintenanceParamExists || this.ifAnyMnPParamExists || this.ifAnyHotlineParamExists) {
        this.clicked_device_type = "";
        this.deviceTypeClicked();
      }
      if (!this.isActionBtnParameterDisabled)
        this.isActionBtnParameterDisabled = !this.form.value.requests_approves.in_progress_datetime;
      if (!this.isActionBtnMnpDisabled)
        this.isActionBtnMnpDisabled = !this.form.value.requests_approves.in_progress_datetime;
      if (!this.isActionBtnHotlineDisabled)
        this.isActionBtnHotlineDisabled = !this.form.value.requests_approves.in_progress_datetime;

      this.ifSubmitDisabled();
      // observation
      this.filterObservationDS();
    }
    if (this.selectedTabLabel == this.locale_service.Locale.language.project.maintenancesettings.maintenancedlgtabs.dialog_heading.observations_list) {
      this.clicked_device_type = 'observation';
      this.filterObservationDS();

    }
    if (this.selectedTabLabel == this.locale_service.Locale.language.project.maintenancesettings.maintenancedlgtabs.dialog_heading.pending_observations_list) {
      this.filterObservDlg();
    }

  }

  /*PTW Report Actions*/
  checkboxValidator(control: FormControl) {
    return control.value ? null : { required: true };
  }
  async rqstPTW(event) {
    let form_val = this.form.getRawValue(), changed_prop = {}, mnt_doc = event.maintenanceDetails, ptw_doc = event.ptwDetails;
    if (mnt_doc.shutdown_required && (mnt_doc.current_status == MaintenanceStatus.RestorationCompleted || mnt_doc.current_status == MaintenanceStatus.Complete)) {
      // fetching from db because on restoration 
      let mnt = await this.mntservice.GetPlanMntById(mnt_doc._id);
      if (mnt.code)
        this.showToast(this.locale_service.Locale.language.errorcode.maintenance[mnt.code], this.locale_service.Locale.language.common.failed,
          {
            duration: 4000
          });
      this.stepper.restoration_completed.datetime = mnt.requests_approves.restoration_completed_datetime;
      this.stepper.maintenance_complete.datetime = mnt.requests_approves.maintenance_complete_datetime;

      if (this.checkMaintenanceComplete() || mnt_doc.current_status == MaintenanceStatus.Complete) {

        if (!((this.hasMaintenance && mnt.requests_approves.parameter_approval_datetime == 0) || (this.hasMNP && mnt.requests_approves.mnp_parameter_datetime == 0))) {
          this.stepper.restoration_completed.datetime = Date.now();
        }

        this.stepper.maintenance_complete.datetime = Date.now();
        form_val.requests_approves.maintenance_complete_datetime = this.stepper.maintenance_complete.datetime;
        form_val.current_status = MaintenanceStatus.Complete;
        //this.updateCompleteMnt(form_val);
        console.log('%c Maintenance Completed!!', 'font-weight: bold; font-size: 50px;color: red; text-shadow: 3px 3px 0 rgb(217,31,38) , 6px 6px 0 rgb(226,91,14) , 9px 9px 0 rgb(245,221,8) , 12px 12px 0 rgb(5,148,68) , 15px 15px 0 rgb(2,135,206) , 18px 18px 0 rgb(4,77,145) , 21px 21px 0 rgb(42,21,113)');
        return;
      }
    }
    else if (mnt_doc.current_status == MaintenanceStatus.PTWRequested) {
      this._rev = mnt_doc._rev;
      this.stepper.ptw_requested.datetime = mnt_doc.requests_approves.ptw_requested_datetime;
      this.stepper.ptw_requested.label = "PTW Requested";
      this.isPTWRequested = false;
    }
    else if (mnt_doc.current_status == MaintenanceStatus.BCCertificateRequested) {
      this._rev = mnt_doc._rev;
      this.stepper.backcharging_requested.datetime = mnt_doc.requests_approves.backcharging_requested_datetime;
    }
    else if (mnt_doc.current_status == MaintenanceStatus.BCCancelCertificateRequested) {
      this.stepper.backcharging_cancel_requested.datetime = mnt_doc.requests_approves.backcharging_cancel_requested_datetime;
      this._rev = mnt_doc._rev;

    }
    //else if (mnt_doc.current_status == MaintenanceStatus.BCCertificateRequested) {
    //  this._rev = mnt_doc._rev;

    //  if (event.actionType && event.actionType === 'selfBackchargingIssued') {
    //    const bcDetails = event.maintenanceDetails?.backcharging_id || {};
    //    this.stepper["backcharging_issued"].sub_steps = Object.keys(bcDetails).map(path => {
    //      const value = bcDetails[path];
    //      return {
    //        label: path.split("/").slice(-2).join("/\n"),
    //        id: value ? value.split("|")[0].split("-").slice(-2).join("-") : "",
    //        datetime: value ? parseInt(value.split("|")[1]) : 0
    //      };
    //    });
    //  }

    //  else {
    //    this.stepper.backcharging_requested.datetime = mnt_doc.requests_approves.backcharging_requested_datetime;
    //  }
    //}
    //else if (mnt_doc.current_status == MaintenanceStatus.BCCancelCertificateRequested) {
    //  this._rev = mnt_doc._rev;
    //  if (event.actionType && event.actionType === 'selfBackchargingIssued') {
    //    const bcDetails = event.maintenanceDetails?.backcharging_id || {};
    //    this.stepper["backcharging_cancel_issued"].sub_steps = Object.keys(bcDetails).map(path => {
    //      const value = bcDetails[path];
    //      return {
    //        label: path.split("/").slice(-2).join("/\n"),
    //        id: value ? value.split("|")[0].split("-").slice(-2).join("-") : "",
    //        datetime: value ? parseInt(value.split("|")[1]) : 0
    //      };
    //    });
    //  }
    //  else {
    //    this.stepper.backcharging_cancel_requested.datetime = mnt_doc.requests_approves.backcharging_cancel_requested_datetime;
    //  }

    //}
    else if (mnt_doc.current_status == MaintenanceStatus.PTWCancelRequested) {
      this.stepper.ptw_cancellation_requested.datetime = ptw_doc.request_cancel_datetime;
      this._rev = mnt_doc._rev;
    }
    else if (mnt_doc.current_status == MaintenanceStatus.PTWCancellationIssued) {
      this._rev = mnt_doc._rev;
      this.stepper.ptw_cancellation_issued.datetime = ptw_doc.cancel_datetime;
      this.isPTWRequested = false;
      this.isPTWIssued = false;
    }
    else if (mnt_doc.current_status == MaintenanceStatus.InProgress) {
      if (ptw_doc) {
        let ids = this.form.get('ptw_ids').value;
        if (!ids.includes(ptw_doc._id)) {
          ids.push(ptw_doc._id)
        }
        changed_prop = { ptw_ids: ids };
        this._rev = mnt_doc._rev;
        this.stepper.ptw_issued.datetime = ptw_doc.issue_datetime;
        this.stepper.ptw_issued.id = ptw_doc.ptw_id;
        this.stepper.in_progress.datetime = ptw_doc.issue_datetime;
        this.isPTWIssued = false;
      }
    }
    else if (event.maintenanceDetails.current_status == MaintenanceStatus.SLDCChargingCodeRequested) {
      this._rev = event.maintenanceDetails._rev;
      this.stepper.ptw_cancellation_issued.datetime = event.ptwDetails.cancel_datetime;
      this.stepper.sldc_charging_code_requested.datetime = event.ptwDetails.cancel_datetime;
      this.isPTWIssued = false;
    }

    this.currentStatusIndex(mnt_doc.current_status);
    changed_prop = { ...changed_prop, current_status: mnt_doc.current_status, requests_approves: mnt_doc.requests_approves };
    this.form.patchValue(changed_prop);
    this.cdr.detectChanges();
  }


  deviceTypeClicked() {
    this.temp_catagorized_param_list = JSON.parse(JSON.stringify(this.catagorized_param_list));

    const tabType = this.selectedTabLabel === 'Maintenance Parameter' ? 'je' : (this.selectedTabLabel == 'Hotline Parameter' ? 'hotline' : 'mnp');

    for (let type in this.temp_catagorized_param_list) { // Remove types without relevant parameters
      let all_names_without_tab_type = true;

      for (let name in this.temp_catagorized_param_list[type]) {
        const has_tab_type = this.temp_catagorized_param_list[type][name]
          .some(param => param.managedby === tabType);

        if (has_tab_type) {
          all_names_without_tab_type = false;
          break;
        }
      }

      if (all_names_without_tab_type) {
        delete this.temp_catagorized_param_list[type];
      }
    }
    if (!this.clicked_device_type) // Set clicked_device_type to the first available key first time only
      this.clicked_device_type = Object.keys(this.temp_catagorized_param_list).sort()[0] || null;


    if (this.clicked_device_type) {
      const filteredData = Object.entries(this.temp_catagorized_param_list[this.clicked_device_type])
        .map(([name, ds]) => ({
          name,
          ds: new MatTableDataSource(
            (ds as any[])
              .filter(param => param.managedby === tabType)
              .map(row => {
                row.display_min = row.reqminmax
                  ? ((row.valuetype == "Float" || row.valuetype == "Number")
                    ? (row.valuetype == "Float"
                      ? (row.calculatedmin % 1 === 0
                        ? row.calculatedmin.toFixed(2)
                        : row.calculatedmin)
                      : row.calculatedmin)
                    : 'NA')
                  : 'NA';
                row.display_max = row.reqminmax
                  ? ((row.valuetype == "Float" || row.valuetype == "Number")
                    ? (row.valuetype == "Float"
                      ? (row.calculatedmax % 1 === 0
                        ? row.calculatedmax.toFixed(2)
                        : row.calculatedmax)
                      : row.calculatedmax)
                    : 'NA')
                  : 'NA';

                if (row.display_min == "-Infinity") row.display_min = "---";
                if (row.display_max == "Infinity") row.display_max = "---";

                return row;
              })
              .sort((a, b) => (a.value === null || a.value === "" ? 1 : b.value === null || b.value === "" ? -1 : 0))
          )
        }))
        .filter(param => param.ds.data.length > 0);

      // set predicate for each group datasource (search will now only check visible param fields)
      filteredData.forEach(g => this.setParameterPredicate(g.ds));

      if (this.selectedTabLabel === 'Maintenance Parameter') {
        this.filteredmaintenanceDataSource = filteredData;
      }
      //else if (this.selectedTabLabel === 'Hotline Parameter') {
      //  this.filteredhotlineDataSource = filteredData;
      //}
      else { // includes 'Hotline Parameter' & 'M & P Parameter'
        this.filteredmpDataSource = filteredData;
      }
    }
  }


  isApproveRevertDisabled() {
    let formval = this.form.value
    if (this.selectedTabLabel == 'M & P Parameter' || this.selectedTabLabel === 'Hotline Parameter') {
      return this.isCancelBtnMnpDisabled || formval.requests_approves.mnp_parameter_datetime === 0 || formval.requests_approves.mnp_parameter_approval_datetime != 0
    }
    else if (this.selectedTabLabel == 'Maintenance Parameter') {
      return this.isCancelBtnParameterDisabled || formval.requests_approves.maintenance_parameter_datetime === 0 || formval.requests_approves.parameter_approval_datetime != 0
    }
  }

  computeParamButtonColors(clicked_param_head_start: string = null) {
    for (const deviceType in this.catagorized_param_list) {
      if (clicked_param_head_start != null && clicked_param_head_start != deviceType)
        continue;

      const template_names = this.catagorized_param_list[deviceType];
      let status = true;

      for (const template_name in template_names) {
        let params = template_names[template_name]

        let list = [];

        if (this.selectedTabLabel === 'Maintenance Parameter') {
          list = params.filter(p => p.managedby === 'je' || p.managedby === 'je_tl');
        }
        else if (this.selectedTabLabel === 'M & P Parameter' || this.selectedTabLabel === 'Hotline Parameter') {
          list = params.filter(p => p.managedby === 'mnp' || p.managedby === 'hotline');
        }
        if (list.length === 0) {
          continue;
        }

        // If no params OR any param is empty → fail immediately
        if (
          !list.every(p => p.value !== null && p.value !== "")
        ) {
          status = false;
          break; // no need to check further
        }
      }
      this.buttonColors[deviceType] = status;
    }
  }

  isObservDisabled(row: any): boolean {
    if (
      row.reqminmax &&
      (row.valuetype === 'Float' || row.valuetype === 'Number') &&
      row.value !== '' &&
      row.value !== 'NA' &&
      row.value !== 'NaN' &&
      (row.value > row.calculatedmax || row.value < row.calculatedmin)
    ) {
      return true;
    }
    return false;
  }

  paramInputChange(ev_value: any, row: any, isCheckbox = false) { // manually add param input value inside formcontrol param
    this.isFormDirty = true;
    let act_params = this.form.get("activity_parameters");
    let mnt = [], mnp = [];
    for (let param of act_params.value) {
      if (param._id == row._id) {

        if (isCheckbox && ev_value.checked != null) {
          param.observ = ev_value.checked
          row.observ = ev_value.checked;
          row.remarks = ev_value.checked ? ev_value.remarks : "";
          param.remarks = row.remarks;
        }
        else {
          const calculatedmin = param.calculatedmin === '---' ? Number.MIN_SAFE_INTEGER : Number(param.calculatedmin);
          const calculatedmax = param.calculatedmax === '---' ? Number.MAX_SAFE_INTEGER : Number(param.calculatedmax);

          if (param.reqminmax && (param.valuetype == "Float" || param.valuetype == "Number") && (ev_value !== '' && ev_value !== 'NA' && ev_value !== 'NaN' && (ev_value > calculatedmax || ev_value < calculatedmin))) {
            param.observ = true;
            row.observ = true;
            row.remarks = "Out of Range"
            param.remarks = row.remarks;
            param.value = ev_value;

          }
          else if (param.reqminmax && (param.valuetype == "Float" || param.valuetype == "Number")) {
            param.observ = false;
            row.observ = false;
            row.remarks = '';
            param.remarks = row.remarks;
            param.value = ev_value;

          }
          else
            param.value = ev_value;

          const template_names = this.catagorized_param_list[this.clicked_device_type];
          for (const template_name in template_names) {
            for (const cat_parm of template_names[template_name]) {
              if (cat_parm._id == row._id) {
                cat_parm.value = ev_value;
              }
            }
          }
        }


      }
      if (param.managedby === 'mnp' || param.managedby === 'hotline')
        mnp.push(param)

      else if (param.managedby === 'je')
        mnt.push(param)

    }
    this.disableSubmit(mnt, mnp);

    act_params.setValue(act_params.value);
    //act_params.setValue(act_params.remarks);
    this.computeParamButtonColors(this.clicked_device_type);
    this.cdr.detectChanges();
  }

  patchRemarksValue(remarksValue: string, row: any): void {
    this.isFormDirty = true;
    const act_params = this.form.get('activity_parameters');
    if (act_params && act_params.value) {
      const params = act_params.value;
      for (const param of params) {
        if (param._id === row._id) {
          param.remarks = remarksValue;
          break;
        }
      }
      act_params.setValue(params);
      this.cdr.detectChanges(); // Ensure the changes are reflected
    }
  }

  ifSubmitDisabled() {
    let act_params = this.form.value.activity_parameters;
    let mnt = [], mnp = [];

    for (let param of act_params) {
      if (param.managedby === 'mnp' || param.managedby === 'hotline')
        mnp.push(param)

      else if (param.managedby === 'je')
        mnt.push(param)
    }
    this.disableSubmit(mnt, mnp);
  }
  //ifSubmitDisabled() {
  //  let act_params = this.form.value.activity_parameters;
  //  //let mnt = [], mnp = [];
  //  const mntNonNull = [], mntNull = [], mnpNonNull = [], mnpNull = [];

  //  for (let param of act_params) {
  //    if (param.managedby === 'mnp')
  //      (param.value !== null ? mnpNonNull : mnpNull).push(param);

  //    else if (param.managedby === 'je')
  //      (param.value !== null ? mntNonNull : mntNull).push(param);
  //  }
  //  const mnt = [...mntNonNull, ...mntNull];
  //  const mnp = [...mnpNonNull, ...mnpNull];
  //  //mnt = [...mnt.filter(item => item.value !== null), ...mnt.filter(item => item.value == null)]
  //  //mnp = [...mnp.filter(item => item.value !== null), ...mnp.filter(item => item.value == null)]
  //  this.disableSubmit(mnt, mnp);
  //}

  disableSubmit(mnt: any, mnp: any) {
    // submit btn disable 
    if (this.selectedTabLabel == 'Maintenance Parameter') {
      this.isSubmitDisabled = mnt.some(device_name => device_name.value == null || device_name.value === "")
    }
    else if (this.selectedTabLabel == 'M & P Parameter' || this.selectedTabLabel == 'Hotline Parameter') {
      this.isSubmitDisabled = mnp.some(device_name => device_name.value == null || device_name.value === "")
    }
  }

  convertToTitleCase(key: string) {
    return key
      .replace(/_/g, ' ')
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  async addPatrollingRow() {

    let tower_range = this.form.value.maintenance_list.tower_range;
    let min = tower_range.split("-")[0];
    let max = tower_range.split("-")[1];

    const modal = await this.modalController.create({
      component: AddUpdatePatrollingInfoComponent,
      componentProps: {
        dialogData: {
          min: min,
          max: max,
          ds: this.patrolling_details
        }
      }
    });

    await modal.present();

    const { data } = await modal.onDidDismiss();

    if (data != null) {
      if (!this.patrolling_details)
        this.patrolling_details = [];

      this.patrolling_details.push(data);
      this.patrolling_details = this.patrolling_details
        .slice()
        .sort((a, b) => a.tower_start - b.tower_start);
      this.form.patchValue({
        patrolling_details: this.patrolling_details
      });

      this.isPatrollingSubmitDisabled = false;
      // Recompute so the stale "No Towers has been assigned" text (from the
      // initial empty-list computation) is replaced by the current
      // unassigned-range summary. Without this the warning only refreshes on
      // SUBMIT via savePatrolling.
      this.patrolling_warning = this.mntservice.unassignedTLTowers(this.patrolling_details, tower_range);

      this.cdr.detectChanges(); // important for mobile
    }
  }

  async updatePatrollingRow(row: any, index: number) {

    let tower_range = this.form.value.maintenance_list.tower_range;
    let min = tower_range.split("-")[0];
    let max = tower_range.split("-")[1];

    const modal = await this.modalController.create({
      component: AddUpdatePatrollingInfoComponent,
      componentProps: {
        dialogData: {
          obj: row,
          index: index,
          min: min,
          max: max,
          ds: this.patrolling_details
        }
      }
    });

    await modal.present();

    const { data } = await modal.onDidDismiss();

    if (data != null) {
      this.patrolling_details.splice(index, 1, data);

      this.patrolling_details = this.patrolling_details
        .slice()
        .sort((a, b) => a.tower_start - b.tower_start);
      this.form.patchValue({
        patrolling_details: this.patrolling_details
      });
      this.isPatrollingSubmitDisabled = false;
      // Keep the warning in sync with the just-edited list — see addPatrollingRow.
      this.patrolling_warning = this.mntservice.unassignedTLTowers(this.patrolling_details, tower_range);

      this.cdr.detectChanges();
    }
  }

  async deletePatrollingRow(index: number) {
    const modal_delpatrol = await this.modalController.create({
      component: ConfirmationDlgComponent,
      componentProps: {
        dialogData: {
          Question: this.locale_service.Locale.language.project.maintenancesettings.confirmation.delete,
          YesText: this.locale_service.Locale.language.common.yes,
          NoText: this.locale_service.Locale.language.common.no
        }
      }
    });
    await modal_delpatrol.present();
    const { data } = await modal_delpatrol.onDidDismiss();
    if (data) {
      this.patrolling_details.splice(index, 1);
      this.patrolling_details = this.patrolling_details.slice().sort((a, b) => a.tower_start - b.tower_start);
      this.isPatrollingSubmitDisabled = false;
      // Keep the warning in sync with the shrunken list — see addPatrollingRow.
      const tower_range = this.form.value.maintenance_list?.tower_range;
      if (tower_range) {
        this.patrolling_warning = this.mntservice.unassignedTLTowers(this.patrolling_details, tower_range);
      }
    }
  }

  patrollingStatusChange() {
    let formval = this.form.getRawValue();

    if (this.patrolling_details.some(pat => pat.status == 'In Progress')) {
      formval.requests_approves.patrolling_completed_datetime = 0;
      this.form.get("requests_approves").setValue(formval.requests_approves);
    }
    this.isPatrollingSubmitDisabled = false;
  }

  SSMntShouldComplete(formData: any) {

    if (formData.requests_approves.parameter_approval_datetime != 0 && (this.ifAnyMnPParamExists ? formData.requests_approves.mnp_parameter_datetime != 0 : true)) {
      formData.requests_approves.maintenance_complete_datetime = formData.requests_approves.parameter_approval_datetime;
      this.stepper.maintenance_complete.datetime = formData.requests_approves.parameter_approval_datetime;
      formData.current_status = MaintenanceStatus.Complete;
    }
    return formData;
  }

  TLMntShouldComplete(formval: any) {
    if (formval.maintenance_list.template.scheduled_patrolling == "scheduled" && formval.requests_approves.parameter_approval_datetime) {
      formval.requests_approves.parameter_approval_datetime = formval.requests_approves.parameter_approval_datetime
      this.stepper.parameter_approval.datetime = formval.requests_approves.parameter_approval_datetime;
      formval.requests_approves.maintenance_complete_datetime = formval.requests_approves.patrolling_completed_datetime
      this.stepper.maintenance_complete.datetime = formval.requests_approves.patrolling_completed_datetime;
      formval.current_status = MaintenanceStatus.Complete;
    }
    else if (formval.maintenance_list.template.scheduled_patrolling == "patrolling") {
      if (this.patrolling_details && this.patrolling_details.some(pat => pat.status == 'In Progress')) {
        formval.requests_approves.patrolling_completed_datetime = 0;
      } else {
        const total_towers = parseInt(formval.maintenance_list.tower_range.split("-")[1]) - parseInt(formval.maintenance_list.tower_range.split("-")[0]) + 1;
        if (this.patrolling_details.reduce((total, cur) => { // if all status completed check for all tower ranges added or not
          return total + (cur.tower_end - cur.tower_start + 1);
        }, 0) == total_towers) {
          formval.requests_approves.patrolling_completed_datetime = Date.now();
          formval.current_status = MaintenanceStatus.PatrollingCompleted;
          this.isPatrollingFilled = false;

        } else {
          formval.requests_approves.patrolling_completed_datetime = 0;
        }
      }
      this.stepper['patrolling_completed'].datetime = formval.requests_approves.patrolling_completed_datetime;
    }
    return formval;
  }

  manualCompleteMaintenance() {
    this.InProgress = true;
    let formval = this.form.getRawValue();

    formval.requests_approves.maintenance_complete_datetime = Date.now();
    this.stepper.maintenance_complete.datetime = formval.requests_approves.maintenance_complete_datetime;
    formval.current_status = MaintenanceStatus.Complete;

    this.mntservice.UpdatePlanMnt(formval).then(data => {
      if (data != null) {
        if (data.code && data.code != null) {
          this.showToast(this.locale_service.Locale.language.errorcode.maintenance[data.code], this.locale_service.Locale.language.common.failed,
            {
              duration: 4000
            });
        } else {
          this.form.patchValue({ current_status: data.current_status, requests_approves: data.requests_approves });
          this.currentStatusIndex(data.current_status);
          // Sync isCompleteDashboard with the new status so downstream checks
          // (isAddObservationBtndisabled, edit-observation gates, etc.) see the
          // completion immediately without a tab switch.
          if (data.current_status === MaintenanceStatus.Complete
              || data.current_status === MaintenanceStatus.Cancel
              || data.current_status === MaintenanceStatus.TLPartiallyComplete) {
            this.isCompleteDashboard = true;
          }
          this.AddObservationButtonStatus();
          // manualCompleteMaintenance sets status to MaintenanceStatus.Complete for
          // any maintenance type (bay/substation/equipment/TL). The correct toast
          // is `maintenancecompleted`; the previous use of `patrollingcompleted`
          // was a copy-paste from savePatrolling and produced "Patrolling
          // Completed Successfully" even for non-patrolling maintenance. Matches
          // ClientApp maintenance-details-dlg.component.ts:4187.
          this.showToast(this.locale_service.Locale.language.project.maintenancesettings.snackbar.maintenancecompleted, this.locale_service.Locale.language.common.ok,
            {
              duration: 4000
            });
        }
      } else {
        this.showToast(this.locale_service.Locale.language.errorcode.api, this.locale_service.Locale.language.common.failed,
          {
            duration: 4000
          });
      }
      this.InProgress = false;
    });
  }

  savePatrolling() {
    this.InProgress = true;

    let formval = this.form.getRawValue();
    formval = this.TLMntShouldComplete(formval); // patrolling completes on btn by aetl

    formval.patrolling_details = this.patrolling_details;
    this.mntservice.UpdatePlanMnt(formval).then(data => {
      if (data != null) {
        if (data.code && data.code != null) {
          this.showToast(this.locale_service.Locale.language.errorcode.maintenance[data.code], this.locale_service.Locale.language.common.failed,
            {
              duration: 4000
            });
        } else {
          this.showToast(this.locale_service.Locale.language.project.maintenancesettings.snackbar.patrollingsaved, this.locale_service.Locale.language.common.ok,
            {
              duration: 4000
            });
          this.form.patchValue({ current_status: data.current_status, requests_approves: data.requests_approves, patrolling_details: data.patrolling_details });
          this._rev = data._rev;
          if (data.requests_approves.patrolling_completed_datetime > 0)
            this.isObservationAndCompleteAccess = true;
          this.currentStatusIndex(data.current_status);
          this.isPatrollingSubmitDisabled = true;
          // Recompute the Add-Observation button states now that current_status
          // may have flipped to PatrollingCompleted. Without this the flag only
          // refreshes on the next tab switch, so a user sitting on the Patrolling
          // tab would see a stale-enabled Add button on Observations List.
          this.AddObservationButtonStatus();
          this.patrolling_warning = this.mntservice.unassignedTLTowers(data.patrolling_details, data.maintenance_list.tower_range);
          if (data.current_status == MaintenanceStatus.Complete) {
            this.showToast(this.locale_service.Locale.language.project.maintenancesettings.snackbar.maintenancecompleted, this.locale_service.Locale.language.common.ok,
              {
                duration: 4000
              });
          }
        }
      } else {
        this.showToast(this.locale_service.Locale.language.errorcode.api, this.locale_service.Locale.language.common.failed,
          {
            duration: 4000
          });
      }
      this.InProgress = false;
    });
  }

  openObservDlg() {
    this.clicked_device_type = 'observation';
    let type = "";

    if (this.form.value.maintenance_type == 'TL') {
      type = "je_tl";

    } else {
      if (this.selectedTabLabel == 'Maintenance Parameter') {
        type = "je"
      }
      else if (this.selectedTabLabel == 'M & P Parameter') {
        type = "mnp";
      }
    }
    this.filterObservationDS();
    this.AddObservationButtonStatus();
    /*    if (!this.form.value.maintenance_list.template._id.startsWith('pov'))
          this.filterObservationDatasource.data = this.observationDatasource.data.filter(value => type === value.observationtype)
        else
          this.filterObservationDatasource.data = this.observationDatasource.data.slice();*/
    //console.log(this.filterObservationDatasource.data.length);
  }
  getAllPendingObservations() {
    this.pendingObservationDatasource = this.dialogData?.obdata?.filter(rows => (rows.device_type == "Bay" && rows.observationtype == 'je_tl') ? rows.device_name.split('/').pop() === this.form.value.maintenance_list.device_master_id : rows.device_name === this.form.value.device_name && rows.status !== 'close');
    this.linkedObservationCount = this.pendingObservationDatasource?.length ?? 0;
    this.tlPendingObservationCount = this.dialogData?.obdata?.filter(rows => rows.device_name.split('/').pop() === this.form.value?.maintenance_list?.device_master_id && rows.status != 'close').length;
  }
  //All the observations that are linked with the same path that are not closed will be shown in the table
  filterObservDlg() {
    let type = "";
    this.clicked_device_type = 'observation_filter';
    if (this.form.value.maintenance_type == 'TL') {
      type = "je_tl";

    } else {
      if (this.selectedTabLabel == 'Maintenance Parameter') {
        type = "je"
      }
      else if (this.selectedTabLabel == 'M & P Parameter') {
        type = "mnp"
      }
    }
    this.AddObservationButtonStatus();
    if (this.dialogData.dashboardType && this.dialogData.dashboardType == 'complete') {
    }
    else
      this.filterObservationDatasource.data = this.dialogData.obdata.filter(rows => (this.form.value.maintenance_type == "Bay" && rows.observationtype == 'je_tl') ? rows.device_name.split('/').pop() === this.form.value.maintenance_list.device_master_id : rows.device_name === this.form.value.device_name && rows.status !== 'close');

    this.setObservationPredicate(this.filterObservationDatasource);
    this.getAllPendingObservations();
  }
  filterObservationDS() {
    if (this.maintenanceDetails.maintenance_type != "TL") {
      if (this.selectedTabLabel == 'Maintenance Parameter')
        if (this.dialogData.device_details.maintenance_list.template._id.startsWith('ptt') && this.dialogData.device_details.maintenance_type === 'Bay')
          this.filterObservationDatasource.data = this.observationDatasource.data.filter(obs => this.resolver.isJEObservation(obs.observationtype) || obs.observationtype === 'je_tl');
        else
          this.filterObservationDatasource.data = this.observationDatasource.data.filter(obs => this.resolver.isJEObservation(obs.observationtype));
      else if (this.selectedTabLabel == 'M & P Parameter' || this.selectedTabLabel == 'Hotline Parameter')
        this.filterObservationDatasource.data = this.observationDatasource.data.filter(obs => obs.observationtype === 'mnp' || obs.observationtype === 'hotline');
      else if (this.selectedTabLabel == this.locale_service.Locale.language.project.maintenancesettings.maintenancedlgtabs.dialog_heading.observations_list) {
        this.filterObservationDatasource.data = this.observationDatasource.data.slice();
      }

    }
    else
      this.filterObservationDatasource.data = this.observationDatasource.data.filter(obs => obs.observationtype === 'je_tl');
    this.setObservationPredicate(this.filterObservationDatasource);
  }

  get mnpObservationCount(): number {
    return this.observationDatasource?.data
      ? this.observationDatasource.data.filter(obs => obs.observationtype === 'mnp' || obs.observationtype === 'hotline').length
      : 0;
  };

  get jeObservationCount(): number {
    return this.observationDatasource?.data
      ? this.observationDatasource.data.filter(obs => this.resolver.isJEObservation(obs.observationtype) || obs.observationtype === 'je_tl').length
      : 0;
  }
  
  // ADD OBSERVATION - user role will be added according to usertype and dashboard type.
  async addObRow() {
    let type = "";
    if (this.form.value.maintenance_type == 'TL') {
      type = "je_tl";
    } else {
      if (this.selectedTabLabel == 'Maintenance Parameter') {
        if (this.resolver?.MaintenanceAccessRights?.maintenence_input_save_submit)
          type = "je"
        else if (this.resolver?.MaintenanceAccessRights?.tl_maintenance_parameter_input_save_submit)
          type = "je_tl";
      }
      else if (this.selectedTabLabel == 'M & P Parameter') {
        type = "mnp"
      }
      else if (this.selectedTabLabel == 'Hotline Parameter') {
        type = "hotline"
      }
      else if (this.selectedTabLabel == this.locale_service.Locale.language.project.maintenancesettings.maintenancedlgtabs.dialog_heading.observations_list) {
        if (this.resolver?.MaintenanceAccessRights?.maintenence_input_save_submit)
          type = "je"
        else if (this.resolver?.MaintenanceAccessRights?.mnp_input_save_submit)
          type = "mnp";
        else if (this.resolver?.MaintenanceAccessRights?.tl_maintenance_parameter_input_save_submit)
          type = "je_tl";
        else if (this.resolver?.MaintenanceAccessRights?.hotline_input_save_submit)
          type = "hotline";
        else
          type = "ob"
      }
    }
    const maintenanceNames = this.form.value.maintenance_list?.associated_eq_maintenance?.filter(item => item.template).map(item => item.template.equipment_name);
    const modal_add = await this.modalController.create({
      component: ObservationDlgComponent,
      componentProps: {
        dialogData: { _id: this.maintenanceDetails._id, observationtype: type, device_name: this.maintenanceDetails.device_name, device_type: this.dialogData.device_details.maintenance_type, dlg: true, maintenance_type: this.dialogData.device_details.maintenance_list.template.maintenancename, tower_range: this.form.value.maintenance_list.tower_range, associated_eq: maintenanceNames, maintenanceDetails: this.maintenanceDetails }
      }
    });
    await modal_add.present();
    const { data } = await modal_add.onDidDismiss();
    if (data != null) {
      this._rev = data.p_rev;
      this.observationDatasource.data.push(data);
      this.observationDatasource.data = this.observationDatasource.data.slice();
      this.dialogData.obdata.push(data);
      this.filterObservationDS();
      if (data.observationtype != 'je_tl')
        this.linkedObservationCount += 1;
      else
        this.tlPendingObservationCount += 1;
    }

  }

  async viewObRow(row, index) {
    const maintenanceNames = this.form.value.maintenance_list?.associated_eq_maintenance?.filter(item => item.template).map(item => item.template.equipment_name);
    const data = await this.mntservice.GetObservationById(row._id);
    if (data.code && data.code != null) {
      this.showToast(this.locale_service.Locale.language.errorcode.maintenance[data.code], this.locale_service.Locale.language.common.failed, { duration: 4000 });
      return;
    }
    const modal_view = await this.modalController.create({
      component: ObservationDlgComponent,
      componentProps: {
        dialogData: { observationtype: data.observationtype, observationDetails: data, index: index, dlg: true, device_type: data.device_type, readonly: true, associated_eq: maintenanceNames }
      }
    });
    await modal_view.present();
  }
  async updateObRow(row: any, index: any, disable = false) {
    const type = row.observationtype;
    const data = await this.mntservice.GetObservationById(row._id);
    if (data.code && data.code != null) {
      this.showToast(this.locale_service.Locale.language.errorcode.maintenance[data.code], this.locale_service.Locale.language.common.failed, { duration: 4000 });
      return;
    }
    const maintenanceNames = this.form.value.maintenance_list?.associated_eq_maintenance?.filter(item => item.template).map(item => item.template.equipment_name);
    const modal_update = await this.modalController.create({
      component: ObservationDlgComponent,
      componentProps: {
        dialogData: {
          maintenance_id: this.maintenanceDetails._id,
          operated_other_observation: this.maintenanceDetails._id != data.connected_maintenance_id,
          observationDetails: data, index: index, device_name: this.maintenanceDetails.device_name, observationtype: type, dlg: true, disable: true, device_type: data.device_type, associated_eq: maintenanceNames
        }
      }
    });
    await modal_update.present();
    const { data: result } = await modal_update.onDidDismiss();
    if (result != null) {
      if (result.connected_maintenance_id != this.dialogData.device_details._id) {
        this.dialogData.device_details.operated_observations_list.push(result._id);
        this.form.patchValue({ operated_observations_list: [...this.dialogData.device_details.operated_observations_list] });
      }
      let new_index = this.observationDatasource.data.findIndex((obj: any) => obj._id === result._id);
      this._rev = result.p_rev;
      let dialogDataIndex = this.dialogData.obdata.findIndex((obj: any) => obj._id === result._id);
      if (dialogDataIndex !== -1) this.dialogData.obdata.splice(dialogDataIndex, 1, result);
      result.disable_button = disable;
      if (new_index !== -1) this.observationDatasource.data.splice(new_index, 1, result);
      this.observationDatasource.data = this.observationDatasource.data.slice();
      this.filterObservationDS();
      if (this.clicked_device_type === 'observation_filter') this.filterObservDlg();
      this.getAllPendingObservations();
    }
  }

  async deleteObRow(row, index: number) {
    const modal_delob = await this.modalController.create({
      component: ConfirmationDlgComponent,
      componentProps: {
        dialogData: {
          Question: this.locale_service.Locale.language.project.maintenancesettings.confirmation.observationdelete,
          YesText: this.locale_service.Locale.language.common.yes,
          NoText: this.locale_service.Locale.language.common.no
        }
      }
    });
    await modal_delob.present();
    const { data } = await modal_delob.onDidDismiss();
    if (data) {
      let new_index = this.observationDatasource.data.findIndex(obj => obj._id === row._id);
      this.InProgress = true;
      this.mntservice.DeleteObservationById(row._id, row._rev, row.connected_maintenance_id, row.connected_parameter_id).then(data => {
        if (data.code && data.code != null) {
          this.showToast(this.locale_service.Locale.language.errorcode.maintenance[data.code], this.locale_service.Locale.language.common.failed,
            {
              duration: 4000
            });
        }
        else {
          this.showToast("Observation Deleted Successfully", this.locale_service.Locale.language.common.ok,
            {
              duration: 4000
            });
          this._rev = data._rev;
          this.observationDatasource.data.splice(new_index, 1);
          this.observationDatasource.data = this.observationDatasource.data.slice();

          this.filterObservationDS();
          this.dialogData.obdata = this.dialogData.obdata.filter(rows => rows._id !== row._id);
          if (row.observationtype != 'je_tl')
            this.linkedObservationCount -= 1;
          else
            this.tlPendingObservationCount -= 1;
          this.cdr.detectChanges();
        }
        this.InProgress = false;
      })
    }
  }
  checkMaintenanceComplete() {
    const stepper: any[] = Object.keys(this.stepper);
    if (!stepper.some(step => step != "maintenance_complete" && !this.stepper[step].hidden && this.stepper[step].datetime == 0)) {
      this.isCompleteDashboard = true;
      return true;
    }
    return false;
  }

  async updateCompleteMnt(formData) {
    this.InProgress = true;
    let data = await this.mntservice.UpdatePlanMnt(formData);
    this.InProgress = false;
    if (data.code && data.code != null)
      this.showToast(this.locale_service.Locale.language.errorcode.maintenance[data.code], this.locale_service.Locale.language.common.failed,
        {
          duration: 4000
        });
    else {
      this.form.patchValue({ current_status: data.current_status, requests_approves: data.requests_approves });
      this._rev = data._rev;
      this.currentStatusIndex(data.current_status);
      this.showToast(this.locale_service.Locale.language.project.maintenancesettings.snackbar.maintenancecompleted, this.locale_service.Locale.language.common.ok,
        {
          duration: 4000
        });

    }
  }

  closeDialog(): void {
    this.ptwIntervalDestroy$.next();
    this.ptwIntervalDestroy$.complete();
    this.modalController.dismiss();
  }

  ngOnDestroy(): void {
    this.breakpointSub?.unsubscribe();
    if (this.updateDlgSubscription) {
      this.updateDlgSubscription.unsubscribe();
    }
    this.ptwIntervalDestroy$.next();
    this.ptwIntervalDestroy$.complete();
  }

  get shouldShowCompleteMaintenanceButton(): boolean {
    const form_val = this.form.value;
    if (this.dialogData.device_details?.maintenance_type === 'TL') { //Check for mnt based on criteria
      if (this.dialogData.device_details?.maintenance_list.template._id.startsWith("pov-") && !this.dialogData.device_details.maintenance_list.template.reqshutdown && this.dialogData.device_details.requests_approves.in_progress_datetime != 0) {
        return true;
      }
      else {
        let mntBasedOn = this.dialogData.device_details.maintenance_list.template.scheduled_patrolling;
        return this.resolver?.MaintenanceAccessRights?.tl_patrolling_complete_maintenance_button &&
          (
            //(mntBasedOn === "scheduled"
            //  ? (form_val?.requests_approves.in_progress_datetime !== 0 && form_val?.requests_approves?.maintenance_complete_datetime === 0)
            //:
            (form_val?.requests_approves?.patrolling_completed_datetime !== 0 && form_val?.requests_approves?.maintenance_complete_datetime === 0)
          );
      }

    }
    else if (this.maintenanceDetails?.maintenance_type === 'Bay' && this.maintenanceDetails?.maintenance_list.template.devicetype.toLowerCase().includes("bus bar")) {
      return form_val?.requests_approves?.maintenance_complete_datetime === 0 && this.maintenanceDetails.sldcchargingcode && form_val?.requests_approves?.restoration_completed_datetime > 0
    }
    else if (this.dialogData?.device_details?.maintenance_type === 'Substation' || this.dialogData?.device_details?.maintenance_type === 'Bay' || this.dialogData?.device_details?.maintenance_type === 'Equipment') {
      return this.dialogData.device_details.activity_parameters.length == 0 && this.dialogData?.device_details.shutdown_required == false &&
        form_val?.requests_approves?.maintenance_complete_datetime === 0 && this.form?.value?.requests_approves?.in_progress_datetime != 0
    }
  }


  CalculateNextMaintenance(cutoff: number, freqNum: number, freqType: string) {
    if (!freqType)
      return 0;
    let time: number = 0;
    switch (freqType) {
      case "Day":
        time = 86400000;
        break;
      case "Week":
        time = 604800000;
        break;
      case "Month":
        time = 2592000000;
        break;
      case "Year":
        time = 31536000000;
        break;
    }
    return cutoff + (freqNum * time);
  }

  getPTWActiveMnts() {
    return this.dialogData.mnt_on_same_bay.filter(bay =>
      bay.requests_approves_datetime.ptw_issued_datetime > 0 && bay.requests_approves_datetime.ptw_cancellation_issued_datetime == 0)
      .map(bay => bay.maintenance_list.maintenancename + (bay.from_all_connected_bays ? (" (" + bay.device_name.split("/").slice(-2).join("/") + ")") : ""))
  }

  getPTWRequestPendingMnts() {
    return this.dialogData.mnt_on_same_bay.filter(bay =>
      bay.requests_approves_datetime.ptw_issued_datetime > 0 && bay.requests_approves_datetime.ptw_cancellation_requested_datetime == 0)
      .map(bay => bay.maintenance_list.maintenancename + (bay.from_all_connected_bays ? (" (" + bay.device_name.split("/").slice(-2).join("/") + ")") : ""))
  }

  getToBeRestoredMnts() {
    return this.dialogData.mnt_on_same_bay.filter(bay =>
      bay.sldcchargingcode && bay.requests_approves_datetime.restoration_completed_datetime == 0 && this.maintenanceDetails.device_name == bay.device_name)
      .map(bay => bay.maintenance_list.maintenancename + (bay.from_all_connected_bays ? (" (" + bay.device_name.split("/").slice(-2).join("/") + ")") : ""))
  }

  isObjectArray(value: any): boolean {
    return Array.isArray(value) && value.length > 0 && typeof value[0] === 'object';
  }

  extractBayNames(value: any[]): string {
    return value.map(item => item.bay_name).join(', ');
  }

  afterLastSlash(value: string): string {
    if (!value) return value;
    const idx = value.lastIndexOf('/');
    return idx >= 0 ? value.slice(idx + 1).trim() : value;
  }



  //Observation Delete button in Observation List
  isButtonDisabled(row: any, clicked_device_type: string, resolver: any, dialogData: any): boolean {
    return row.status === 'close' ||
      clicked_device_type === 'observation_filter' ||
      row?.disable_button || this.maintenanceOnConnectedBay ||
      ((row.observationtype == 'je_tl' && !resolver.MaintenanceAccessRights.tl_maintenance_parameter_input_save_submit)
        || (resolver.isJEObservation(row.observationtype) && !resolver.MaintenanceAccessRights.maintenence_input_save_submit)
        || (row.observationtype == 'mnp' && !resolver.MaintenanceAccessRights.mnp_input_save_submit)) ||
      this.isCompleteDashboard;
  }

  async saveAllConnectedObservations() {
    let obs_ids_list = [];
    let pending_obsdatasource = this.dialogData.obdata.filter(rows => (rows.device_type == "Bay" && rows.observationtype == 'je_tl') ? rows.device_name.split('/').pop() === this.form.value.maintenance_list.device_master_id : rows.device_name === this.form.value.device_name && rows.status !== 'close');
    let obs_id_list = [...(this.dialogData.device_details.maintenance_list?.observations_list ?? []), ...(this.dialogData.device_details?.observations_list ?? [])];
    //let unique_ids_list = Array.from(new Set(obs_id_list));
    for (let id of obs_id_list) {
      if (!obs_ids_list.includes(id))
        obs_ids_list.push(id)
    }
    for (let data of pending_obsdatasource) {
      if (!obs_ids_list.includes(data._id))
        obs_ids_list.push(data._id)
    }

    this.InProgress = false;
    let result = await this.mntservice.GetObservationbyLists(obs_ids_list);
    if (result.code != null) {
      this.showToast(
        this.locale_service.Locale.language.errorcode.maintenance[result.code], this.locale_service.Locale.language.common.failed,
        { duration: 4000 }
      );
    }
    else {
      return result;
    }

  }
  //Observation Button Disable conditions
  AddObservationButtonStatus() {
    this.isMaintenanceParameterAddObservationButtonDisabled = this.isAddObservationBtndisabled('maintenance');
    this.isMNPParameterAddObservationButtonDisabled = this.isAddObservationBtndisabled('mnp');
    this.isHotlineParameterAddObservationButtonDisabled = this.isAddObservationBtndisabled('hotl');
    this.isObsListAddObservationButtonDisabled = this.isAddObservationBtndisabled('obs');
    this.isTLMaintenanceParameterAddObservationButtonDisabled = this.isAddObservationBtndisabled('tl');
  }

  isAddObservationBtndisabled(tabName: string): boolean {
    const status = this.form.value.current_status;
    const isPlannedOrApproval =
      status === MaintenanceStatus.Planned || status === MaintenanceStatus.RequestPTW ||
      status === MaintenanceStatus.XenApprovalRequested;
    const isCompleteOrCancel = status === MaintenanceStatus.Complete || status === MaintenanceStatus.Cancel;
    // The workflow has two similar-sounding steps:
    //   "Patrolling Done"      → status PatrollingCompleted (patrolling_completed_datetime set)
    //   "Patrolling Completed" → status Complete           (maintenance_complete_datetime set)
    // Observations should stay addable at "Patrolling Done" and only close off
    // at the true completion step, which is already covered by isCompleteDashboard
    // (Complete/Cancel/TLPartiallyComplete — see line 531). No extra
    // patrolling_completed_datetime gate here.
    const isDashboardComplete = this.isCompleteDashboard;
    //const isPendingObservation = this.clicked_device_type === 'observation_filter';
    const isConnectedBay = this.maintenanceOnConnectedBay; //normal bay maintenance
    const isJE = this.resolver.MaintenanceAccessRights.maintenence_input_save_submit;
    const isHL = this.resolver.MaintenanceAccessRights.hotline_input_save_submit;
    const isMNP = this.resolver.MaintenanceAccessRights.mnp_input_save_submit;
    let isTLTemplate = this.maintenanceOfConnectedTLInBay;
    const isJEorJETL = this.resolver.MaintenanceAccessRights.tl_maintenance_parameter_input_save_submit || this.resolver.MaintenanceAccessRights.maintenence_input_save_submit;

    //let path = this.dialogData.device_details.device_name.split('/');
    //let tl_path = path.slice(0, path.length - 2).join('/') + '/' + this.dialogData.device_details.maintenance_list.device_master_id;
    //const haspathAccess = this.isPathMatching(this.group_path, tl_path);
    //const isAssociatedUser = this.maintenanceOfConnectedTLInBayAccess;

    if (tabName == 'maintenance') {
      return isPlannedOrApproval || isDashboardComplete || this.isCompleteDashboard ||
        !(isTLTemplate ? isJEorJETL : isJE)
    }
    else if (tabName == 'mnp') {
      return isPlannedOrApproval || isDashboardComplete || !isMNP || this.isCompleteDashboard
    }
    else if (tabName == 'hotl') {
      return isPlannedOrApproval || isDashboardComplete || !isHL || this.isCompleteDashboard
    }
    else if (tabName == 'obs') {
      // Read the live form status alongside the isCompleteDashboard flag —
      // the flag is only computed once at ngOnInit from dialogData and stays
      // stale after the user clicks Complete Patrolling from within this
      // dialog. isCompleteOrCancel closes that gap (see line 3922).
      return isPlannedOrApproval || this.isCompleteDashboard || isCompleteOrCancel || !(isJEorJETL || isMNP)
    }
    else if (tabName == 'tl') {
      return this.isCompleteDashboard || isCompleteOrCancel || isPlannedOrApproval || !isJEorJETL
    }

  }


  isEditObservationBtninMaintenanceParameterdisabled(row: any): boolean {
    const status = this.form.value.current_status;
    const isPlannedOrApproval = status === MaintenanceStatus.Planned || status === MaintenanceStatus.RequestPTW || status === MaintenanceStatus.XenApprovalRequested;
    const isJE = this.resolver.MaintenanceAccessRights.maintenence_input_save_submit;
    const isMNP = this.resolver.MaintenanceAccessRights.mnp_input_save_submit;
    const isJETL = this.resolver.MaintenanceAccessRights.tl_maintenance_parameter_input_save_submit;
    const isSSE = this.resolver.MaintenanceAccessRights.maintenence_parameter_approve_revert;
    const userAllowed = isJE || isJETL || isMNP || isSSE;
    return row.status === 'close'
      || this.isCompleteDashboard
      || !userAllowed
      || isPlannedOrApproval
      || this.isCompleteDashboard
      || this.maintenanceOnConnectedBay;
  }

  //(row.observationtype == 'je_tl' && !this.resolver.MaintenanceAccessRights.tl_maintenance_parameter_input_save_submit)
  //(row.observationtype == 'mnp' && !this.resolver.MaintenanceAccessRights.mnp_input_save_submit)
  //(row.observationtype == 'je' && !this.resolver.MaintenanceAccessRights.maintenence_input_save_submit)
  //(row.observationtype == 'mnp' && !this.resolver.MaintenanceAccessRights.mnp_input_save_submit))

  isEditObservationBtninMNPParameterdisabled(row: any): boolean {
    const status = this.form.value.current_status;
    const isPlannedOrApproval =
      status === MaintenanceStatus.Planned || status === MaintenanceStatus.RequestPTW || status === MaintenanceStatus.XenApprovalRequested;
    const isJE = this.resolver.MaintenanceAccessRights.maintenence_input_save_submit;
    const isMNP = this.resolver.MaintenanceAccessRights.mnp_input_save_submit;
    const isSSE = this.resolver.MaintenanceAccessRights.maintenence_parameter_approve_revert;
    const userAllowed = isJE || isMNP || isSSE;

    return this.isCompleteDashboard || row.status == 'close' || this.isCompleteDashboard || isPlannedOrApproval || !userAllowed

  }

  isDeleteObservationBtninMaintenanceParameterdisabled(row: any): boolean {

    const status = this.form.value.current_status;
    const isCompleteOrCancel = status === MaintenanceStatus.Complete || status === MaintenanceStatus.Cancel;

    return row.status == 'close' || this.clicked_device_type == 'observation_filter' || row.connected_parameter_id || this.isCompleteDashboard || isCompleteOrCancel
      || (row.observationtype == 'je_tl' && !this.resolver.MaintenanceAccessRights.tl_maintenance_parameter_input_save_submit)
      || (this.resolver.isJEObservation(row.observationtype) && !this.resolver.MaintenanceAccessRights.maintenence_input_save_submit)
      || (row.observationtype == 'mnp' && !this.resolver.MaintenanceAccessRights.mnp_input_save_submit)
  }

  isDeleteObservationBtninMNPParameterdisabled(row: any): boolean {

    return row.status == 'close' ||
      !this.resolver.MaintenanceAccessRights.mnp_input_save_submit ||
      this.clicked_device_type == 'observation_filter' ||
      this.isCompleteDashboard ||
      row.connected_parameter_id
  }

  isEditObservationBtninTLMaintenanceParameterdisabled(row: any): boolean {
    const isJETL = this.resolver.MaintenanceAccessRights.tl_maintenance_parameter_input_save_submit;
    const isAETL = this.resolver.MaintenanceAccessRights.tl_maintenance_parameter_approve_revert;
    const isSSE = this.resolver.MaintenanceAccessRights.maintenence_parameter_approve_revert;
    const isJE = this.resolver.MaintenanceAccessRights.maintenence_input_save_submit;
    const status = this.form.value.current_status;
    const isPlannedOrApproval =
      status === MaintenanceStatus.Planned || status === MaintenanceStatus.RequestPTW ||
      status === MaintenanceStatus.XenApprovalRequested;
    const obType = row.observationtype;
    const ownObservation = ((isAETL || isJETL) && row.observationtype == 'je_tl') || (this.resolver.isJEObservation(row.observationtype) && (isJE || isSSE));
    const isValidUser = isJETL || isAETL;

    return row.status == 'close' ||
      !ownObservation || isPlannedOrApproval || this.isCompleteDashboard
  }

  isDeleteObservationBtninTLMaintenanceParameterdisabled(row: any): boolean {
    return row.status == 'close' ||
      !this.resolver.MaintenanceAccessRights.tl_maintenance_parameter_input_save_submit ||
      this.clicked_device_type == 'observation_filter' ||
      this.isCompleteDashboard ||
      row.connected_parameter_id
  }
  //this.dialogData.device_details.maintenance_list?.observations_list?.includes(row._id)
  isEditObservationBtninObservationsListdisabled(row: any): boolean {
    const isJE = this.resolver.MaintenanceAccessRights.maintenence_input_save_submit;
    const isJETL = this.resolver.MaintenanceAccessRights.tl_maintenance_parameter_input_save_submit;
    const isAETL = this.resolver.MaintenanceAccessRights.tl_maintenance_parameter_approve_revert;
    const isMNP = this.resolver.MaintenanceAccessRights.mnp_input_save_submit;
    const isSSE = this.resolver.MaintenanceAccessRights.maintenence_parameter_approve_revert;
    const userAllowed = isJE || isMNP || isSSE || isJETL || isAETL;
    const status = this.form.value.current_status;
    const isPlannedOrApproval = status === MaintenanceStatus.Planned || status === MaintenanceStatus.RequestPTW || status === MaintenanceStatus.XenApprovalRequested;
    //const access = this.resolver.MaintenanceAccessRights;
    const isClosed = row.status === 'close';
    const isDashboardComplete = this.isCompleteDashboard;
    const isCompleteOrCancel = status === MaintenanceStatus.Complete || status === MaintenanceStatus.Cancel;

    // Compute rights once
    //const rightsByType = {
    //  je_tl: access.tl_maintenance_parameter_input_save_submit,
    //  je: access.maintenence_input_save_submit,
    //  mnp: access.mnp_input_save_submit
    //};

    // Single point of truth for "hasRight"
    //const hasRight = this.clicked_device_type === 'observation_filter'
    //  ? (
    //    access.mnp_input_save_submit ||
    //    access.maintenence_input_save_submit ||
    //    access.tl_maintenance_parameter_input_save_submit
    //  )
    //  : rightsByType[row.observationtype];

    // Final return — SAME for both cases
    return (this.isCompleteDashboard ||
      isClosed ||
      !userAllowed ||
      isPlannedOrApproval ||
      this.isCompleteDashboard
    );
    //return row.status == 'close' ||
    //  (this.clicked_device_type == 'observation_filter' ? !(this.resolver.MaintenanceAccessRights.mnp_input_save_submit || this.resolver.MaintenanceAccessRights.maintenence_input_save_submit || this.resolver.MaintenanceAccessRights.tl_maintenance_parameter_input_save_submit) :
    //    (row.observationtype == 'je_tl' && !this.resolver.MaintenanceAccessRights.tl_maintenance_parameter_input_save_submit)
    //    || (row.observationtype == 'je' && !this.resolver.MaintenanceAccessRights.maintenence_input_save_submit)
    //    || (row.observationtype == 'mnp' && !this.resolver.MaintenanceAccessRights.mnp_input_save_submit))
    //  || this.form.value.current_status === MaintenanceStatus.Planned
    //  || this.form.value.current_status === MaintenanceStatus.XenApprovalRequested
    //  || this.isCompleteDashboard
  }

  isDeleteObservationBtninObservationsListdisabled(row: any): boolean {
    const status = this.form.value.current_status;
    const s = this.resolver.MaintenanceAccessRights;
    const isCompleteOrCancel = status === MaintenanceStatus.Complete || status === MaintenanceStatus.Cancel;
    const isClosed = row.status === 'close';
    const isDashboardComplete = this.isCompleteDashboard;
    const isUsedInMaintenance =
      this.dialogData.device_details.maintenance_list?.observations_list?.includes(row._id);
    const isConnected = !!row.connected_parameter_id;

    // observation_filter → delete ALWAYS disabled
    if (this.clicked_device_type === 'observation_filter') {
      return true;
    }

    const rightsByType = {
      je_tl: s.tl_maintenance_parameter_input_save_submit,
      je: s.maintenence_input_save_submit,
      // Alarm-generated observations are JE observations for permission
      // purposes — same right, keyed separately because observationtype on
      // the row is the raw 'alarm' string. Mirrors ClientApp's rightsByType.
      alarm: s.maintenence_input_save_submit,
      mnp: s.mnp_input_save_submit
    };

    const hasRight = rightsByType[row.observationtype];

    return (
      isClosed ||
      isCompleteOrCancel ||
      isUsedInMaintenance ||
      isDashboardComplete ||
      isConnected ||
      !hasRight
    );
    //return row.status == 'close' || this.dialogData.device_details.maintenance_list?.observations_list?.includes(row._id) ||
    //  this.isCompleteDashboard ||
    //  row.connected_parameter_id ||
    //  (this.clicked_device_type == 'observation_filter' ? true : (row.observationtype == 'je_tl' && !this.resolver.MaintenanceAccessRights.tl_maintenance_parameter_input_save_submit)
    //    || (row.observationtype == 'je' && !this.resolver.MaintenanceAccessRights.maintenence_input_save_submit)
    //    || (row.observationtype == 'mnp' && !this.resolver.MaintenanceAccessRights.mnp_input_save_submit))
  }

  resetSearchFilters(): void {
    // --- Clear all datasource filters ---
    const allSources = [
      this.filterObservationDatasource,
      ...(this.filteredmaintenanceDataSource?.map(x => x?.ds) || []),
      ...(this.filteredmpDataSource?.map(x => x?.ds) || [])
    ];

    allSources.forEach(src => {
      if (src) src.filter = '';
    });

    // --- Clear all search input fields ---
    const root = this.leftcontainer?.nativeElement;
    if (root) {
      root.querySelectorAll('mat-form-field.search input[matInput]')
        .forEach(input => input.value = '');
    }
  }


  // Whether the currently logged-in user is allowed to edit the Planned Date
  // for this maintenance. Mirrors client app logic: needs the maintenance_date
  // right, status must be Planned or XenApprovalRequested, and not blocked by
  // an active maintenance on a connected bay / TL the user can't touch.
  get canEditPlannedDate(): boolean {
    const status = this.form?.value?.current_status;
    return !!(
      this.resolver?.MaintenanceAccessRights?.maintenance_date &&
      (status === MaintenanceStatus.Planned || status === MaintenanceStatus.XenApprovalRequested) &&
      !this.maintenanceOnConnectedBay &&
      !(this.maintenanceOfConnectedTLInBay && !this.maintenanceOfConnectedTLInBayAccess)
    );
  }

  get isFutureMaintenance() {
    const details = this.dialogData?.device_details;
    const templateId = details?.maintenance_list?.template?._id || '';
    const isPatrolling = templateId.startsWith('ptt-') &&
      details?.maintenance_list?.template?.scheduled_patrolling === "patrolling";

    const isHotline = !!this.dialogData.device_details?.maintenance_list?.template?._id.startsWith("pht-") || this.dialogData.device_details?.maintenance_list?.template?.hotline;


    // 1. Bypass date check for Hotline or Patrolling
    if (isPatrolling || isHotline) {
      return false;
    }

    // 2. Standard date check
    const plannedDate = Number(details?.plannedDate);
    if (!Number.isFinite(plannedDate)) return false;

    return plannedDate > Date.now();
  }

  isTabularView = false;


  tablesVM: TableVM[] = [];

  toggleViewMode() {
    this.isTabularView = !this.isTabularView;

    if (this.isTabularView) {
      this.buildTablesVM();
    }
  }

  buildTablesVM() {
    const src = this.catagorized_param_list;

    const headerMap: Map<string, TableVM> = new Map();

    for (const headStart in src) {
      const headerObj = src[headStart];

      for (const header in headerObj) {
        const paramsArr = headerObj[header];

        // Create VM if not exists
        if (!headerMap.has(header)) {
          const cols = paramsArr.map(p => p.parametername.substring(p.head_start_label.length + 3)); // temporary code // substring 

          headerMap.set(header, {
            header: header,
            columns: cols,
            displayedColumns: ['headStart', ...cols],
            dataSource: []
          });
        }

        const vm = headerMap.get(header)!;

        // Build row
        const row: any = { headStart };

        paramsArr.forEach(p => {
          row[p.parametername.substring(p.head_start_label.length + 3)] = p; // keep reference to original object
        });

        vm.dataSource.push(row);
      }
    }

    this.tablesVM = Array.from(headerMap.values());
  }

  close() {
    this.modalController.dismiss();
  }

  getVisibleStepsCount(): number {
    return Object.values(this.stepper).filter((s: any) => !s.hidden).length;
  }

  openAddPatrolling() {
    console.log('Open Add Patrolling Dialog');
  }

  activeCard: string = 'workflow';

  toggleCard(key: string) {
    this.activeCard = this.activeCard === key ? null : key;
  }

  onActiveTabChange(_ev: any) {
    if (this.activeTab === 'observations_list') {
      this.clicked_device_type = 'observation';
      this.filterObservationDS();
      this.AddObservationButtonStatus();
    }
    this.detailsContent?.scrollToTop(0);
  }

  // ── Asset Damage lock — mirrors ClientApp maintenance-details-dlg helpers.
  // The bay path used for the AssetDamage/Lock query. Prefers the maintenance
  // list's bay_path/maintenance_on_bay; for Equipment maintenance we clip to
  // the first 6 device-name segments (project/zone/circle/division/substation/bay).
  resolveAssetDamageBayPath(): string {
    const ml = this.form?.value?.maintenance_list || this.maintenanceDetails?.maintenance_list;
    const dn = (this.form?.value?.device_name || this.maintenanceDetails?.device_name || '').trim();
    if (!ml && !dn) return '';
    const bp = (ml?.bay_path || ml?.maintenance_on_bay || '').trim();
    if (bp) return bp;
    if (this.maintenanceDetails?.maintenance_type === 'Equipment') {
      const parts = dn.split('/');
      if (parts.length >= 6) return parts.slice(0, 6).join('/');
    }
    return dn;
  }

  getSubstationIdForAssetDamage(): string {
    const dn = this.form?.value?.device_name || this.maintenanceDetails?.device_name || '';
    const p = dn.split('/');
    return p.length > 4 ? p[4] : '';
  }

  // When maintenance is completed/cancelled the lock is irrelevant — the dialog
  // is read-only either way. Matches ClientApp isMaintenanceCompletedForDamage.
  isMaintenanceCompletedForDamage(): boolean {
    return this.isCompleteDashboard;
  }

  private cacheAssetDamageContext(): void {
    this.assetDamageBayPath = this.resolveAssetDamageBayPath();
    this.assetDamageSubstationId = this.getSubstationIdForAssetDamage();
    this.assetDamageLvBayPath = this.maintenanceDetails?.connected_hv_lv_bay?.[0] ?? '';
  }

  async refreshAssetDamageLockState(): Promise<void> {
    if (!this.assetDamageFeatureOn || !this.maintenanceDetails?._id) return;
    if (this.isMaintenanceCompletedForDamage()) return;
    const bayPath = this.assetDamageBayPath || this.resolveAssetDamageBayPath();
    if (!bayPath) return;
    try {
      const r = await this.mntservice.getAssetDamageLock(bayPath, this.maintenanceDetails._id);
      if (r?.code === 'mnt_notfound' || r?.code === 'validation') {
        this.assetDamageBayLocked = false;
        this.assetDamageLockBanner = '';
        this.activeDamageReport = null;
        this.activeDamageReportEquipments = [];
        return;
      }
      this.assetDamageBayLocked = !!r?.bayLocked;
      this.assetDamageLockBanner = (r?.message as string) || '';
      this.activeDamageReport = r?.activeDamageReport ?? null;
      this.activeDamageReportEquipments = r?.activeDamageEquipments ?? [];
      if (!this.assetDamageBayLocked) {
        this.activeDamageReport = null;
        this.activeDamageReportEquipments = [];
      }
    } catch {
      this.assetDamageBayLocked = false;
      this.activeDamageReport = null;
      this.activeDamageReportEquipments = [];
    }
    this.cdr.markForCheck();
  }
}
interface TableVM {
  header: string;
  columns: string[];
  displayedColumns: string[];
  dataSource: any[];
}
