import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';
import { AppService } from 'src/app/core/services/app.service';

export class BCElementClass {
  name: string;
  route?: string;
}

export class BCSelectionClass {
  sel_index?: number;
  parent_route?: string;
  elements: BCElementClass[];
}

@Component({
  selector: 'app-breadcrumb',
  templateUrl: './breadcrumb.component.html',
  styleUrls: ['./breadcrumb.component.scss']
})
export class BreadcrumbComponent {

  @Input() Selection: BCSelectionClass[];
  @Input() queryParams: any = null;

  searchText = '';
  levelMenuOpen = false;
  activeLevel: BCSelectionClass = null;
  levelPopoverEvent: any = null;

  constructor(
    private router: Router,
    public appservice: AppService
  ) { }

  private navigateTo(commands: any[]) {
    if (!commands || commands.length === 0) return;
    this.router.navigate(commands, {
      queryParams: this.queryParams,
      queryParamsHandling: 'merge'
    });
  }

  goCrumb(selitem: BCSelectionClass) {
    if (selitem?.sel_index == null) return;
    const item = selitem.elements[selitem.sel_index];
    if (!item?.route) return;
    this.navigateTo([(selitem.parent_route || '') + item.route]);
  }

  openLevelMenu(selitem: BCSelectionClass, ev: any) {
    this.activeLevel = selitem;
    this.searchText = '';
    this.levelPopoverEvent = ev;
    this.levelMenuOpen = true;
  }

  closeLevelMenu() {
    this.levelMenuOpen = false;
    this.activeLevel = null;
    this.searchText = '';
  }

  onLevelItemClick(selitem: BCSelectionClass, item: BCElementClass) {
    this.closeLevelMenu();
    this.navigateTo([selitem.parent_route + item.route]);
  }

  filterMenuElements(selitem: BCSelectionClass, term: string): BCElementClass[] {
    if (!selitem) return [];
    if (!term) return selitem.elements || [];
    const t = term.toLowerCase().trim();
    return (selitem.elements || []).filter(e =>
      this.appservice.unescapedName(e.name).toLowerCase().includes(t)
    );
  }
}
