import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { ModalController, ToastController } from '@ionic/angular';

import { AppService } from '../../../../../../core/services/app.service';
import { LocaleService } from '../../../../../../core/services/locale/locale.service';
import { MaintenanceService, MaintenanceStatus } from '../../../../../../core/services/maintenance.service';
import { SignalRService } from '../../../../../../core/services/signal-r.service';
import { ProjectResolverService } from '../../../../../../core/services/project-resolver.service';
import { DateTimeSelectionDlgComponent } from '../../../../../../shared/components/date-time-selection/date-time-selection-dlg/date-time-selection-dlg.component';

@Component({
  selector: 'app-observation-action-dlg',
  templateUrl: './observation-action-dlg.component.html',
  styleUrls: ['./observation-action-dlg.component.scss']
})
export class ObservationActionDlgComponent implements OnInit, OnDestroy {
  @Input() dialogData: any;

  group_path: string[];
  current_sel_path: string[];
  form: FormGroup;
  saving = false;
  bayTempList: any[] = [];
  eqTempList: any[] = [];
  object_list: any[] = [];
  filteredBayTemplate: any[] = [];
  filteredEqTemplate: any[] = [];
  tl_list: any[] = [];
  baylist: any[] = [];
  updatedDateTime: any;
  observationsDatasource = [];
  observationrelDatasource = [];
  bayrelDatasource = [];
  observationFullDatasource = [];
  connected_mnt_details: any;
  filteredObservationDatasource = [];
  cb_status: boolean = false;
  linkedMaintenancePath: any;
  linkedMaintenanceDeviceId: string = null;

  scheduledMaintenanceList: any;
  lvbayMntList: any;
  combinedMaintenanceList: any;
  maintenanceTemplates: any;

  subs: Subscription = null;

  constructor(
    public modalController: ModalController,
    private toastController: ToastController,
    private formBuilder: FormBuilder,
    public appservice: AppService,
    public signalr: SignalRService,
    public resolver: ProjectResolverService,
    private route: ActivatedRoute,
    public mntservice: MaintenanceService,
    public locale_service: LocaleService,
  ) { }

