import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { DashboardPage } from './dashboard.page';
import { IonicModule } from '@ionic/angular';
import { MessageAlertDlgComponent } from '../message-alert-dlg/message-alert-dlg.component';
import { PVMainComponent } from '../pvmain/pvmain.component';
//import { PVMainComponent } from '../pvmain/pvmain.component';
const routes: Routes = [
  { path: '', component: DashboardPage }
];

@NgModule({
  declarations: [
    DashboardPage,
    // PVMainComponent,
  ],
  imports: [
    SharedModule,
     IonicModule,
    RouterModule.forChild(routes),
  ]
})
export class DashboardModule { }
