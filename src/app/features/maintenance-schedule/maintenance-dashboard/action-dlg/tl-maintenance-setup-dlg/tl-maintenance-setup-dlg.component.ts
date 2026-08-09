import { Component, OnInit, Input, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ToastController, ModalController } from '@ionic/angular';
import { AppService } from 'src/app/core/services/app.service';
import { MaintenanceService } from 'src/app/core/services/maintenance.service';

@Component({
  selector: 'app-tl-maintenance-setup-dlg',
  templateUrl: './tl-maintenance-setup-dlg.component.html',
  styleUrls: ['./tl-maintenance-setup-dlg.component.scss']
})
export class TlMaintenanceSetupDlgComponent implements OnInit {

  @Input() dialogData: any;

  form: FormGroup;
  saving = false;

  filteredTemplateNames: string[] = [];
  originalTemplateNames: string[] = [];
  Templates: any[] = [];
  templateSchedules: string[] = [];

  filteredObservations: any[] = [];
  originalObservations: any[] = [];

  connected_bays: string[] = [];

  constructor(
    private formBuilder: FormBuilder,
    private toastController: ToastController,
    public modalController: ModalController,
    public appservice: AppService,
    public mntservice: MaintenanceService,
    private cdr: ChangeDetectorRef
  ) { }

  async ngOnInit() {
    this.saving = true;
    this.form = this.formBuilder.group({
      templates: [[]],
      observations: [false],
      maintenance_on_bay: [''],
    });

    let observation_path = '';

    if (this.dialogData.is_tl_planning) {
      this.connected_bays.push(this.dialogData.connected_bay_mnt_details.device_name);
      this.connected_bays = [...this.connected_bays, ...Object.keys(this.dialogData.connected_bay_mnt_details.backcharging_id)];

      let data = await this.mntservice.GetAllMaintenanceTemplate('transmissionline');
      if (data.code && data.code != null) {
        this.showToast('Failed to load TL templates');
      } else {
        observation_path = this.dialogData.connected_bay_mnt_details.connected_line_path;
        let tl = await this.mntservice.GetTransmissionById(this.dialogData.connected_bay_mnt_details.line_name);
        if (tl.code && tl.code != null) {
          this.showToast('Failed to load transmission data');
        } else {
          data?.transmissiondetails?.forEach(temp => {
            let tl_mnt_list = tl.maintenance_list.find(t => t.template._id == temp._id);
            if ((this.dialogData.mnt_on_same_tl_bay
              ? !this.dialogData.mnt_on_same_tl_bay.some(bay => bay.maintenance_list._id == temp._id)
              : true) && tl_mnt_list?.cutoff_date) {
              if (temp.scheduled_patrolling == 'scheduled' && temp.reqshutdown) {
                this.Templates.push(temp);
                this.originalTemplateNames.push(temp.maintenancename);
                this.filteredTemplateNames.push(temp.maintenancename);
                this.templateSchedules.push(this.appservice.dateToString(tl_mnt_list.cutoff_date, 4));
              }
            }
          });
        }
      }
    } else {
      let ss_bay = this.dialogData.my_line_bay.split('/').slice(-2);
      let ss = await this.mntservice.GetSubstationById(ss_bay[0]);
      if (ss.code && ss.code != null) {
        this.showToast('Failed to load substation data');
      } else {
        observation_path = this.dialogData.my_line_bay;
        for (let s = 0; s < ss.bay.length; s++) {
          let bay = ss.bay[s];
          if (this.dialogData.my_line_bay.split('/').slice(-1)[0] == bay.name) {
            bay.maintenance_list.forEach(mnt => {
              if (!mnt.is_scheduled && mnt?.cutoff_date && mnt.template.reqshutdown && !mnt.template._id.startsWith('ptt')) {
                this.Templates.push(mnt);
                this.originalTemplateNames.push(mnt.template.maintenancename);
                this.filteredTemplateNames.push(mnt.template.maintenancename);
                this.templateSchedules.push(this.appservice.dateToString(mnt.cutoff_date, 4));
              }
            });
            break;
          }
        }
      }
    }

    let observationList = await this.mntservice.GetObservationByPath(observation_path);
    if (!(observationList.code && observationList.code != null)) {
      this.originalObservations = observationList.filter(val =>
        !(val.scheduled_status === 'scheduled' || val.scheduled_status === 'planned'));
      this.filteredObservations = this.originalObservations.slice();
    }

    this.saving = false;
    this.cdr.detectChanges();
  }

  get selectedTemplates(): string[] {
    return this.form?.get('templates')?.value ?? [];
  }

  get observationsEnabled(): boolean {
    return this.originalObservations.length > 0 && this.selectedTemplates.length === 0;
  }

  async showToast(message: string, color: string = 'danger') {
    const toast = await this.toastController.create({ message, duration: 2500, color });
    await toast.present();
  }

  async save() {
    let form_val = this.form.value;

    if ((!form_val.templates || form_val.templates.length == 0) && !form_val.observations) {
      this.showToast('Select at least one template or attend observations');
      return;
    }
    if (this.connected_bays.length > 0 && !form_val.maintenance_on_bay) {
      this.showToast('Select one line bay to create maintenance');
      return;
    }

    this.saving = true;

    let ob_response;
    if (form_val.observations) {
      ob_response = await this.mntservice.GetObservationById(this.filteredObservations[0]._id);
      if (ob_response.code && ob_response.code != null) {
        this.showToast('Failed to load observation data');
        this.saving = false;
        return;
      }
    }

    let response;
    if (form_val.observations) {
      if (this.dialogData.is_tl_planning) {
        response = await this.mntservice.CreateObservationTLScheduledMnt(
          this.dialogData.connected_bay_mnt_details.device_name,
          this.dialogData.connected_bay_mnt_details.plannedDate,
          ob_response,
          this.filteredObservations.map(obs => obs._id),
          this.dialogData.connected_bay_mnt_details.maintenance_list?.line_name,
          this.dialogData.connected_bay_mnt_details.maintenance_list?.voltage_level,
          this.dialogData.connected_bay_mnt_details.maintenance_list?.tower_range,
          this.dialogData.connected_bay_mnt_details._id
        );
      } else {
        response = await this.mntservice.CreateObservationBayScheduledMnt(
          this.dialogData.my_line_bay,
          this.dialogData.connected_bay_mnt_details.plannedDate,
          ob_response,
          this.filteredObservations.map(obs => obs._id),
          this.dialogData.connected_bay_mnt_details.maintenance_list?.line_name,
          this.dialogData.connected_bay_mnt_details._id
        );
      }
    } else if (this.dialogData.is_tl_planning) {
      response = await this.mntservice.CreateTLScheduledMnt({
        tl_templates: form_val.templates.map(name => this.Templates.find(tmp => tmp.maintenancename == name)),
        connected_bay_mnt_id: this.dialogData.connected_bay_mnt_details._id,
        tl_path: this.dialogData.connected_bay_mnt_details.connected_line_path,
        bay_path: form_val.maintenance_on_bay
      });
    } else {
      response = await this.mntservice.CreateLineBayScheduledMnt({
        bay_mnt_list: form_val.templates.map(name => this.Templates.find(tmp => tmp.template.maintenancename == name)),
        connected_bay_mnt_id: this.dialogData.connected_bay_mnt_details._id,
        path: this.dialogData.my_line_bay
      });
    }

    if (response.code && response.code != null) {
      this.showToast('Failed to create maintenance');
      this.saving = false;
      return;
    }

    this.showToast('Planned activity added to dashboard', 'success');
    this.saving = false;
    this.modalController.dismiss(true);
  }
}
