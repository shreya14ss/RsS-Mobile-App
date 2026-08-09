import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute } from '@angular/router';
import { ModalController } from '@ionic/angular';
import { AppService } from 'src/app/core/services/app.service';
import { LocaleService } from 'src/app/core/services/locale/locale.service';
import { MaintenanceService, MaintenanceStatus } from 'src/app/core/services/maintenance.service';
import { DateTimeSelectionDlgComponent } from 'src/app/shared/components/date-time-selection/date-time-selection-dlg/date-time-selection-dlg.component';


@Component({
  selector: 'app-plan-maintenance-dlg',
  templateUrl: './pv-plan-maintenance-dlg.component.html',
  styleUrls: ['./pv-plan-maintenance-dlg.component.scss']
})

export class PlanMaintenanceDlgComponent implements OnInit {
  @Input() dialogData: any;

  form: FormGroup;
  dataSource: any[] = [];
  getPath: any;
  disableSelect: boolean = false;
  saving: boolean = false;
  plannedDataSource: any = [];
  devicemaster: any = [];
  plannedDocId: string | null = null;
  closeTime: string | null = null;
  currMaintenanceDetails: any = {};
  chkPlanExists: any;
  chkPlanExisted: boolean;
  plnmntID: string;
  plnmntData: any;
  planmntPath: string;
  isPlanmntClicked: boolean;
  isDelayedMaintenance: boolean;
  isFutureDate: boolean = false;
  monthsFromNow: number = 0;

  constructor(
    private _snackBar: MatSnackBar,
    private route: ActivatedRoute,
    private appService: AppService,
    private mntservice: MaintenanceService,
    public modalController: ModalController,
    public locale_service: LocaleService,
    private formBuilder: FormBuilder
  ) {}


  async ngOnInit() {
    if (this.dialogData.obj)
      this.disableSelect = true;
    if (this.dialogData.obj.cutoffstr) {
      const [day, month, year] = this.dialogData.obj.cutoffstr.split('/');
      const cutoffDate = new Date(+year, +month - 1, +day);

      const today = new Date();
      const threeMonthsFromNow = new Date();
      threeMonthsFromNow.setMonth(today.getMonth() + 3);

      if (cutoffDate > threeMonthsFromNow) {
        this.isFutureDate = true;
        this.monthsFromNow = (cutoffDate.getFullYear() - today.getFullYear()) * 12
          + (cutoffDate.getMonth() - today.getMonth());
      }
    }

    const tl_shutdown = this.dialogData?.obj?.mnt.startsWith('ptt') && this.dialogData.type == 'bay';
    let path = "";
    if (tl_shutdown)
      path = this.dialogData.obj.mntlst.tower_range ? this.dialogData.obj.path.split(this.dialogData.obj.mntlst.tower_range)[0] : this.dialogData.obj.path
    else if (this.dialogData.type == 'tl')
      path = this.dialogData.obj.path + "/" + this.dialogData.obj.line_name;
    else
      path = this.dialogData.obj.path;

    if (this.dialogData.obj.mntlst.tl_planned_date) {
      this.dialogData.obj.plannedDate = this.dialogData.obj.mntlst.tl_planned_date;
      this.dialogData.obj.time_range_value = this.dialogData.obj.mntlst.tl_time_range_value;
      this.dialogData.obj.time_range_type = this.dialogData.obj.mntlst.tl_time_range_type;
    }

    this.form = this.formBuilder.group({
      device_name: [path, Validators.required],
      cutoffDate: [(this.dialogData?.obj?.cutoffstr) ? this.dialogData.obj.cutoffstr : 0, Validators.required],
      plannedDate: [(this.dialogData?.obj?.plannedDate) ? this.dialogData.obj.plannedDate : '', Validators.required],
      showpdate: [(this.dialogData?.obj?.plannedDate) ? this.appService.dateToString(Number(this.dialogData.obj.plannedDate), 11) : '',],
      time_range_value: [(this.dialogData?.obj?.time_range_value) ? this.dialogData.obj.time_range_value : 0, [Validators.required, Validators.min(1)]],
      time_range_type: [(this.dialogData?.obj?.time_range_type) ? this.dialogData.obj.time_range_type : 'Hour'],
      dialogCloseTime: [null],
      reason: [''],
      scheduledMaintenancelist: [[]]
    });

    if (this.dialogData.type == 'tl' || (this.dialogData.type == 'ob_tl') || (this.dialogData.type == 'bay' && (this.dialogData.obj.mntlst.template._id.startsWith('ptt') || this.dialogData.obj.mntlst.bay_maintenance_on_tl_observation))) {
      this.saving = true;
      if (this.dialogData.type == 'tl') {
        this.form.removeControl("time_range_value");
        this.form.removeControl("time_range_type");
      }
      let _id = (this.dialogData.type == 'tl') ? this.dialogData.obj._id : this.dialogData.obj.mntlst.device_master_id;
      let response = await this.mntservice.GetTLById(_id);
      if (response.code && response.code != null) {
        this._snackBar.open("Could not not get TL Master", null, { duration: 2000 });
      } else {
        this.dialogData.tl_details = response;
      }
      this.saving = false;
    }

    if (this.dialogData.type == 'bay' && this.dialogData.obj?.mntlst?.connected_line && this.dialogData.obj?.mnt.startsWith("pbt")
      && this.dialogData.obj?.mntlst?.connected_bays) {
      this.saving = true;
      let response: any = await this.mntservice.GetPlanMntByDeviceNames(this.dialogData.obj?.mntlst?.connected_bays);
      if (response.code && response.code != null) {
        this._snackBar.open("Could not get Planned Maintenances", null, { duration: 2000 });
      } else {
        for (let mnt of (response as any[])) {
          if (mnt.shutdown_required && mnt.maintenance_list.template._id.startsWith("ptt") && mnt.requests_approves.backcharging_cancel_issued_datetime == 0) {
            this.dialogData.my_line_mnts = true;
            break;
          }
          if (mnt.shutdown_required && mnt.maintenance_list.template._id.startsWith("pbt") && mnt.device_name != path && mnt.requests_approves.backcharging_cancel_issued_datetime == 0) {
            this.dialogData.my_connected_bay_mnts = mnt.device_name.split("/").slice(-2).join("/");
            break;
          }
        }
      }
      this.saving = false;
    }

    if (this.dialogData.type == 'tl' || this.dialogData.obj?.mntlst?.template?.require_schedule) {
      this.form.removeControl("time_range_value");
      this.form.removeControl("time_range_type");
    }
    this.isDelayedMaintenance = this.isPreviousDay(this.dialogData.obj.cutoff);
    if (this.isDelayedMaintenance) {
      let reason_control = this.form.get('reason');
      reason_control.setValidators([Validators.required]);
      reason_control.updateValueAndValidity();
    }
  }