  async ngOnInit() {
    this.group_path = this.route.snapshot.root.firstChild.firstChild.data.viewData.group_path;
    this.current_sel_path = this.group_path.slice(1, 5);
    this.current_sel_path.push('');

    this.form = this.formBuilder.group({
      plannedDate: [Date.now()],
      plannedDatestr: [Date.now()],
      showpdate: '',
      scheduledMaintenance: [],
      bay: ['', Validators.required],
      observations_list: [[this.dialogData.observation_details._id], Validators.required],
      time_range_value: 0,
      time_range_type: 'Hour',
      requireMnp: false
    });

    if (this.dialogData?.observation_details?.device_type === 'Substation') {
      this.form.get('bay').disable();
    }

    const pathParts = this.dialogData?.path?.split('/') || [];
    const lastPart = pathParts[pathParts.length - 1];

    let bay = "";
    if (pathParts.length > 4) {
      bay = pathParts[5];
    }
    const secondLastPart = pathParts[pathParts.length - 2];

    const obdata = this.dialogData.obdata;
    const obsDetails = this.dialogData.observation_details;
    const isNotScheduled = (val: any) => !(val.scheduled_status === 'scheduled' || val.scheduled_status === 'planned');

    const getLastFromDeviceName = (val: any) => val.device_name.split('/').pop();

    let observation = [];
    let equipmentObservations = [];

    this.UpdateValidators();

    if (obsDetails.equipment_name === 'NA') {
      observation = obdata.filter(val => {
        if (obsDetails.device_type == "Substation") {
          if (obsDetails.bay_path) {
            if (val.bay_path) {
              return obsDetails.bay_path == val.bay_path && isNotScheduled(val);
            } else {
              return obsDetails.bay_path == val.device_name && isNotScheduled(val);
            }
          } else {
            return obsDetails.device_name == val.device_name && !val.bay_path && isNotScheduled(val);
          }
        } else if (obsDetails.device_type == "Bay") {
          if (obsDetails.bay_path) {
            if (val.bay_path) {
              return val.bay_path == obsDetails.bay_path && isNotScheduled(val);
            } else {
              return obsDetails.bay_path == val.device_name && isNotScheduled(val);
            }
          } else {
            if (val.bay_path) {
              return obsDetails.device_name == val.bay_path && isNotScheduled(val);
            } else {
              return obsDetails.device_name == val.device_name && isNotScheduled(val);
            }
          }
        } else {
          return (getLastFromDeviceName(val) === lastPart &&
            obsDetails.device_type === val.device_type &&
            isNotScheduled(val));
        }
      });

      if (obsDetails.device_type === 'Equipment') {
        const set = new Set(observation.map(obs => obs._id));
        equipmentObservations = obdata.filter(val =>
          !set.has(val._id) &&
          (this.isRelatedEquipment(this.dialogData, val)) &&
          isNotScheduled(val)
        );
      }
      this.observationrelDatasource = [...observation, ...equipmentObservations];
    } else {
      let bayObservations = [];
      if (this.dialogData?.observation_details.status === 'requireshutdown') {
        bayObservations = obdata.filter(val => getLastFromDeviceName(val) === secondLastPart && isNotScheduled(val) && (val.device_type === 'Bay' || this.dialogData.observation_details._id == val._id));
      } else {
        bayObservations = obdata.filter(val =>
          getLastFromDeviceName(val) === secondLastPart && this.dialogData.observation_details.equipment_name == val.equipment_name &&
          val.device_type === 'Equipment' &&
          isNotScheduled(val)
        );
      }

      const eqpObservations = obdata.filter(val =>
        getLastFromDeviceName(val) === lastPart &&
        isNotScheduled(val)
      );

      this.observationrelDatasource = [...bayObservations, ...eqpObservations];
    }

    this.filteredObservationDatasource = [...this.filteredObservationDatasource, ...this.observationrelDatasource];
    this.saving = true;

    if (this.dialogData?.observation_details.connected_object_id != null) {
      this.baylist.push({
        fullValue: this.dialogData.path,
        displayValue: this.dialogData?.path?.split('/').pop()
      });
      this.form.patchValue({ bay: this.baylist.length == 1 || this.dialogData.observation_details.bay_path ? this.baylist[0].fullValue : '' });
    } else {
      if (this.dialogData.observation_details.reason !== "Manual") {
        this.connected_mnt_details = await this.mntservice.GetPlanMntById(this.dialogData?.observation_details?.connected_maintenance_id);
        if (this.connected_mnt_details.code && this.connected_mnt_details.code != null) {
          this.showToast(this.locale_service.Locale.language.errorcode.maintenance[this.connected_mnt_details.code]);
        } else {
          if ((this.dialogData.observation_details.device_type == 'TL' && this.dialogData.observation_details.status == 'requireshutdown') || (this.dialogData.observation_details.device_type == 'Bay' && this.dialogData.observation_details.observationtype == 'je_tl' && this.dialogData.observation_details.status == 'requireshutdown')) {
            for (let i = 1; i <= 5; i++) {
              const bayProp = `sstn${i}_bayname`;
              const bayList = this.connected_mnt_details.tl_details?.[bayProp];
              if (bayList.length > 0) {
                const bayValue = bayList[0].bay_name;

                if (bayValue) {
                  this.baylist.push({
                    fullValue: bayValue,
                    displayValue: bayValue.split('/').slice(-2, -1)[0],
                  });
                }
              }
            }
          } else if (this.dialogData.observation_details.device_type == 'TL' && this.dialogData.observation_details.status !== 'requireshutdown') {
            this.baylist.push({
              fullValue: this.dialogData.path,
              displayValue: this.dialogData?.path?.split('/').pop()
            });
          } else {
            if (this.dialogData.observation_details.device_type === 'Equipment' && this.dialogData?.observation_details?.status === 'requireshutdown') {
              this.dialogData.path = this.dialogData.path.substring(0, this.dialogData.path.lastIndexOf("/"));
            }
            if (this.dialogData.observation_details.bay_path && this.dialogData.observation_details.device_type === 'Substation') {
              this.baylist.unshift({
                fullValue: this.dialogData.observation_details?.bay_path,
                displayValue: this.dialogData.observation_details?.bay_path.split('/').pop()
              });
            }
            this.baylist.push({
              fullValue: this.dialogData.path,
              displayValue: this.dialogData?.path?.split('/').pop()
            });
          }

          this.form.patchValue({ bay: this.baylist.length == 1 || this.dialogData.observation_details.bay_path ? this.baylist[0].fullValue : '' });
        }
      } else {
        if (this.dialogData.observation_details.device_type === 'Equipment' && this.dialogData?.observation_details?.status === 'requireshutdown') {
          this.dialogData.path = this.dialogData.path.substring(0, this.dialogData.path.lastIndexOf("/"));
        }
        if (this.dialogData.observation_details.bay_path && this.dialogData.observation_details.device_type === 'Substation') {
          this.baylist.unshift({
            fullValue: this.dialogData.observation_details?.bay_path,
            displayValue: this.dialogData.observation_details?.bay_path.split('/').pop()
          });
        }
        this.baylist.push({
          fullValue: this.dialogData.path,
          displayValue: this.dialogData?.path?.split('/').pop()
        });
        this.form.patchValue({ bay: this.baylist.length == 1 || this.dialogData.observation_details.bay_path ? this.baylist[0].fullValue : '' });
      }
    }

    await this.getTargetPath();
    await this.getBaytypeFromName(this.linkedMaintenancePath);

    // Build the initial chip list now that filteredObservationDatasource is
    // populated (so descriptions resolve correctly for the pre-selected obs),
    // then keep it in sync with the multi-select's form value on every change.
    this.rebuildObservationChips(this.form.get('observations_list')?.value);
    this.subs = this.form.get('observations_list')?.valueChanges.subscribe(
      (ids: string[]) => this.rebuildObservationChips(ids)
    );

    this.saving = false;
  }

