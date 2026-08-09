import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { AppService, AppVersionDetails } from '../../../core/services/app.service';
import { SignalRService } from '../../../core/services/signal-r.service';
import { LocaleService } from '../../../core/services/locale/locale.service';

@Component({
  selector: 'app-about-configuration-dlg',
  templateUrl: './about-configuration-dlg.component.html',
  styleUrls: ['./about-configuration-dlg.component.scss']
})
export class AboutConfigurationDlgComponent implements OnInit {
  versionDetails?: AppVersionDetails;
  version: any;
  InProgress: boolean = true;

  constructor(
    private modalController: ModalController,
    public locale_service: LocaleService,
    private _signalr: SignalRService,
    public appService: AppService
  ) { }

  async ngOnInit(): Promise<void> {
    this.InProgress = true;
    console.log(this.appService.getVersionDetails());
    let data = await this._signalr.GetConfigVersionDetails();
    this.version = data;
    this.InProgress = false;
    this.InProgress = true;
    this.appService.getVersionDetails().subscribe(data => {
      this.versionDetails = data;
      this.InProgress = false;
    });
  }

  onClose() {
    this.modalController.dismiss(null);
  }
}
