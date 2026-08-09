import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ModalController } from '@ionic/angular';
import { AppService } from 'src/app/core/services/app.service';
import { LocaleService } from 'src/app/core/services/locale/locale.service';

@Component({
  selector: 'app-confirmation-remarks-dlg',
  templateUrl: './confirmation-remarks-dlg.component.html',
})
export class ConfirmationRemarksDlgComponent implements OnInit {

  @Input() dialogData: any;

  form: FormGroup;

  constructor(
    public locale_service: LocaleService,
    public appservice: AppService,
    private formBuilder: FormBuilder,
    private modalController: ModalController,
  ) {}

  ngOnInit() {
    this.form = this.formBuilder.group({
      cancel_reason: ['', Validators.required]
    });
  }

  dismiss() {
    this.modalController.dismiss(null);
  }

  confirm() {
    if (this.form.invalid) return;
    this.modalController.dismiss({ cancel_reason: this.form.value.cancel_reason });
  }
}
