import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { IonicModule, IonicRouteStrategy } from '@ionic/angular';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { CoreModule } from './core/core.module';
import { JwtInterceptor } from './core/interceptors/jwt.interceptor';
// import { CompletedMaintenanceComponent } from './features/completed-maintenance/completed-maintenance.component';
// import { PlanMaintenanceComponent } from './features/plan-maintenance/plan-maintenance.component';
// import { MaintenanceDetailsDlgComponent } from './features/maintenance-dashboard/maintenance-details/maintenance-details.component';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { PVMainComponent } from './features/pvmain/pvmain.component';
import { LoginPage } from './features/auth/login.page';
import { LoginSelectorComponent } from './features/auth/login-selector/login-selector.component';
import { SharedModule } from './shared/shared.module';

@NgModule({
  declarations: [
    AppComponent,
    LoginPage,
    LoginSelectorComponent,
    // CompletedMaintenanceComponent,
    // MaintenanceDashboardComponent,
    // PlanMaintenanceComponent,
    // MaintenanceDetailsDlgComponent,
    //PVMainComponent
  ],
  imports: [
    SharedModule,
    BrowserModule,
    IonicModule.forRoot({
      mode: 'md'
    }),
    HttpClientModule,
    CoreModule,
    AppRoutingModule,
    NoopAnimationsModule
  ],
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    { provide: HTTP_INTERCEPTORS, useClass: JwtInterceptor, multi: true }
  ],
  // schemas: [CUSTOM_ELEMENTS_SCHEMA],
  bootstrap: [AppComponent],
  entryComponents: [LoginSelectorComponent]
})
export class AppModule { }
