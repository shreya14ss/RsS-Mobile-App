import { Component, OnInit, Input, ChangeDetectorRef } from '@angular/core';
import { LocaleService } from '../../../../../core/services/locale/locale.service';
import { FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { MatTableDataSource } from '@angular/material/table';
import { AppService } from '../../../../../core/services/app.service';
import { MaintenanceService } from '../../../../../core/services/maintenance.service';
import { ActivatedRoute } from '@angular/router';
import { ProjectResolverService } from '../../../../../core/services/project-resolver.service';
import { SignalRService } from '../../../../../core/services/signal-r.service';
import { ModalController, ToastController } from '@ionic/angular';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ObservationActionDlgComponent } from './observation-action-dlg/observation-action-dlg.component';

export interface CreateObservationPayload {
  connected_maintenance_id: string,
  tower_range: string,
  tower_type: string,
  tower_s: string,
  tower_e: string,
  device_name: string,
  description: string,
  device_master_id: string,
  equipment_name: string,
  device_type: 'Bay' | 'Substation' | 'Equipment' | 'TL',
  bay_path: string,
  bay_type: string,
  time: number,
  maintenance_type: string,
  observations: string,
  remarks: string,
  status: string,
  userid: string,
  observationtype: string,
  scheduled_status: string,
  reason: string,
}

@Component({
  selector: 'app-observation-dlg',
  templateUrl: './observation-dlg.component.html',
  styleUrls: ['./observation-dlg.component.scss']
})
export class ObservationDlgComponent implements OnInit {

  @Input() dialogData: any;

  form: FormGroup;
  InProgress = false;
  saving: boolean = false;
  observationDatasource: MatTableDataSource<any>;
  observationDetails: any;
  maintenanceDetails: any;
  observation_list: any;
  historyDatasource = new MatTableDataSource<any>();
  historyExpanded: boolean = true;
  isOutOfRange = false;
  filteredObservationStatus: any = { ...this.locale_service.Locale.language.project.maintenancesettings.observationstatus };
  cb_status: boolean = false;
  previousStatusValue: any;
  equipment_name_list: any = ['NA'];
  fullEquipmentList: string[] = [];
  displayPath: string = '';
  showPathButton: boolean;
  group_path: string;
  isStartMaintenanceButtondisabled: boolean;
  showPathInputBox: boolean;
  alarmObjectDetails: any;
  alarmValue: boolean;
  min: Number;
  max: Number;
  showStatusChangeWarning: boolean;
  connectedBayMaintenance: any[];
  connectedTLMaintenance: any[];
  observationSearchCtrl = new FormControl('');
  filteredObservationList: any[] = [];
  isBayObservation: boolean = false;
  norder = () => 0;

  constructor(
    private cdr: ChangeDetectorRef,
    public signalr: SignalRService,
    public locale_service: LocaleService,
    private route: ActivatedRoute,
    private formBuilder: FormBuilder,
    public appservice: AppService,
    private toastController: ToastController,
    public mntservice: MaintenanceService,
    public modalController: ModalController,
    public resolver: ProjectResolverService,
  ) { }

