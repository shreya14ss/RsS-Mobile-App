import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
// import { PVEventComponent } from './pvevent/pvevent.component';
import { DynamicViewDirective } from './core/services/dynamic-view.directive';
import { PVMainComponent } from './features/pvmain/pvmain.component';
// import { ProjectAuthGuard } from './auth/project-auth.guard';
import { ProjectResolverService } from './core/services/project-resolver.service';
import { SharedModule } from './shared/shared.module';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule } from '@angular/material/sort';
import { MatMenuModule } from '@angular/material/menu';
// import { MatSidenavModule } from '@angular/material/sidenav';
// import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
// import { MatAutocompleteModule } from '@angular/material/autocomplete';
// import { MatTreeModule } from '@angular/material/tree';
// import { MatRadioModule } from '@angular/material/radio';
// import { MatButtonToggleModule } from '@angular/material/button-toggle';
// import { MatGridListModule } from '@angular/material/grid-list';
import { MatCheckboxModule } from '@angular/material/checkbox';
// import { MatBadgeModule } from '@angular/material/badge';
// import { MatPaginatorModule } from '@angular/material/paginator';
// import { MatSliderModule } from '@angular/material/slider';
// import { MatBottomSheetModule } from '@angular/material/bottom-sheet';
// import { MatDividerModule } from '@angular/material/divider';
// import { MatListModule } from '@angular/material/list';
// import { MatSelectModule } from '@angular/material/select';
// //import { MatOptionModule } from '@angular/material';
// import { MatButtonModule } from '@angular/material/button';
// import { MatSlideToggleModule } from '@angular/material/slide-toggle';
// import { MatTabsModule } from '@angular/material/tabs';
import { MatExpansionModule } from '@angular/material/expansion';
// import { DashBoardComponent } from './pvdashboard/dash-board/dash-board.component';
// import { DashTileComponent } from './pvdashboard/dash-tile/dash-tile.component';
// import { PVChartComponent } from './pvchart/pvchart.component';
// import { DashMergeComponent } from './pvdashboard/dash-merge/dash-merge.component';
// import { DashCardComponent } from './pvdashboard/dash-card/dash-card.component';
// import { PVHMIComponent } from './pvhmi/pvhmi.component';
// import { PVPanelComponent } from './pvpanel/pvpanel.component';
// import { PVBinaryReportComponent } from './pvbinary-report/pvbinary-report.component';
// import { ExportAsModule } from 'ngx-export-as';
// import { DashTitleComponent } from './pvdashboard/dash-title/dash-title.component';
// import { DashContentComponent, CREATE_PVPANEL_TOKEN, CREATE_PVCHART_TOKEN, CREATE_DASHBOARD_TOKEN, CREATE_PVHMI_TOKEN, CREATE_LOADSHEDDING_TOKEN, CREATE_MAPS_TOKEN, CREATE_CHAT_TOKEN, CREATE_MAINTENANCE_DEVICE_INFO_TOKEN, CREATE_OPERATIONAL_VIEW_TOKEN, CREATE_GRP_OPERATIONAL_VIEW_TOKEN, CREATE_EVENT_LOG_VIEW_TOKEN, CREATE_FAULT_REPORT_VIEW_TOKEN, CREATE_EVENT_VIEW_TOKEN, CREATE_SHIFT_CLOSE_REPORT_VIEW_TOKEN, CREATE_USERS_IN_SHIFT_VIEW_TOKEN } from './pvdashboard/dash-content/dash-content.component';
// import { HMIPopUpComponent } from './hmipop-up/hmipop-up.component';
// import { NgxDaterangepickerMd } from 'ngx-daterangepicker-material';
// import { FooterComponent } from './footer/footer.component';
// import { PVHistoryComponent } from './pvhistory/pvhistory.component';
// import { PVAlarmComponent } from './pvalarm/pvalarm.component';
// import { DragDropModule } from '@angular/cdk/drag-drop';
// import { FormsModule, ReactiveFormsModule } from '@angular/forms';
// import { ControlDlgComponent } from './control-management/control-dlg/control-dlg.component';
// import { InterlockViewDlgComponent } from './control-management/interlock-view-dlg/interlock-view-dlg.component';
// import { LoadsheddingproductComponent } from './loadshedding/loadsheddingproduct/loadsheddingproduct.component';
// import { LoadSheddingLogicComponent } from './loadshedding/load-shedding-logic/load-shedding-logic.component';
// import { LoadSheddingTreeComponent } from './loadshedding/load-shedding-tree/load-shedding-tree.component';
// import { PVReportSettingsComponent } from './pvreportsettings/pvreportsettings.component';
// import { PVReportObjectSettingsComponent } from './pvreportsettings/pvreportobjectsettings/pvreportobjectsettings.component';
// import { PVChartColorrangeSettingsComponent } from './pvreportsettings/pvchartcolorrangesettings/pvchartcolorrangesettings.component';
// import { PvColorrangeSettingdlgComponent } from './pvreportsettings/pv-colorrange-settingdlg/pv-colorrange-settingdlg.component';
// import { PVReportChartSettingsComponent } from './pvreportsettings/pvreportchartsettings/pvreportchartsettings.component';
// import { PVReportTimeSettingsComponent } from './pvreportsettings/pvreporttimesettings/pvreporttimesettings.component';
// import { PVReportPanelSettingsComponent } from './pvreportsettings/pvreportpanelsettings/pvreportpanelsettings.component';
// import { GroupObjectSelectionComponent } from './group-object-selection/group-object-selection.component';
// import { LoadSheddingEditorComponent } from './loadshedding/load-shedding-editor/load-shedding-editor.component';
// import { LoadSheddingStatusComponent } from './loadshedding/load-shedding-status/load-shedding-status.component';
// import { LoadSheddingMainComponent } from './loadshedding/load-shedding-main/load-shedding-main.component';
// import { PvObjectSettingdlgComponent } from './pvreportsettings/pv-object-settingdlg/pv-object-settingdlg.component';
// import { LoadSheddingStatusDetailComponent } from './loadshedding/load-shedding-status-detail/load-shedding-status-detail.component';
// import { LoadSheddingParametersComponent } from './loadshedding/load-shedding-parameters/load-shedding-parameters.component';
// import { PVToggleComponent } from './pvtoggle/pvtoggle.component';
// import { DynamicTableComponent } from 'src/app/common/dynamic-table/dynamic-table.component';
// import { PVStatusComponent } from './pvstatus/pvstatus.component';
// import { PVLiveTrendComponent } from './pvlive-trend/pvlive-trend.component';
// import { LoadSheddingReportComponent } from './loadshedding/load-shedding-report/load-shedding-report.component';
// import { PVTrippingReportComponent } from './pvtripping-report/pvtripping-report.component';
// import { ResizableModule } from 'angular-resizable-element';
// import { PvAddUpdateViewDetailDlg } from './pvdashboard/pv-add-update-view-detail-dlg/pv-add-update-view-detail-dlg.component';
// import { PvDashViewTileComponent } from './pvdashboard/dash-view-tile/dash-view-tile.component';
// import { ProjectSettingsComponent } from './project-settings/project-settings.component';
// import { BasicSettingsComponent } from './project-settings/basic-settings/basic-settings.component';
// import { AlarmSettingsComponent } from './project-settings/alarm-settings/alarm-settings.component';
// import { EventSettingsComponent } from './project-settings/event-settings/event-settings.component';
// import { EventsettingDlgComponent } from './project-settings/event-settings/eventsetting-dlg/eventsetting-dlg.component';
// import { AlarmsettingDlgComponent } from './project-settings/alarm-settings/alarmsetting-dlg/alarmsetting-dlg.component';
// import { MatOptionModule } from '@angular/material/core';
// import { PvtimesettingsComponent } from './pvtimesettings/pvtimesettings.component';
// import { ImageSettingsComponent } from './project-settings/image-settings/image-settings.component';
// import { DateTimeSelectionComponent } from './date-time-selection/date-time-selection.component';
// import { SoundSettingsComponent } from './project-settings/sound-settings/sound-settings.component';
// import { SoundSelectionDlgComponent } from './project-settings/sound-settings/sound-selection-dlg/sound-selection-dlg.component';
// import { SoundChooseFileDlgComponent } from './project-settings/sound-settings/sound-choose-file-dlg/sound-choose-file-dlg.component';
// import { ElementSettingsComponent } from './project-settings/element-settings/element-settings.component';
// import { ImageChooseFileDlgComponent } from './project-settings/image-settings/image-choose-file-dlg/image-choose-file-dlg.component';
// import { ImageSelectionDlgComponent } from './project-settings/image-settings/image-selection-dlg/image-selection-dlg.component';
// import { DateTimeSelectionDlgComponent } from './date-time-selection/date-time-selection-dlg/date-time-selection-dlg.component';

