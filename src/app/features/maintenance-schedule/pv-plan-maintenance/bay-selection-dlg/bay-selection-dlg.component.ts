import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ModalController, ToastController } from '@ionic/angular';
import { AppService } from 'src/app/core/services/app.service';
import { MaintenanceService, MaintenanceStatus } from 'src/app/core/services/maintenance.service';
import { LocaleService } from 'src/app/core/services/locale/locale.service';
import { DateTimeSelectionDlgComponent } from 'src/app/shared/components/date-time-selection/date-time-selection-dlg/date-time-selection-dlg.component';

@Component({
  selector: 'app-bay-selection-dlg',
  templateUrl: './bay-selection-dlg.component.html',
  styleUrls: ['./bay-selection-dlg.component.scss']
})
export class BaySelectionDlgComponent implements OnInit, OnDestroy {
  @Input() dialogData: any;

  form: FormGroup;
  connectedBays: string[] = [];
  saving = false;
  isDelayedMaintenance = false;
  private destroy$ = new Subject<void>();

  constructor(
    private modalController: ModalController,
    private toastController: ToastController,
    private route: ActivatedRoute,
    public locale_service: LocaleService,
    private appService: AppService,
    private formBuilder: FormBuilder,
    private mntservice: MaintenanceService,
  ) { }

