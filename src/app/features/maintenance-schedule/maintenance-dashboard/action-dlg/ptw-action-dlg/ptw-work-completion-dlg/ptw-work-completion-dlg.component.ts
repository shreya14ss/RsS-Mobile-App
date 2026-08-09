import { Component, OnInit, Input } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ModalController, ToastController } from '@ionic/angular';
import { LocaleService } from 'src/app/core/services/locale/locale.service';
import { MaintenanceService, MaintenanceStatus } from '../../../../../../core/services/maintenance.service';

@Component({
  selector: 'app-ptw-work-completion-dlg',
  templateUrl: './ptw-work-completion-dlg.component.html',
  styleUrls: ['./ptw-work-completion-dlg.component.scss']
})
export class PtwWorkCompletionDlgComponent implements OnInit {

  @Input() dialogData: any;   // ✅ restored

  form: FormGroup;
  InProgress = false;

  constructor(
    public locale_service: LocaleService,
    private formBuilder: FormBuilder,
    private mntservice: MaintenanceService,
    private toastCtrl: ToastController,
    private modalController: ModalController,
  ) {}

  ngOnInit(): void {
    this.form = this.formBuilder.group({
      maintenance_status: ['', Validators.required],
      cancel_remarks: ['']
    });

    this.form.get('maintenance_status').valueChanges.subscribe(status => {
      if (status === 'ptw_c_r_work_incomplete') {
        this.form.get('cancel_remarks').setValidators([Validators.required]);
      } else {
        this.form.get('cancel_remarks').setValidators(null);
      }
      this.form.get('cancel_remarks').updateValueAndValidity();
    });
  }

  async showToast(message: string, color: string = 'success') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 4000,
      position: 'bottom',
      color
    });
    await toast.present();
  }

  onCancel() {
    this.modalController.dismiss(null);
  }

  cancelPTW() {
    let form_val = this.form.value;
    let next_status = MaintenanceStatus.PTWCancelRequested;

    let ptwDetails = JSON.parse(JSON.stringify(this.dialogData.ptwDetails));
    ptwDetails.cancellation_details = form_val;
    ptwDetails.ptw_work_completed =
      form_val.maintenance_status == MaintenanceStatus.PTWCancelRequestedWorkComplete;

    ptwDetails.remarks = form_val.cancel_remarks;

    this.InProgress = true;

    this.mntservice.UpdatePTW(
      ptwDetails,
      next_status,
      this.dialogData.maintenanceDetails._id
    ).then(async data => {

      if (data.code && data.code != null) {
        await this.showToast(
          this.locale_service.Locale.language.errorcode.maintenance[data.code],
          'danger'
        );
      } else {
        await this.showToast(
          this.locale_service.Locale.language.project.maintenancesettings.snackbar.ptwcancellationrequest,
          'success'
        );

        data.current_status = next_status;
        this.modalController.dismiss(data);
      }

      this.InProgress = false;
    });
  }
}