  ngOnInit(): void {
    this.saving = true;
    this.group_path = this.route.snapshot.root.firstChild.firstChild.data.viewData.group_path;
    this.observationDetails = this.dialogData?.observationDetails;

    if (this.dialogData?.observationDetails?.history) {
      this.historyDatasource.data = this.dialogData?.observationDetails.history;
    }

    this.form = this.formBuilder.group({
      device_master_id: this.observationDetails ? this.observationDetails.device_master_id : this.dialogData.maintenanceDetails.maintenance_list.device_master_id,
      connected_maintenance_id: this.observationDetails ? this.observationDetails.connected_maintenance_id : this.dialogData._id,
      device_name: this.observationDetails ? this.observationDetails.device_name : this.dialogData.device_name,
      tower_range: this.observationDetails ? this.observationDetails.tower_range : this.dialogData.tower_range,
      device_type: this.observationDetails ? this.observationDetails.device_type : this.dialogData.device_type,
      maintenance_type: this.observationDetails ? this.observationDetails.maintenance_type : this.dialogData.maintenance_type,
      observation_id: this.observationDetails ? this.observationDetails.observation_id : '',
      observationtype: this.observationDetails ? this.observationDetails.observationtype : this.dialogData.observationtype,
      tower_type: this.observationDetails ? this.observationDetails.tower_type : 'Tower',
      tower_s: [this.observationDetails ? this.observationDetails.tower_s : '', Validators.required],
      tower_e: this.observationDetails ? this.observationDetails.tower_e : '',
      time: this.observationDetails ? this.observationDetails.time : Date.now(),
      description: [this.observationDetails ? this.observationDetails.description : '', Validators.required],
      equipment_name: this.observationDetails ? this.observationDetails.equipment_name : 'NA',
      observations: [this.observationDetails ? this.observationDetails.observations : '', !this.observationDetails ? [Validators.required] : []],
      remarks: this.observationDetails ? this.observationDetails?.remarks : '',
      status: this.observationDetails ? this.observationDetails.status : 'open',
      userid: this.observationDetails ? this.observationDetails.userid : this.getUserNameWithID(),
      display_device_name: '',
      scheduled_status: this.observationDetails ? this.observationDetails.scheduled_status : 'NA',
      searchinput: [""]
    });

    if (!this.observationDetails) {
      if (this.dialogData.dlg && (this.dialogData.device_type == 'Bay' && this.dialogData.observationtype == 'je_tl')) {
        let tl_path = this.dialogData.maintenanceDetails.maintenance_list.connected_line_path;
        this.form.patchValue({ display_device_name: this.appservice.unescapedName(tl_path.split('/').pop()) });
      } else {
        this.form.patchValue({ display_device_name: this.appservice.unescapedName(this.form.get('device_name')?.value?.split('/').pop()) });
      }
    } else {
      if (this.form.value.equipment_name && this.form.value.equipment_name != 'NA') {
        this.form.patchValue({ display_device_name: this.appservice.unescapedName(this.form.value.equipment_name) });
      } else {
        this.form.patchValue({ display_device_name: this.appservice.unescapedName(this.form.get('device_name')?.value?.split('/').pop()) });
      }
    }

    if (this.dialogData.device_type === 'Substation' && (this.form.get('status')?.value === 'requireshutdown' || this.observationDetails?.bay_path != null)) {
      this.showPathInputBox = true;
      if (!this.form.get('bay_path')) {
        this.form.addControl('bay_path', new FormControl(''));
      }
      if (!this.form.get('display_bay_path')) {
        this.form.addControl('display_bay_path', new FormControl(''));
      }
      if (this.observationDetails.bay_path) {
        this.form.patchValue({ bay_path: this.observationDetails.bay_path, display_bay_path: this.appservice.unescapedName(this.observationDetails.bay_path) });
      }
    }

    if (this.dialogData.disable) {
      this.form.get("observations").disable();
      this.form.get("tower_type").disable();
      this.form.get("tower_s").disable();
      this.form.get("tower_e").disable();
      this.form.get("time").disable();
      this.form.get("description").disable();
    }

    if (this.dialogData?.readonly) {
      this.form.controls['observations'].disable();
      this.form.controls['tower_type'].disable();
      this.form.controls['tower_s'].disable();
      this.form.controls['tower_e'].disable();
      this.form.controls['status'].disable();
      this.form.controls["equipment_name"].disable();
    }

    if (this.observationDetails?.parameter_details) {
      this.form.addControl('min', new FormControl({ value: this.observationDetails.parameter_details.min, disabled: true }));
      this.form.addControl('max', new FormControl({ value: this.observationDetails.parameter_details.max, disabled: true }));
      this.form.addControl('value', new FormControl(this.observationDetails.parameter_details.value ?? 'NaN'));

      let formval = this.form.getRawValue();
      if ((formval.value >= this.observationDetails?.parameter_details?.min && formval.value <= this.observationDetails?.parameter_details?.max) && formval.status !== 'close' && formval.status != "fixed")
        this.showStatusChangeWarning = true;
      else
        this.showStatusChangeWarning = false;
    }

    if (this.observationDetails?.connected_object_id != null) {
      this.saving = true;
      this.mntservice.GetObjectDetails(this.observationDetails.connected_object_id).then((data) => {
        if (data == null) {
          this.showToast("Error Fetching Object Details");
        } else {
          this.alarmObjectDetails = data;
          this.alarmValue = data.value;
        }
        this.saving = false;
      });
    }

    const isTL = this.shouldShowContainer();
    if (isTL) {
      if (this.form.value.tower_type == 'tower') {
        this.observationList("maintenance_observation_list_tower");
      } else {
        this.observationList("maintenance_observation_list_span");
      }
    } else {
      this.observationList("maintenance_observation_list");
    }

    this.observationSearchCtrl.valueChanges
      .pipe(debounceTime(200), distinctUntilChanged())
      .subscribe(search => {
        const value = (search || '').toLowerCase();
        this.filteredObservationList = this.observation_list.filter(ob =>
          ob.ob?.toLowerCase().includes(value)
        );
      });

    if (this.dialogData.observationtype) {
      if (!this.resolver.MaintenanceAccessRights.maintenence_input_save_submit && this.resolver.MaintenanceAccessRights.tl_maintenance_parameter_input_save_submit) {
        // For a JETL-only user, the addControl below REPLACES the tower controls
        // (and their disabled state from lines ~153-169) with fresh ones. Without
        // carrying the disable flag through, updating an existing observation
        // would leave the tower range editable — the client app has the same bug
        // in principle but isn't hit because ClientApp users on this test have JE
        // rights, which skips this branch entirely. Preserve the disabled state
        // by constructing the new controls with { disabled: true } when the
        // dialog was opened in update (disable) or readonly mode.
        const lockTowers = !!this.dialogData.disable || !!this.dialogData.readonly;
        this.form.addControl('tower_type', new FormControl({ value: this.observationDetails ? this.observationDetails.tower_type : 'Tower', disabled: lockTowers }));
        this.form.addControl('tower_s', new FormControl({ value: this.observationDetails ? this.observationDetails.tower_s : '', disabled: lockTowers }, Validators.required));
        this.form.addControl('tower_e', new FormControl({ value: this.observationDetails ? this.observationDetails.tower_e : '', disabled: lockTowers }));
      }
    }

    if (this.observationDetails && !this.dialogData.dlg) {
      Object.keys(this.form.controls).forEach((field) => {
        if (field !== 'remarks' && field !== 'status' && field !== 'min' && field !== 'max' && field !== 'value' && field !== 'display_bay_path' && field !== 'equipment_name') {
          this.form.get(field)?.disable();
        }
      });
    }

    if (this.dialogData.device_type == "Bay" || this.dialogData?.observationDetails?.device_name?.split('/').length == 6) {
      if (this.dialogData.associated_eq && this.dialogData?.associated_eq.length > 0) {
        this.equipment_name_list.push(...this.dialogData?.associated_eq);
      } else {
        let form_val = this.form.getRawValue();
        this.mntservice.GetEquipmentNamesList(this.dialogData?.device_name ?? form_val.device_name).then((data) => {
          if (data.code && data.code != null) {
            this.showToast(this.locale_service.Locale.language.errorcode.maintenance[data.code]);
          } else {
            this.equipment_name_list = [...this.equipment_name_list, ...data];
            this.equipment_name_list = Array.from(new Set(this.equipment_name_list));
          }
        });
      }
    }

    if (this.dialogData.device_type == "Equipment") {
      if (this.form.get("equipment_name").value != 'NA' && this.form.get("equipment_name").value !== null) {
        this.equipment_name_list.push(this.observationDetails.equipment_name);
      }
    }

    if (this.form.get("equipment_name").value != 'NA' && this.form.get("equipment_name").value !== null) {
      this.equipment_name_list.push(this.observationDetails.equipment_name);
    }

    if ((this.form.value.scheduled_status && this.form.value.scheduled_status != 'NA') || this.form.value.status == 'close')
      this.form.controls["equipment_name"].disable();

    this.equipment_name_list = Array.from(new Set(this.equipment_name_list));
    this.isRemarksReq(this.form.value.status);
    this.filterStatusOptions();
    this.saving = false;
    this.fullEquipmentList = [...this.equipment_name_list];
  }

