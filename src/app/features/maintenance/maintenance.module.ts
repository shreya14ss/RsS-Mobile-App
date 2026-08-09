import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { MaintenancePage } from './maintenance.page';


const routes: Routes = [
  { path: '', component: MaintenancePage }
];

@NgModule({
  declarations: [
    MaintenancePage
  ],
  imports: [
    SharedModule,
    RouterModule.forChild(routes),
  ]
})
export class MaintenanceModule { }