  get HasScheduledMaintenance() {
    const list = this.form.get('scheduledMaintenance')?.value;
    return Array.isArray(list) && list.length > 0;
  }
  get IsShutdownMaintenance() {
    return this.dialogData.observation_details.status == 'requireshutdown';
  }

  get titleText(): string {
    return this.dialogData?.observation_details.status !== 'requireshutdown'
      ? 'Start Observation Maintenance'
      : 'Schedule Observation Maintenance';
  }

  get connectedBayLabel(): string {
    return this.dialogData?.connectedBayMnt?.[0]?.device_name?.split('/').slice(-2).join('/') ?? '';
  }
  get connectedTLLabel(): string {
    return this.dialogData?.connectedTLMnt?.[0]?.device_name?.split('/').slice(-2).join('/') ?? '';
  }

  // Backing property for the observation chip list. Populated in ngOnInit +
  // whenever the form's observations_list changes. It's a plain field instead
  // of a getter so Angular's change detection doesn't recreate the array (and
  // every chip's DOM) on every CD cycle — that used to freeze the screen after
  // the user picked a second observation via the multi-select popup.
  selectedObservationChips: { id: string; description: string; removable: boolean }[] = [];

  trackChipById(_: number, chip: { id: string }) {
    return chip.id;
  }

  private rebuildObservationChips(ids: string[] | null | undefined) {
    const safeIds = Array.isArray(ids) ? ids : [];
    this.selectedObservationChips = safeIds.map((id: string) => ({
      id,
      description: this.getDescriptionById(id),
      removable: id !== this.dialogData.observation_details._id,
    }));
  }

  get selectedScheduledChips() {
    const list = this.form?.get('scheduledMaintenance')?.value;
    return Array.isArray(list) ? list : [];
  }

  isRelatedEquipment(dialogData: any, doc: any): boolean {
    if (dialogData.path == doc.device_name)
      return true;
    let observation_path = doc.device_name.split('/');
    if (observation_path > 5)
      return false;
    let bayPath = dialogData.path.split('/');
    let eqpName = dialogData.path.split('/').pop();
    bayPath = bayPath.splice(0, bayPath.length - 1);

    return observation_path.join('/') === bayPath.join('/') && doc.equipment_name == eqpName;
  }

