import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { TabsPage } from './tabs.page';
import { IonicModule } from '@ionic/angular';
import { MessageAlertDlgComponent } from '../message-alert-dlg/message-alert-dlg.component';

const routes: Routes = [
  {
    path: '',
    component: TabsPage,
    children: [
      {
        path: 'dashboard',
        loadChildren: () =>
          import('../dashboard/dashboard.module').then(m => m.DashboardModule)
      },
      {
        path: 'maintenance',
        loadChildren: () =>
          import('../maintenance/maintenance.module').then(m => m.MaintenanceModule)
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      }
    ]
  }
];

@NgModule({
  declarations: [TabsPage],
  imports: [
    SharedModule,
    IonicModule,
    RouterModule.forChild(routes)
  ]
})
export class TabsModule {}
