import { Component, Input } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { Router } from '@angular/router';
import { AppService } from '../../../core/services/app.service';
import { LocaleService } from '../../../core/services/locale/locale.service';

@Component({
  selector: 'app-confirmation-dlg',
  templateUrl: './confirmation-dlg.component.html',
  styleUrls: ['./confirmation-dlg.component.scss']
})
export class ConfirmationDlgComponent {

  @Input() dialogData: any;

  constructor(
    private modalController: ModalController,
    public locale_service: LocaleService,
    public router: Router,
    public appservice: AppService,
  ) {}

  onClose(result: boolean) {
    this.modalController.dismiss(result);
  }
}