//import { PvViewtileSettingsdlgComponent } from './pvdashboard/dash-view-tile/dash-view-tile-dlg/pv-dashboard-settingsdlg.component';
//import { PvViewTileDetailComponent } from './pvdashboard/dash-view-tile/dash-view-tile-detail/pv-view-tile-detail.component';

// import { ElementsettingsDlgComponent } from './project-settings/element-settings/elementsettings-dlg/elementsettings-dlg.component';
// import { ElementsettingsValueDlgComponent } from './project-settings/element-settings/elementsettings-value-dlg/elementsettings-value-dlg.component';
// import { LoadSheddingRankDlgComponent } from './loadshedding/load-shedding-rank-dlg/load-shedding-rank-dlg.component';
// import { DashViewTileDlgComponent } from './pvdashboard/dash-view-tile/dash-view-tile-dlg/dash-view-tile-dlg.component';
// import { PvHmiSettingsDlgComponent } from './pvhmi/pv-hmi-settings-dlg/pv-hmi-settings-dlg.component';
// import { PvTrippingReportSettingsDlgComponent } from './pvtripping-report/pv-tripping-report-settings-dlg/pv-tripping-report-settings-dlg.component';
// import { FaultReportDetailComponent } from './pvtripping-report/fault-report-detail/fault-report-detail.component';
// import { PvHmiListDlgComponent } from './pvhmi/pv-hmi-list-dlg/pv-hmi-list-dlg.component';
// import { PvHmiPreviewDlgComponent } from './pvhmi/pv-hmi-preview-dlg/pv-hmi-preview-dlg.component';
// import { PvHmiPreviewComponent } from './pvhmi/pv-hmi-preview/pv-hmi-preview.component';
// import { BellSnackBarComponent } from './footer/bell-snack-bar/bell-snack-bar.component';
// import { ColumnFilterDlgComponent } from './column-filter-dlg/column-filter-dlg.component';
// import { FaultIndividualAggregateDlgComponent } from './pvtripping-report/fault-individual-aggregate-dlg/fault-individual-aggregate-dlg.component';
// import { DashViewMylinksDlgComponent } from './pvdashboard/dash-view-mylinks-dlg/dash-view-mylinks-dlg.component';
// import { MatSortModule } from '@angular/material/sort';
// import { UserRolesComponent } from './project-settings/user-roles/user-roles.component';
// import { SelectUsersDlgComponent } from './project-settings/user-roles/select-users-dlg/select-users-dlg.component';
// import { SelectRightsDlgComponent } from './project-settings/user-roles/select-rights-dlg/select-rights-dlg.component';
// import { OverlayModule } from '@angular/cdk/overlay';
// import { PvMapsComponent } from './pv-maps/pv-maps.component';
// import { PvMapsDlgComponent } from './pv-maps/pv-maps-dlg/pv-maps-dlg.component';
// import { PvMarkerComponent } from './pv-maps/pv-maps-dlg/pv-marker/pv-marker.component';
// import { LatLongDlgComponent } from './pv-maps/pv-maps-dlg/pv-marker/lat-long-dlg/lat-long-dlg.component';
// import { PvAreaComponent } from './pv-maps/pv-area/pv-area.component';
// import { PvAreaDlgComponent } from './pv-maps/pv-area/pv-area-dlg/pv-area-dlg.component';
// import { PvCardsComponent } from './pvpanel/pv-cards/pv-cards.component';
// import { ScrollingModule } from '@angular/cdk/scrolling';
// import { HighchartsChartModule } from 'highcharts-angular';
// import { ProjectGroupComponent } from './project-settings/project-group/project-group.component';
// import { ProjectGroupDlgComponent } from './project-settings/project-group/project-group-dlg/project-group-dlg.component';
// import { BackupDBComponent } from './project-settings/backup-db/backup-db.component';
// import { FooterAggregationDlgComponent } from './pvpanel/footer-aggregation/footer-aggregation.component';
// import { PvActionSettingDlgComponent } from './pvtripping-report/pv-tripping-report-settings-dlg/pv-action-setting-dlg/pv-action-setting-dlg.component';
// import { AsObjectStandardComponent } from './loadshedding/as-object-standard/as-object-standard.component';
// import { AsDetailViewTitlesDlgComponent } from './loadshedding/load-shedding-status-detail/as-detail-view-titles-dlg/as-detail-view-titles-dlg.component';
// import { AutomaticReportSettingsComponent } from './project-settings/automatic-report-settings/automatic-report-settings.component';
// import { ScanInhibitDlgComponent } from './pvstatus/scan-inhibit-dlg/scan-inhibit-dlg.component';
// import { AutomaticReportSettingsDlgComponent } from './project-settings/automatic-report-settings/automatic-report-settings-dlg/automatic-report-settings-dlg.component';
// import { PveditorComponent } from './pveditor/pveditor.component';
// import { PvShapeDlgComponent } from './pveditor/pv-shape-dlg/pv-shape-dlg.component';
// import { HvgEditorComponent } from './hvg-editor/hvg-editor.component';
// import { TopPanelEditorComponent } from './hvg-editor/top-panel-editor/top-panel-editor.component';
// import { RightPanelEditorComponent } from './hvg-editor/right-panel-editor/right-panel-editor.component';
// import { DynamicDataTableDlgComponent } from './hvg-editor/dynamic-data-table-dlg/dynamic-data-table-dlg.component';
// import { DynamicDataEditDlgComponent } from './hvg-editor/dynamic-data-table-dlg/dynamic-data-edit-dlg/dynamic-data-edit-dlg.component';
// import { CanvasSettingDlgComponent } from './hvg-editor/right-panel-editor/canvas-setting-dlg/canvas-setting-dlg.component';
// import { HmiSettingViewDlgComponent } from './hvg-editor/hmi-setting-view-dlg/hmi-setting-view-dlg.component';
// import { ViewEditorDlgComponent } from './hvg-editor/view-editor-dlg/view-editor-dlg.component';
// import { DashTemplateDlgComponent } from './pvdashboard/dash-template-dlg/dash-template-dlg.component';
// import { DashTempImportDlgComponent } from './pvdashboard/dash-temp-import-dlg/dash-temp-import-dlg.component';
// import { ControlAuthenticationDlgComponent } from './control-management/control-authentication-dlg/control-authentication-dlg.component';
// import { AutopanelHeaderComponent } from './project-settings/automatic-report-settings/autopanel-header/autopanel-header.component';
// import { ControlAlarmInhibitDlgComponent } from './pvstatus/control-alarm-inhibit-dlg/control-alarm-inhibit-dlg.component';
// import { ShiftSetManagementComponent } from './project-settings/shift-set-management/shift-set-management.component';
// import { ShiftRosterSettingsDlgComponent } from './project-settings/shift-set-management/shift-roster-settings-dlg/shift-roster-settings-dlg.component';
// import { PvOperationalViewComponent } from './pv-operational-view/pv-operational-view.component';
// import { OperationalInputDlgComponent } from './pv-operational-view/operational-input-dlg/operational-input-dlg.component';
// import { PvOperationalViewSettingsComponent } from './pv-operational-view/pv-operational-view-settings/pv-operational-view-settings.component';
// import { PvOprObjectsettingsComponent } from './pv-operational-view/pv-operational-view-settings/pv-opr-objectsettings/pv-opr-objectsettings.component';
// import { PvOprObjectsettingDlgComponent } from './pv-operational-view/pv-operational-view-settings/pv-opr-objectsetting-dlg/pv-opr-objectsetting-dlg.component';
// import { EventLogViewComponent } from './event-log-view/event-log-view.component';
// import { EventLogDlgComponent } from './event-log-view/event-log-dlg/event-log-dlg.component';
// import { ShiftSetSettingsDlgComponent } from './project-settings/shift-set-management/shift-set-settings-dlg/shift-set-settings-dlg.component';
// import { RosterManagementComponent } from './project-settings/roster-management/roster-management.component';
// import { RosterSettingsDlgComponent } from './project-settings/roster-management/roster-settings-dlg/roster-settings-dlg.component';
// import { LogStartupValueComponent } from './log-startup-value/log-startup-value.component';
// import { GroupOperationalViewComponent } from './group-operational-view/group-operational-view.component';
// import { GroupOperationalViewSettingsComponent } from './group-operational-view/group-operational-view-settings/group-operational-view-settings.component';
// import { GroupOprObjectsettingsComponent } from './group-operational-view/group-operational-view-settings/group-opr-objectsettings/group-opr-objectsettings.component';
// import { GroupOprObjectSettingsDlgComponent } from './group-operational-view/group-operational-view-settings/group-opr-object-settings-dlg/group-opr-object-settings-dlg.component';
// import { GroupOperationalInputDlgComponent } from './group-operational-view/group-operational-input-dlg/group-operational-input-dlg.component';
// import { LogStartupObjectsettingsComponent } from './log-startup-value/log-startup-objectsettings/log-startup-objectsettings.component';
// import { LogStartupObjectSettingsDlgComponent } from './log-startup-value/log-startup-object-settings-dlg/log-startup-object-settings-dlg.component';
// import { ShiftSummaryComponent } from './shift-summary/shift-summary.component';
// import { TemplateMaintenanceComponent } from './maintenance-schedule/template-maintenance/template-maintenance.component';
// import { TmpTypeTransmissionComponent } from './maintenance-schedule/template-maintenance/tmp-type-transmission/tmp-type-transmission.component';
// import { TmpTypeSubstationComponent } from './maintenance-schedule/template-maintenance/tmp-type-substation/tmp-type-substation.component';
// import { TmpTypeBayComponent } from './maintenance-schedule/template-maintenance/tmp-type-bay/tmp-type-bay.component';
// import { TmpTypeEquipmentComponent } from './maintenance-schedule/template-maintenance/tmp-type-equipment/tmp-type-equipment.component';
// import { TmpTypeActivityParameterDlgComponent } from './maintenance-schedule/template-maintenance/tmp-type-activity-parameter/tmp-type-activity-parameter-dlg/tmp-type-activity-parameter-dlg.component';
// import { TmpTypeEquipmentDlgComponent } from './maintenance-schedule/template-maintenance/tmp-type-equipment/tmp-type-equipment-dlg/tmp-type-equipment-dlg.component';
// import { TmpTypeBayDlgComponent } from './maintenance-schedule/template-maintenance/tmp-type-bay/tmp-type-bay-dlg/tmp-type-bay-dlg.component';
// import { TmpTypeSubstationDlgComponent } from './maintenance-schedule/template-maintenance/tmp-type-substation/tmp-type-substation-dlg/tmp-type-substation-dlg.component';
// import { TmpTypeTransmissionDlgComponent } from './maintenance-schedule/template-maintenance/tmp-type-transmission/tmp-type-transmission-dlg/tmp-type-transmission-dlg.component';
// import { CutoffScheduleComponent } from './maintenance-schedule/cutoff-schedule/cutoff-schedule.component';
// import { TmpTypeActivityParameterComponent } from './maintenance-schedule/template-maintenance/tmp-type-activity-parameter/tmp-type-activity-parameter.component';
// import { TmpTypeFrequencyComponent } from './maintenance-schedule/template-maintenance/tmp-type-frequency/tmp-type-frequency.component';
// import { TmpTypeFrequencyDlgComponent } from './maintenance-schedule/template-maintenance/tmp-type-frequency/tmp-type-frequency-dlg/tmp-type-frequency-dlg.component';
import { PvPlanMaintenanceComponent } from './features/maintenance-schedule/pv-plan-maintenance/pv-plan-maintenance.component';
import { PlanMaintenanceDlgComponent } from './features/maintenance-schedule/pv-plan-maintenance/pv-plan-maintenance-dlg/pv-plan-maintenance-dlg.component';
import { MaintenanceDashboardComponent } from './features/maintenance-schedule/maintenance-dashboard/maintenance-dashboard.component';
import { MaintenanceDetailsDlgComponent } from './features/maintenance-schedule/maintenance-dashboard/maintenance-details/maintenance-details.component';
import { AddUpdatePatrollingInfoComponent } from './features/maintenance-schedule/maintenance-dashboard/action-dlg/add-update-patrolling-info/add-update-patrolling-info.component';
import { PtwActionDlgComponent } from './features/maintenance-schedule/maintenance-dashboard/action-dlg/ptw-action-dlg/ptw-action-dlg.component';
import { PtwWorkCompletionDlgComponent } from './features/maintenance-schedule/maintenance-dashboard/action-dlg/ptw-action-dlg/ptw-work-completion-dlg/ptw-work-completion-dlg.component';
import { ConfirmationRemarksDlgComponent } from './features/maintenance-schedule/maintenance-dashboard/action-dlg/confirmation-remarks-dlg/confirmation-remarks-dlg.component';
import { ObservationDlgComponent } from './features/maintenance-schedule/maintenance-dashboard/action-dlg/observation-dlg/observation-dlg.component';
import { ObservationActionDlgComponent } from './features/maintenance-schedule/maintenance-dashboard/action-dlg/observation-dlg/observation-action-dlg/observation-action-dlg.component';
import { BaySelectionDlgComponent } from './features/maintenance-schedule/pv-plan-maintenance/bay-selection-dlg/bay-selection-dlg.component';
import { TlMaintenanceSetupDlgComponent } from './features/maintenance-schedule/maintenance-dashboard/action-dlg/tl-maintenance-setup-dlg/tl-maintenance-setup-dlg.component';
import { ConditionalMaintenanceSetupDlgComponent } from './features/maintenance-schedule/maintenance-dashboard/action-dlg/conditional-maintenance-setup-dlg/conditional-maintenance-setup-dlg.component';
// import { MatChipsModule } from '@angular/material/chips';
// import { UserGroupRightsComponent } from './project-settings/user-group-rights/user-group-rights.component';
// import { UserPositionComponent } from './project-settings/user-position/user-position.component';
// import { UserGroupRightsDlgComponent } from './project-settings/user-group-rights/user-group-rights-dlg/user-group-rights-dlg.component';
// import { UserPositionDlgComponent } from './project-settings/user-position/user-position-dlg/user-position-dlg.component';
// import { RolesGroupsDlgComponent } from './project-settings/user-position/roles-groups-dlg/roles-groups-dlg.component';
// import { MaintenanceDetailsDlgComponent } from './maintenance-schedule/pv-maintenance-dashboard/maintenance-details-dlg/maintenance-details-dlg.component';
// import { PtwActionDlgComponent } from './maintenance-schedule/action-dlg/ptw-action-dlg/ptw-action-dlg.component';
// import { SldcActionDlgComponent } from './maintenance-schedule/action-dlg/sldc-action-dlg/sldc-action-dlg.component';
// import { PtwWorkCompletionDlgComponent } from './maintenance-schedule/action-dlg/ptw-action-dlg/ptw-work-completion-dlg/ptw-work-completion-dlg.component';
// import { PtwTransferDlgComponent } from './maintenance-schedule/action-dlg/ptw-action-dlg/ptw-transfer-dlg/ptw-transfer-dlg.component';
// import { BackchargingActionDlgComponent } from './maintenance-schedule/action-dlg/backcharging-action-dlg/backcharging-action-dlg.component';
// import { MatStepperModule } from '@angular/material/stepper';
// import { RosterUpdateDlgComponent } from './project-settings/roster-management/roster-update-dlg/roster-update-dlg.component';
// import { FullCalendarModule } from '@fullcalendar/angular';
// import { ConditionalMaintenanceSetupDlgComponent } from './maintenance-schedule/pv-maintenance-dashboard/conditional-maintenance-setup-dlg/conditional-maintenance-setup-dlg.component';
// import { PtwOtherActionDlgComponent } from './maintenance-schedule/action-dlg/ptw-other-action-dlg/ptw-other-action-dlg.component';
// import { QrDialogComponent } from './maintenance-schedule/action-dlg/qr-dialog/qr-dialog.component';
// import { QRCodeModule } from 'angularx-qrcode';
// import { PvMaintenanceCompletedDashboardComponent } from './maintenance-schedule/pv-maintenance-dashboard/pv-maintenance-completed-dashboard/pv-maintenance-completed-dashboard.component';
// import { OtpActionDlgComponent } from './maintenance-schedule/action-dlg/ptw-action-dlg/otp-action-dlg/otp-action-dlg.component';
// import { MaintenanceCommonTableComponent } from './maintenance-schedule/pv-maintenance-dashboard/maintenance-common-table/maintenance-common-table.component';
// import { TmpTypeActivityParameterMapComponent } from '../project/maintenance-schedule/template-maintenance/tmp-activity-parameter-map/tmp-activity-parameter-map.component';
// import { TmpTypeActivityParameterMapDlgComponent } from '../project/maintenance-schedule/template-maintenance/tmp-activity-parameter-map/tmp-activity-parameter-map-dlg/tmp-activity-parameter-map-dlg.component';
// import { AddUpdatePatrollingInfoComponent } from './maintenance-schedule/action-dlg/add-update-patrolling-info/add-update-patrolling-info.component';
// import { ObservationDlgComponent } from './maintenance-schedule/action-dlg/observation-dlg/observation-dlg.component';
// import { ObservationActionDlgComponent } from './maintenance-schedule/action-dlg/observation-dlg/observation-action-dlg/observation-action-dlg.component';
// import { ConfirmationRemarksDlgComponent } from './maintenance-schedule/action-dlg/confirmation-remarks-dlg/confirmation-remarks-dlg.component';
// import { SelectMultiGroupsDlgComponent } from './project-settings/user-position/select-multi-groups-dlg/select-multi-groups-dlg.component';
// import { AddUpdateMaintenanceDBComponent } from './maintenance-schedule/add-update-maintenance-db/add-update-maintenance-db.component';
// import { AuditDlgComponent } from './maintenance-schedule/add-update-maintenance-db/audit-dlg/audit-dlg.component';
// import { TlFixResultDlgComponent } from './maintenance-schedule/add-update-maintenance-db/tl-fix-result-dlg/tl-fix-result-dlg.component';
// import { PvTrlineComponent } from './pv-maps/pv-maps-dlg/pv-trline/pv-trline.component';
// import { PvTrlineDlgComponent } from './pv-maps/pv-maps-dlg/pv-trline/pv-trline-dlg/pv-trline-dlg.component';
// import { PvColorcodeComponent } from './pv-maps/pv-maps-dlg/pv-colorcode/pv-colorcode.component';
// import { PvDataWithImagesComponent } from './pv-maps/pv-maps-dlg/pv-data-with-images/pv-data-with-images.component';
// import { PvGeojsondbComponent } from './pv-maps/pv-maps-dlg/pv-geojsondb/pv-geojsondb.component';
// import { PvFiltertabsComponent } from './pv-maps/pv-maps-dlg/pv-filtertabs/pv-filtertabs.component';
// import { PvColorcodeDlgComponent } from './pv-maps/pv-maps-dlg/pv-colorcode/pv-colorcode-dlg/pv-colorcode-dlg.component';
// import { PvDatawithimagesDlgComponent } from './pv-maps/pv-maps-dlg/pv-data-with-images/pv-datawithimages-dlg/pv-datawithimages-dlg.component';
// import { CoordinatesDlgComponent } from './pv-maps/pv-maps-dlg/pv-trline/pv-trline-dlg/coordinates-dlg/coordinates-dlg.component';
// import { GeojsonInputComponent } from './pv-maps/pv-maps-dlg/pv-geojsondb/geojson-input/geojson-input.component';
// import { PvSubstationComponent } from './pv-maps/pv-maps-dlg/pv-substation/pv-substation.component';
// import { PvSubstationDlgComponent } from './pv-maps/pv-maps-dlg/pv-substation/pv-substation-dlg/pv-substation-dlg.component';
// import { NgOrderedRangeBasedChipComponent } from './pv-maps/pv-maps-dlg/ui-components/ng-ordered-range-based-chip/ng-ordered-range-based-chip.component';
// import { RichTextPasteComponent } from './pv-maps/pv-maps-dlg/ui-components/rich-text-paste/rich-text-paste.component';
// import { DatabaseMappingComponent } from './maintenance-schedule/database-mapping/database-mapping.component';
// import { DatabaseMappingDlgComponent } from './maintenance-schedule/database-mapping/database-mapping-dlg/database-mapping-dlg.component';
// import { DatabaseObjectMappingDlgComponent } from './maintenance-schedule/database-mapping/database-mapping-dlg/database-object-mapping-dlg/database-object-mapping-dlg.component';
// import { ColorSettingsDlgComponent } from './../common/color-settings-dlg/color-settings-dlg.component';
// import { TlMaintenanceSetupDlgComponent } from './maintenance-schedule/action-dlg/tl-maintenance-setup-dlg/tl-maintenance-setup-dlg.component';
//import { LinkedDevicesComponent } from './linked-devices/linked-devices.component';
// import { NoticeBoardComponent } from './notice-board/notice-board.component';
// import { MessageAlertDlgComponent } from './message-alert-dlg/message-alert-dlg.component';
// import { MessageModalComponent } from './message-modal/message-modal.component';
//import { MdulogsDetailComponent } from './maintenance-schedule/mdulogs-detail/mdulogs-detail.component';
// import { PvGroupOrderComponent } from './pv-group-order/pv-group-order.component';
//import { DatabaseMappingIccpDlgComponent } from './maintenance-schedule/database-mapping/database-mapping-iccp-dlg/database-mapping-iccp-dlg.component';
// import { DatabaseMappingAlarmDetailsDlgComponent } from './maintenance-schedule/database-mapping/database-mapping-alarm-details-dlg/database-mapping-alarm-details-dlg.component';
// import { PvMaintenanceDeviceInformationComponent } from './maintenance-schedule/pv-maintenance-device-information/pv-maintenance-device-information.component';
// import { CoreConsoleDlgComponent } from './footer/core-console-dlg/core-console-dlg.component'
// import { DatabaseMappingTripParametersDlgComponent } from './maintenance-schedule/database-mapping/database-mapping-trip-parameters-dlg/database-mapping-trip-parameters-dlg.component'
// import { PathFilterComponent } from './../common/path-filter/path-filter.component';
// import { GroupColumnFilterDlgComponent } from './group-column-filter-dlg/group-column-filter-dlg.component'
// import { EventLogGroupDlgComponent } from './event-log-view/event-log-group-dlg/event-log-group-dlg.component'
// import { PVShiftCloseReportComponent } from './pvshift-close-report/pvshift-close-report.component';
// import { PvShiftCloseReportDlgComponent } from './pvshift-close-report/pvshift-close-report-dlg/pvshift-close-report-dlg.component';
// import { BasicShapesDlgComponent } from './hvg-editor/basic-shapes-dlg/basic-shapes-dlg.component';
// import { ManualObservationCreationDlgComponent } from './maintenance-schedule/action-dlg/manual-observation-creation-dlg/manual-observation-creation-dlg.component';
// import { ManualDocManagementComponent } from './maintenance-schedule/manual-doc-management/manual-doc-management.component';
// import { TmpTypeHotlineComponent } from './maintenance-schedule/template-maintenance/tmp-type-hotline/tmp-type-hotline.component';
// import { TmpTypeHotlineDlgComponent } from './maintenance-schedule/template-maintenance/tmp-type-hotline/tmp-type-hotline-dlg/tmp-type-hotline-dlg.component';
// import { MaintenancePdfComponent } from './maintenance-schedule/pv-maintenance-dashboard/maintenance-details-dlg/maintenance-pdf/maintenance-pdf.component';
// import { PVUserInShiftComponent } from './pvuser-in-shift/pvuser-in-shift.component';
//import { CoreConsoleDlgComponent } from './footer/core-console-dlg/core-console-dlg.component';
//import { CoreOptionsComponent } from './footer/core-options/core-options.component';