  ngAfterViewInit() {
    if (!this.observationDetails) {
      if (this.form.value.device_type == 'TL' || (this.form.value.device_type == 'Bay' && this.form.value.observationtype == 'je_tl')) {
        const towers = this.dialogData.maintenanceDetails.maintenance_list.tower_range.split('-');
        this.min = Number(towers[0]);
        this.max = Number(towers[1]);

        this.form.get('tower_type')?.valueChanges.subscribe(type => {
          setTimeout(() => {
            const towerS = this.form.get('tower_s')?.value;
            const towerE = this.form.get('tower_e')?.value;
            if (towerS < this.min || towerS > this.max) {
              this.form.get('tower_s')?.setErrors({ range: true });
            } else {
              this.form.get('tower_s')?.setErrors(null);
            }
            if (type === 'Inter Tower') {
              if (towerE > this.max) {
                this.form.get('tower_e')?.setErrors({ range: true });
              } else {
                this.form.get('tower_e')?.setErrors(null);
              }
            } else {
              this.form.get('tower_e')?.setErrors(null);
            }
          });
        });

        this.form.get('tower_s')?.valueChanges.subscribe(value => {
          setTimeout(() => {
            if (value < this.min || value > this.max) {
              this.form.get('tower_s')?.setErrors({ range: true });
            } else {
              this.form.get('tower_s')?.setErrors(null);
            }
          });
        });

        this.form.get('tower_e')?.valueChanges.subscribe(value => {
          setTimeout(() => {
            if (this.form.get('tower_type')?.value === 'Inter Tower') {
              if (value < this.min || value > this.max) {
                this.form.get('tower_e')?.setErrors({ range: true });
              } else {
                this.form.get('tower_e')?.setErrors(null);
              }
            } else {
              this.form.get('tower_e')?.setErrors(null);
            }
          });
        });
      }
    }
  }