  getParameterNameById(id: string, type: string): string {
    let param;
    if (type == 'eqtemp')
      param = this.eqTempList.find(p => p._id === id);
    else
      param = this.bayTempList.find(p => p._id === id);
    return param ? param.maintenancename : '';
  }

  ngOnDestroy() {
    if (this.subs)
      this.subs.unsubscribe();
  }

  getDescriptionById(id: string): string {
    const observation = this.filteredObservationDatasource.find(obs => obs._id === id);
    return observation ? observation.description : '';
  }

  remove(name: string) {
    this.removeFromMultiSelect(
      'observations_list',
      x => x === name
    );
  }

  private removeFromMultiSelect(
    controlName: string,
    predicate: (item: any) => boolean,
    onEmpty?: () => void
  ) {
    const ctrl = this.form.get(controlName);
    if (!ctrl) return;

    const current = ctrl.value || [];
    const filtered = current.filter((x: any) => !predicate(x));

    ctrl.setValue(filtered);

    if (filtered.length === 0 && onEmpty) {
      onEmpty();
    }

    ctrl.updateValueAndValidity();
  }

  onBayChange(event: any): void {
    const value = event?.detail?.value ?? event?.value;
    let bayrelDatasource = this.dialogData.obdata.filter(val => val.device_name === value && (val.scheduled_status !== 'scheduled' || val.scheduled_status !== 'planned') && val._id != this.dialogData.observation_details._id);

    bayrelDatasource.forEach(obs => {
      if (this.filteredObservationDatasource.every(old => old._id != obs._id)) {
        this.filteredObservationDatasource.push(obs);
      }
    });
  }

  async dateClicked() {
    let start = this.form.value.plannedDate == 0 ? Date.now() : this.form.value.plannedDate;
    const modal_datetime = await this.modalController.create({
      component: DateTimeSelectionDlgComponent,
      componentProps: {
        dialogData: {
          selection_type: 'single',
          value: {
            range: {
              start: start,
              end: start,
            },
          },
          showSeconds: false,
          showMilli: false,
          isShowRange: false,
          restrictPastDate: true
        }
      }
    });
    await modal_datetime.present();
    const { data } = await modal_datetime.onDidDismiss();
    if (data && data.range && data.range.start) {
      this.updatedDateTime = data.range.start;
      const selectedDateTime = new Date(data.range.end);

      if (this.form.get('plannedDate')) {
        this.form.get('plannedDate').setValue(data.range.start);
        this.form.get('plannedDatestr').setValue(selectedDateTime);
      } else {
        console.error('plannedDate form control is not available.');
      }
    }
  }

  getSavedDate(date: number) {
    return this.appservice.dateToString(date, 4);
  }

  scheduleMaintenance() {
    const formVal = this.form.getRawValue();

    let maintenanceExists = this.dialogData.obMaintenance.some(data => data.device_name === formVal.bay && this.dialogData.observation_details._id === data.maintenance_list._id);

    if (maintenanceExists) {
      this.showToast('Maintenance already Planned');
      this.saving = true;
    } else {
      this.mntservice.scheduleObservationMaintenance(
        formVal.bay,
        formVal.plannedDate,
        this.dialogData.observation_details,
        formVal.observations_list,
        this.connected_mnt_details?.maintenance_list?.device_master_id ?? "",
        this.connected_mnt_details?.maintenance_list?.voltage_level ?? "",
        this.connected_mnt_details?.maintenance_list?.tower_range ?? ""
      ).then(scheduleResponse => {
        if (scheduleResponse?.code) {
          this.showToast(this.locale_service.Locale.language.errorcode.maintenance[scheduleResponse.code]);
        } else {
          this.showToast('Maintenance Scheduled');
          this.modalController.dismiss({ action: 'DISABLE', value: true });
        }
      }).catch(() => {
        this.showToast('An error occurred while scheduling maintenance');
      });
    }
    this.saving = false;
  }

