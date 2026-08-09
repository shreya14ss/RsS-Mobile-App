import {
  Component,
  EventEmitter,
  Input,
  Output,
  ViewChild,
} from '@angular/core';
import { DateTimeSelectionComponent } from '../date-time-selection/date-time-selection.component';
import { AppService } from 'src/app/core/services/app.service';

/**
 * Reusable filter bar for dashboard views. Provides:
 *  • a primary text search input,
 *  • an inline chip that shows the currently-applied date range (tap to change,
 *    × to clear), reusing the app's date-time-selection dialog,
 *  • a slot (<ng-content>) for a per-tab filter menu trigger.
 *
 * Kept intentionally presentational — filtering of the underlying datasource is
 * the parent's responsibility (bind to `(searchTextChange)`).
 */
@Component({
  selector: 'app-search-filter-bar',
  templateUrl: './search-filter-bar.component.html',
  styleUrls: ['./search-filter-bar.component.scss']
})
export class SearchFilterBarComponent {
  @Input() searchText = '';
  @Output() searchTextChange = new EventEmitter<string>();

  @Input() placeholder = 'Search...';

  @Input() showDate = true;
  @Input() time_settings: any = null;
  @Input() view_type = 'mnt_db';
  @Input() isShowRange: any = null;
  @Input() shiftList: any = null;

  @Output() dateChange = new EventEmitter<any>();
  @Output() clearDate = new EventEmitter<void>();

  @ViewChild('dateSel') dateSel: DateTimeSelectionComponent;

  focused = false;

  /**
   * A date range is considered "applied" once a real start timestamp is set.
   * Matches the shape used by app-date-time-selection (range.start > 0).
   */
  get hasDateApplied(): boolean {
    const start = this.time_settings?.range?.start;
    return !!(start && !isNaN(start) && start > 0);
  }

  get dateLabel(): string {
    return this.dateSel?.selected_daterange || '';
  }

  onSearchChange(v: string) {
    this.searchText = v;
    this.searchTextChange.emit(v);
  }

  clearSearch() {
    if (!this.searchText) return;
    this.searchText = '';
    this.searchTextChange.emit('');
  }

  openDatePicker() {
    this.dateSel?.dateClicked();
  }

  onDateChanged(ev: any) {
    this.dateChange.emit(ev);
  }

  onClearDate(ev: Event) {
    ev.stopPropagation();
    this.clearDate.emit();
  }
}