  async ngOnInit() {
    this.connectedBays = this.dialogData.element.mntlst.connected_bays ?? [];

    // If the scheduled cutoff is already in the past, don't pre-fill the planned date —
    // the user must explicitly pick a new (today/future) date. Otherwise the maintenance
    // would silently get planned in the past when the user just clicks Confirm.
    const cutoff = this.dialogData.element.cutoff;
    const cutoffIsPast = this.isPreviousDay(cutoff);
    const initialPlannedDate = cutoffIsPast ? null : (cutoff ?? Date.now());
    const initialShowPDate = (cutoff && !cutoffIsPast)
      ? this.appService.dateToString(cutoff, 11) : '';

    this.form = this.formBuilder.group({
      plannedDate: [initialPlannedDate, Validators.required],
      showpdate: [initialShowPDate],
      tl_time_range_value: [this.dialogData.element.tl_time_range_value ?? 0],
      tl_time_range_type: [this.dialogData.element.tl_time_range_type ?? 'Hour'],
      reqshutdown: [false],
      reason: [''],
    });

    this.form.get('reqshutdown')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((isChecked: boolean) => {
        const ctrl = this.form.get('tl_time_range_value');
        if (isChecked) {
          ctrl?.setValidators([Validators.required, Validators.min(1)]);
          this.form.addControl('maintenance_on_bay', new FormControl(this.connectedBays[0] ?? ''));
        } else {
          ctrl?.clearValidators();
          ctrl?.setValue(null);
          if (this.form.get('maintenance_on_bay')) {
            this.form.removeControl('maintenance_on_bay');
          }
        }
        ctrl?.updateValueAndValidity();
      });

    this.saving = true;
    const response: any = await this.mntservice.GetPlanMntByDeviceNames(this.connectedBays);
    if (response?.code != null) {
      await this.showToast('Could not get Planned Bay');
    } else {
      this.dialogData.my_cbay_mnts = (response as any[])
        .filter(mnt =>
          mnt.shutdown_required &&
          this.connectedBays.includes(mnt.device_name) &&
          mnt.requests_approves.backcharging_cancel_issued_datetime == 0
        );
      if (this.dialogData.my_cbay_mnts.length === 0) {
        this.dialogData.my_cbay_mnts = undefined;
      }
    }
    this.saving = false;

    this.isDelayedMaintenance = this.isPreviousDay(this.dialogData.element.cutoff);
    if (this.isDelayedMaintenance) {
      const reasonCtrl = this.form.get('reason');
      reasonCtrl?.setValidators([Validators.required]);
      reasonCtrl?.updateValueAndValidity();
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  isPreviousDay(timestamp: number): boolean {
    if (!timestamp) return false;
    const input = new Date(timestamp);
    const today = new Date();
    input.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return input < today;
  }

  async dateClicked() {
    const cutoff = this.dialogData.element.cutoff;
    const cutoffFallback = (cutoff && !this.isPreviousDay(cutoff)) ? cutoff : Date.now();
    const sdatetime = this.form.get('plannedDate')?.value ?? cutoffFallback;
    const modal_datetime = await this.modalController.create({
      component: DateTimeSelectionDlgComponent,
      componentProps: {
        dialogData: {
          selection_type: 'single_time',
          value: { range: { start: sdatetime, end: sdatetime } },
          showSeconds: true,
          showMilli: false,
          isShowRange: false,
          restrictPastDate: true
        }
      }
    });
    await modal_datetime.present();
    const { data } = await modal_datetime.onDidDismiss();
    if (data?.range?.start) {
      this.form.patchValue({
        plannedDate: data.range.end,
        showpdate: this.appService.dateToString(data.range.end, 11),
      });
    }
  }

  navigateToMaintenanceTab() {
    const project_id = this.route.snapshot.root.firstChild.firstChild.paramMap.get('id');
    const path = this.route.snapshot.root.firstChild.firstChild.data.viewData.group_path.join('/');
    this.mntservice.NavigateToMaintenanceTab(project_id, path, 'Maintenance Dashboard', 'Asst. Mnt. Elmnt');
    this.modalController.dismiss(null);
  }

  cancel() {
    this.modalController.dismiss(null);
  }

  async save() {
    if (this.saving) return;
    this.saving = true;

    if (this.form.invalid) {
      await this.showToast(this.locale_service.Locale.language.project.maintenancesettings.snackbar.validationmessage);
      this.saving = false;
      return;
    }

    const form_val = this.form.value;
    const element = this.dialogData.element;

    if (element.mntlst.frequency !== null) {
      element.mntlst.frequency.maintenanceCount = 1;
    }
    element.mntlst.is_scheduled = true;

    const saveData: any = {
      device_name: form_val.reqshutdown
        ? form_val.maintenance_on_bay
        : element.mntlst.connected_line_path,
      cutoffDate: element.cutoff,
      plannedDate: form_val.plannedDate,
      current_status: MaintenanceStatus.Planned,
      maintenance_type: form_val.reqshutdown ? 'Bay' : 'TL',
      maintenance_list: element.mntlst,
      connected_bay: element.connected_bay,
      shutdown_required: form_val.reqshutdown,
      requests_approves: { planned_datetime: form_val.plannedDate },
      time_range_value: form_val.tl_time_range_value,
      time_range_type: form_val.tl_time_range_type,
      tl_details: this.dialogData.tl_details,
      delayed_reason: form_val.reason,
      observations_list: [],
      shutdown_duration_history: [],
    };

    saveData.shutdown_duration_history.push({
      user: `${this.appService.getUserName()} (${this.appService.getLoginID()})`,
      time: form_val.plannedDate,
      time_range_value: form_val.tl_time_range_value,
      time_range_type: form_val.tl_time_range_type,
    });

    saveData.maintenance_list.maintenance_on_bay = form_val.maintenance_on_bay;

    const role_name = this.route.snapshot.root.firstChild.firstChild.data.viewData.access.role.role.role_name;
    saveData['sse'] = `${role_name ?? ''}-${this.appService.getUserName()}(${this.appService.getLoginID()})`;

    if (saveData.shutdown_required && saveData.maintenance_list.template._id.startsWith('ptt')) {
      this.dialogData.my_line_mnts = true;
    }

    const tlResponse = await this.mntservice.GetTLById(saveData.maintenance_list.connected_line);
    if (tlResponse?.code != null) {
      await this.showToast('Could not get TL Master');
      this.saving = false;
      return;
    }
    saveData.tl_details = tlResponse;

    this.mntservice.SavePlanMnt(saveData)
      .then(async (response) => {
        if (response?.code != null) {
          await this.showToast(this.locale_service.Locale.language.errorcode.maintenance[response.code]);
        } else {
          await this.showToast(this.locale_service.Locale.language.project.maintenancesettings.snackbar.planned);

          const plan_mnt = response;
          const tlPath = plan_mnt.maintenance_list.connected_line_path;
          const mntTowerRange = (plan_mnt.maintenance_list.tower_range || '').trim().toLowerCase();

          let receivingUsers = await this.appService.GetUserIdsFromRight('rqst_ptw_Button', tlPath);
          if (mntTowerRange) {
            receivingUsers = receivingUsers.filter((user: any) => {
              const userRange = (user.tower_range || '').trim().toLowerCase();
              return !userRange || userRange === mntTowerRange;
            });
          }

          this.appService.sendActionableNotification(
            { id: this.appService.getLoginID(), name: this.appService.getUserName(), loginId: this.appService.getLoginID() },
            receivingUsers,
            [],
            `${this.appService.unescapedName(`[MT_SPTLBS] Maintenance Plan Alert: A maintenance activity has been planned by ${plan_mnt.sse} on ${plan_mnt.maintenance_list.connected_line}. Please review and proceed as per schedule.`)}`,
            MaintenanceStatus.Planned,
            {
              maintenance_id: plan_mnt._id,
              target_view: 'Maintenance Dashboard',
              target_tab: 'Scheduled TL',
              expectedCompletionStatus: MaintenanceStatus.PTWRequested,
              currentStatus: MaintenanceStatus.Planned,
            },
            'Request for PTW'
          );

          this.modalController.dismiss(response);
        }
      })
      .catch(async err => {
        await this.showToast(this.locale_service.Locale.language.project.maintenancesettings.snackbar.erroroccured);
        console.error(err);
      })
      .finally(() => { this.saving = false; });
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