  startMaintenance() {
    let form_val = this.form.getRawValue();

    if (form_val.scheduledMaintenance && form_val.scheduledMaintenance.length > 0) {
      for (let mnt of form_val.scheduledMaintenance) {
        if (mnt.isLvBay) {
          this.applyLvBayMaintenanceTransform(mnt, form_val);
        } else {
          this.applyNormalScheduledMaintenanceTransform(mnt, form_val);
        }
      }
    }

    let maintenance_list = {
      device_master_id: this.dialogData.observation_details.device_master_id,
      is_mnp_observation_maintenance: this.dialogData.observation_details.observationtype == "mnp" || this.dialogData.observation_details.require_mnp ? true : false,
      template: {
        _id: this.dialogData.observation_details._id,
        maintenancename: 'Observation Maintenance',
        hotline: this.connected_mnt_details?.maintenance_list.template._id.startsWith("pht-"),
      },
      cutoff_date: Date.now(),
      observations_list: form_val.observations_list,
      voltage_level: this.connected_mnt_details?.maintenance_list?.voltage_level ?? "",
    };

    if (this.dialogData.observation_details.equipment_details != null) {
      (maintenance_list.template as any).baytype = this.dialogData.observation_details.equipment_details?.baytype;
      (maintenance_list.template as any).equipment_name = this.dialogData.observation_details.equipment_details?.equipment_name;
    }

    if (this.dialogData.observation_details.device_type == 'Bay' || (this.dialogData.observation_details.device_type == 'Equipment' && this.dialogData.observation_details.status == 'requireshutdown')) {
      (maintenance_list.template as any).devicetype = this.dialogData.observation_details.equipment_details?.baytype;
    } else if (this.dialogData.observation_details.device_type == 'Equipment') {
      (maintenance_list.template as any).devicetype = this.dialogData.observation_details?.equipment_details ? this.dialogData.observation_details.equipment_details?.devicetype : this.dialogData.observation_details.equipment_details?.baytype;
    }

    if (this.dialogData.observation_details.device_type == 'TL') {
      (maintenance_list as any).maintenance_on_bay = this.form?.value?.bay;
      maintenance_list.template.maintenancename = 'Observation TL Maintenance';
      (maintenance_list.template as any).scheduled_patrolling = "scheduled";
      (maintenance_list.template as any).observation_line_details = {
        tower_type: this.dialogData.observation_details?.tower_type,
        tower_s: this.dialogData.observation_details?.tower_s,
        tower_e: this.dialogData.observation_details?.tower_e,
      };
    }

    let saveData: any = {
      device_name: this.linkedMaintenancePath,
      cutoffDate: form_val.plannedDate,
      plannedDate: form_val.plannedDate,
      current_status: MaintenanceStatus.Planned,
      shutdown_required: this.dialogData.observation_details.status == 'requireshutdown' ? true : false,
      time_range_value: form_val.time_range_value ?? null,
      time_range_type: form_val.time_range_type ?? null,
      maintenance_type: this.getDeviceType(),
      maintenance_list: maintenance_list,
      requests_approves: { planned_datetime: Date.now() },
      schedule_or_conditional: 'scheduled',
      observations_list: form_val.observations_list,
      shutdown_duration_history: [],
      sse: this.getUserNameWithID()
    };
    saveData.shutdown_duration_history.push({ user: this.getUserNameWithID(), time: form_val.plannedDate, time_range_value: form_val.time_range_value, time_range_type: form_val.time_range_type });

    if (this.lvbayMntList.length > 0) {
      saveData["connected_hv_lv_bay"] = [this.lvbayMntList[0].lvBayName];
      if (this.lvbayMntList[0].lvBayDeviceId)
        saveData["connected_hv_lv_bay_ids"] = [this.lvbayMntList[0].lvBayDeviceId];
    }

    const selectedScheduled = (form_val.scheduledMaintenance || []).slice();
    const payload = [...selectedScheduled, saveData];

    const control = this.form.get('scheduledMaintenance');
    const current = Array.isArray(control?.value) ? control.value : [];
    control?.setValue([...current, saveData]);

    this.saving = true;
    this.mntservice.CreateObservationMNT(payload).then(async (response) => {
      if (response?.code != "success") {
        this.showToast(this.locale_service.Locale.language.errorcode.maintenance[response.code]);
      } else {
        for (const plan_mnt of response.created_maintenance) {
          try {
            const devicePath = plan_mnt.device_name.split('/');
            const substationPath = devicePath.slice(0, 5).join('/');

            const receiving_users = await this.appservice.GetUserIdsFromRight(
              "rqst_ptw_Button",
              substationPath
            );

            if (!receiving_users || receiving_users.length === 0) {
              console.warn(`No users found for right 'rqst_ptw_Button' at path: ${substationPath}`);
              continue;
            }

            const deviceShortName = plan_mnt.device_name.split("/").pop();
            const maintenanceName = plan_mnt.maintenance_list?.template?.maintenancename || "Maintenance";

            const message = this.appservice.unescapedName(
              `${this.appservice.unescapedName(`[MT_SATPM] Maintenance Plan Alert: A maintenance activity has been planned by ${plan_mnt.sse} on ${plan_mnt.device_name.split("/")[4]} ${plan_mnt.device_name.split("/").pop()}. Please review and proceed as per schedule.`)}`,
            );

            await this.appservice.sendActionableNotification(
              {
                id: this.appservice.getLoginID(),
                name: this.appservice.getUserName(),
                loginId: this.appservice.getLoginID()
              },
              receiving_users,
              [],
              message,
              MaintenanceStatus.Planned,
              {
                maintenance_id: plan_mnt._id,
                target_view: 'Maintenance Dashboard',
                target_tab: plan_mnt.maintenance_type,
                expectedCompletionStatus: MaintenanceStatus.PTWRequested,
                currentStatus: MaintenanceStatus.Planned
              },
              'Perform your task'
            );

            console.log(`Notification sent for maintenance ${plan_mnt._id} (${deviceShortName})`);
          } catch (err) {
            console.error(`Failed to send PTW notification for maintenance ${plan_mnt?._id || 'unknown'}:`, err);
          }
        }

        this.showToast(this.locale_service.Locale.language.project.maintenancesettings.snackbar.planned);
        this.modalController.dismiss(true);
      }
    });
    this.saving = false;
  }