  async showToast(message: string, duration: number = 2000) {
    const toast = await this.toastController.create({
      message,
      duration,
      position: 'bottom'
    });
    await toast.present();
  }

  clearObservationSearch(): void {
    this.observationSearchCtrl.setValue('');
  }

  observationList(dbname: string) {
    this.mntservice.getListbyId(dbname).then((data) => {
      this.saving = true;
      if (data.code && data.code != null) {
        this.showToast(this.locale_service.Locale.language.errorcode.maintenance[data.code]);
      } else {
        this.observation_list = data.list.map(ob => { return { ob: ob, hide: false }; });
      }
      this.filteredObservationList = [...this.observation_list];
      this.form.patchValue({ observations: this.observationDetails ? this.observationDetails.observations : '' });
      this.saving = false;
    });
  }

  saveOb() {
    let form_val = this.form.getRawValue();

    if (form_val.equipment_name !== 'NA' && form_val.device_type == 'Bay') {
      form_val.device_type = 'Equipment';
      form_val.equipment_details = { baytype: this.dialogData.maintenanceDetails.maintenance_list.template.devicetype };
    }
    if (form_val.device_type == 'Equipment' && form_val.equipment_name == 'NA') {
      form_val.equipment_details = { devicetype: this.dialogData.maintenanceDetails.maintenance_list.template.devicetype, baytype: this.dialogData.maintenanceDetails.maintenance_list.template.baytype };
    }
    if (form_val.tower_type == "Tower") {
      form_val.tower_e = null;
    }

    form_val.history = [];
    form_val.history.push({
      user_id: this.getUserNameWithID(),
      time: Date.now(),
      remarks: form_val.remarks?.trim() ? form_val.remarks : '----',
      status: form_val.status
    });

    this.saving = true;
    this.mntservice.AddObservation(form_val).then(ret_data => {
      if (ret_data != null) {
        if (ret_data.code && ret_data.code != null) {
          this.showToast(this.locale_service.Locale.language.errorcode.maintenance[ret_data.code]);
        } else {
          this.showToast(this.locale_service.Locale.language.project.maintenancesettings.snackbar.observationadded);
          ret_data = { ...ret_data.observ, p_rev: ret_data._rev };
          this.historyDatasource.data = this.historyDatasource.data.slice();
          this.modalController.dismiss(ret_data);
        }
      } else {
        this.showToast(this.locale_service.Locale.language.errorcode.api);
      }
      this.saving = false;
    });
  }

