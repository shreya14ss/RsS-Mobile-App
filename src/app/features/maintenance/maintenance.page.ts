import { Component, OnInit } from '@angular/core';
import { ToastController } from '@ionic/angular';
import { AppService } from '../../core/services/app.service';
import { ListColumn } from '../../shared/components/rs-mobile-list/rs-mobile-list.component';
import { MaintenanceStatusToString } from './maintenance-status';

@Component({
  selector: 'app-maintenance',
  templateUrl: './maintenance.page.html'
})
export class MaintenancePage implements OnInit {

  loading = true;
  allRecords: any[] = [];
  filteredRecords: any[] = [];
  searchTerm = '';

  selectedItem: any = null;
  showDetail = false;

  /** Columns shown inside each rs-mobile-list row */
  listColumns: ListColumn[] = [
    {
      key: 'status',
      label: '',
      badge: true,
      badgeClass: (val) => this.statusBadgeClass(val)
    }
  ];

  constructor(
    private appService: AppService,
    private toastCtrl: ToastController
  ) {}

  ngOnInit() {
    // this.loadRecords();
  }

  // async loadRecords() {
  //   this.loading = true;
  //   try {
  //     const data = await this.appService.GetMaintenanceRecords('maintenance', 'yes');
  //     // CouchDB view response wraps rows; plain array returned from some endpoints
  //     const rows: any[] = Array.isArray(data)
  //       ? data
  //       : (data?.rows || []);

  //     this.allRecords = rows.map(row => {
  //       const doc = row?.doc || row;
  //       return {
  //         _id: doc._id,
  //         title: this.buildTitle(doc),
  //         subtitle: doc.maintenancetype || doc.maintenance_type || '—',
  //         status: doc.status,
  //         statusLabel: this.statusLabel(doc.status),
  //         zone: doc.zone,
  //         circle: doc.circle,
  //         division: doc.division,
  //         substation: doc.substation,
  //         bay: doc.bay,
  //         plannedDate: doc.plannedDate,
  //         cutoffDate: doc.cutoffDate,
  //         raw: doc
  //       };
  //     });

  //     this.applyFilter();
  //   } catch {
  //     await this.showToast('Failed to load maintenance records.', 'danger');
  //   }
  //   this.loading = false;
  // }

  handleSearch(event: any) {
    this.searchTerm = event.detail.value?.toLowerCase() || '';
    this.applyFilter();
  }

  private applyFilter() {
    if (!this.searchTerm) {
      this.filteredRecords = [...this.allRecords];
      return;
    }
    this.filteredRecords = this.allRecords.filter(r =>
      r.title?.toLowerCase().includes(this.searchTerm) ||
      r.subtitle?.toLowerCase().includes(this.searchTerm) ||
      r.statusLabel?.toLowerCase().includes(this.searchTerm)
    );
  }

  onItemClicked(item: any) {
    this.selectedItem = item;
    this.showDetail = true;
  }

  closeDetail() {
    this.showDetail = false;
    this.selectedItem = null;
  }

  async doRefresh(event: any) {
    // await this.loadRecords();
    event.target.complete();
  }

  private buildTitle(doc: any): string {
    const parts = [doc.zone, doc.substation || doc.circle, doc.bay].filter(Boolean);
    return parts.join(' / ') || doc._id || 'Record';
  }

  statusLabel(status: string): string {
    return MaintenanceStatusToString[status]?.show || status || '—';
  }

  statusBadgeClass(status: string): string {
    const map: Record<string, string> = {
      planned: 'status-planned',
      in_progress: 'status-in_progress',
      maintenance_complete: 'status-maintenance_complete',
      maintainance_cancelled: 'status-maintainance_cancelled',
      ptw_issued: 'status-ptw_issued'
    };
    return map[status] || 'status-default';
  }

  private async showToast(msg: string, color = 'medium') {
    const toast = await this.toastCtrl.create({ message: msg, duration: 3000, color, position: 'bottom' });
    await toast.present();
  }
}