  getDeviceLabel() {
    if (this.dialogData.observation_details.device_type == 'Substation') {
      if (this.dialogData.observation_details.status !== 'requireshutdown')
        return "Select Substation";
      else
        return "Select Bay";
    } else if (this.dialogData.observation_details.device_type == 'Bay') {
      if (this.dialogData.observation_details.observationtype == 'je_tl' && this.dialogData.observation_details.status !== 'requireshutdown')
        return "Select TL";
      if (this.dialogData.observation_details.equipment_name !== 'NA')
        return "Selected Equipment";
      else
        return "Select Bay";
    } else if (this.dialogData.observation_details.device_type == 'Equipment') {
      if (this.dialogData.observation_details.status == 'requireshutdown')
        return "Select Bay";
      else
        return "Select Equipment";
    } else if (this.dialogData.observation_details.device_type == 'TL') {
      if (this.dialogData.observation_details.status == 'requireshutdown')
        return "Select Bay";
      else
        return "Selected TL";
    }
  }

  onScheduledMaintenanceSelect(selectedItems: any[]) {
    const ctrl = this.form.get('time_range_value');
    if (selectedItems && selectedItems.length > 0) {
      ctrl.setValidators([
        Validators.required,
        Validators.min(1)
      ]);
    } else {
      ctrl.clearValidators();
    }
    ctrl.updateValueAndValidity();
  }

  onScheduledMaintenanceChange(event: any) {
    const val = event?.detail?.value ?? event?.value ?? [];
    this.onScheduledMaintenanceSelect(val);
  }

  UpdateValidators() {
    const time_range = this.form.get('time_range_value');
    if (this.dialogData.observation_details.status == 'requireshutdown') {
      time_range.setValidators([
        Validators.required,
        Validators.min(1)
      ]);
    } else {
      time_range.clearValidators();
    }
    time_range.updateValueAndValidity();
  }

  removeScheduled(item: any) {
    this.removeFromMultiSelect(
      'scheduledMaintenance',
      x => x.template.maintenancename === item.template.maintenancename,
      () => {
        const time = this.form.get('time_range_value');
        time?.clearValidators();
        time?.updateValueAndValidity();
      }
    );
  }

