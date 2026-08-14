import { Component, Input, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ModalController, ToastController } from '@ionic/angular';
import { ActivatedRoute } from '@angular/router';
import { AppService } from 'src/app/core/services/app.service';
import { LocaleService } from 'src/app/core/services/locale/locale.service';
import { MaintenanceService, MaintenanceStatus } from 'src/app/core/services/maintenance.service';
import { SignalRService } from 'src/app/core/services/signal-r.service';
import { ProjectResolverService } from 'src/app/core/services/project-resolver.service';

@Component({
  selector: 'app-conditional-maintenance-setup-dlg',
  templateUrl: './conditional-maintenance-setup-dlg.component.html',
  styleUrls: ['./conditional-maintenance-setup-dlg.component.scss']
})
export class ConditionalMaintenanceSetupDlgComponent implements OnInit {

  @Input() dialogData: any;

  form: FormGroup;
  saving = false;
  object_list: any[] = [];
  linkedMaintenanceDeviceId: string = null;
  scheduledMaintenanceList: any[] = [];
  lvbayMntList: any[] = [];
  combinedMaintenanceList: any[] = [];
  filteredEqName: string[] = [];
  originalEqName: string[] = [];
  eqDetails: any[] = [];
  trpping_remarks: string = '';

  searchTerm = '';

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
    private cdr: ChangeDetectorRef
  ) { }

  async ngOnInit() {
    this.saving = true;

    this.form = this.formBuilder.group({
      eqname: [[], Validators.required],
      requireMnp: [false],
      reqshutdown: [true],
      scheduledMaintenance: [[]],
      time_range_value: [0],
      time_range_type: ['Hour']
    });

    // Fire independent loads in parallel; isolate each failure so one bad response
    // doesn't abort the others or trap the saving spinner forever.
    const safe = <T,>(p: Promise<T>): Promise<T | null> =>
      p.then(v => v).catch(e => { console.warn('[BreakdownSetup] load failed', e); return null; });

    try {
      const [
        remarks,
        equipmentTemplateData,
        hv_lv_bay,
        primaryEqps,
        maintenancelist
      ] = await Promise.all([
        safe(this.signalr.GetCBLastDetails(this.dialogData.obj_id, this.dialogData.datetime)),
        safe(this.mntservice.GetAllMaintenanceTemplate('equipment', false)),
        safe(this.mntservice.GetLVbayFromHVbay(this.dialogData.path)),
        safe(this.mntservice.GetAllEquipmentsByBay(this.dialogData.path)),
        safe(this.mntservice.GetMaintenanceListByPath(this.dialogData.path)),
      ]);

      // signalr.GetObjectList only feeds the (currently unused) object_list — fire and forget
      safe(this.signalr.GetObjectList(this.dialogData.path)).then(data => { this.object_list = (data as any) || []; });

      this.trpping_remarks = (typeof remarks === 'string') ? remarks : '';

      if (!equipmentTemplateData || (equipmentTemplateData as any).code) {
        this.showToast('Equipment templates unavailable');
      }
      const templateDetails: any[] = (equipmentTemplateData as any)?.equipmentdetails ?? [];

      // LV-bay equipments (depends on hv_lv_bay path)
      if (hv_lv_bay && typeof hv_lv_bay === 'string') {
        const lvEqps: any = await safe(this.mntservice.GetAllEquipmentsByBay(hv_lv_bay));
        if (lvEqps && !lvEqps.code && Array.isArray(lvEqps)) {
          const bay_name = hv_lv_bay.split('/').slice(-1)[0];
          this.eqDetails = templateDetails.length > 0
            ? lvEqps.filter((item: any) => {
                if (templateDetails.some(primary => primary.devicetype == item.type)) {
                  item.name = bay_name + '/' + item.name;
                  item.additional_bay = bay_name;
                  return true;
                }
                return false;
              })
            : lvEqps;
        }
      }

      // Primary-bay equipments
      if (!primaryEqps || (primaryEqps as any).code) {
        this.showToast('Failed to load equipment list');
      } else if (Array.isArray(primaryEqps)) {
        const filtered = templateDetails.length > 0
          ? primaryEqps.filter((item: any) => templateDetails.some(primary => primary.devicetype == item.type))
          : primaryEqps;
        this.eqDetails = [...this.eqDetails, ...filtered];
        this.originalEqName = this.eqDetails.map(item => item.name);
        this.filteredEqName = [...this.originalEqName];
        if (!this.form.get('eqname').value?.length) {
          this.form.get('eqname').setValue(this.originalEqName);
        }
      }

      // Scheduled maintenance list
      if (maintenancelist && Object.keys(maintenancelist).length > 0) {
        const firstKey = Object.keys(maintenancelist)[0];
        const firstList = (maintenancelist as any)[firstKey] || [];
        this.scheduledMaintenanceList = firstList
          .filter((x: any) => x.item2?.template?.reqshutdown)
          .map((x: any) => ({ ...x.item2, isLvBay: false }));
        this.mergeMaintenanceLists();
      }
    } catch (e) {
      console.error('[BreakdownSetup] ngOnInit failed', e);
      this.showToast('Could not load all maintenance data');
    } finally {
      this.saving = false;
      this.cdr.detectChanges();
    }
  }

  private mergeMaintenanceLists(): void {
    const scheduled = Array.isArray(this.scheduledMaintenanceList) ? this.scheduledMaintenanceList : [];
    const lvbay = Array.isArray(this.lvbayMntList) ? this.lvbayMntList : [];

    if (lvbay.length > 0) {
      scheduled.forEach(s => {
        s.lvBayName = lvbay[0].lvBayName;
        s.lvBayDeviceId = lvbay[0].lvBayDeviceId;
      });
    }
    this.combinedMaintenanceList = [...scheduled, ...lvbay];
  }

  get showNoTemplatesMessage(): boolean {
    return !this.saving && (!this.combinedMaintenanceList || this.combinedMaintenanceList.length === 0);
  }

  get selectedEqNames(): string[] {
    return this.form?.get('eqname')?.value ?? [];
  }

  get selectedScheduled(): any[] {
    return this.form?.get('scheduledMaintenance')?.value ?? [];
  }

  get isEditableMode(): boolean {
    return this.dialogData?.current_status != 'planned' && this.resolver?.MaintenanceAccessRights?.create_conditional_maintenance;
  }

  search(value: string) {
    this.searchTerm = value || '';
    const filter = this.searchTerm.toLowerCase();
    this.filteredEqName = this.originalEqName.filter(name => name.toLowerCase().includes(filter));
  }

  removeEq(name: string) {
    const ctrl = this.form.get('eqname');
    const current: string[] = ctrl.value || [];
    ctrl.setValue(current.filter(n => n !== name));
  }

  removeScheduled(item: any) {
    const ctrl = this.form.get('scheduledMaintenance');
    const current: any[] = ctrl?.value || [];
    const nameToRemove = item.template?.maintenancename;
    const filtered = current.filter(x => x.template?.maintenancename !== nameToRemove);
    ctrl?.setValue(filtered);
    this.onScheduledMaintenanceSelect(filtered);
  }

  onScheduledMaintenanceSelect(selectedItems: any[]) {
    const ctrl = this.form.get('time_range_value');
    if (selectedItems && selectedItems.length > 0) {
      ctrl.setValidators([Validators.required, Validators.min(1)]);
    } else {
      ctrl.clearValidators();
    }
    ctrl.updateValueAndValidity();
  }

  private getUserNameWithID(): string {
    let role_name = '';
    try {
      role_name = this.route.snapshot.root.firstChild.firstChild.data['viewData']?.access?.role?.role?.role_name ?? '';
    } catch { /* swallow */ }
    return role_name
      ? `${role_name}-${this.appservice.getUserName()} (${this.appservice.getLoginID()})`
      : `${this.appservice.getUserName()} (${this.appservice.getLoginID()})`;
  }

  private applyNormalScheduledMaintenanceTransform(mnt: any, form_val: any) {
    mnt.maintenance_list = { ...mnt };
    mnt.device_name = this.dialogData.path;
    mnt.connected_hv_lv_bay = mnt.lvBayName ? [mnt.lvBayName] : null;
    mnt.connected_hv_lv_bay_ids = mnt.lvBayDeviceId ? [mnt.lvBayDeviceId] : null;
    mnt.cutoffDate = mnt.cutoff_date;
    mnt.current_status = MaintenanceStatus.Planned;
    mnt.maintenance_type = 'Bay';
    mnt.shutdown_required = true;
    mnt.observations_list = [];
    mnt.shutdown_duration_history = [];
    mnt.plannedDate = Date.now();
    mnt.time_range_value = form_val.time_range_value;
    mnt.time_range_type = form_val.time_range_type;
    mnt.requests_approves = { planned_datetime: Date.now() };
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
    mnt.connected_hv_lv_bay = [this.dialogData.path];
    mnt.connected_hv_lv_bay_ids = this.linkedMaintenanceDeviceId ? [this.linkedMaintenanceDeviceId] : null;
    mnt.cutoffDate = mnt.cutoff_date;
    mnt.current_status = MaintenanceStatus.Planned;
    mnt.maintenance_type = 'Bay';
    mnt.shutdown_required = true;
    mnt.observations_list = [];
    mnt.shutdown_duration_history = [];
    mnt.plannedDate = Date.now();
    mnt.time_range_value = form_val.time_range_value;
    mnt.time_range_type = form_val.time_range_type;
    mnt.requests_approves = { planned_datetime: Date.now() };
    mnt.shutdown_duration_history.push({
      user: this.getUserNameWithID(),
      time: form_val.plannedDate,
      time_range_value: form_val.time_range_value,
      time_range_type: form_val.time_range_type
    });
  }

  async save() {
    const form_val = this.form.value;
    if (!form_val.eqname || form_val.eqname.length === 0) {
      this.showToast('Select at least one equipment to start maintenance');
      return;
    }
    if (this.form.invalid) {
      this.showToast('Please complete the form');
      return;
    }

    this.saving = true;
    const eq_types: Record<string, string[]> = {};
    form_val.eqname.forEach(name => {
      const eq = this.eqDetails.find(e => e.name === name);
      if (!eq) return;
      const type = (eq.additional_bay ? eq.additional_bay + '/' : '') + eq.type;
      if (!eq_types[type]) eq_types[type] = [];
      eq_types[type].push(name);
    });

    if (form_val.scheduledMaintenance && form_val.scheduledMaintenance.length > 0) {
      for (const mnt of form_val.scheduledMaintenance) {
        if (mnt.isLvBay) {
          this.applyLvBayMaintenanceTransform(mnt, form_val);
        } else {
          this.applyNormalScheduledMaintenanceTransform(mnt, form_val);
        }
      }
    }

    const response = await this.mntservice.CreateConditionalMnt({
      eq_types,
      shutdown_required: form_val.reqshutdown,
      path: this.dialogData.path,
      requireMnp: form_val.requireMnp,
      planmnt: form_val.scheduledMaintenance
    });

    if (response && response.code != null) {
      this.showToast('Failed to start maintenance');
      this.saving = false;
      return;
    }

    // Send actionable notifications for each planned mnt (best-effort)
    const created_maintenance = Array.isArray(response) ? response : [];
    for (const plan_mnt of created_maintenance) {
      try {
        const devicePath = (plan_mnt.device_name || '').split('/');
        const substationPath = devicePath.slice(0, 5).join('/');
        const receiving_users = await this.appservice.GetUserIdsFromRight('rqst_ptw_Button', substationPath);
        if (!receiving_users || receiving_users.length === 0) continue;

        const message = this.appservice.unescapedName(
          `Maintenance Plan Alert: A maintenance activity has been planned by ${plan_mnt.sse} on ${devicePath[4]} ${devicePath.pop()}. Please review and proceed as per schedule.`
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
          'MT_SATPM',
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
      } catch (err) {
        console.error('Failed to send PTW notification:', err);
      }
    }

    this.showToast('Planned activity added to dashboard', 'success');
    this.saving = false;
    this.modalController.dismiss(true);
  }

  async showToast(message: string, color: string = 'danger') {
    const toast = await this.toastController.create({ message, duration: 2500, color });
    await toast.present();
  }

  cancel() {
    this.modalController.dismiss(null);
  }

  /**
   * Planned-state action: dismiss this dialog and ask the parent (dashboard) to open
   * the maintenance details for the connected plan_mnt.
   * connected_mnt_id is shaped as "<mnt_list_id>|<mnt._id>" — the second part is the plan_mnt id.
   */
  openMaintenanceDetails() {
    const connected = this.dialogData?.connected_mnt_id;
    if (!connected) {
      this.showToast('No linked maintenance found');
      return;
    }
    const mntId = String(connected).split('|')[1];
    if (!mntId) {
      this.showToast('Invalid maintenance reference');
      return;
    }
    this.modalController.dismiss({ action: 'openMaintenance', maintenanceId: mntId });
  }
}
