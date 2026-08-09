import { Component, OnInit, AfterViewInit, Input } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { AppService } from '../../../../core/services/app.service';
import { LocaleService } from '../../../../core/services/locale/locale.service';

@Component({
  selector: 'app-date-time-selection-dlg',
  templateUrl: './date-time-selection-dlg.component.html',
  styleUrls: ['./date-time-selection-dlg.component.scss']
})
export class DateTimeSelectionDlgComponent implements OnInit, AfterViewInit {

  @Input() dialogData: any;

  // Ionic 6 quirk: when <ion-segment> renders above an inline <ion-datetime>
  // in the same <ion-content>, the datetime's IntersectionObserver fires
  // before the segment finishes layout — the calendar shadow-DOM never
  // paints. Deferring the datetime's *ngIf mount by one tick lets the segment
  // settle first, so the datetime observes a stable viewport and renders.
  datetimeReady: boolean = false;

  selection_type: string = 'full';
  value: any = {};
  selectedPreset: string | null = null;

  // 'single' | 'range' — controls which pickers are shown inside the dialog
  mode: 'single' | 'range' = 'single';

  // When false (planning / picking a specific date), the Single/Range mode
  // toggle is hidden and the dialog is locked to single-date selection.
  // When true or unset (search / filtering), the toggle is shown.
  showRange: boolean = true;

  // When true (planning flows), the picker refuses any date before today —
  // the Yesterday preset is hidden, the datetime `min` is bound, and apply()
  // rejects a start that lands before today.
  restrictPastDate: boolean = false;

  // ISO strings for ion-datetime (ion-datetime does not accept Unix timestamps)
  startISO: string = '';
  endISO: string = '';
  minISO: string | null = null;

  constructor(
    private modalCtrl: ModalController,
    private appservice: AppService,
    public locale_service: LocaleService
  ) {}

  ngOnInit() {
    // Support legacy dialogData path
    if (this.dialogData) {
      this.selection_type = this.dialogData.selection_type || this.selection_type;
      if (this.dialogData.value) {
        this.value = { ...this.dialogData.value, range: { ...this.dialogData.value?.range } };
      } else {
        this.value = { rangeselection: 'current_day', range: { start: Date.now(), end: Date.now() } };
      }
      // Callers picking a specific date (planning flows) pass isShowRange: false;
      // search flows leave it null/undefined so the toggle stays visible.
      this.showRange = this.dialogData.isShowRange !== false;
      this.restrictPastDate = this.dialogData.restrictPastDate === true;
    }

    // Default dialog mode based on incoming selection_type
    this.mode = this.selection_type === 'single' ? 'single' : 'single';

    // Convert Unix timestamps → ISO strings for ion-datetime
    this.startISO = this.tsToISO(this.value?.range?.start);
    this.endISO = this.tsToISO(this.value?.range?.end);

    // When planning, bind ion-datetime's `min` to the start of today (local)
    // so the wheel/calendar refuses to scroll into previous days.
    if (this.restrictPastDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      this.minISO = this.tsToISO(today.getTime());

      // If the caller pre-seeded a past value (e.g. an existing planned date
      // that has since slipped into the past), snap the picker forward to
      // today so the wheel opens on a valid day.
      const startTs = new Date(this.startISO).getTime();
      if (Number.isFinite(startTs) && startTs < today.getTime()) {
        this.startISO = this.minISO;
        if (new Date(this.endISO).getTime() < today.getTime()) {
          this.endISO = this.minISO;
        }
      }
    }

    if (this.value?.rangeselection === 'current_day') this.selectedPreset = 'today';
    else if (this.value?.rangeselection === 'previous_day') this.selectedPreset = 'yesterday';
    else this.selectedPreset = null;

  }

  ngAfterViewInit() {
    setTimeout(() => { this.datetimeReady = true; }, 0);
  }

  private tsToISO(ts: any): string {
    let d: Date;
    if (!ts) {
      d = new Date();
      d.setHours(0, 0, 0, 0);
    } else {
      d = new Date(Number(ts));
    }
    // ion-datetime interprets ISO strings by their zone: `...Z` = UTC (which
    // shifts the displayed date across midnight in non-UTC zones). Emit a
    // local ISO string (no Z / offset) so the picker highlights the same
    // wall-clock date the caller passed in.
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }

  onModeChange(mode: 'single' | 'range') {
    this.mode = mode;
    this.selectedPreset = null;
  }

  // In range mode, the start date/time must be strictly before the end
  // date/time. Used to disable the Apply button and surface an inline error.
  get isRangeInvalid(): boolean {
    if (this.mode !== 'range') return false;
    const start = new Date(this.startISO).getTime();
    const end = new Date(this.endISO).getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end)) return false;
    return start >= end;
  }

  // When planning, the picked start must not fall before today (local).
  // Drives the inline error and disables Apply.
  get isPastDateInvalid(): boolean {
    if (!this.restrictPastDate) return false;
    const start = new Date(this.startISO).getTime();
    if (!Number.isFinite(start)) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return start < today.getTime();
  }

  close() {
    this.modalCtrl.dismiss(null);
  }

  apply() {
    // Defensive: never emit an inverted range even if the UI's disable-guard
    // is bypassed. Bail silently — the button is already disabled and the
    // inline error tells the user why.
    if (this.isRangeInvalid || this.isPastDateInvalid) return;

    const start = new Date(this.startISO).getTime();
    let end: number;
    let rangeselection: string;

    if (this.mode === 'single') {
      if (this.selection_type === 'single_time') {
        // Datetime pickers (planning flows): preserve the exact picked time.
        // Callers that read data.range.end (bay-selection, maintenance-details
        // date reschedule, etc.) get the same specific timestamp as start,
        // instead of being snapped to 23:59:59 of the picked day.
        end = start;
      } else {
        // Date-only pickers (filtering / range presets): expand the single day
        // to cover 00:00:00.000 – 23:59:59.999 so the range query includes it.
        const endDate = new Date(this.startISO);
        endDate.setHours(23, 59, 59, 999);
        end = endDate.getTime();
      }
      rangeselection = 'single_date';
    } else {
      end = new Date(this.endISO).getTime();
      rangeselection = 'custom';
    }

    this.modalCtrl.dismiss({ rangeselection, range: { start, end } });
  }

  selectToday() {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    this.selectedPreset = 'today';
    this.modalCtrl.dismiss({
      rangeselection: 'current_day',
      range: { start: start.getTime(), end: end.getTime() }
    });
  }

  selectYesterday() {
    // Planning flows hide the Yesterday button, but guard here too in case
    // the button is reachable via keyboard/automation.
    if (this.restrictPastDate) return;
    const start = new Date();
    start.setDate(start.getDate() - 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setDate(end.getDate() - 1);
    end.setHours(23, 59, 59, 999);
    this.selectedPreset = 'yesterday';
    this.modalCtrl.dismiss({
      rangeselection: 'previous_day',
      range: { start: start.getTime(), end: end.getTime() }
    });
  }
}
