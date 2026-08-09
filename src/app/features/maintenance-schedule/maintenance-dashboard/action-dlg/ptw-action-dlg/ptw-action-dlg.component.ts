import { Component, OnInit, OnChanges, SimpleChanges, Input, EventEmitter, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { ModalController, ToastController } from '@ionic/angular';
import { PtwWorkCompletionDlgComponent } from './ptw-work-completion-dlg/ptw-work-completion-dlg.component'
import { ActivatedRoute } from '@angular/router';
// import { BackchargingActionDlgComponent } from '../backcharging-action-dlg/backcharging-action-dlg.component';
import { ChangeDetectorRef } from '@angular/core';
import { interval } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
// import { EventLogDlgComponent } from 'src/app/features/event-log-view/event-log-dlg/event-log-dlg.component'; // register in module when available
declare const EventLogDlgComponent: any; // placeholder — replace with real import once module is registered
import { MaintenanceService, MaintenanceStatus } from 'src/app/core/services/maintenance.service';
import { ObjectStandard } from 'src/app/core/services/object-control.service';
import { ProjectResolverService } from 'src/app/core/services/project-resolver.service';
import { SignalRService } from 'src/app/core/services/signal-r.service';
import { AppService } from 'src/app/core/services/app.service';
import { LocaleService } from 'src/app/core/services/locale/locale.service';
import { ConfirmationDlgComponent } from 'src/app/shared/components/confirmation-dlg/confirmation-dlg.component';

@Component({
  selector: 'app-ptw-action-dlg',
  templateUrl: './ptw-action-dlg.component.html',
  styleUrls: ['./ptw-action-dlg.component.scss'],
})
export class PtwActionDlgComponent implements OnInit, OnChanges {
  form: FormGroup;
  InProgress = false;
  object_list: any[] = [];
  @Input() dialogData!: any;
  /** When true (e.g. bay locked for unresolved asset damage), PTW actions must not be editable.
   *  Mirrors ClientApp ptw-action-dlg.component.ts:39. */
  @Input() maintenanceBlockedByAssetDamage = false;
  @Output() formEmitter: EventEmitter<any> = new EventEmitter<any>();
  ptwDataSource: any;
  isCancelPTW: boolean = false;
  disableReqPTWCancelBtn: boolean = false;
  all_iso_status_open: boolean = false;
  all_iso_status_close: boolean = false;
  all_cb_status_open: boolean = false;
  all_cb_status_close: boolean = false;
  below66KVVoltageLevel: boolean = false;
  isConditional: boolean = false;
  MaintenanceStatus = MaintenanceStatus;
  connected_lv_bay: string = "";
  current_status: string = "";
  backcharging_ids: any = null;
  ObjectStandard = ObjectStandard;
  mnt_on_same_bay: any[] = [];
  backcharging_details: {};
  isRunning = false;
  maintenanceSkipXENSLDCStep = true;
  isButtonContainerAccess = true;
  isCompleteDashboard: boolean;

  //isObservationOrConditional = false;
  isObservationalMaintenance: boolean;
  isHVLVMaintenance: boolean;
  eventLogsPerformed: any[] = [];
  eventLogs = null;
  // Modal state for event-log viewer
  showEventLogModal = false;
  groupedEventLogs: any = {};
  // Modal state for PDF export preview
  showExportModal = false;
  exportModalData: any = {};
  hasActiveBC: boolean = false;
  constructor(
    private cdRef: ChangeDetectorRef,
    // private exportAsService: ExportAsService,
    private route: ActivatedRoute,
    public signalr: SignalRService,
    public appservice: AppService,
    private toastController: ToastController,
    private modalController: ModalController,
    private resolver: ProjectResolverService,
    public mntservice: MaintenanceService,
    private formBuilder: FormBuilder, public locale_service: LocaleService) { }

  private showToast(message: string, _action: string = 'OK', config: { duration?: number; panelClass?: string } = {}) {
    const duration = config.duration ?? 2000;
    this.toastController.create({
      message,
      duration,
      position: 'bottom',
      buttons: [{ text: 'OK', role: 'cancel' }]
    }).then(toast => toast.present());
  }

  // When the parent flips maintenanceBlockedByAssetDamage after the form is built,
  // disable the form so all inline inputs go read-only. Mirrors ClientApp
  // ptw-action-dlg.component.ts:204-213.
  ngOnChanges(changes: SimpleChanges): void {
    const c = changes['maintenanceBlockedByAssetDamage'];
    if (!c || !this.form) return;
    if (c.firstChange) return;
    if (this.maintenanceBlockedByAssetDamage) {
      this.form.disable();
    }
    this.cdRef?.markForCheck?.();
  }

  async ngOnInit() {
    this.resolver.mnt_ptw_form = this;
    const voltageLevel = this.dialogData.maintenanceDetails.maintenance_list.voltage_level?.trim().slice(0, 2);
    if (voltageLevel === "11" || voltageLevel === "33") {
      this.below66KVVoltageLevel = true;
    }
    this.isConditional = this.dialogData.maintenanceDetails.maintenance_list.template._id.startsWith("con");
    this.isObservationalMaintenance = this.dialogData.maintenanceDetails.maintenance_list.template._id.startsWith("pov");
    this.isHVLVMaintenance = this.dialogData.maintenanceDetails.maintenance_list.template.devicetype.toLowerCase().includes("hv bay") || this.dialogData.maintenanceDetails.maintenance_list.template.devicetype.toLowerCase().includes("lv bay");
    //this.isObservationOrConditional = (this.dialogData.maintenanceDetails.maintenance_list.template._id.startsWith("con") || this.dialogData.maintenanceDetails.maintenance_list.template._id.startsWith("pov"))
    //  && (this.dialogData.maintenanceDetails.maintenance_list.template.devicetype.toLowerCase().includes("hv bay") || this.dialogData.maintenanceDetails.maintenance_list.template.devicetype.toLowerCase().includes("lv bay"))
    if ((this.dialogData.maintenanceDetails.maintenance_list.template._id.startsWith("ptt")
      && this.resolver.MaintenanceAccessRights.rqst_ptw_Button
      && this.resolver.MaintenanceAccessRights.maintenence_input_save_submit
      && !this.resolver.MaintenanceAccessRights.admin)
      || (this.dialogData?.maintenanceDetails.hasOwnProperty("is_non_initiator_on_hold")
        && this.dialogData?.maintenanceDetails.is_non_initiator_on_hold
        && this.dialogData?.maintenanceDetails.current_status == MaintenanceStatus.PTWRequested)
      || (this.dialogData?.maintenanceDetails.hasOwnProperty("is_non_initiator_on_hold")
        && this.dialogData?.maintenanceDetails.current_status == MaintenanceStatus.PTWCancellationIssued))
      this.isButtonContainerAccess = false;

    this.InProgress = true;
    this.isCompleteDashboard = this.dialogData.maintenanceDetails.current_status == MaintenanceStatus.Complete || this.dialogData.maintenanceDetails.current_status == MaintenanceStatus.Cancel || this.dialogData.maintenanceDetails.current_status == MaintenanceStatus.TLPartiallyComplete

    this.form = this.formBuilder.group({
      _id: [],
      ptw_id: ['', [Validators.required]],
      issue_datetime: [Date.now()],
      show_issue_date: [''],
      connected_maintenance_id: [this.dialogData.maintenanceDetails ? [this.dialogData.maintenanceDetails._id] : ''],
      request_cancel_datetime: [0],
      cancel_datetime: [0],
      show_cancel_date: [''],
      device_name: [this.dialogData ? this.dialogData?.maintenanceDetails?.device_name : ''],
      show_device_name: [this.dialogData ? this.dialogData?.maintenanceDetails?.device_name.split('/').slice(-1)[0] : ''],
      issuedto: [this.dialogData?.maintenanceDetails?.je ?? ''],
      issuedby: [''], // added after ptw issued
      ssename: [this.dialogData ? this.dialogData?.maintenanceDetails.sse : ''],
      cancelledby: [''],
      workpurpose: [this.dialogData ? this.dialogData?.maintenanceDetails.maintenance_list.template.maintenancename : ''],
      remarks: [''],
      ptwissuecheckbox: [false, [this.checkboxValidator]],
      ptwcancelcheckbox: [false, [this.checkboxValidator]],
      ptw_work_completed: [false],
      sldcshutdowncode: this.dialogData?.maintenanceDetails?.sldcshutdowncode ?? "",
      sldcchargingcode: this.dialogData?.maintenanceDetails?.sldcchargingcode ?? "",
    });
    await this.GetEventLogObjects();

    //if (this.showRestorationButtonSection) {
    //this.hasActiveBackcharging();
    //}

    if (this.dialogData?.self_backcharging) {
      this.dialogData.maintenanceDetails.self_backcharging = this.dialogData.self_backcharging
    }
    if (this.dialogData.maintenanceDetails.backcharging_id != null) {
      this.backcharging_details = this.dialogData.maintenanceDetails.backcharging_id;
    }
    this.mnt_on_same_bay = this.dialogData?.mnt_on_same_bay?.filter(bay => (bay.device_name == this.dialogData?.maintenanceDetails.device_name) && (this.dialogData?.maintenanceDetails.maintenance_list.template._id.startsWith("ptt") ? (bay.maintenance_list.tower_range == this.dialogData?.maintenanceDetails.maintenance_list.template.tower_range) : true));
    // ptw will be different for same bay tl mnt + range
    let ptw_id = "";
    if (this.dialogData?.maintenanceDetails.requests_approves.ptw_issued_datetime == 0 && this.dialogData.maintenanceDetails.requests_approves.ptw_requested_datetime > 0) {
      // let new_id = this.dialogData.new_ptw_id;

      //to map the dialogdata properly -- this handle both cases: plain value (ClientApp) or map object (Mobile parent)
      let new_id = typeof this.dialogData.new_ptw_id === 'object' && this.dialogData.new_ptw_id !== null
        ? this.dialogData.new_ptw_id[this.dialogData.maintenanceDetails._id] : this.dialogData.new_ptw_id;

      if (this.dialogData?.maintenanceDetails?.ptw_ids.length == 0) {
        if (this.dialogData.hv_lv_ptw) { // if HV bay has PTW then patch on LV, or vice versa
          ptw_id = this.dialogData.hv_lv_ptw;
        }
        else if (this.mnt_on_same_bay) {
          // executes when multiple maintenance with same bay has same sldc shutdown code, ptw will be kept same
          let mnt = this.mnt_on_same_bay.find(mnt => this.matchTL(mnt) && mnt.ptw_ids && mnt.ptw_ids.length > 0 && mnt.requests_approves_datetime.ptw_cancellation_issued_datetime == 0);
          ptw_id = mnt ? mnt.ptw_ids[0] : "PTW/" + new_id;
        }
        else {
          ptw_id = "PTW/" + new_id;
        }
      }
      else {
        ptw_id = this.dialogData?.maintenanceDetails?.ptw_ids.slice(-1)[0]
      }
    } else {
      this.patchFormIfPTWExists();
    }


    this.form.patchValue({ ptw_id: ptw_id });
    this.handleFormDisabling();
    this.handleCancellationDatetime(this.ptwDataSource);

    this.form.disable();

    if (this.resolver.MaintenanceAccessRights.issue_ptw_button) { // && !this.isCBOpenOnConnectedBay // why this was used here
      if (this.dialogData.maintenanceDetails.current_status === MaintenanceStatus.PTWRequested) {
        this.form.enable();
        this.form.get('cancelledby').disable();
        this.form.get('issuedby').disable();
        this.form.get('issuedto').disable();
        this.form.get('ssename').disable();
      }
    }
    if (this.resolver.MaintenanceAccessRights.rqst_ptw_Button && this.dialogData.maintenanceDetails.current_status === MaintenanceStatus.InProgress) {
      this.form.get('ptwcancelcheckbox').enable();
    }

    this.validateCheckBox();
    this.current_status = this.dialogData.maintenanceDetails.current_status;
    /*Check for access in connected bays*/
    //if (!this.dialogData.isAccess) {
    //  this.form.disable();
    //}

    this.formDisableOnSkipXENSLDCStep();

    // Asset-damage lock passed in from parent — override every other enable path
    // and keep the form read-only. Mirrors ClientApp applyAssetDamageMaintenanceBlockIfNeeded.
    if (this.maintenanceBlockedByAssetDamage) {
      this.form.disable();
    }

    this.InProgress = false;

    // Load event logs from maintenance data
    this.loadEventLogsFromMaintenance();

    interval(2000)
      .pipe(takeUntil(this.dialogData.ptwIntervalDestroy$))
      .subscribe(() => {
        this.safeRefresh();
      });
  }

  async safeRefresh() {
    if (this.isRunning) return; // prevent duplicate calls
    this.isRunning = true;
    try {
      await this.GetEventLogObjects();
    } catch (err) {
      console.error('Error fetching event log objects:', err);
    } finally {
      this.isRunning = false;
    }
  }

  async CancelSelfBackcharging(bayName: string) {
    let backfeedingData: any = {};
    if (this.dialogData.maintenanceDetails?.backcharging_id && this.dialogData.maintenanceDetails.backcharging_id[bayName]) {
      backfeedingData = await this.mntservice.GetBackChargingByID(this.dialogData.maintenanceDetails?.backcharging_id[bayName].split("|")[0])
      if (backfeedingData.code && backfeedingData.code != null) {
        this.showToast(this.locale_service.Locale.language.errorcode[backfeedingData.code], this.locale_service.Locale.language.common.failed,
          {
            duration: 2000
          });
        return;
      }
    }
    else {
      backfeedingData.backcharging_id = this.dialogData.maintenanceDetails.ptw_ids.slice(-1)[0];
      backfeedingData.workpurpose = this.dialogData.maintenanceDetails.maintenance_list.template.maintenancename;
    }
    this.dialogData.maintenanceDetails.connected_bay = bayName
    // this.dialog.open(BackchargingActionDlgComponent, {
    //   height: '100%', width: '900px', closeOnNavigation: true, disableClose: true, autoFocus: true,
    //   data: { self_bc: true, device_details: this.dialogData.maintenanceDetails, backchargingDetails: backfeedingData, mnt_on_same_bay: [] }
    // }).afterClosed().subscribe(async (data) => {
    //   if (data != null && !data.code) {
    //     // Optional: show loader/spinner
    //     this.InProgress = true;

    //     // 🔄 Get the updated maintenance document from DB (to fix stepper + live data)
    //     const updatedDoc = await this.mntservice.GetPlanMntById(this.dialogData.maintenanceDetails._id);

    //     if (updatedDoc && !updatedDoc.code) {
    //       this.dialogData.maintenanceDetails = updatedDoc;

    //       // Emit to parent (stepper will re-render)
    //       this.formEmitter.emit({
    //         actionType: 'selfBackchargingCancelled',
    //         maintenanceDetails: updatedDoc,
    //         backchargingDetails: data,
    //       });
    //     } else {
    //       // fallback: manually update backcharging_id
    //       this.dialogData.maintenanceDetails.backcharging_id[bayName] = data.backcharging_id;
    //     }

    //     this.InProgress = false;
    //   }
    // });
  }
  issueSelfBackcharging(bayName: string) {
    let backfeedingData: any = {};
    this.dialogData.maintenanceDetails.connected_bay = bayName;
    backfeedingData.backcharging_id = this.dialogData.maintenanceDetails.ptw_ids.slice(-1)[0];
    backfeedingData.workpurpose = this.dialogData.maintenanceDetails.maintenance_list.template.maintenancename;
    // this.dialog.open(BackchargingActionDlgComponent, {
    //   height: '100%', width: '900px', closeOnNavigation: true, disableClose: true, autoFocus: true,
    //   data: { self_bc: true, device_details: this.dialogData.maintenanceDetails, backchargingDetails: backfeedingData, mnt_on_same_bay: [] }
    // }).afterClosed().subscribe(async (data) => {
    //   if (data != null && !data.code) {
    //     // Optional: show loader/spinner
    //     this.InProgress = true;

    //     // 🔄 Get the updated maintenance document from DB (to fix stepper + live data)
    //     const updatedDoc = await this.mntservice.GetPlanMntById(this.dialogData.maintenanceDetails._id);

    //     if (updatedDoc && !updatedDoc.code) {
    //       this.dialogData.maintenanceDetails = updatedDoc;

    //       if (this.dialogData.maintenanceDetails.backcharging_id != null) {
    //         this.backcharging_details = this.dialogData.maintenanceDetails?.backcharging_id;
    //       }
    //       // Emit to parent (stepper will re-render)
    //       this.formEmitter.emit({
    //         actionType: 'selfBackchargingIssued',
    //         maintenanceDetails: updatedDoc,
    //         backchargingDetails: data,
    //       });
    //     } else {
    //       // fallback: manually update backcharging_id
    //       this.dialogData.maintenanceDetails.backcharging_id[bayName] = data.backcharging_id;
    //     }

    //     this.InProgress = false;

    //     //this.cdRef.detectChanges();
    //   }
    // });
  }

  validateCheckBox() {
    if (!this.dialogData.maintenanceDetails.connected_bay ? (this.dialogData.maintenanceDetails.current_status === MaintenanceStatus.PTWRequested && this.all_cb_status_open) : this.dialogData.maintenanceDetails.current_status === MaintenanceStatus.BCCertificateIssued) {
      this.form.get('ptwissuecheckbox').enable();
    }
  }

  patchFormIfPTWExists(): void {
    // Fetch PTW details and patch the form with the data
    if (this.dialogData.maintenanceDetails.requests_approves.in_progress_datetime > 0) {
      this.InProgress = true;
      this.mntservice.GetPTWByID(this.dialogData.maintenanceDetails.ptw_ids.slice(-1)[0]).then(data => {
        this.InProgress = false;
        if (data.code) {
          this.showToast(this.locale_service.Locale.language.errorcode.maintenance[data.code],
            this.locale_service.Locale.language.common.failed,
            { duration: 4000 });
        } else {
          this.ptwDataSource = data;
          this.patchFormWithPTWData(data);
        }
      });
    }
    // If ptw_ids doesn't exist, the form remains as initialized (no reset here)
  }

  patchFormWithPTWData(data: any): void {
    this.form.patchValue({
      _id: data._id ?? '',
      ptw_id: data._id ?? '',
      issue_datetime: data.issue_datetime ?? Date.now(),
      request_cancel_datetime: data?.request_cancel_datetime,
      show_issue_date: this.appservice.dateToString(data.issue_datetime),
      cancel_datetime: data.cancel_datetime ?? 0,
      show_cancel_date: data.cancel_datetime
        ? this.appservice.dateToString(data.cancel_datetime)
        : this.appservice.dateToString(null, 1),
      device_name: data.device_name ?? this.dialogData.maintenanceDetails.device_name,
      issuedto: data?.issuedto ?? '', // added after ptw issued
      issuedby: data.issuedby ?? '',  // added after ptw issued
      cancelledby: data.cancelledby ?? '',
      workpurpose: data.workpurpose ?? this.dialogData?.maintenanceDetails.maintenance_list.template.maintenancename,
      ptw_work_completed: data.ptw_work_completed ?? false,
      remarks: data.remarks ?? this.dialogData.remarks,
      connected_maintenance_id: data.connected_maintenance_id,
      sldcshutdowncode: this.dialogData?.maintenanceDetails?.sldcshutdowncode ?? "",
      sldcchargingcode: this.dialogData?.maintenanceDetails?.sldcchargingcode ?? "",

    });
  }

  handleFormDisabling(): void {
    const formControls = this.form.controls;

    // Additional logic to disable fields based on dialogData
    if (this.ptwDataSource || this.dialogData.maintenanceDetails.current_status !== MaintenanceStatus.PTWRequested) {
      if (this.dialogData.maintenanceDetails.current_status === MaintenanceStatus.InProgress) {
        formControls['ptwcancelcheckbox'].enable();

      }
    } else if (!this.ptwDataSource && this.dialogData.maintenanceDetails.current_status === MaintenanceStatus.PTWRequested) {
      this.form.enable();
      if (this.form.get('issuedto').value) {
        formControls['issuedto'].disable();
      }
      if (this.form.get('issuedby').value) {
        formControls['issuedby'].disable();
      }
      if (this.form.get('ssename').value) {
        formControls['ssename'].disable();
      }

    }


  }

  formDisableOnSkipXENSLDCStep() {
    const formControls = this.form.controls;
    // enabled individually because entire form is disabled, whole form disabling flow to be changed in future
    formControls['sldcshutdowncode'].disable();
    formControls['sldcchargingcode'].disable();

    if (!this.isCompleteDashboard && this.maintenanceSkipXENSLDCStep && !this.below66KVVoltageLevel && this.resolver.MaintenanceAccessRights.issue_ptw_button && !this.dialogData?.maintenanceDetails.hasOwnProperty("is_non_initiator_on_hold")) {

      const afterPTWRequest = this.dialogData?.maintenanceDetails?.requests_approves?.ptw_requested_datetime > 0
      const beforePTWIssue = this.dialogData?.maintenanceDetails?.requests_approves?.ptw_issued_datetime == 0
      const beforeNBFIssue = this.dialogData?.maintenanceDetails?.requests_approves?.backcharging_issued_datetime == 0

      if (this.dialogData?.maintenanceDetails?.connected_bay) {
        if (!this.isConditional && afterPTWRequest && beforeNBFIssue) {
          formControls['sldcshutdowncode'].enable();
          formControls['sldcshutdowncode'].setValidators([Validators.required]);
          formControls['sldcshutdowncode'].updateValueAndValidity();
        }
      } else {
        if (!this.isConditional && afterPTWRequest && beforePTWIssue) {
          formControls['sldcshutdowncode'].enable();
          formControls['sldcshutdowncode'].setValidators([Validators.required]);
          formControls['sldcshutdowncode'].updateValueAndValidity();
        }
      }



      const afterPTWCancel = this.dialogData?.maintenanceDetails?.requests_approves?.ptw_cancellation_issued_datetime > 0
      const beforeNBFCancelIssue = this.dialogData?.maintenanceDetails?.requests_approves?.backcharging_cancel_issued_datetime === 0
      const beforeRestoration = this.dialogData?.maintenanceDetails?.requests_approves?.restoration_completed_datetime === 0

      if (this.dialogData?.maintenanceDetails?.connected_bay) {
        if (afterPTWCancel && beforeNBFCancelIssue) {
          formControls['sldcchargingcode'].enable();
          formControls['sldcchargingcode'].setValidators([Validators.required]);
          formControls['sldcchargingcode'].updateValueAndValidity();
        }
      } else {
        if (afterPTWCancel && beforeRestoration) {
          formControls['sldcchargingcode'].enable();
          formControls['sldcchargingcode'].setValidators([Validators.required]);
          formControls['sldcchargingcode'].updateValueAndValidity();
        }
      }


    }
  }

  matchTL(mnt: any): boolean {
    let cur_device = this.dialogData?.maintenanceDetails.device_name + (this.dialogData?.maintenanceDetails.maintenance_list?.tower_range ?? "");
    let same_device = mnt.device_name + (mnt.maintenance_list?.tower_range ?? "");
    return cur_device == same_device;
  }
  updatePTWData(new_ptw_id: any, backcharging_ids: any, reload: boolean = false) {
    if (new_ptw_id && this.dialogData?.maintenanceDetails?.ptw_ids?.length == 0 && this.dialogData.maintenanceDetails.requests_approves.ptw_requested_datetime > 0 && !this.dialogData.hv_lv_ptw) {
      this.dialogData.new_ptw_id = new_ptw_id[this.dialogData?.maintenanceDetails._id];
      //let ptw_id = "";
      //if (this.dialogData.common_sldc_mnts) {
      //  // executes when multiple maintenance with same bay has same sldc shutdown code, ptw will be kept same
      //  let mnt = this.mnt_on_same_bay.find(mnt => [...this.dialogData.common_sldc_mnts].some(mnt_id => mnt._id == mnt_id && mnt.ptw_ids && mnt.ptw_ids.length > 0));
      //  ptw_id = mnt ? mnt.ptw_ids[0] : "PTW-" + new_ptw_id;
      //}
      //else {
      //  ptw_id = "PTW-" + new_ptw_id;
      //}
      //this.form.patchValue({ ptw_id: ptw_id });
      let ptw_id = "";
      if (this.mnt_on_same_bay) {
        // executes when multiple maintenance with same bay has same sldc shutdown code, ptw will be kept same
        let mnt = this.mnt_on_same_bay.find(mnt => this.matchTL(mnt) && mnt.ptw_ids && mnt.ptw_ids.length > 0 && mnt.requests_approves_datetime.ptw_cancellation_issued_datetime == 0);
        ptw_id = mnt ? mnt.ptw_ids[0] : "PTW/" + this.dialogData.new_ptw_id;
      }
      else {
        ptw_id = "PTW/" + this.dialogData.new_ptw_id;
      }
      this.form.patchValue({ ptw_id: ptw_id });
    }

    if (backcharging_ids)
      this.backcharging_ids = backcharging_ids;

    if (reload) {
      this.ngOnInit();
    }
  }

  getDeviceNameLabel(): string {
    if (this.dialogData && this.dialogData.maintenanceDetails) {
      switch (this.dialogData.maintenanceDetails.maintenance_type) {
        case 'Substation':
          return this.locale_service.Locale.language.project.maintenancesettings.actiondlg.inputfields.substation;
        case 'Bay':
          return this.locale_service.Locale.language.project.maintenancesettings.actiondlg.inputfields.bay;
        case 'Equipment':
          return this.locale_service.Locale.language.project.maintenancesettings.actiondlg.inputfields.equipment;
      }
    }

  }

  handleCancellationDatetime(ptwDetails) {
    if (ptwDetails && ptwDetails.ptw_id && ptwDetails.cancel_datetime == 0) {
      this.form.get('cancel_datetime').setValue(Date.now());
      this.form.get('show_cancel_date').setValue(this.appservice.dateToString(Date.now()));
    } else if (ptwDetails && ptwDetails.ptw_id && ptwDetails.cancel_datetime != 0) {
      this.form.get('cancel_datetime').setValue(ptwDetails.cancel_datetime);
      this.form.get('show_cancel_date').setValue(this.appservice.dateToString(ptwDetails.cancel_datetime));
    }
  }

  checkboxValidator(control: FormControl) {
    return control.value ? null : { required: true };
  }

  getUserNameWithID() {
    const role_name = this.route.snapshot.root.firstChild.firstChild.data.viewData.access.role.role.role_name
    return role_name ? `${role_name}-${this.appservice.getUserName()} (${this.appservice.getLoginID()})` : `${this.appservice.getUserName()} (${this.appservice.getLoginID()})`
  }

  requestPTW() {
    let plan_mnt = this.dialogData.maintenanceDetails;
    plan_mnt.current_status = MaintenanceStatus.PTWRequested;
    plan_mnt.je = this.getUserNameWithID();

    // check from the list of active backcharging ids if exists assign during ptw request
    if (this.backcharging_ids && Object.keys(this.backcharging_ids).length > 0 && plan_mnt.backcharging_id && Object.keys(plan_mnt.backcharging_id).length > 0) {
      for (let connected_bay in plan_mnt.backcharging_id) {
        if (this.backcharging_ids[connected_bay])
          plan_mnt.backcharging_id[connected_bay] = this.backcharging_ids[connected_bay]
      }
      if (!Object.values(plan_mnt.backcharging_id).some(bc => bc == "")) {
        plan_mnt.requests_approves.ptw_requested_datetime = Date.now();
        plan_mnt.requests_approves.backcharging_issued_datetime = Date.now();
        plan_mnt.current_status = MaintenanceStatus.BCCertificateIssued; // status change if all backcharging issued
      }
    }

    if (this.all_cb_status_open && this.all_iso_status_open) {
      this.dialogData.maintenanceDetails.requests_approves.eventlog_ptw_datetime = Date.now();
      plan_mnt.requests_approves.eventlog_ptw_datetime = Date.now();
    }
    //let ptw_id = "";
    //if (this.mnt_on_same_bay) {
    //  // executes when multiple maintenance with same bay has same sldc shutdown code, ptw will be kept same
    //  let mnt = this.mnt_on_same_bay.find(mnt => mnt.ptw_ids && mnt.ptw_ids.length > 0);
    //  ptw_id = mnt ? mnt.ptw_ids[0] : "";
    //}
    //if (ptw_id) {
    //  plan_mnt.ptw_ids.push(ptw_id);
    //  plan_mnt.requests_approves.in_progress_datetime = Date.now();
    //  plan_mnt.current_status = MaintenanceStatus.InProgress;
    //}

    this.InProgress = true;
    this.mntservice.UpdatePlanMnt(plan_mnt).then(async data => {
      if (data != null) {
        if (data.code && data.code != null) {
          this.showToast(this.locale_service.Locale.language.errorcode.maintenance[data.code], this.locale_service.Locale.language.common.failed,
            {
              duration: 2000
            });
        } else {


          // Delete previous actionable notifications in this maintenance
          this.appservice.DeleteActionableNoticesByMtc(plan_mnt._id).then((result) => {
            if (result.deletedCount !== undefined) {
              console.log(`Deleted ${result.deletedCount} actionable notices`);
            } else {
              console.error('Error:', result.code);
            }
          });


          // Send actionable notification for PTW request
          const devicePath = plan_mnt.device_name.split('/');
          const substationPath = devicePath.slice(0, 5).join('/');

          let recieving_users = await this.appservice.GetUserIdsFromRight("issue_ptw_button", substationPath);

          this.appservice.sendActionableNotification(
            { id: this.appservice.getLoginID(), name: this.appservice.getUserName(), loginId:this.appservice.getLoginID() },
            recieving_users,
            [], // No groups needed
            `${this.appservice.unescapedName(`[MT_JRP] PTW Requested for ${plan_mnt.device_name.split("/").pop()} - ${plan_mnt.maintenance_list.template.maintenancename} by ${this.getUserNameWithID()}`)}`,
            MaintenanceStatus.PTWRequested,
            {
              maintenance_id: plan_mnt._id,
              target_view: 'Maintenance Dashboard',
              target_tab: 'Bay',
              expectedCompletionStatus: MaintenanceStatus.PTWIssued,
              currentStatus: MaintenanceStatus.PTWRequested
            },
            'Review PTW Request'
          );

          this.validateCheckBox();
          this.form.patchValue({ issuedto: plan_mnt.je });
          this.dialogData.maintenanceDetails = data;
          this.current_status = this.dialogData.maintenanceDetails.current_status;

          this.showToast(this.locale_service.Locale.language.project.maintenancesettings.snackbar.ptwrequestsuccess, this.locale_service.Locale.language.common.ok,
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

  requestBackcharging() {

    this.InProgress = true;
    let form_val = this.form.getRawValue();
    let mnt_details = this.dialogData.maintenanceDetails;
    if (mnt_details.ptw_ids.length == 0) {
      mnt_details.ptw_ids.push(form_val.ptw_id);
    }
    mnt_details.current_status = MaintenanceStatus.BCCertificateRequested;
    if (Object.values(mnt_details.backcharging_id).every(val => val)) {
      mnt_details.current_status = MaintenanceStatus.BCCertificateIssued;
    }
    mnt_details.operator = this.getUserNameWithID();

    // Delete previous actionable notifications in this maintenance
    this.appservice.DeleteActionableNoticesByMtc(mnt_details._id).then((result) => {
      if (result.deletedCount !== undefined) {
        console.log(`Deleted ${result.deletedCount} actionable notices`);
      } else {
        console.error('Error:', result.code);
      }
    });


    //if (this.maintenanceSkipXENSLDCStep && !this.below66KVVoltageLevel && !this.isConditional) {
    //  mnt_details.sldcshutdowncode = this.form.value.sldcshutdowncode;
    //  mnt_details.requests_approves.sldc_shutdown_code_issued_datetime = Date.now();
    //  this.IssueSLDCCodeOnSameBayAndConnectedTL('sldc_shutdown');
    //}

    this.mntservice.UpdatePlanMnt(mnt_details).then(async data => {
      if (data != null) {
        if (data.code && data.code != null) {
          this.showToast(this.locale_service.Locale.language.errorcode.maintenance[data.code], this.locale_service.Locale.language.common.failed,
            {
              duration: 2000
            });
        }
        else {
          this.current_status = this.dialogData.maintenanceDetails.current_status;
          // send Notifiation to Connected Line & TL according to mnt planned
          //const substation = data.device_name.split("/")[4];
          //this.appservice.sendNotificationDetails(data, "Backcharging Requested By " + substation, connected_ss);
          //this.formEmitter.emit(this.dialogData)          
          this.showToast(this.locale_service.Locale.language.project.maintenancesettings.snackbar.bcrequestsuccess, this.locale_service.Locale.language.common.ok,
            {
              duration: 2000
            });

          // Send actionable notification for NBF Requested
          const plan_mnt = this.dialogData.maintenanceDetails;
          let connected_ss = Object.keys(data.backcharging_id).map(bay => bay.split("/").slice(0, -1).join("/"));

          let recieving_users = [];
          for (let ss of connected_ss) {
            let res = await this.appservice.GetUserIdsFromRight("issue_ptw_button", ss);
            recieving_users = [...res, ...recieving_users];
          }

          this.appservice.sendActionableNotification(
            { id: this.appservice.getLoginID(), name: this.appservice.getUserName(), loginId:this.appservice.getLoginID() },
            recieving_users,
            [], // No groups needed
            `${this.appservice.unescapedName(`[MT_ORN] No Back Feeding Requested By ${plan_mnt.device_name.split("/").pop()} - ${plan_mnt.device_name.split("/").pop()}`)}`,
            MaintenanceStatus.BCCertificateRequested,
            {
              maintenance_id: plan_mnt._id,
              target_view: 'Maintenance Dashboard',
              target_tab: 'Backfeeding Requests',
              expectedCompletionStatus: MaintenanceStatus.BCCertificateIssued,
              currentStatus: MaintenanceStatus.BCCertificateRequested
            },
            'Issue NBF'
          );
        }
      }
      else {
        this.showToast(this.locale_service.Locale.language.errorcode.api, this.locale_service.Locale.language.common.failed,
          {
            duration: 2000
          });
      }
      this.InProgress = false;
    })

  }

  requestBackchargingCancel() {
    let plan_mnt = this.dialogData.maintenanceDetails;
    plan_mnt.current_status = MaintenanceStatus.BCCancelCertificateRequested;

    //if (this.form.value.sldcchargingcode && !plan_mnt.sldcchargingcode) { // with backcharging
    //  plan_mnt.sldcchargingcode = this.form.value.sldcchargingcode;
    //  plan_mnt.requests_approves.sldc_charging_code_issued_datetime = Date.now();
    //  this.IssueSLDCCodeOnSameBayAndConnectedTL('sldc_restore');
    //}
    this.InProgress = true;

    // Delete previous actionable notifications in this maintenance
    this.appservice.DeleteActionableNoticesByMtc(plan_mnt._id).then((result) => {
      if (result.deletedCount !== undefined) {
        console.log(`Deleted ${result.deletedCount} actionable notices`);
      } else {
        console.error('Error:', result.code);
      }
    });

    this.mntservice.UpdatePlanMnt(plan_mnt).then(async data => {
      if (data != null) {
        if (data.code && data.code != null) {
          this.showToast(this.locale_service.Locale.language.errorcode.maintenance[data.code], this.locale_service.Locale.language.common.failed,
            {
              duration: 2000
            });
        }
        else {
          this.current_status = this.dialogData.maintenanceDetails.current_status;
          this.showToast(this.locale_service.Locale.language.project.maintenancesettings.snackbar.bccancelsuccess, this.locale_service.Locale.language.common.ok,
            {
              duration: 2000
            });
          // send Notifiation to Connected Line & TL according to mnt planned
          const substation = data.device_name.split("/")[4];
          let connected_ss = Object.keys(data.backcharging_id).map(bay => bay.split("/").slice(0, -1).join("/"));
          //this.appservice.sendNotificationDetails(data, "Backcharging Cancel Requested By " + substation, connected_ss);

          // Send actionable notification for NBF Requested
          const plan_mnt = this.dialogData.maintenanceDetails;
          const devicePath = plan_mnt.device_name.split('/');

          let recieving_users = [];
          for (let ss of connected_ss) {
            let res = await this.appservice.GetUserIdsFromRight("issue_ptw_button", ss);
            recieving_users = [...res, ...recieving_users];
          }

          this.appservice.sendActionableNotification(
            { id: this.appservice.getLoginID(), name: this.appservice.getUserName(), loginId:this.appservice.getLoginID() },
            recieving_users,
            [], // No groups needed
            `${this.appservice.unescapedName(`[MT_ORNC] No Back Feeding Cancel Requested By ${plan_mnt.device_name.split("/").pop()} - ${substation}`)}`,
            MaintenanceStatus.BCCancelCertificateRequested,
            {
              maintenance_id: plan_mnt._id,
              target_view: 'Maintenance Dashboard',
              target_tab: 'Backfeeding Requests',
              expectedCompletionStatus: MaintenanceStatus.BCCancelCertificateIssued,
              currentStatus: MaintenanceStatus.BCCancelCertificateRequested
            },
            'Cancel NBF'
          );
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

  async saveSldcShutdownCode() {
    const shutdownCode = this.form.get('sldcshutdowncode')?.value?.trim();
    if (!shutdownCode) {
      this.showToast("Please enter Shutdown Code", "OK", { duration: 3000 });
      return;
    }
    var isDuplicateCode = await this.IsValidCode('S', shutdownCode);
    if (isDuplicateCode) {
      this.showToast(
        'Shutdown code already exists',
        'OK',
        { duration: 3000 }
      );
      return;
    }
    this.InProgress = true;

    const planMnt = { ...this.dialogData.maintenanceDetails };
    planMnt.sldcshutdowncode = shutdownCode;
    planMnt.requests_approves.sldc_shutdown_code_issued_datetime = Date.now();

    this.mntservice.UpdatePlanMnt(planMnt).then((updatedDoc) => {
      if (updatedDoc && !updatedDoc.code) {
        this.IssueSLDCCodeOnSameBayAndConnectedTL('sldc_shutdown');
        this.showToast("Shutdown Code saved successfully", "OK", { duration: 3000 });
      } else {
        this.showToast("Failed to save Shutdown Code", "OK", { duration: 4000, panelClass: 'error-snackbar' });
      }
    }).catch(() => {
      this.showToast("Error saving Shutdown Code", "OK", { duration: 4000, panelClass: 'error-snackbar' });
    }).finally(() => {
      this.InProgress = false;
    });
  }

  async saveSldcChargingCode() {
    const chargingCode = this.form.get('sldcchargingcode')?.value?.trim();
    if (!chargingCode) {
      this.showToast("Please enter Charging Code", "OK", { duration: 3000 });
      return;
    }
    var isDuplicateCode = await this.IsValidCode('C', chargingCode);
    if (isDuplicateCode) {
      this.showToast(
        'Charging code already exists',
        'OK',
        { duration: 3000 }
      );
      return;
    }

    this.InProgress = true;

    const planMnt = { ...this.dialogData.maintenanceDetails };
    planMnt.sldcchargingcode = chargingCode;
    planMnt.requests_approves.sldc_charging_code_issued_datetime = Date.now();

    this.mntservice.UpdatePlanMnt(planMnt).then((updatedDoc) => {
      if (updatedDoc && !updatedDoc.code) {
        this.IssueSLDCCodeOnSameBayAndConnectedTL('sldc_restore');
        this.showToast("Charging Code saved successfully", "OK", { duration: 3000 });
      } else {
        this.showToast("Failed to save Charging Code", "OK", { duration: 4000, panelClass: 'error-snackbar' });
      }
    }).catch(() => {
      this.showToast("Error saving Charging Code", "OK", { duration: 4000, panelClass: 'error-snackbar' });
    }).finally(() => {
      this.InProgress = false;
    });
  }

  async issuePTW() {
    let form_val = this.form.getRawValue();
    form_val.issuedby = this.getUserNameWithID();
    form_val.issuedto = this.dialogData?.maintenanceDetails.je;
    form_val._id = form_val.ptw_id;
    form_val.request_issue_datetime = Date.now();

    const confirmModal = await this.modalController.create({
      component: ConfirmationDlgComponent,
      componentProps: {
        dialogData: {
          Question: this.locale_service.Locale.language.project.maintenancesettings.maintenancebutton.issueptwbtn,
          YesText: this.locale_service.Locale.language.common.yes,
          NoText: this.locale_service.Locale.language.common.no
        }
      },
      cssClass: 'auto-height-modal'
    });
    await confirmModal.present();
    const { data: result } = await confirmModal.onDidDismiss();
    if (result) {
      this.InProgress = true;

      //if (this.maintenanceSkipXENSLDCStep && !this.below66KVVoltageLevel && !this.dialogData?.maintenanceDetails?.connected_bay && !this.isConditional) { // with out backcharging; SLDC Code
      //  let plan_mnt = this.dialogData.maintenanceDetails;
      //  //if (form_val.sldcshutdowncode && !plan_mnt.sldcshutdowncode) {
      //  //  plan_mnt.sldcshutdowncode = form_val.sldcshutdowncode;
      //  //  plan_mnt.requests_approves.sldc_shutdown_code_issued_datetime = Date.now();
      //  //  this.IssueSLDCCodeOnSameBayAndConnectedTL('sldc_shutdown');
      //  //}

      //  let data: any = await this.mntservice.UpdatePlanMnt(plan_mnt);
      //  if (data.code && data.code != null) {
      //    this.showToast(this.locale_service.Locale.language.errorcode.maintenance[data.code], this.locale_service.Locale.language.common.failed,
      //      {
      //        duration: 2000
      //      });
      //  }
      //  else {
      //    this.dialogData.maintenanceDetails = data;
      //  }
      //}

      form_val.connected_maintenance_id = this.getCommonPTWMaintenanceIDs();
      this.mntservice.AddPTW(form_val).then(async data => {
        if (data.code && data.code != null) {
          if (data.code != 'exists')
            this.showToast(this.locale_service.Locale.language.errorcode.maintenance[data.code], this.locale_service.Locale.language.common.failed,
              {
                duration: 2000
              });
          else
            this.showToast(this.locale_service.Locale.language.project.maintenancesettings.snackbar.ptwexists, this.locale_service.Locale.language.common.failed,
              {
                duration: 2000
              });
        }
        else {
          this.showToast(this.locale_service.Locale.language.project.maintenancesettings.snackbar.ptwissuesuccess, this.locale_service.Locale.language.common.ok,
            {
              duration: 2000
            });


          const plan_mnt = this.dialogData.maintenanceDetails;

          // Delete previous actionable notifications in this maintenance
          this.appservice.DeleteActionableNoticesByMtc(plan_mnt._id).then((result) => {
            if (result.deletedCount !== undefined) {
              console.log(`Deleted ${result.deletedCount} actionable notices`);
            } else {
              console.error('Error:', result.code);
            }
          });

          // Send actionable notification for PTW issue
          const devicePath = plan_mnt.device_name.split('/');
          const substationPath = devicePath.slice(0, 5).join('/');

          let recieving_users = await this.appservice.GetUserIdsFromRight("rqst_ptw_Button", substationPath);

          this.appservice.sendActionableNotification(
            { id: this.appservice.getLoginID(), name: this.appservice.getUserName(), loginId:this.appservice.getLoginID() },
            recieving_users,
            [], // No groups needed
            `${this.appservice.unescapedName(`[MT_OIP] PTW Issued for ${plan_mnt.device_name.split("/").pop()} - ${plan_mnt.maintenance_list.template.maintenancename}`)}`,
            MaintenanceStatus.PTWIssued,
            {
              maintenance_id: plan_mnt._id,
              target_view: 'Maintenance Dashboard',
              target_tab: 'Bay',
              expectedCompletionStatus: MaintenanceStatus.PTWCancelRequested,
              currentStatus: MaintenanceStatus.PTWIssued
            },
            'View PTW'
          );


          this.dialogData.maintenanceDetails.current_status = MaintenanceStatus.InProgress; // to update on stepper
          this.current_status = MaintenanceStatus.InProgress;
          this.dialogData.ptwDetails = data;
          this.ptwDataSource = data;
          this.form.patchValue(data);
          this.form.disable();
          // Load event logs from maintenance data
          this.loadEventLogsFromMaintenance();
          //this.formEmitter.emit(this.dialogData);
        }
        this.InProgress = false;
      });
    }
  }

  async requestPTWCancel() {
    let form_val = this.form.getRawValue();
    form_val.request_cancel_datetime = Date.now();
    form_val.connected_maintenance_id = this.getCommonPTWMaintenanceIDs();

    const modal = await this.modalController.create({
      component: PtwWorkCompletionDlgComponent,
      componentProps: { dialogData: { ptwDetails: form_val, maintenanceDetails: this.dialogData.maintenanceDetails } },
      cssClass: 'auto-height-modal'
    });
    await modal.present();
    const { data: result } = await modal.onDidDismiss();

    if (result) {
      this.dialogData.maintenanceDetails.current_status = MaintenanceStatus.PTWCancelRequested;
      this.dialogData.ptwDetails = result;
      this.form.patchValue(result);
      //this.formEmitter.emit(this.dialogData);
      this.current_status = this.dialogData.maintenanceDetails.current_status;
      this.disableReqPTWCancelBtn = true;
      this.form.get('ptwcancelcheckbox').disable();

      const plan_mnt = this.dialogData.maintenanceDetails;

      // Delete previous actionable notifications in this maintenance
      this.appservice.DeleteActionableNoticesByMtc(plan_mnt._id).then((res) => {
        if (res.deletedCount !== undefined) {
          console.log(`Deleted ${res.deletedCount} actionable notices`);
        } else {
          console.error('Error:', res.code);
        }
      });

      // Send actionable notification for PTW Cancel Request
      const devicePath = plan_mnt.device_name.split('/');
      const substationPath = devicePath.slice(0, 5).join('/');
      let recieving_users = [];
      try {
        recieving_users = await this.appservice.GetUserIdsFromRight("issue_ptw_button", substationPath);
      } catch (error) {
        console.error(error.code);
      }

      this.appservice.sendActionableNotification(
        { id: this.appservice.getLoginID(), name: this.appservice.getUserName(), loginId:this.appservice.getLoginID() },
        recieving_users,
        [],
        `${this.appservice.unescapedName(`[MT_JRPC] PTW Cancel Requested for ${plan_mnt.device_name.split("/").pop()} - ${plan_mnt.maintenance_list.template.maintenancename}`)}`,
        MaintenanceStatus.PTWCancelRequested,
        {
          maintenance_id: plan_mnt._id,
          target_view: 'Maintenance Dashboard',
          target_tab: 'Bay',
          expectedCompletionStatus: MaintenanceStatus.PTWCancellationIssued,
          currentStatus: MaintenanceStatus.PTWCancelRequested
        },
        'Cancel PTW'
      );
    }
  }

  // async transferPTW() {
  //   let form_val = this.form.getRawValue();
  //   const modal = await this.modalController.create({
  //     component: PtwTransferDlgComponent,
  //     componentProps: { dialogData: { ptwDetails: form_val } },
  //     cssClass: 'auto-height-modal'
  //   });
  //   await modal.present();
  // }

  async cancelPTW() {
    this.isCancelPTW = true;
    let form_val = this.form.getRawValue();
    let next_status = MaintenanceStatus.PTWCancellationIssued;

    if (!this.maintenanceSkipXENSLDCStep) {
      let connected_bay_ptw_active = this.dialogData.mnt_on_same_bay.filter(mnt => this.dialogData.maintenanceDetails.device_details != mnt.device_details && mnt.requests_approves_datetime.ptw_issued_datetime > 0 && mnt.requests_approves_datetime.ptw_cancellation_issued_datetime == 0).length > 0
      // same check with logic moved to after cancel ptw executes, because of recent feature change for same bay & same day ptw will be same, so for previous logic before cancel ptw not to conflict with this
      if (!this.dialogData.ptw_is_active_on_same_bay && this.mnt_on_same_bay && !connected_bay_ptw_active) { // on less than 66KV bays or if on same bay PTW is active or not cancelled keep PTWCancellationIssued else SLDCChargingCodeRequested
        // update all mnt of same bay
        if (!this.below66KVVoltageLevel) {
          next_status = MaintenanceStatus.SLDCChargingCodeRequested;
        }
      }
    }

    //if (this.maintenanceSkipXENSLDCStep && !this.below66KVVoltageLevel && !this.dialogData?.maintenanceDetails?.connected_bay) { // with out backcharging; SLDC Code
    //  let plan_mnt = this.dialogData.maintenanceDetails;
    //  //if (form_val.sldcchargingcode && !plan_mnt.sldcchargingcode) {
    //  //  plan_mnt.sldcchargingcode = form_val.sldcchargingcode;
    //  //  plan_mnt.requests_approves.sldc_charging_code_issued_datetime = Date.now();
    //  //  this.IssueSLDCCodeOnSameBayAndConnectedTL('sldc_restore');
    //  //}
    //  let data: any = await this.mntservice.UpdatePlanMnt(plan_mnt);
    //  if (data.code && data.code != null) {
    //    this.showToast(this.locale_service.Locale.language.errorcode.maintenance[data.code], this.locale_service.Locale.language.common.failed,
    //      {
    //        duration: 2000
    //      });
    //  }
    //  else {
    //    this.dialogData.maintenanceDetails = data;
    //  }
    //}


    form_val.cancel_datetime = Date.now();
    form_val.cancelledby = this.getUserNameWithID();
    this.InProgress = true;
    form_val.connected_maintenance_id = this.getCommonPTWMaintenanceIDs();
    this.mntservice.UpdatePTW(form_val, next_status, this.dialogData.maintenanceDetails._id).then(async data => {
      if (data.code && data.code != null) {
        this.showToast(this.locale_service.Locale.language.errorcode.maintenance[data.code], this.locale_service.Locale.language.common.failed,
          {
            duration: 2000
          });
      }
      else {
        this.showToast(this.locale_service.Locale.language.project.maintenancesettings.snackbar.ptwcancelsuccess, this.locale_service.Locale.language.common.ok,
          {
            duration: 2000
          });

        // ✅ DELETE ALL ACTIONABLE NOTIFICATIONS
        const plan_mnt = this.dialogData.maintenanceDetails;

        this.appservice.DeleteActionableNoticesByMtc(plan_mnt._id).then((result) => {
          if (result.deletedCount !== undefined) {
            console.log(`Deleted ${result.deletedCount} actionable notices (PTW Cancel Step)`);
          } else {
            console.error("Error while deleting actionable notices:", result.code);
          }
        });

        if (!this.maintenanceSkipXENSLDCStep) {
          let res_mnt = await this.mntservice.GetPlanMntByIds([...this.dialogData.mnt_on_same_bay.map(mnt => mnt._id), this.dialogData.maintenanceDetails._id]);
          if (res_mnt.code && res_mnt.code != null) {
            this.showToast(this.locale_service.Locale.language.errorcode.maintenance[res_mnt.code], this.locale_service.Locale.language.common.failed,
              {
                duration: 2000
              });
          }
          else {
            this.mnt_on_same_bay = (Object.values(res_mnt) as any[]).map(mnt => {
              mnt.requests_approves_datetime = mnt.requests_approves;
              mnt.isVoltagelevelNoSLDCExists = mnt.maintenance_list.voltage_level ? mnt.maintenance_list.voltage_level.trim().slice(0, 2) : "";
              mnt.from_all_connected_bays = this.mnt_on_same_bay.find(bay => bay._id == mnt._id)?.from_all_connected_bays;
              return mnt;
            });

            this.dialogData.ptw_is_active_on_same_bay = this.mnt_on_same_bay.some(bay =>
              bay.requests_approves_datetime.ptw_issued_datetime > 0 && bay.requests_approves_datetime.ptw_cancellation_issued_datetime == 0);
          }

          if (!this.dialogData.ptw_is_active_on_same_bay) { // on less than 66KV bays or if on same bay PTW is active or not cancelled keep PTWCancellationIssued else SLDCChargingCodeRequested
            // update all mnt of same bay
            if (!this.below66KVVoltageLevel) {
              next_status = MaintenanceStatus.SLDCChargingCodeRequested
            }

            let mod_mnts = this.mnt_on_same_bay.filter(bay =>
              ((bay.isVoltagelevelNoSLDCExists == "" || (bay.isVoltagelevelNoSLDCExists && parseInt(bay.isVoltagelevelNoSLDCExists) >= 66)) || bay.from_all_connected_bays) // if from_all_connected_bays true then its connected bay == allow 
              && bay.current_status == MaintenanceStatus.PTWCancellationIssued); // number of mnts that are on PTWCancellationIssued status & (voltage level "" or >= 66kv)
            if (mod_mnts.length > 0 && this.mnt_on_same_bay
              .filter(bay =>
                bay.requests_approves_datetime.ptw_issued_datetime > 0))         // filter all ptw activated bays & all are PTWCancellationIssued (above filtered)
            {

              // update all mnts to SLDCChargingCodeRequested rest blocked mnts will work automatically // in case of Skip XEN-SLDC it will be Backcharging Cancellation Requested or Restoration will be blocked
              let res_mnt_status_mod: any[] = (Object.values(mod_mnts) as any[]).map(mnt => {
                mnt.current_status = MaintenanceStatus.SLDCChargingCodeRequested;
                mnt.requests_approves.sldc_charging_code_requested_datetime = Date.now();
                return mnt
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
        }

        this.dialogData.maintenanceDetails.current_status = next_status; // to update on stepper
        this.form.patchValue(data);
        this.dialogData.ptwDetails = data;
        //this.formEmitter.emit(this.dialogData);
        this.current_status = this.dialogData.maintenanceDetails.current_status;

      }
      this.InProgress = false;
    });
  }

  async addEventLog(type: string = "") {

    if (type === 'restoration') {
      const hasCode = this.form.get('sldcchargingcode')?.value?.trim();
      const needsCode = !this.below66KVVoltageLevel && this.maintenanceSkipXENSLDCStep;

      if (needsCode && !hasCode) {
        this.showToast("Please enter SLDC Charging Code before restoration", "OK", { duration: 4000 });
        return;
      }
    }

    let view_id = this.route.snapshot.root.firstChild.firstChild.data.viewData.viewData._id;
    let form_val = this.form.getRawValue();
    let path = this.dialogData.maintenanceDetails.device_name
    if (this.dialogData.maintenanceDetails.maintenance_type == 'Equipment') {
      path = this.dialogData.maintenanceDetails.device_name.split('/').slice(0, -1).join('/')
    }

    // EventLogDlgComponent must be registered in the project module before use
    const eventLogModal = await this.modalController.create({
      component: EventLogDlgComponent,
      componentProps: {
        dialogData: {
          object_id: null,
          path: this.appservice.unescapedName(path),
          rpath: this.appservice.unescapedName(path.split('/').slice(-2).join('/')),
          object_list: this.object_list,
          view_id: view_id,
          type: "maintenance",
          maintenance_id: form_val.ptw_id,
          connected_lv_bay: this.connected_lv_bay,
          hvbay: this.dialogData.maintenanceDetails.maintenance_list.template.devicetype.toLowerCase().includes("hv bay"),
          isRestoration: type == "restoration",
          busbarbay: this.dialogData.maintenanceDetails.maintenance_list.template.devicetype.toLowerCase().includes("bus bar")
        },
        onEventsPerformed: (value: any) => {
          if (value && Object.keys(value).length > 0)
            this.captureEventLogsPerformed(this.dialogData.maintenanceDetails, value);
        }
      },
      cssClass: 'fullscreen-modal'
    });
    await eventLogModal.present();
    const { data: changed_obj } = await eventLogModal.onDidDismiss();
    {
      if (this.dialogData.maintenanceDetails.maintenance_list.template.devicetype.toLowerCase().includes("bus bar") && this.eventLogsPerformed.length > 0 && type == "restoration" && !this.dialogData.maintenanceDetails.requests_approves.restoration_completed_datetime) {
        let mnt = this.dialogData.maintenanceDetails;
        mnt.requests_approves.restoration_completed_datetime = Date.now();
        this.mntservice.UpdatePlanMnt(this.dialogData.maintenanceDetails).then(data => {
          if (data != null) {
            if (data.code && data.code != null) {
              this.showToast(this.locale_service.Locale.language.errorcode.maintenance[data.code], this.locale_service.Locale.language.common.failed,
                {
                  duration: 2000
                });
            }
            else {
              this.dialogData.maintenanceDetails = data;
              this.formDisableOnSkipXENSLDCStep();
              this.showToast(this.locale_service.Locale.language.project.maintenancesettings.snackbar.restorationsuccess, this.locale_service.Locale.language.common.ok,
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
      if (changed_obj) {

        //for (let obj of this.object_list) {
        //  if (obj?.id in changed_obj) {
        //    obj.value = !!changed_obj[obj.id];
        //  }
        //}

        //this.checkISOStatus();
        //this.checkCBStatus();
        // because we are mandatory restoring all objects in event log, checkin CB & ISO is unnecessary


        if (type == "restoration") { // && this.all_cb_status_close && this.all_iso_status_close) { // cb should be close & all ISO should be close/true
          this.InProgress = true;


          // ✅ DELETE ALL ACTIONABLE NOTIFICATIONS HERE
          const plan_mnt = this.dialogData.maintenanceDetails;

          this.appservice.DeleteActionableNoticesByMtc(plan_mnt._id).then((result) => {
            if (result.deletedCount !== undefined) {
              console.log(`Deleted ${result.deletedCount} actionable notices.`);
            } else {
              console.error("Error while deleting actionable notices:", result.code);
            }
          });


          if (this.dialogData.maintenanceDetails.backcharging_id) {
            // send Notifiation to Connected Line & TL according to mnt planned
            //const substation = this.dialogData.maintenanceDetails.device_name.split("/")[4];
            //let connected_ss = Object.keys(this.dialogData.maintenanceDetails.backcharging_id).map(bay => bay.split("/").slice(0, -1).join("/"));
            //const tl_path = this.dialogData.maintenanceDetails.maintenance_list.connected_line_path
            //connected_ss.push(tl_path);
            //this.appservice.sendNotificationDetails(this.dialogData.maintenanceDetails, "Restoration Happened in " + substation, connected_ss);
          }


          let res_mnt_status_mod: any[] = [];
          let inactive_sldc_auto_mnt = this.mnt_on_same_bay   // sldc_auto_code was given but ptw not requested (maintenance not started)
            .filter(bay => bay.requests_approves_datetime.ptw_requested_datetime == 0 && bay.requests_approves_datetime.sldc_auto_code);
          if (inactive_sldc_auto_mnt.length > 0) {
            let res_mnt = await this.mntservice.GetPlanMntByIds(inactive_sldc_auto_mnt.map(mnt => mnt._id))
            if (res_mnt.code && res_mnt.code != null) {
              this.showToast(this.locale_service.Locale.language.errorcode.maintenance[res_mnt.code], this.locale_service.Locale.language.common.failed,
                {
                  duration: 2000
                });
            } else { // update all mnts to SLDCShutdownCodeRequested
              res_mnt_status_mod = (Object.values(res_mnt) as any[]).map(mnt => {
                mnt.current_status = MaintenanceStatus.SLDCShutDownCodeRequested; // undo request as maintenance did not performed
                mnt.requests_approves.sldc_shutdown_code_issued_datetime = 0; // undo previously filled time
                mnt.sldcshutdowncode = "";
                mnt.sldc_auto_code = false;
                return mnt;
              });

            }
          }

          // if status was RestorationRequired & if on same bay any other mnt has RestorationRequired update to RestorationCompleted
          if (this.mnt_on_same_bay.length > 0 && this.dialogData.maintenanceDetails.current_status == MaintenanceStatus.RestorationRequired) {
            let res_mnt = await this.mntservice.GetPlanMntByDeviceNames([this.mnt_on_same_bay[0].device_name])
            if (res_mnt.code && res_mnt.code != null) {
              this.showToast(this.locale_service.Locale.language.errorcode.maintenance[res_mnt.code], this.locale_service.Locale.language.common.failed,
                {
                  duration: 2000
                });
            }
            else {
              let mod_mnt: any[] = res_mnt.filter(bay => (bay.shutdown_required
                && bay.requests_approves.restoration_completed_datetime > 0 && bay.current_status == MaintenanceStatus.RestorationRequired));
              if (mod_mnt.length > 0) {
                res_mnt_status_mod = res_mnt_status_mod.concat(mod_mnt.map(mnt => {
                  let hasMaintenance = mnt.activity_parameters ? mnt.activity_parameters.some(managedby => managedby.managedby == "je") : false;
                  let hasMNP = mnt.activity_parameters ? mnt.activity_parameters.some(managedby => managedby.managedby == "mnp") : false;
                  if ((hasMaintenance && mnt.requests_approves.parameter_approval_datetime == 0) || (hasMNP && mnt.requests_approves.mnp_parameter_datetime == 0))
                    mnt.current_status = MaintenanceStatus.RestorationCompleted;
                  else
                    mnt.current_status = MaintenanceStatus.Complete;
                }));

                if (res_mnt_status_mod.length > 0) {
                  let res_update = await this.mntservice.BulkUpdatePlanMnts(res_mnt_status_mod);
                  if (res_update.code && res_update.code != null) {
                    this.showToast(this.locale_service.Locale.language.errorcode.maintenance[res_update.code], this.locale_service.Locale.language.common.failed,
                      {
                        duration: 4000
                      });
                  }
                }
              }
            }
          }

          this.dialogData.maintenanceDetails.requests_approves.restoration_completed_datetime = Date.now();
          let mnt = this.dialogData.maintenanceDetails;
          let hasMaintenance = mnt.activity_parameters ? mnt.activity_parameters.some(managedby => managedby.managedby == "je") : false;
          let hasMNP = mnt.activity_parameters ? mnt.activity_parameters.some(managedby => managedby.managedby == "mnp") : false;
          if ((hasMaintenance && mnt.requests_approves.parameter_approval_datetime == 0) || (hasMNP && mnt.requests_approves.mnp_parameter_datetime == 0))
            mnt.current_status = MaintenanceStatus.RestorationCompleted;
          else
            mnt.current_status = MaintenanceStatus.Complete;

          this.current_status = mnt.current_status;
          this.formEmitter.emit(this.dialogData);
          this.formDisableOnSkipXENSLDCStep();

          //this.mntservice.UpdatePlanMnt(this.dialogData.maintenanceDetails).then(data => {
          //  if (data != null) {
          //    if (data.code && data.code != null) {
          //      this.showToast(this.locale_service.Locale.language.errorcode.maintenance[data.code], this.locale_service.Locale.language.common.failed,
          //        {
          //          duration: 2000
          //        });
          //    }
          //    else {
          //      this.current_status = MaintenanceStatus.RestorationCompleted;
          //      this.dialogData.maintenanceDetails = data;
          //      this.formEmitter.emit(this.dialogData);
          //      this.showToast(this.locale_service.Locale.language.project.maintenancesettings.snackbar.restorationsuccess, this.locale_service.Locale.language.common.ok,
          //        {
          //          duration: 2000
          //        });
          //    }
          //  } else {
          //    this.showToast(this.locale_service.Locale.language.errorcode.api, this.locale_service.Locale.language.common.failed,
          //      {
          //        duration: 2000
          //      });
          //  }
          //  this.InProgress = false;
          //});
          //  this.mntservice.UpdatePlanMnt(this.dialogData.maintenanceDetails).then(data => {
          //    if (data != null) {
          //      if (data.code && data.code != null) {
          //        this.showToast(this.locale_service.Locale.language.errorcode.maintenance[data.code], this.locale_service.Locale.language.common.failed,
          //          {
          //            duration: 2000
          //          });
          //      }
          //      else {
          //        this.current_status = mnt.current_status;
          //        this.dialogData.maintenanceDetails = data;
          //        this.formEmitter.emit(this.dialogData);
          //        this.showToast(this.locale_service.Locale.language.project.maintenancesettings.snackbar.restorationsuccess, this.locale_service.Locale.language.common.ok,
          //          {
          //            duration: 2000
          //          });
          //      }
          //    } else {
          //      this.showToast(this.locale_service.Locale.language.errorcode.api, this.locale_service.Locale.language.common.failed,
          //        {
          //          duration: 2000
          //        });
          //    }
          //    this.InProgress = false;
          //  });
          this.InProgress = false;
        }
        else if (type == 'ptw' && this.all_cb_status_open && this.all_iso_status_open) { // cb should be open & all ISO should be open/false
          this.InProgress = true;
          this.dialogData.maintenanceDetails.requests_approves.eventlog_ptw_datetime = Date.now();

          if (this.dialogData.maintenanceDetails.backcharging_id) {
            // send Notifiation to Connected Line & TL according to mnt planned
            //const substation = this.dialogData.maintenanceDetails.device_name.split("/")[4];
            //let connected_ss = Object.keys(this.dialogData.maintenanceDetails.backcharging_id).map(bay => bay.split("/").slice(0, -1).join("/"));
            //const tl_path = this.dialogData.maintenanceDetails.maintenance_list.connected_line_path
            //connected_ss.push(tl_path);
            //this.appservice.sendNotificationDetails(this.dialogData.maintenanceDetails, "Shutdown Happened in " + substation, connected_ss);

          }

          //commented for new flow
          //if (!this.dialogData.maintenanceDetails.ptw_ids.includes(this.form.get("ptw_id").value))
          //  this.dialogData.maintenanceDetails.ptw_ids.push(this.form.get("ptw_id").value);
          this.mntservice.UpdatePlanMnt(this.dialogData.maintenanceDetails).then(data => {
            if (data.code && data.code != null) {
              this.showToast(this.locale_service.Locale.language.errorcode.maintenance[data.code], this.locale_service.Locale.language.common.failed,
                {
                  duration: 2000
                });
            }
            else {
              this.dialogData.maintenanceDetails = data;
              this.showToast(this.locale_service.Locale.language.project.maintenancesettings.snackbar.eventlogsuccess, this.locale_service.Locale.language.common.ok,
                {
                  duration: 2000
                });
            }

            this.InProgress = false;
          });
        }
      }
    }
  }

  //ptw actions
  async GetEventLogObjects(): Promise<boolean> {
    try {
      // Fetch object list based on device name path
      let path = this.dialogData.maintenanceDetails.device_name;
      if (this.dialogData.maintenanceDetails?.maintenance_type === 'Equipment') {
        path = path.split('/').slice(0, 6).join('/');
      }
      let hv_lv_exists = (this.dialogData.maintenanceDetails.maintenance_list.template.devicetype.toLowerCase().includes("hv bay")
        || this.dialogData.maintenanceDetails.maintenance_list.template.devicetype.toLowerCase().includes("lv bay")) && this.dialogData.maintenanceDetails.connected_hv_lv_bay;

      let data = await this.signalr.GetObjectList(path);
      if (!data || data === 'hub') return false; // Early exit if not connected

      let obj_list = data || [];

      if (!hv_lv_exists)
        this.object_list = data || [];

      // check for HV Bay & add LV Bays CB & ISO's
      if (hv_lv_exists && this.dialogData.maintenanceDetails.connected_hv_lv_bay?.length > 0) {
        let lv_bay = this.dialogData.maintenanceDetails.connected_hv_lv_bay[0];
        this.connected_lv_bay = lv_bay.split("/").slice(-1)[0];
        let lv_bay_data = await this.signalr.GetObjectList(lv_bay);
        if (lv_bay_data && lv_bay_data !== 'hub') {
          for (let lv of lv_bay_data) {
            lv.additional_objects = true;
          }
          this.object_list = obj_list.concat(lv_bay_data);
        } else {
          this.object_list = obj_list;
        }
      }
      this.checkISOStatus(); // setting all ISO objects
      this.checkCBStatus(); // setting all CB objects
    } catch (e) {
      console.error(e);
      return false;
    } finally {
      setTimeout(() => { this.InProgress = false; }, 100);
    }
    return true;
  }
  checkCBStatus() {
    const cb_arr = this.object_list.filter(obj => obj.std == this.ObjectStandard.CBSTATUS);
    if (cb_arr.length == 0) {
      this.all_cb_status_open = true;
      this.all_cb_status_close = true;
      return;
    }
    this.all_cb_status_open = cb_arr.every(obj => !obj.value); // all CB obj should be OPEN/false for issuing PTW/Backcharging;
    this.all_cb_status_close = cb_arr.every(obj => obj.value); // all CB obj should be CLOSE/true for restoration;
  }

  checkISOStatus() {
    const iso_arr = this.object_list.filter(obj => obj.std == this.ObjectStandard.ISO);
    if (iso_arr.length == 0) {
      this.all_iso_status_open = true;
      this.all_iso_status_close = true;
      return;
    }
    this.all_iso_status_open = iso_arr.every(obj => !obj.value); // all ISO obj should be OPEN/false for issuing PTW/Backcharging;
    this.all_iso_status_close = iso_arr.every(obj => obj.value); // all ISO obj should be CLOSE/true for restoration;
  }
  getCommonPTWMaintenanceIDs() {
    let ptw_id = this.form.getRawValue().ptw_id;
    let connected_mnt_ids = [];
    if (this.mnt_on_same_bay)
      connected_mnt_ids = this.mnt_on_same_bay.filter(mnt => mnt.ptw_ids && mnt.ptw_ids.length > 0 && mnt.ptw_ids.includes(ptw_id)).map(mnt => mnt._id);
    connected_mnt_ids = [...connected_mnt_ids, this.dialogData?.maintenanceDetails._id];
    return connected_mnt_ids;
  }



  async IssueSLDCCodeOnSameBayAndConnectedTL(action: string) {

    this.InProgress = true;
    let success_msg = "";

    let device_names = [this.dialogData.maintenanceDetails.device_name];
    if (this.dialogData.maintenanceDetails.backcharging_id)
      device_names = [...device_names, ...Object.keys(this.dialogData.maintenanceDetails.backcharging_id)];

    if (this.dialogData.maintenanceDetails.connected_hv_lv_bay)
      device_names = [...device_names, ...this.dialogData.maintenanceDetails.connected_hv_lv_bay];

    // fetch all ACTIVE mnt on current device name & connected device names
    let res_mnt = await this.mntservice.GetPlanMntByDeviceNames(device_names);
    if (res_mnt.code && res_mnt.code != null) {
      this.showToast(this.locale_service.Locale.language.errorcode.maintenance[res_mnt.code], this.locale_service.Locale.language.common.failed,
        {
          duration: 2000
        });
    }
    else {
      let checkSLDCCodePatchValidation = (mnt: any, cur_mnt: any): boolean => {
        // other same bay mnt has Planned
        // for Backcharging: Before Backcharging Requested
        // for wo BC: Before PTW Issue
        if (action == "sldc_shutdown") {
          return cur_mnt.connected_bay
            ? mnt.requests_approves.backcharging_requested_datetime == 0
            : mnt.requests_approves.ptw_issued_datetime == 0
        }
        // other same bay mnt has PTW Issued
        // for Backcharging: Before Backcharging Cancel Requested
        // for wo BC: Before PTW Cancel
        else if (action == "sldc_restore" && mnt.requests_approves.ptw_cancellation_issued_datetime > 0) {
          return cur_mnt.connected_bay
            ? mnt.requests_approves.backcharging_cancel_requested_datetime == 0
            : mnt.requests_approves.restoration_completed_datetime == 0
        }
        return false;
      };
      res_mnt = res_mnt.filter(mnt => checkSLDCCodePatchValidation(mnt, this.dialogData.maintenanceDetails) && mnt._id != this.dialogData.maintenanceDetails._id);
    }
    if (!res_mnt || res_mnt.length == 0) {
      this.InProgress = false;
      return;
    }
    res_mnt = await this.mntservice.GetPlanMntByIds(res_mnt.map(mnt => mnt._id));
    if (res_mnt.code && res_mnt.code != null) {
      this.showToast(this.locale_service.Locale.language.errorcode.maintenance[res_mnt.code], this.locale_service.Locale.language.common.failed,
        {
          duration: 2000
        });
    }
    else {
      let res_mnt_status_mod: any[] = res_mnt.map(mnt => {
        if (action == "sldc_shutdown") {
          mnt.requests_approves.sldc_shutdown_code_issued_datetime = Date.now();
          mnt.sldcshutdowncode = this.form.value.sldcshutdowncode;
          success_msg = "SLDC Shutdown Code Issued Successfully";
        }
        else if (action == "sldc_restore") {
          mnt.requests_approves.sldc_charging_code_issued_datetime = Date.now();
          mnt.sldcchargingcode = this.form.value.sldcchargingcode;
          success_msg = "SLDC Charging Code Issued Successfully";
        }
        return mnt;
      });
      let res_update = await this.mntservice.BulkUpdatePlanMnts(res_mnt_status_mod);
      if (res_update.code && res_update.code != null) {
        this.showToast(this.locale_service.Locale.language.errorcode.maintenance[res_update.code], this.locale_service.Locale.language.common.failed,
          {
            duration: 4000
          });
      } else {
        this.showToast(success_msg, this.locale_service.Locale.language.common.success,
          {
            duration: 2000
          });

        // send Notifiation to Connected Line & TL according to mnt planned
        //const mnt = res_mnt_status_mod.find(mnt => mnt.backcharging_id);
        //if (mnt) {
        //  const status = mnt.current_status;
        //  const substation = mnt.device_name.split("/")[4];
        //  let connected_ss = Object.keys(mnt.backcharging_id).map(bay => bay.split("/").slice(0, -1).join("/"));
        //  const tl_path = mnt.maintenance_list.connected_line_path
        //  connected_ss.push(tl_path);

        //  if (status == MaintenanceStatus.SLDCShutDownCodeIssued)
        //    this.appservice.sendNotificationDetails(mnt, "Shutdown Code Issued by SLDC for " + substation, connected_ss);
        //  else if (status == MaintenanceStatus.SLDCChargingCodeIssued)
        //    this.appservice.sendNotificationDetails(mnt, "Charging Code Issued by SLDC for " + substation, connected_ss);
        //}
      }
    }
    this.InProgress = false;
  }

  // <= TEMPLATE GETTERS

  // ---- SHOW SLDC BLOCK ----
  get showSLDCBlock(): boolean {
    return this.maintenanceSkipXENSLDCStep
      && !this.below66KVVoltageLevel;
  }

  // ---- REQUEST PTW BUTTON ----
  get disableRequestPTW(): boolean {
    if (this.maintenanceBlockedByAssetDamage) return true;
    return this.dialogData.isFutureMaintenance || this.form.invalid
      || this.dialogData.mnt_to_be_restored_exists
      || !(this.current_status === MaintenanceStatus.RequestPTW
        || this.current_status === MaintenanceStatus.SLDCShutDownCodeIssued)
  }
  get showPTWCheckbox(): boolean {
    // if below 66 kv or conditional don't check CB/ISO
    const isObservationorConditionorHVLV = this.isHVLVMaintenance || this.isConditional || this.isObservationalMaintenance;
    return !this.ptwDataSource
      && this.resolver.MaintenanceAccessRights.issue_ptw_button
      && (
        this.dialogData?.maintenanceDetails?.connected_bay && this.current_status === MaintenanceStatus.BCCertificateIssued
        && (this.below66KVVoltageLevel || (this.all_cb_status_open && this.all_iso_status_open))
      );
  }

  // ---- ISSUE PTW BUTTON ----
  get disableIssuePTW(): boolean {
    // if maintenance is conditional or observation Event Log interlock is not required on Issue PTW: isObservationOrConditional
    const form_val = this.form?.getRawValue();
    //in case 66kv below device shutdown code is not required
    const validSDCode = !!this.dialogData.maintenanceDetails.sldcshutdowncode || this.below66KVVoltageLevel;
    const isLineBay = !!this.dialogData?.maintenanceDetails?.connected_bay;
    const CbIsoOpen = this.all_cb_status_open && this.all_iso_status_open;
    const isConditional = this.isConditional;
    const ptwChecked = this.form?.get('ptwissuecheckbox')?.value;

    //IN CASE OF HV LV MAINTENANCE AND OBSERVATION AND CONDITIONAL MAINTENANCE NO NEED TO CHECK FOR CB IS OPEN OR NOT
    const skipCbIsoCheck = this.isHVLVMaintenance && (isConditional || this.isObservationalMaintenance);

    if (this.InProgress) return true;
    if (this.maintenanceBlockedByAssetDamage) return true;

    //IF CB STEP IS NOT SKIPPED AND CB OR ISO IS CLOSED FOR THE DEVICE DISABLE THE BUTTON
    if (!skipCbIsoCheck && (!this.all_cb_status_open || !this.all_iso_status_open)) {
      return true;
    }

    let enable = false;

    if (isLineBay) {
      if (isConditional) {
        //FOR LINE BAY CHECKBOX AND STATUS SHOULD BE BCCertificateIssued
        enable = this.current_status === MaintenanceStatus.BCCertificateIssued && ptwChecked;
      } else {
        enable = validSDCode && this.current_status === MaintenanceStatus.BCCertificateIssued && ptwChecked;
      }
    } else {
      if (isConditional) {
        enable = this.current_status === MaintenanceStatus.PTWRequested;
      } else {
        enable = validSDCode && this.current_status === MaintenanceStatus.PTWRequested;
      }
    }

    return !enable;



    //return this.InProgress || (LineBayMnt && !form_val.ptwissuecheckbox)
    //  || (!this.isObservationOrConditional && !(this.all_cb_status_open && this.all_iso_status_open))
    //  || (
    //  LineBayMnt
    //    ? this.current_status !== MaintenanceStatus.BCCertificateIssued
    //    : (this.current_status !== MaintenanceStatus.PTWRequested || !validSDCode)
    //  );
  }
  // ---- REQUEST BACKCHARGING ----
  get disableRequestBackCharging(): boolean {
    if (this.maintenanceBlockedByAssetDamage) return true;
    const planMnt = { ...this.dialogData.maintenanceDetails };
    return this.InProgress
      || (!planMnt.sldcshutdowncode && !this.isConditional)
      || !(this.current_status === MaintenanceStatus.PTWRequested)
  }
  // ---- REQUEST BACKCHARGING CANCEL ----
  get disableRequestBackChargingCancel(): boolean {
    if (this.maintenanceBlockedByAssetDamage) return true;
    const planMnt = { ...this.dialogData.maintenanceDetails };
    return this.InProgress
      || this.form.invalid
      || this.dialogData.ptw_is_active_on_same_bay
      || (!this.below66KVVoltageLevel &&
        (this.maintenanceSkipXENSLDCStep
          ? (this.current_status !== MaintenanceStatus.PTWCancellationIssued)
          : (this.current_status !== MaintenanceStatus.SLDCChargingCodeIssued)
        )
      )
      || (this.below66KVVoltageLevel &&
        this.current_status !== MaintenanceStatus.PTWCancellationIssued
      )
      || !planMnt.sldcchargingcode;
  }
  // ---- CANCEL PTW BUTTON ----
  get disableCancelPTW(): boolean {
    if (this.maintenanceBlockedByAssetDamage) return true;
    return this.InProgress
      || this.form.invalid
      || this.isCancelPTW
      || !this.dialogData.ptw_cancellation_requested_on_all_same_bay // ptw_cancellation_requested_on_all_same_bay: till all mnt on same bay has ptw cancellation request check box remains disable
      || this.current_status !== MaintenanceStatus.PTWCancelRequested;
  }

  get showCancelPTW(): boolean {
    return this.resolver.MaintenanceAccessRights.issue_ptw_button &&
      (!this.below66KVVoltageLevel ||
        (this.current_status !== MaintenanceStatus.PTWCancellationIssued &&
          this.current_status !== MaintenanceStatus.BCCancelCertificateIssued))
  }

  // ---- REQUEST PTW CANCEL CHECKBOX ----
  get showRequestPTWCancelCheckbox(): boolean {
    return this.resolver.MaintenanceAccessRights.rqst_ptw_Button && this.current_status == MaintenanceStatus.InProgress
  }
  // ---- REQUEST PTW CANCEL ----
  get disableRequestPTWCancel(): boolean {
    if (this.maintenanceBlockedByAssetDamage) return true;
    const form_val = this.form?.getRawValue();
    return this.current_status !== MaintenanceStatus.InProgress
      || this.disableReqPTWCancelBtn
      || !form_val.ptwcancelcheckbox;
  }

  get disableRestoration(): boolean {
    if (this.maintenanceBlockedByAssetDamage) return true;

    // Restoration is blocked if SLDC charging code is required but missing
    const needsChargingCode = !this.below66KVVoltageLevel && this.maintenanceSkipXENSLDCStep;
    const planMnt = { ...this.dialogData.maintenanceDetails };

    return this.InProgress
      || (needsChargingCode && !planMnt.sldcchargingcode)
      || !this.dialogData.isAccess;
  }

  get disableEventLog(): boolean {
    if (this.maintenanceBlockedByAssetDamage) return true;
    const needsChargingCode = !this.below66KVVoltageLevel && this.maintenanceSkipXENSLDCStep;
    const planMnt = { ...this.dialogData.maintenanceDetails };

    return this.InProgress
      || !this.dialogData.isAccess
      || (!this.isConditional && needsChargingCode && !planMnt.sldcshutdowncode);
  }

  // ---- ngIf SECTION SHOW/HIDE LOGIC ----
  get showRestorationButtonSection(): boolean {
    return this.resolver.MaintenanceAccessRights.issue_ptw_button
      && !this.dialogData?.maintenanceDetails.hasOwnProperty("is_non_initiator_on_hold")
      && !(this.dialogData?.ptw_is_active_on_same_bay && this.current_status === MaintenanceStatus.PTWCancellationIssued) // when backcharging is not applicable & status is PTW Cancelled & other mnts (same bay or line) have PTW active, then Restoration is visible when it should not.
      &&
      (
        (!this.dialogData?.ptw_is_active_on_same_bay && this.current_status === MaintenanceStatus.RestorationRequired)
        ||
        (this.dialogData?.maintenanceDetails?.connected_bay
          ? this.current_status === MaintenanceStatus.BCCancelCertificateIssued
          : (this.current_status === MaintenanceStatus.SLDCChargingCodeIssued
            || ((this.below66KVVoltageLevel || this.maintenanceSkipXENSLDCStep)
              && this.current_status === MaintenanceStatus.PTWCancellationIssued)
          )
        )
      );
  }

  get showEventLogSection(): boolean {
    const form_val = this.form?.getRawValue();

    const hasBusBar = this.dialogData?.maintenanceDetails?.maintenance_list
      ?.template?.devicetype
      ?.toLowerCase()
      ?.includes('bus bar');

    const objectListCondition = hasBusBar || this.object_list?.length > 0;

    return !this.ptwDataSource
      && form_val.ptw_id
      && objectListCondition
      && this.resolver.MaintenanceAccessRights.issue_ptw_button
      && (
        this.dialogData?.maintenanceDetails?.connected_bay
          ? ((this.below66KVVoltageLevel || this.isConditional || form_val.sldcshutdowncode)
            && this.current_status === MaintenanceStatus.BCCertificateIssued)
          : ((this.below66KVVoltageLevel || this.isConditional || form_val.sldcshutdowncode)
            && this.current_status === MaintenanceStatus.PTWRequested)
      );
  }




  // TEMPLATE GETTERS =>

  async captureEventLogsPerformed(plan_mnt: any, event_performed: any) {
    let eventLogEntry: any[] = [];

    for (let obj_id in event_performed) {
      let obj = event_performed[obj_id];
      let obj_exists = this.eventLogsPerformed.find(event_obj => event_obj.object_id == obj.id);
      const previousStatus = obj_exists ? obj_exists.previous_status : obj.prev_value;
      let currentStatus = obj.value;
      let isPerformed = currentStatus !== previousStatus;

      eventLogEntry.push({
        object_id: obj.id,
        object_type: obj.std,
        display_name: obj.DisplayName,
        previous_status: previousStatus,
        current_status: currentStatus,
        text_std: obj.text_std,
        is_performed: isPerformed,
        timestamp: obj.datetime,
        parent_name: obj_exists ? obj_exists.parent_name : null
      });

    }
    let details_to_fetch = eventLogEntry.filter(ev => ev.parent_name == null).map(ev => ev.object_id);
    if (details_to_fetch.length > 0) {
      let obj_details = await this.signalr.GetObjectDeviceNameByID(details_to_fetch);
      eventLogEntry = eventLogEntry.map(event => { if (obj_details.hasOwnProperty(event.object_id)) event.parent_name = obj_details[event.object_id]; return event; });
    }
    if (eventLogEntry.length > 0) {
      this.eventLogsPerformed = eventLogEntry;

      plan_mnt.event_logs_performed = this.eventLogsPerformed;
      plan_mnt.requests_approves.eventlog_ptw_datetime = Date.now();
      this.mntservice.UpdatePlanMnt(plan_mnt).then(data => {
        if (data.code && data.code != null) {
          this.showToast(this.locale_service.Locale.language.errorcode.maintenance[data.code], this.locale_service.Locale.language.common.failed,
            {
              duration: 2000
            });
        }
        else {
          this.dialogData.maintenanceDetails = data;
        }
      });
    }
  }

  loadEventLogsFromMaintenance(): void {
    if (!this.dialogData?.maintenanceDetails) {
      this.eventLogsPerformed = [];
      return;
    }

    const maintenanceData = this.dialogData.maintenanceDetails;

    if (maintenanceData.event_logs_performed && Array.isArray(maintenanceData.event_logs_performed) && maintenanceData.event_logs_performed.length > 0) {
      this.eventLogsPerformed = maintenanceData.event_logs_performed.map((log: any) => {

        return {
          object_id: log.object_id,
          object_type: log.object_type,
          display_name: log.display_name || 'Unknown',
          previous_status: log.previous_status,
          current_status: log.current_status,
          prev_text: log.text_std.find(std => std.s_on_value == log.previous_status).s_text,
          cur_text: log.text_std.find(std => std.s_on_value == log.current_status).s_text,
          text_std: log.text_std,
          is_performed: log.is_performed !== undefined ? log.is_performed : (log.previous_status !== log.current_status),
          timestamp: log.timestamp,
          parent_name: log.parent_name
        };
      });
    } else {
      this.eventLogsPerformed = [];
    }

    this.eventLogs = this.eventLogsPerformed.reduce((acc, item) => {
      const key = item.parent_name;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(item);
      return acc;
    }, {});
  }


  openEventPerformedDialog() {

    const groupedByParent = this.eventLogsPerformed.reduce((acc, item) => {
      const key = item.parent_name;

      if (!acc[key]) {
        acc[key] = [];
      }

      acc[key].push(item);
      return acc;
    }, {});

    this.groupedEventLogs = groupedByParent;
    this.showEventLogModal = true;
  }

  pdfConfig = {
    type: 'pdf',
    elementIdOrContent: 'ptwPDF',
    options: {
      margin: [20, 15, 20, 15],
      jsPDF: {
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      },
      html2canvas: {
        scale: 2
      }
    }
  };


  pdfCallbackFn(pdf: any) {
    const totalPages = pdf.internal.getNumberOfPages();

    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);

      pdf.setFontSize(9);
      pdf.text(
        `Page ${i} of ${totalPages}`,
        pdf.internal.pageSize.getWidth() - 30,
        pdf.internal.pageSize.getHeight() - 10
      );
    }
  }

  export(type: string, orientation: 'portrait' | 'landscape' = 'landscape') {
    this.exportModalData = {
      ptwDataSource: this.ptwDataSource,
      maintenanceDetails: this.dialogData.maintenanceDetails,
      eventLogs: this.eventLogs
    };
    this.showExportModal = true;

    // After modal content renders, trigger PDF export
    setTimeout(() => {
      const el = document.getElementById('ptwPDF');
      if (!el || el.offsetHeight === 0) {
        console.error('PDF DOM not ready');
        return;
      }
      this.pdfConfig.type = type;
      (this.pdfConfig.options.jsPDF as any).orientation = orientation;
      // exportAsService.save(this.pdfConfig, `PTW_${this.ptwDataSource.ptw_id}`)
      //   .subscribe(() => console.log('PTW PDF exported'));
    }, 300);
  }


  get isLineBayMaintenance() {
    const paths = this.dialogData?.maintenanceDetails?.maintenance_list?.connected_line_path;
    if (!paths) return false;
    return Array.isArray(paths) ? paths.length > 0 : true;
  }

  async IsValidCode(type: string, code: string) {
    const isDuplicate = await this.mntservice.isDuplicateCode(type, code);
    return isDuplicate;
  }
}
