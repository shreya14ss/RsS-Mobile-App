import { Component, OnInit, Input } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ToastController, ModalController } from '@ionic/angular';
import { LocaleService } from 'src/app/core/services/locale/locale.service';

@Component({
  selector: 'app-add-update-patrolling-info',
  templateUrl: './add-update-patrolling-info.component.html',
  styleUrls: ['./add-update-patrolling-info.component.scss']
})
export class AddUpdatePatrollingInfoComponent implements OnInit {

  @Input() dialogData: any; // replaces MAT_DIALOG_DATA

  form: FormGroup;
  saving = false;

  constructor(
    private formBuilder: FormBuilder,
    public locale_service: LocaleService,
    private toastController: ToastController,
    public modalController: ModalController
  ) { }
  norder = () => 0;
  ngOnInit(): void {

    this.form = this.formBuilder.group({
      tower_start: [
        this.dialogData.obj ? this.dialogData.obj.tower_start : '',
        [Validators.min(this.dialogData.min), Validators.max(this.dialogData.max)]
      ],
      tower_end: [
        this.dialogData.obj ? this.dialogData.obj.tower_end : '',
        [Validators.min(this.dialogData.min), Validators.max(this.dialogData.max)]
      ],
      name: [
        this.dialogData.obj ? this.dialogData.obj.name : '',
        Validators.required
      ],
      status: [
        this.dialogData.obj ? this.dialogData.obj.status : 'In Progress',
        Validators.required
      ]
    });
  }

  // ✅ Toast instead of snackbar
  async showToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'bottom'
    });
    await toast.present();
  }

  // ✅ SAME VALIDATION LOGIC
  isValidated(formval: any) {

    if (formval.tower_end < formval.tower_start) {
      this.showToast(
        this.locale_service.Locale.language.project.maintenancesettings.snackbar.towerendsmallervalidate
      );
      return false;
    }

    if (this.dialogData.min > formval.tower_start) {
      this.showToast(
        this.locale_service.Locale.language.project.maintenancesettings.snackbar.towerminvalidate
      );
      return false;
    }

    if (this.dialogData.max < formval.tower_end) {
      this.showToast("Maximum value is " + this.dialogData.max + " for Tower End");
      return false;
    }

    return true;
  }

  // ✅ SAME SAVE LOGIC
  async save() {

    let formval = this.form.value;

    if (this.isValidated(formval)) {

      let hasConflict = false;

      this.dialogData.ds.forEach((p_det: any, idx: number) => {

        if (this.hasRangeConflict(p_det, formval)) {

          this.showToast(
            "Tower Start/ Tower End has a conflict with an existing range"
          );

          hasConflict = true;
          return;
        }
      });

      if (!hasConflict) {
        this.modalController.dismiss(formval);
        return;
      }
    }

    this.modalController.dismiss(null);
  }

  // ✅ SAME UPDATE LOGIC
  async update() {

    let formval = this.form.value;

    if (this.isValidated(formval)) {

      let hasConflict = false;

      this.dialogData.ds.forEach((p_det: any, idx: number) => {

        if (this.dialogData.index != null && this.dialogData.index != idx) {

          if (this.hasRangeConflict(p_det, formval)) {

            this.showToast(
              this.locale_service.Locale.language.project.maintenancesettings.snackbar.towerexistingrange
            );

            hasConflict = true;
            return;
          }
        }
      });

      if (!hasConflict) {
        this.modalController.dismiss(formval);
        return;
      }
    }

    this.modalController.dismiss(null);
  }

  // ✅ SAME RANGE CONFLICT LOGIC
  hasRangeConflict(p_det: any, formval: any) {
    return (
      (p_det.tower_start <= formval.tower_start && formval.tower_start <= p_det.tower_end) ||
      (p_det.tower_start <= formval.tower_end && formval.tower_end <= p_det.tower_end) ||
      (formval.tower_start <= p_det.tower_start && p_det.tower_end <= formval.tower_end)
    );
  }

}