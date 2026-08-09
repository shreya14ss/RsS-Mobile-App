import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { RsButtonComponent } from './components/rs-button/rs-button.component';
import { RsInputComponent } from './components/rs-input/rs-input.component';
import { RsMobileListComponent } from './components/rs-mobile-list/rs-mobile-list.component';
import { BreadcrumbComponent } from './breadcrumb/breadcrumb.component';
import { MessageAlertDlgComponent } from '../features/message-alert-dlg/message-alert-dlg.component';
import { ConfirmationDlgComponent } from './components/confirmation-dlg/confirmation-dlg.component';
import { DateTimeSelectionDlgComponent } from './components/date-time-selection/date-time-selection-dlg/date-time-selection-dlg.component';
import { DateTimeSelectionComponent } from './components/date-time-selection/date-time-selection.component';
import { AboutConfigurationDlgComponent } from './components/about-configuration-dlg/about-configuration-dlg.component';
import { SearchFilterBarComponent } from './components/search-filter-bar/search-filter-bar.component';

@NgModule({
  declarations: [
    RsButtonComponent,
    RsInputComponent,
    RsMobileListComponent,
    BreadcrumbComponent,
    MessageAlertDlgComponent,
    ConfirmationDlgComponent,
    DateTimeSelectionDlgComponent,
    DateTimeSelectionComponent,
    AboutConfigurationDlgComponent,
    SearchFilterBarComponent,
  ],
  imports: [
    CommonModule,
    IonicModule,
    ReactiveFormsModule,
    FormsModule,
  ],
  exports: [
    RsButtonComponent,
    RsInputComponent,
    RsMobileListComponent,
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    IonicModule,
    BreadcrumbComponent,
    MessageAlertDlgComponent,
    ConfirmationDlgComponent,
    DateTimeSelectionDlgComponent,
    DateTimeSelectionComponent,
    AboutConfigurationDlgComponent,
    SearchFilterBarComponent,
  ]
})
export class SharedModule { }