  getUserNameWithID() {
    const role_name = this.route.snapshot.root.firstChild.firstChild.data.viewData.access.role.role.role_name;
    return role_name ? `${role_name}-${this.appservice.getUserName()} (${this.appservice.getLoginID()})` : `${this.appservice.getUserName()} (${this.appservice.getLoginID()})`;
  }

  async getTargetPath() {
    const obs = this.dialogData.observation_details;
    let targetPath = "";

    if (obs.device_type === 'Substation') {
      targetPath = obs.bay_path || obs.device_name;
    } else if (obs.device_type === 'Bay') {
      targetPath = obs.bay_path || obs.device_name;
    } else if (obs.device_type === 'Equipment') {
      targetPath = obs.bay_path
        ? obs.bay_path
        : (obs.status == 'requireshutdown' ? obs.device_name.substring(0, obs.device_name.lastIndexOf("/")) : obs.device_name);
    } else if (obs.device_type === 'TL') {
      targetPath = obs.bay_path || obs.device_name;
    } else {
      targetPath ||= obs.device_name;
    }

    this.linkedMaintenancePath = targetPath;
    let maintenancelist = await this.mntservice.GetMaintenanceListByPath(targetPath);

    if (maintenancelist && Object.keys(maintenancelist).length > 0) {
      const firstKey = Object.keys(maintenancelist)[0];
      const firstList = maintenancelist[firstKey];
      this.scheduledMaintenanceList = firstList.filter(x => x.item2.template.reqshutdown).map(x => x.item2);
      this.scheduledMaintenanceList = this.scheduledMaintenanceList.map(x => ({ ...x, isLvBay: false }));
      this.mergeMaintenanceLists();
    }
  }

  getDeviceType() {
    const obs = this.dialogData.observation_details;
    let type = "";

    if (obs.device_type === 'Substation') {
      type = obs.bay_path ? 'Bay' : 'Substation';
    } else if (obs.device_type === 'Bay') {
      type = 'Bay';
    } else if (obs.device_type === 'Equipment') {
      type = obs.bay_path
        ? 'Bay'
        : (obs.status == 'requireshutdown' ? 'Bay' : 'Equipment');
    } else if (obs.device_type === 'TL') {
      type = obs.bay_path ? 'Bay' : 'TL';
    } else {
      type = obs.device_type;
    }

    return type;
  }

  async getBaytypeFromName(name: string) {
    const response = await this.mntservice.fetchLVBayMaintenanceList(name);

    if (!response || response.code) {
      this.lvbayMntList = [];
      return;
    }

    const lvBayName = response.lvBayName;
    const lvBayDeviceId: string = response.lvBayDeviceId ?? null;
    this.linkedMaintenanceDeviceId = response.hvBayDeviceId ?? null;
    const maintenanceData = response.maintenancelist;

    if (!maintenanceData || Object.keys(maintenanceData).length === 0) {
      this.lvbayMntList = [];
      return;
    }

    const firstKey = Object.keys(maintenanceData)[0];
    const firstList = maintenanceData[firstKey];

    if (!Array.isArray(firstList) || firstList.length === 0) {
      this.lvbayMntList = [];
      return;
    }

    this.lvbayMntList = firstList
      .filter(x => x.item2?.template?.reqshutdown)
      .map(x => ({
        ...x.item2,
        isLvBay: true,
        lvBayName: lvBayName,
        lvBayDeviceId: lvBayDeviceId
      }));

    this.mergeMaintenanceLists();
  }

  private mergeMaintenanceLists(): void {
    const scheduled = Array.isArray(this.scheduledMaintenanceList)
      ? this.scheduledMaintenanceList
      : [];

    const lvbay = Array.isArray(this.lvbayMntList)
      ? this.lvbayMntList
      : [];

    if (lvbay.length > 0) {
      scheduled.forEach(s => {
        s.lvBayName = lvbay[0].lvBayName;
        s.lvBayDeviceId = lvbay[0].lvBayDeviceId;
      });
    }

    this.combinedMaintenanceList = [...scheduled, ...lvbay];
  }