  get rangeMinLabel(): string | number {
    const min = this.observationDetails?.parameter_details?.min;
    return min != null ? min : '---';
  }

  get rangeMaxLabel(): string | number {
    const max = this.observationDetails?.parameter_details?.max;
    return max != null ? max : '---';
  }

  getUserNameWithID() {
    const role_name = this.route.snapshot.root.firstChild.firstChild.data.viewData.access.role.role.role_name;
    return role_name
      ? `${role_name}-${this.appservice.getUserName()} (${this.appservice.getLoginID()})`
      : `${this.appservice.getUserName()} (${this.appservice.getLoginID()})`;
  }

  async updateOb(obj: any) {
    let form_val = this.form.getRawValue();

    if (this.dialogData?.observationDetails.equipment_details !== null) {
      form_val.equipment_details = this.dialogData?.observationDetails.equipment_details;
    }
    if (this.dialogData.observationDetails.device_type == "Bay" && form_val.equipment_name !== "NA") {
      form_val.device_type = "Equipment";
    } else if (this.dialogData.observationDetails.device_name.split('/').length == 6 && form_val.equipment_name == "NA") {
      form_val.device_type = "Bay";
      form_val.equipment_details = null;
    }

    if (form_val.tower_type == "Tower") {
      form_val.tower_e = null;
    }
    if (obj.parameter_details) {
      form_val.parameter_details = obj.parameter_details;
      form_val.parameter_details.value = form_val.value;
    }

    form_val._id = this.dialogData.observationDetails._id;
    form_val.history = obj.history;
    form_val.reason = this.dialogData.observationDetails.reason;

    form_val.history.push({
      user_id: this.getUserNameWithID(),
      time: Date.now(),
      remarks: form_val.remarks?.trim() ? form_val.remarks : '----',
      status: form_val.status,
      operated_maintenance_id: (this.dialogData?.dlg && this.dialogData?.operated_other_observation) ? this.dialogData?.maintenance_id ?? null : null,
      value: this.dialogData?.observationDetails.parameter_details?.value ?? null
    });

    this.saving = true;

    if (this.dialogData.observationDetails.connected_object_id) {
      form_val.connected_object_id = this.dialogData.observationDetails.connected_object_id;
    }
    if (form_val.device_type == "TL") {
      form_val.tl_bay_path = this.dialogData.observationDetails?.tl_bay_path;
    }
    if (form_val.connected_object_id != null && (form_val.status == 'fixed' || form_val.status == 'close') && this.alarmObjectDetails?.value == true) {
      let object_details = [];
      object_details.push({
        object_detail: { Id: form_val.connected_object_id, Path: form_val.description, Heading: '', datetime: Date.now() },
        val: '0',
        comment: "Fixed from Observation",
      });
      this.signalr.SubstituteOperationalData(this.dialogData.view_id, 0, object_details, this.dialogData.observationDetails.alarm_reason, false, 0);
    }

    this.mntservice.UpdateObservation(form_val).then(ret_data => {
      if (ret_data != null) {
        if (ret_data.code && ret_data.code != null) {
          this.showToast(this.locale_service.Locale.language.errorcode[ret_data.code]);
        } else {
          this.showToast(this.locale_service.Locale.language.project.maintenancesettings.snackbar.observationupdated);
          this.historyDatasource.data = ret_data.history;
          this.historyDatasource.data = this.historyDatasource.data.slice();
        }
        this.modalController.dismiss(ret_data);
      } else {
        this.showToast(this.locale_service.Locale.language.errorcode.api);
      }
      this.saving = false;
    });
  }

  openDetails() {
    const maintenanceId = this.observationDetails?.connected_maintenance_id;
    if (maintenanceId) {
      this.modalController.dismiss({ action: 'openMaintenance', maintenanceId });
    }
  }

