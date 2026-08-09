import { Component, Input, Output, EventEmitter } from '@angular/core';

export interface ListColumn {
  key: string;
  label: string;
  badge?: boolean;
  badgeClass?: (value: string) => string;
}

@Component({
  selector: 'rs-mobile-list',
  templateUrl: './rs-mobile-list.component.html'
})
export class RsMobileListComponent {
  @Input() data: any[] = [];
  @Input() columns: ListColumn[] = [];
  @Input() titleKey: string = 'title';
  @Input() subtitleKey: string = 'subtitle';
  @Input() loading: boolean = false;
  @Input() emptyMessage: string = 'No records found.';

  @Output() itemClicked = new EventEmitter<any>();

  onItemClick(item: any) {
    this.itemClicked.emit(item);
  }

  getValue(item: any, key: string): any {
    return key.split('.').reduce((obj, k) => obj?.[k], item);
  }
}