//FusionCharts.options['license']({
//  key: 'nA-16C5C-11coI3A1A7B3A6C6C5C4C4I2D1A4mB-13vE2B4H-9C-7ssdB4E6warI4F2C8D3E2D1C1C4G1F4F1A11A7E3E2B2ettB1B11B1B-13B1A2B4qpgB14B1D8akzH4B3B2aB-22yA3C4E3B4C1C3A3B9B2D3D2B-9ppF1C10c2C8df1wG4E3C3nB-16A5VD6D3kkdB5D7E4D5C5G5E4G2G3C9B3B4C4C1b==',
//  creditLabel: false,
//});
//FusionCharts.options['creditLabel'] = false;
@NgModule({
  declarations: [
    // PVUserInShiftComponent,
    // PVShiftCloseReportComponent,
    PVMainComponent,
    // HMIPopUpComponent,
    // PVEventComponent,
    DynamicViewDirective,
    // DashTileComponent,
    // PVChartComponent,
    // DashMergeComponent,
    // DashCardComponent,
    // DashBoardComponent,
    // PVHMIComponent,
    // PVPanelComponent,
    // PVBinaryReportComponent,
    // DashTitleComponent,
    // DashContentComponent,
    // FooterComponent,
    // PVHistoryComponent,
    // PVAlarmComponent,
    // ControlDlgComponent,
    // LoadsheddingproductComponent,
    // LoadSheddingLogicComponent,
    // LoadSheddingTreeComponent,
    // InterlockViewDlgComponent,
    // PVReportSettingsComponent,
    // GroupObjectSelectionComponent,
    // LoadSheddingEditorComponent,
    // LoadSheddingStatusComponent,
    // LoadSheddingMainComponent,
    // PvObjectSettingdlgComponent,
    // LoadSheddingStatusDetailComponent,
    // LoadSheddingParametersComponent,
    // DynamicTableComponent,
    // PVToggleComponent,
    // PVStatusComponent,
    // DashViewTileDlgComponent,
    // BasicShapesDlgComponent,
    // //PvViewtileSettingsdlgComponent,
    // PvViewTileDetailComponent,
    // PVLiveTrendComponent,
    // LoadSheddingReportComponent,
    // PVTrippingReportComponent,
    // PvAddUpdateViewDetailDlg,
    // ProjectSettingsComponent,
    // BasicSettingsComponent,
    // AlarmSettingsComponent,
    // EventSettingsComponent,
    // EventsettingDlgComponent,
    // AlarmsettingDlgComponent,
    // PvtimesettingsComponent,
    // ImageSettingsComponent,
    // DateTimeSelectionComponent,
    // DateTimeSelectionDlgComponent,
    // SoundSettingsComponent,
    // SoundSelectionDlgComponent,
    // SoundChooseFileDlgComponent,
    // PVReportObjectSettingsComponent,
    // PVChartColorrangeSettingsComponent, 
    // PvColorrangeSettingdlgComponent,
    // PVReportChartSettingsComponent,
    // PVReportTimeSettingsComponent,
    // PVReportPanelSettingsComponent,
    // ElementSettingsComponent,
    // ImageChooseFileDlgComponent,
    // ImageSelectionDlgComponent,
    // ElementsettingsDlgComponent,
    // ElementsettingsValueDlgComponent,
    //     LoadSheddingRankDlgComponent,
    //     PvDashViewTileComponent,
    //     PvHmiSettingsDlgComponent,
    //     PvTrippingReportSettingsDlgComponent,
    //     FaultReportDetailComponent,
    //     PvHmiListDlgComponent,
    //     PvHmiPreviewDlgComponent,
    //     PvHmiPreviewComponent,
    //     BellSnackBarComponent,
    //     ColumnFilterDlgComponent,
    //     FaultIndividualAggregateDlgComponent,
    // DashViewMylinksDlgComponent,
    // UserRolesComponent,
    // SelectUsersDlgComponent,
    // SelectRightsDlgComponent,
    // PvMapsComponent,
    // PvMapsDlgComponent,
    // PvMarkerComponent,
    // LatLongDlgComponent,
    // PvAreaComponent,
    // PvAreaDlgComponent,
    // PvCardsComponent,
    // ProjectGroupComponent,
    // ProjectGroupDlgComponent,
    // BackupDBComponent,
    // FooterAggregationDlgComponent,
    // PvActionSettingDlgComponent,
    // AsObjectStandardComponent,
    // ScanInhibitDlgComponent,
    // ControlAlarmInhibitDlgComponent,
    // AutomaticReportSettingsComponent,
    // AutomaticReportSettingsDlgComponent,
    // PveditorComponent,
    // PvShapeDlgComponent,
    // HvgEditorComponent,
    // TopPanelEditorComponent,
    // RightPanelEditorComponent,
    // DynamicDataTableDlgComponent,
    // DynamicDataEditDlgComponent,
    // CanvasSettingDlgComponent,
    // HmiSettingViewDlgComponent,
    // ViewEditorDlgComponent,
    // DashTemplateDlgComponent,
    // DashTempImportDlgComponent,
    // ControlAuthenticationDlgComponent,
    // AsDetailViewTitlesDlgComponent,    
    // AutopanelHeaderComponent,
    // ShiftSetManagementComponent,
    // ShiftRosterSettingsDlgComponent,
    // OperationalInputDlgComponent,
    // PvOperationalViewComponent,
    // PvOperationalViewSettingsComponent,
    // PvOprObjectsettingsComponent,
    // PvOprObjectsettingDlgComponent,
    // EventLogViewComponent,
    //     EventLogDlgComponent,
    //     ShiftSetSettingsDlgComponent,
    //     RosterManagementComponent,
    // RosterSettingsDlgComponent,
    // LogStartupValueComponent,
    //  GroupOperationalViewComponent,
    // GroupOperationalViewSettingsComponent,
    // GroupOprObjectsettingsComponent,
    // GroupOprObjectSettingsDlgComponent,
    // GroupOperationalInputDlgComponent,
    // LogStartupObjectsettingsComponent,
    // LogStartupObjectSettingsDlgComponent,
    // ShiftSummaryComponent,
    // TemplateMaintenanceComponent,
    // TmpTypeTransmissionComponent,
    // TmpTypeSubstationComponent,
    // TmpTypeBayComponent,
    // TmpTypeEquipmentComponent,
    // TmpTypeActivityParameterDlgComponent,
    // TmpTypeEquipmentDlgComponent,
    // TmpTypeBayDlgComponent,
    // TmpTypeSubstationDlgComponent,
    // TmpTypeTransmissionDlgComponent,
    // CutoffScheduleComponent,
    // TmpTypeActivityParameterComponent,
    // TmpTypeFrequencyComponent,
    // TmpTypeFrequencyDlgComponent,
    PvPlanMaintenanceComponent,
    PlanMaintenanceDlgComponent,
    MaintenanceDashboardComponent,
    MaintenanceDetailsDlgComponent,
    AddUpdatePatrollingInfoComponent,
    PtwActionDlgComponent,
    PtwWorkCompletionDlgComponent,
    ConfirmationRemarksDlgComponent,
    ObservationDlgComponent,
    ObservationActionDlgComponent,
    BaySelectionDlgComponent,
    TlMaintenanceSetupDlgComponent,
    ConditionalMaintenanceSetupDlgComponent,
    // UserGroupRightsComponent,
    // UserPositionComponent,
    // UserGroupRightsDlgComponent,
    // UserPositionDlgComponent,
    // RolesGroupsDlgComponent,
    // MaintenanceDetailsDlgComponent,
    // PtwActionDlgComponent,
    // SldcActionDlgComponent,
    // PtwWorkCompletionDlgComponent,
    // PtwTransferDlgComponent,
    // BackchargingActionDlgComponent,
    // RosterUpdateDlgComponent,
    // ConditionalMaintenanceSetupDlgComponent,
    // PtwOtherActionDlgComponent,
    // QrDialogComponent,
    // PvMaintenanceCompletedDashboardComponent,
    // OtpActionDlgComponent,
    // MaintenanceCommonTableComponent,
    // TmpTypeActivityParameterMapComponent,
    // TmpTypeActivityParameterMapDlgComponent,
    // AddUpdatePatrollingInfoComponent,
    // ObservationDlgComponent,
    // ObservationActionDlgComponent,
    // ConfirmationRemarksDlgComponent,
    // SelectMultiGroupsDlgComponent,
    // AddUpdateMaintenanceDBComponent,
    // AuditDlgComponent,
    // TlFixResultDlgComponent,
    // PvTrlineComponent,
    // PvTrlineDlgComponent,
    // PvColorcodeComponent,
    // PvDataWithImagesComponent,
    // PvGeojsondbComponent,
    // PvFiltertabsComponent,
    // PvColorcodeDlgComponent,
    // PvDatawithimagesDlgComponent,
    // CoordinatesDlgComponent,
    // GeojsonInputComponent,
    // PvSubstationComponent,
    // PvSubstationDlgComponent,
    // NgOrderedRangeBasedChipComponent,
    // RichTextPasteComponent,
    // /*ReportTabsComponent,*/
    // DatabaseMappingComponent,
    // DatabaseMappingDlgComponent,
    // DatabaseObjectMappingDlgComponent,
    // TlMaintenanceSetupDlgComponent,
    // ColorSettingsDlgComponent,
    // PvGroupOrderComponent,
    // MessageAlertDlgComponent,
    // //LinkedDevicesComponent,
    // NoticeBoardComponent,
    // MessageModalComponent,
    // //CoreConsoleDlgComponent,
    // //CoreOptionsComponent,
    // //MdulogsDetailComponent,
    // //DatabaseMappingIccpDlgComponent,
    // DatabaseMappingAlarmDetailsDlgComponent,
    // PvMaintenanceDeviceInformationComponent,
    // DatabaseMappingTripParametersDlgComponent,
    // CoreConsoleDlgComponent,
    // PathFilterComponent,
    // GroupColumnFilterDlgComponent,
    // EventLogGroupDlgComponent,
    // PvShiftCloseReportDlgComponent,
    // ManualObservationCreationDlgComponent,
    // ManualDocManagementComponent,
    // TmpTypeHotlineComponent,
    // TmpTypeHotlineDlgComponent,
    // MaintenancePdfComponent
  ],
  imports: [
    // MatStepperModule,
    // MatChipsModule,
    CommonModule,
    SharedModule,
    MatDialogModule,
    MatSnackBarModule,
    MatTabsModule,
    MatTableModule,
    MatSortModule,
    MatMenuModule,
    // MatSidenavModule,
    // MatAutocompleteModule,
    // MatPaginatorModule,
    MatExpansionModule,
    // MatProgressSpinnerModule,
    // MatTreeModule,
    // MatListModule,
    // MatSelectModule,
    // MatOptionModule,
    // MatButtonModule,
    // MatBadgeModule,
    // MatRadioModule,
    // MatButtonToggleModule,
    // MatGridListModule,
    MatCheckboxModule,
    // ExportAsModule,
    // DragDropModule,
    // MatSliderModule,
    // MatBottomSheetModule,
    // MatDividerModule,
    // FormsModule,
    // ReactiveFormsModule,
    // MatSlideToggleModule,
    // ResizableModule,
    // QRCodeModule,
    // MatTabsModule,    
    // MatSortModule,
    // HighchartsChartModule,
    // OverlayModule,
    // ScrollingModule,
    // FullCalendarModule,
    // NgxDaterangepickerMd.forRoot(),
    RouterModule.forChild([
      { path: '**', component: PVMainComponent, 
        // canActivate: [ProjectAuthGuard], 
        resolve: { viewData: ProjectResolverService }, runGuardsAndResolvers: 'always' }
    ])
  ],
  providers: [

    // { provide: CREATE_PVPANEL_TOKEN, useValue: PVPanelComponent },
    // { provide: CREATE_PVCHART_TOKEN, useValue: PVChartComponent },
    // { provide: CREATE_DASHBOARD_TOKEN, useValue: DashBoardComponent },
    // { provide: CREATE_PVHMI_TOKEN, useValue: PVHMIComponent },
    // { provide: CREATE_LOADSHEDDING_TOKEN, useValue: LoadSheddingStatusComponent },
    // { provide: CREATE_MAPS_TOKEN, useValue: PvMapsComponent },
    // { provide: CREATE_CHAT_TOKEN, useValue: NoticeBoardComponent },
    // { provide: CREATE_MAINTENANCE_DEVICE_INFO_TOKEN, useValue: PvMaintenanceDeviceInformationComponent },
    // { provide: CREATE_OPERATIONAL_VIEW_TOKEN, useValue: PvOperationalViewComponent },
    // { provide: CREATE_GRP_OPERATIONAL_VIEW_TOKEN, useValue: GroupOperationalViewComponent },
    // { provide: CREATE_EVENT_LOG_VIEW_TOKEN, useValue: EventLogViewComponent },
    // { provide: CREATE_FAULT_REPORT_VIEW_TOKEN, useValue: PVTrippingReportComponent },
    // { provide: CREATE_EVENT_VIEW_TOKEN, useValue: PVEventComponent },
    // { provide: CREATE_SHIFT_CLOSE_REPORT_VIEW_TOKEN, useValue: PVShiftCloseReportComponent },
    // { provide: CREATE_USERS_IN_SHIFT_VIEW_TOKEN, useValue: PVUserInShiftComponent }
  ],
  entryComponents: [
    // HMIPopUpComponent,
    // PVStatusComponent,
    // PVEventComponent,
    // PVAlarmComponent,
    // DashBoardComponent,
    // DashCardComponent,
    // DashMergeComponent,
    // PVChartComponent,
    // PVPanelComponent,
    // PVBinaryReportComponent,
    // PVHMIComponent,
    // ControlDlgComponent,
    // PVReportSettingsComponent,
    // GroupObjectSelectionComponent,
    // LoadSheddingMainComponent,
    // InterlockViewDlgComponent,
    // PvObjectSettingdlgComponent,
    // LoadSheddingStatusComponent,
    // LoadSheddingStatusDetailComponent,
    // LoadSheddingParametersComponent,
    // PVHistoryComponent,
    // PVTrippingReportComponent,
    // ProjectSettingsComponent,
    // AlarmsettingDlgComponent,
    // EventsettingDlgComponent,
    // PVReportTimeSettingsComponent,
    // PVReportObjectSettingsComponent,
    // PvColorrangeSettingdlgComponent,
    // PVChartColorrangeSettingsComponent,
    // PVReportChartSettingsComponent,
    // ControlAuthenticationDlgComponent
  ],
  bootstrap: []
})
export class ProjectModule { }