  async startscheduleMaintenance() {
    if (this.observationDetails.equipment_name != 'NA' && !this.observationDetails.device_name.includes(this.observationDetails.equipment_name)) {
      this.observationDetails.device_name = `${this.observationDetails.device_name}/${this.observationDetails.equipment_name}`;
    }
    this.hasConnectedBayMaintenance();
    this.hasConnectedTLMaintenance();

    const modal = await this.modalController.create({
      component: ObservationActionDlgComponent,
      backdropDismiss: false,
      componentProps: {
        dialogData: {
          connectedBayMnt: this.connectedBayMaintenance ?? [],
          connectedTLMnt: this.connectedTLMaintenance ?? [],
          path: this.observationDetails.device_name,
          type: "sse",
          device_type: this.observationDetails.device_type,
          user_id: this.getUserNameWithID(),
          usertype: this.observationDetails.observationtype,
          observation_details: this.observationDetails,
          obdata: this.dialogData.obdata,
          obMaintenance: this.dialogData.obMaintenance
        }
      }
    });
    await modal.present();
    const { data } = await modal.onDidDismiss();
    if (data) {
      if (data.action == "ROUTE") {
        this.modalController.dismiss(null);
      } else {
        this.isStartMaintenanceButtondisabled = data;
      }
    }
  }

  groupselectionDlg() {
    // GroupObjectSelectionComponent not yet available as Ionic modal — wire once mobile version is ready.
    this.showToast('Feature coming soon');
  }

  onStatusChange(selectedValue: string) {
    this.form.get('remarks')?.reset();
    let val = this.form.get('value')?.value;
    this.isRemarksReq(selectedValue);

    if (this.dialogData?.device_type === 'Substation') {
      if (selectedValue == 'requireshutdown') {
        if (!this.form.get('bay_path')) {
          this.form.addControl('bay_path', new FormControl('', Validators.required));
        } else {
          this.form.get('bay_path')?.setValidators(Validators.required);
          this.form.get('bay_path')?.updateValueAndValidity();
        }
        if (!this.form.get('display_bay_path')) {
          this.form.addControl('display_bay_path', new FormControl('', Validators.required));
        } else {
          this.form.get('display_bay_path')?.setValidators(Validators.required);
          this.form.get('display_bay_path')?.updateValueAndValidity();
        }
        this.showPathButton = true;
        this.showPathInputBox = true;
      }
      if (selectedValue == 'open') {
        if (this.form.get('bay_path')) {
          this.form.removeControl('bay_path');
          this.showPathButton = false;
        }
        if (this.form.get('display_bay_path')) {
          this.form.removeControl('display_bay_path');
        }
        this.showPathInputBox = false;
      }
    }

    const min = this.observationDetails?.parameter_details?.min ?? null;
    const max = this.observationDetails?.parameter_details?.max ?? null;
    const hasAnyLimit = min != null || max != null;
    const inRange = this.isWithinRange(val, min, max);

    this.showStatusChangeWarning = hasAnyLimit && inRange && selectedValue !== 'fixed' && selectedValue !== 'close';
    this.isOutOfRange = hasAnyLimit && (selectedValue == 'fixed' || selectedValue == 'close') && !inRange;
  }

  private isWithinRange(val: any, min?: number | null, max?: number | null): boolean {
    // Empty / null / non-numeric is never "in range" — otherwise JS coerces
    // '' and null to 0, which made backspacing the Value field on mobile look
    // like a valid zero and hid every downstream error. This mirrors what the
    // web input naturally gives us via native (input) event semantics.
    if (val === null || val === undefined || val === '' || Number.isNaN(Number(val))) return false;
    const num = Number(val);
    if (min != null && num < min) return false;
    if (max != null && num > max) return false;
    return true;
  }