  private applyNormalScheduledMaintenanceTransform(mnt: any, form_val: any) {
    mnt.maintenance_list = { ...mnt };
    mnt.device_name = this.linkedMaintenancePath;
    mnt.connected_hv_lv_bay = mnt.lvBayName ? [mnt.lvBayName] : null;
    mnt.connected_hv_lv_bay_ids = mnt.lvBayDeviceId ? [mnt.lvBayDeviceId] : null;
    mnt.cutoffDate = mnt.cutoff_date;
    mnt.current_status = MaintenanceStatus.Planned;
    mnt.maintenance_type = this.getDeviceType();
    mnt.shutdown_required = this.dialogData.observation_details.status === 'requireshutdown';
    mnt.observations_list = [];
    mnt.shutdown_duration_history = [];
    mnt.plannedDate = form_val.plannedDate;
    mnt.time_range_value = form_val.time_range_value;
    mnt.time_range_type = form_val.time_range_type;
    mnt.requests_approves = { planned_datetime: form_val.plannedDate };
    mnt.shutdown_duration_history.push({
      user: this.getUserNameWithID(),
      time: form_val.plannedDate,
      time_range_value: form_val.time_range_value,
      time_range_type: form_val.time_range_type
    });
  }

  private applyLvBayMaintenanceTransform(mnt: any, form_val: any) {
    mnt.maintenance_list = { ...mnt };
    mnt.device_name = mnt.lvBayName;
    mnt.connected_hv_lv_bay = [this.linkedMaintenancePath];
    mnt.connected_hv_lv_bay_ids = this.linkedMaintenanceDeviceId ? [this.linkedMaintenanceDeviceId] : null;

    mnt.cutoffDate = mnt.cutoff_date;
    mnt.current_status = MaintenanceStatus.Planned;
    mnt.maintenance_type = "Bay";
    mnt.shutdown_required = this.dialogData.observation_details.status === 'requireshutdown';
    mnt.observations_list = [];
    mnt.shutdown_duration_history = [];
    mnt.plannedDate = form_val.plannedDate;
    mnt.time_range_value = form_val.time_range_value;
    mnt.time_range_type = form_val.time_range_type;
    mnt.requests_approves = { planned_datetime: form_val.plannedDate };
    mnt.shutdown_duration_history.push({
      user: this.getUserNameWithID(),
      time: form_val.plannedDate,
      time_range_value: form_val.time_range_value,
      time_range_type: form_val.time_range_type
    });
  }

  get showNoTemplatesMessage(): boolean {
    const isShutdownObservation = this.dialogData.observation_details.status == "requireshutdown";
    return !this.saving && isShutdownObservation && (!this.combinedMaintenanceList || this.combinedMaintenanceList.length === 0);
  }

  getConnectedBayDetails() {
    const ob_details = this.dialogData?.observation_details;
    let device_name = "";
    if (ob_details.status !== 'requireshutdown') {
      return;
    }
    if (ob_details.device_type == 'Substation') {
      device_name = ob_details.bay_path;
    }
    if (ob_details.device_type == "Equipment") {
      if (ob_details.device_name.split('/')) { }
    }
  }

  navigateToMaintenanceTab() {
    const project_id = this.route.snapshot.root.firstChild.firstChild.paramMap.get('id');
    const path = this.route.snapshot.root.firstChild.firstChild.data.viewData.group_path.join('/');

    this.mntservice.NavigateToMaintenanceTab(project_id, path, "Maintenance Dashboard", "Connected Bays");
    this.modalController.dismiss({ action: 'ROUTE' });
  }

  navigateToTLTab() {
    const project_id = this.route.snapshot.root.firstChild.firstChild.paramMap.get('id');
    const path = this.route.snapshot.root.firstChild.firstChild.data.viewData.group_path.join('/');

    this.mntservice.NavigateToMaintenanceTab(project_id, path, "Maintenance Dashboard", "Connected TL");
    this.modalController.dismiss({ action: 'ROUTE' });
  }

  cancel() {
    this.modalController.dismiss(null);
  }

  private async showToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'bottom'
    });
    await toast.present();
  }
}
