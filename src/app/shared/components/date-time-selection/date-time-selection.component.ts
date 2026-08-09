import { Component, OnInit, Input, EventEmitter, Output } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { DateTimeSelectionDlgComponent } from './date-time-selection-dlg/date-time-selection-dlg.component';
import { ActivatedRoute } from '@angular/router';
import { LocaleService } from 'src/app/core/services/locale/locale.service';
import { ProjectResolverService } from 'src/app/core/services/project-resolver.service';
import { AppService } from 'src/app/core/services/app.service';

@Component({
  selector: 'app-date-time-selection',
  templateUrl: './date-time-selection.component.html',
  styleUrls: ['./date-time-selection.component.scss']
})
export class DateTimeSelectionComponent implements OnInit {

  public selected_daterange: string = '';
  public opt_resolution: string = 'hourly';
  public resolution_shift: string = 'All';

  @Input() label: string;
  @Input() removeTimePicker: boolean = false;

  @Input() set time_settings(value: any) {
    if (this._time_settings != value) {
      this._time_settings = value;
      this.setStartValue();
    }
  }

  public _time_settings: any = null;

  @Input() selection_type: string = 'full';
  @Input() custom_selection_type: string = null;
  @Input() shiftList = null;

  @Output() valueChanged: EventEmitter<any> = new EventEmitter<any>();

  @Input() isShowRange = undefined;
  @Input() view_type: any;
  @Input() view_detail_type: string = null;
  @Input() shift_name_list: string[] = [];
  @Input() ishourlyLogReport: boolean;

  shift_list: string[] = ["All"];
  hasShiftCloseReport: boolean;
  isDailyLogSheetReport: boolean;

  static resolutions_sel = {
    "one_min": [1, 1440],
    "five_min": [5, 2880],
    "ten_min": [10, 28800],
    "fifteen_min": [15, 72000],
    "thirty_min": [30, 72000],
    "hourly": [60, 144000],
    "shift": [480, null],
    "daily": [1440, null],
    "weekly": [10080, null],
    "monthly": [57600, null],
    "yearly": [576000, null]
  };

  keepOrder = (a, b) => a;

  constructor(
    public locale_service: LocaleService,
    private resolver: ProjectResolverService,
    private appservice: AppService,
    private modalCtrl: ModalController,
    private route: ActivatedRoute
  ) { }

  checkreso(reso: string): boolean {
    if (((this.view_detail_type != "report" && this.view_detail_type != 'mnt_opr_dashboard') || this.shift_name_list?.length == 0) && reso == "shift")
      return false;

    if (this.view_detail_type == 'mnt_opr_dashboard') {
      return (reso == "shift" || reso == "daily");
    }

    let tmp_reso = DateTimeSelectionComponent.checkresolution(
      this._time_settings,
      reso,
      null,
      this._time_settings.one_five_min_reso
    );

    return tmp_reso == reso;
  }

  static checkresolution(time_settings: any, resolution: string, view_detail_type: string, _one_Five_Reso: boolean): any {
    if (!time_settings || !time_settings.rangeselection)
      return resolution;

    let diff = 0;
    let one_five_min = false;

    switch (time_settings.rangeselection) {
      case 'current_day':
      case 'previous_day':
      case 'last_24_hours':
      case 'previous_24_hours':
        diff = 24 * 60;
        break;

      case 'current_week':
      case 'previous_week':
      case 'last_7_days':
      case 'previous_7_days':
        diff = 24 * 60 * 7;
        one_five_min = _one_Five_Reso;
        break;

      default:
        diff = (time_settings.range.end - time_settings.range.start) / 60000;
        break;
    }

    if ((resolution && one_five_min) ||
      (DateTimeSelectionComponent.resolutions_sel[resolution][0] <= diff &&
        (DateTimeSelectionComponent.resolutions_sel[resolution][1] == null ||
          DateTimeSelectionComponent.resolutions_sel[resolution][1] >= diff))) {
      return resolution;
    }

    for (let reso in DateTimeSelectionComponent.resolutions_sel) {
      const [start, end] = DateTimeSelectionComponent.resolutions_sel[reso];

      if (start <= diff && (end === null || end >= diff)) {
        return reso;
      }
    }

    return 'hourly';
  }

  setTimeRangeValue() {
    if (this._time_settings?.rangeselection) {
      const rs = this._time_settings.rangeselection;

      if (rs === 'single_date') {
        // Single-date selection — show date only, no range
        this.selected_daterange = this.appservice.dateToString(this._time_settings.range.start, 4);
      } else if (rs === 'custom') {
        this.selected_daterange =
          this.appservice.dateToString(this._time_settings.range.start, 3) +
          ' - ' +
          this.appservice.dateToString(this._time_settings.range.end, 3);
      } else {
        const label = this.locale_service.Locale.language.project.timesettings.rangeselection[rs];
        if (label) {
          this.selected_daterange = label;
        } else if (this._time_settings.range?.start != null && !isNaN(this._time_settings.range.start)) {
          // rangeselection key not in locale (e.g. 'mnt_db') — fall back to formatted date range
          this.selected_daterange =
            this.appservice.dateToString(this._time_settings.range.start, 3) +
            ' - ' +
            this.appservice.dateToString(this._time_settings.range.end, 3);
        } else {
          this.selected_daterange = '';
        }
      }
    }
  }

  setStartValue() {
    this.setTimeRangeValue();

    if (this._time_settings?.resolution)
      this.opt_resolution = this._time_settings.resolution;

    if (this._time_settings?.resolution_shift)
      this.resolution_shift = this._time_settings.resolution_shift;
  }

  ngOnInit(): void {
    this.hasShiftCloseReport =
      this.route.snapshot.root.firstChild.firstChild.data.viewData.viewData.detail.dashboard?.tiles
        ?.some(obj => obj.type === "shiftclosereport");

    this.setupDateAndTimeEnvironmentFeatures();
  }

  setupDateAndTimeEnvironmentFeatures() {
    if (this._time_settings == null) {
      this._time_settings = {
        rangeselection: 'current_day'
      };
    }

    if (this.shift_name_list?.length > 0)
      this.shift_list = this.shift_list.concat(this.shift_name_list);

    this.setStartValue();
  }

  resolutionChanged(ev: any) {
    this.opt_resolution = ev.detail.value;
    this._time_settings.resolution = this.opt_resolution;
    this.valueChanged.emit(this._time_settings);
  }

  resolutionShiftChanged(ev: any) {
    this.resolution_shift = ev.detail.value;
    this._time_settings.resolution_shift = this.resolution_shift;
    this.valueChanged.emit(this._time_settings);
  }

  async dateClicked() {
    const modal = await this.modalCtrl.create({
      component: DateTimeSelectionDlgComponent,
      componentProps: {
        dialogData: {
          selection_type: this.removeTimePicker ? 'none' : this.selection_type,
          value: this._time_settings,
          showSeconds: true,
          shiftList: this.shiftList,
          isShowRange: this.isShowRange,
          view_detail_type: this.view_detail_type,
          custom_selection_type: this.custom_selection_type,
          defaultRangeSelection: this._time_settings?.rangeselection || 'current_day'
        }
      }
    });

    await modal.present();

    const { data } = await modal.onWillDismiss();

    if (data) {
      this._time_settings.rangeselection = data.rangeselection;
      if (data.range)
        this._time_settings.range = data.range;

      this.setTimeRangeValue();
      this.valueChanged.emit(this._time_settings);
    }
  }
}