  checkValue(ev?: any) {
    const currentStatus = this.form.get('status')?.value;
    const min = this.observationDetails?.parameter_details?.min;
    const max = this.observationDetails?.parameter_details?.max;
    // Read directly from the event when available. Ionic's ion-input CVA can
    // update the FormControl slightly after (ionInput) fires, so reading
    // form.get('value').value here returns the previous keystroke's value and
    // makes range checks act on stale input (visible as "no error on backspace,
    // error appears one keystroke late when typing").
    const raw = ev != null
      ? (ev?.detail?.value ?? ev?.target?.value ?? this.form.get('value')?.value)
      : this.form.get('value')?.value;
    const inRange = this.isWithinRange(raw, min, max);
    const isEmpty = raw === null || raw === undefined || raw === '';
    const isFixedOrClose = currentStatus === 'fixed' || currentStatus === 'close';
    this.showStatusChangeWarning = !isFixedOrClose && inRange;
    // An empty/invalid value is always out-of-range regardless of status, so
    // the user sees a clear error the moment they clear the field.
    this.isOutOfRange = isEmpty || (isFixedOrClose && !inRange);
  }

  filterStatusOptions() {
    const isJE = this.resolver.MaintenanceAccessRights.maintenence_input_save_submit;
    const isMNP = this.resolver.MaintenanceAccessRights.mnp_input_save_submit;
    const isSSE = this.resolver.MaintenanceAccessRights.observation_start_maintenance_input;
    const isAETL = this.resolver.MaintenanceAccessRights.tl_maintenance_parameter_approve_revert;
    const isJETL = this.resolver.MaintenanceAccessRights.tl_maintenance_parameter_input_save_submit;
    const isJEobservation = this.resolver.isJEObservation(this.dialogData.observationtype);
    const isMNPObservation = this.dialogData.observationtype == 'mnp';
    const isJETLObservation = this.dialogData.observationtype == 'je_tl';
    const isHotLineObservation = this.dialogData.observationtype == 'hotline';
    const isHotLineJE = this.resolver.MaintenanceAccessRights.hotline_input_save_submit;
    const isHotLineSSE = this.resolver.MaintenanceAccessRights.hotline_observation_close;
    const isADMIN = isJE && isMNP && isSSE;

    if (this.dialogData.observationDetails?.connected_object_id) {
      const isFixed = this.dialogData.observationDetails.history.some(obj => obj.status == 'fixed');
      if (isFixed) delete this.filteredObservationStatus.open;
    }

    if (isADMIN) return;
    else if ((isJE && isJEobservation) || (isJE && this.dialogData.observationtype == 'ob')) {
      delete this.filteredObservationStatus.close;
    } else if (isJE && isMNPObservation) {
      delete this.filteredObservationStatus.close;
    } else if (isMNP && isMNPObservation) {
      delete this.filteredObservationStatus.fixed;
    } else if (isMNP && isJEobservation) {
      this.form.controls['status'].disable();
    } else if (isSSE && isJEobservation) {
      delete this.filteredObservationStatus.fixed;
    } else if (isSSE && isMNPObservation) {
      delete this.filteredObservationStatus.close;
    } else if ((isJETL && isJETLObservation) || (isJETL && this.dialogData.observationtype == 'ob')) {
      delete this.filteredObservationStatus.close;
    } else if (isAETL && isJETLObservation) {
      delete this.filteredObservationStatus.fixed;
    } else if (isHotLineJE && isHotLineObservation) {
      return;
    } else if (isHotLineSSE && isHotLineObservation) {
      delete this.filteredObservationStatus.fixed;
    } else if (isHotLineObservation) {
      if (isJE) {
        delete this.filteredObservationStatus.close;
      } else if (isSSE) {
        delete this.filteredObservationStatus.fixed;
      }
    } else {
      this.form.controls['status'].disable();
      delete this.filteredObservationStatus.fixed;
      delete this.filteredObservationStatus.close;
    }

    this.cdr.detectChanges();
  }

  startButtonValidation() {
    if (this.form.get('status')?.value !== this.dialogData.observationDetails.status)
      return true;
    if (this.dialogData.device_type === 'Substation') {
      if (this.form.get('status')?.value === 'requireshutdown') {
        if (this.observationDetails?.bay_path) {
          this.form.patchValue({ bay_path: this.observationDetails?.bay_path });
          return false;
        } else {
          return true;
        }
      } else {
        return false;
      }
    }
  }