  isPreviousDay(timestamp: number): boolean {
    if (!timestamp) return false;
    const input = new Date(timestamp);
    const today = new Date();
    input.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    if (this.dialogData.my_line_mnts || this.dialogData.my_connected_bay_mnts)
      return false;
    return input < today;
  }

  async openDatePicker() {
    const current = this.form?.get('plannedDate')?.value
      ?? this.dialogData?.obj?.cutoff
      ?? Date.now();
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
      const dt = new Date(data.range.start);
      this.form.get('plannedDate')?.setValue(dt.getTime());
      const dialogCloseTime = dt.toLocaleTimeString('en-GB', {
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
      });
      this.form.get('dialogCloseTime')?.setValue(dialogCloseTime);
      this.closeTime = dialogCloseTime;
    }
  }

  dismiss(data?: any) {
    this.modalController.dismiss(data ?? null);
  }

  get getUserNameWithID() {
    const role_name = this.route.snapshot.root.firstChild.firstChild.data.viewData.access.role.role.role_name;
    return role_name ? `${role_name}-${this.appService.getUserName()} (${this.appService.getLoginID()})` : `${this.appService.getUserName()} (${this.appService.getLoginID()})`;
  }

  removeScheduled(item: any) {
    const ctrl = this.form.get('scheduledMaintenancelist');
    const current = ctrl?.value || [];
    const nameToRemove = item.template.maintenancename;
    const filtered = current.filter(x => x.template.maintenancename !== nameToRemove);
    ctrl?.setValue(filtered);
  }

  get HasscheduledMaintenance() {
    return this.form.get('scheduledMaintenancelist')?.value?.length > 0;
  }

  navigateToMaintenanceTab() {
    let project_id = this.route.snapshot.root.firstChild.firstChild.paramMap.get('id');
    let path = this.route.snapshot.root.firstChild.firstChild.data.viewData.group_path.join('/');
    this.mntservice.NavigateToMaintenanceTab(project_id, path, "Maintenance Dashboard", this.dialogData.my_line_mnts ? "Connected TL" : "Asst. Mnt. Elmnt");
    this.dismiss();
  }

  getSavedDate(date: number) {
    return this.appService.dateToString(date, 5);
  }

  async save() {
    if (this.form.invalid) {
      this._snackBar.open(this.locale_service.Locale.language.project.maintenancesettings.snackbar.validationmessage, this.locale_service.Locale.language.common.failed, { duration: 2000 });
      return;
    }
    this.saving = true;
    this.isPlanmntClicked = true;
    let form_val = this.form.value;
    if (this.dialogData.obj.mntlst.frequency !== null)
      this.dialogData.obj.mntlst.frequency.maintenanceCount = 1;

    this.dialogData.obj.mntlst.is_scheduled = true;
    let saveData = {
      device_name: form_val.device_name,
      cutoffDate: this.dialogData.obj.cutoff,
      plannedDate: form_val.plannedDate,
      current_status: MaintenanceStatus.Planned,
      maintenance_type: this.dialogData.obj.type,
      maintenance_list: this.dialogData.obj.mntlst,
      connected_bay: this.dialogData.obj?.connected_bay,
      shutdown_required: this.dialogData.obj?.reqshutdown ?? false,
      requests_approves: { planned_datetime: form_val.plannedDate },
      time_range_value: form_val.time_range_value,
      time_range_type: form_val.time_range_type,
      tl_details: this.dialogData.tl_details,
      delayed_reason: form_val.reason,
      observations_list: [],
      shutdown_duration_history: []
    };
    const role_name = this.route.snapshot.root.firstChild.firstChild.data.viewData.access.role.role.role_name;
    saveData.shutdown_duration_history ??= [];
    saveData.shutdown_duration_history.push({ user: `${role_name ?? ''}-${this.appService.getUserName()}(${this.appService.getLoginID()})`, time: form_val.plannedDate, time_range_value: form_val.time_range_value, time_range_type: form_val.time_range_type });

    if (this.dialogData.type == 'tl' && !this.dialogData?.obj.mnt.startsWith('pov')) {
      saveData["patrolling_details"] = [];
    } else {
      saveData["sse"] = this.getUserNameWithID;
    }
    saveData["sse"] = this.getUserNameWithID;

    this.mntservice.SavePlanMnt(saveData)
      .then(async response => {
        if (response.code && response.code != null) {
          this._snackBar.open(this.locale_service.Locale.language.errorcode.maintenance[response.code], this.locale_service.Locale.language.common.failed, { duration: 2000 });
        } else {
          this._snackBar.open(this.locale_service.Locale.language.project.maintenancesettings.snackbar.planned, this.locale_service.Locale.language.common.ok, { duration: 2000 });

          if (response.is_initiator) {
            const connected_ss: string[] = response.backcharging_id
              ? Object.keys(response.backcharging_id).map(bay => bay.split("/").slice(0, -1).join("/"))
              : [];
            const tl_path = response.maintenance_list.connected_line_path;
            const all_connected_paths: string[] = [...connected_ss, ...(tl_path ? [tl_path] : [])];
            const results = await Promise.all(
              all_connected_paths.map(async (path) => {
                const [mntUsers, tlUsers] = await Promise.all([
                  this.appService.GetUserIdsFromRight("create_scheduled_maintenance", path),
                  this.appService.GetUserIdsFromRight("schedule_tl_maintenance", path)
                ]);
                return [...mntUsers, ...tlUsers];
              })
            );
            let recieving_users = [...new Set(results.flat())];
            const deviceName = response.device_name.split('/').slice(-1)[0];
            const ssNames = connected_ss.map(ss => ss.split('/').slice(-1)[0]).join(', ');
            const tlName = tl_path?.split('/').slice(-1)[0];
            const msg = `Scheduled Maintenance Alert: Maintenance has been planned on ${deviceName}. Connected elements include TL: ${tlName} and Substations: ${ssNames}. Please review and plan accordingly.`;
            this.appService.sendNotificationDetails(response, msg, [], recieving_users);
          }

          const plan_mnt = response;
          const devicePath = plan_mnt.device_name.split('/');
          const substationPath = devicePath.slice(0, 5).join('/');
          let recieving_users = [];
          recieving_users = await this.appService.GetUserIdsFromRight("rqst_ptw_Button", substationPath);

          if (plan_mnt.shutdown_required) {
            this.appService.sendActionableNotification(
              { id: this.appService.getLoginID(), name: this.appService.getUserName(), loginId: this.appService.getLoginID() },
              recieving_users,
              [],
              `${this.appService.unescapedName(`[MT_SATPM] Maintenance Plan Alert: A maintenance activity has been planned by ${plan_mnt.sse} on ${plan_mnt.device_name.split("/")[4]} ${plan_mnt.device_name.split("/").pop()}. Please review and proceed as per schedule.`)}`,
              MaintenanceStatus.Planned,
              { maintenance_id: plan_mnt._id, target_view: 'Maintenance Dashboard', target_tab: plan_mnt.maintenance_type, expectedCompletionStatus: MaintenanceStatus.PTWRequested, currentStatus: MaintenanceStatus.Planned },
              'Request for PTW'
            );
          } else {
            this.appService.sendActionableNotification(
              { id: this.appService.getLoginID(), name: this.appService.getUserName(), loginId: this.appService.getLoginID() },
              recieving_users,
              [],
              `${this.appService.unescapedName(`[MT_SATPM] Maintenance Plan Alert: A maintenance activity has been planned by ${plan_mnt.sse} on ${plan_mnt.device_name.split("/")[4]} ${plan_mnt.device_name.split("/").pop()}. Please review and proceed as per schedule.`)}`,
              MaintenanceStatus.Planned,
              { maintenance_id: plan_mnt._id, target_view: 'Maintenance Dashboard', target_tab: plan_mnt.maintenance_type, expectedCompletionStatus: MaintenanceStatus.InProgress, currentStatus: MaintenanceStatus.Planned },
              'Start Maintenance'
            );
          }

          this.dismiss(response);
        }
      })
      .catch(err => {
        this._snackBar.open(this.locale_service.Locale.language.project.maintenancesettings.snackbar.erroroccured, this.locale_service.Locale.language.common.failed, { duration: 2000 });
        console.error(err);
      }).finally(() => { this.saving = false; });
  }
}