  updateTowerE(event: any) {
    const towerSValue = event.target?.value ? parseInt(event.target.value, 10) : null;
    if (this.form.get('tower_type')?.value === 'Inter Tower') {
      this.form.patchValue({ tower_e: towerSValue !== null ? towerSValue + 1 : null });
    }
    this.form.get('tower_e')?.updateValueAndValidity();
  }

  updateTower() {
    const towerType = this.form.get('tower_type')?.value;
    const towerSValue = parseInt(this.form.get('tower_s')?.value, 10);

    if (towerType === 'Inter Tower') {
      this.observationList('maintenance_observation_list_span');
      this.form.patchValue({ observations: null });
      // Always mark tower_e required for Inter Tower — do not gate on tower_s
      // being filled, otherwise the user could submit with only tower_s set.
      this.form.get('tower_e')?.setValidators([Validators.required]);
      if (towerSValue) {
        this.form.patchValue({ tower_e: towerSValue !== null ? towerSValue + 1 : null });
      }
    } else {
      this.form.patchValue({ tower_e: null });
      this.form.patchValue({ observations: null });
      this.observationList('maintenance_observation_list_tower');
      this.form.get('tower_e')?.clearValidators();
    }

    this.form.get('tower_e')?.updateValueAndValidity();
  }

  shouldShowContainer(): boolean {
    const data = this.dialogData;
    const details = data?.observationDetails;
    return (
      (data?.device_type === 'Bay' && data.observationtype === 'je_tl' && !details?.connected_parameter_id) ||
      (data?.device_type === 'Bay' && details?.tower_s) ||
      (data?.device_type === 'TL' && !details?.connected_parameter_id) ||
      (details?.device_type === 'TL' && data?.readonly)
    );
  }

  isRemarksReq(status: string) {
    if (status == 'fixed') {
      this.form.get('remarks').setValidators([Validators.required]);
    } else {
      this.form.get('remarks').clearValidators();
    }
    this.form.get('remarks').updateValueAndValidity();
  }

  hasConnectedBayMaintenance() {
    const connectedBaymnt = this.dialogData?.connectedBayDS ?? [];
    if (this.form.get('status')?.value !== 'requireshutdown') return;
    if (!connectedBaymnt || connectedBaymnt.length == 0) return;
    const maintenanceObj = connectedBaymnt.filter((mnt: any) => mnt.maintenance_list?.connected_bays?.includes(this.dialogData.observationDetails.device_name) && mnt.requests_approves_datetime.backcharging_cancel_issued_datetime == 0);
    this.connectedBayMaintenance = maintenanceObj;
  }

  hasConnectedTLMaintenance() {
    const connectedTLmnt = this.dialogData?.connectedTLDS;
    const connectedBaymnt = this.dialogData?.connecedBayTLDS;
    if (this.form.get('status')?.value !== 'requireshutdown') return;
    if ((!connectedTLmnt || connectedTLmnt.length == 0) && (!connectedBaymnt || connectedBaymnt.length == 0)) return;
    if (connectedTLmnt) {
      const maintenanceExists = connectedTLmnt.filter(mnt => (mnt.connected_line_path == this.dialogData.observationDetails.device_name) && mnt.requests_approves_datetime.backcharging_cancel_issued_datetime == 0);
      if (maintenanceExists && maintenanceExists.length > 0)
        this.connectedBayMaintenance = maintenanceExists;
    }
    if (connectedBaymnt) {
      const maintenanceObj = connectedBaymnt.filter(mnt => mnt.maintenance_list?.connected_bays?.includes(this.dialogData.observationDetails.device_name) && mnt.requests_approves_datetime.backcharging_cancel_issued_datetime == 0);
      this.connectedTLMaintenance = maintenanceObj;
    }
  }

  async GetEventLogObjects(path: string): Promise<boolean> {
    let data = await this.signalr.GetObjectList(path);
    this.alarmObjectDetails = data;
    for (let d of data) {
      if (d.DisplayName?.includes('CB STATUS')) {
        this.cb_status = d.value;
      }
    }
    return true;
  }
}
