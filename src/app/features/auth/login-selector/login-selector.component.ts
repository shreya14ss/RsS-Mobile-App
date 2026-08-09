import { Component, Input, OnInit } from '@angular/core';
import { ModalController, ToastController } from '@ionic/angular';
import { AppService } from '../../../core/services/app.service';

@Component({
  selector: 'app-login-selector',
  templateUrl: './login-selector.component.html'
})
export class LoginSelectorComponent implements OnInit {

  /** Passed in from login page — full tenant list already fetched */
  @Input() tenants: any[] = [];

  projects: any[] = [];
  selectedTenantId: string = null;
  selectedProjectId: string = null;
  loading = false;

  constructor(
    private modalCtrl: ModalController,
    private appService: AppService,
    private toastCtrl: ToastController
  ) { }

  ngOnInit() {
    console.log('LoginSelector INIT');
    console.log('Tenants received:', this.tenants);

    if (this.tenants?.length === 1) {
      // Single tenant — auto-select it and load its projects
      console.log('Single tenant auto-selected');
      this.selectedTenantId = this.tenants[0]._id;
      this.loadProjects(this.selectedTenantId);
    } else if (this.tenants?.length > 1) {
      // Multiple tenants — user picks, but pre-select first tenant
      console.log('Multiple tenants, default selecting first');
      this.selectedTenantId = this.tenants[0]._id;
      this.loadProjects(this.selectedTenantId);
    }
  }

  async onTenantChange() {
    console.log('Tenant changed:', this.selectedTenantId);
    this.selectedProjectId = null;
    this.projects = [];
    if (this.selectedTenantId) {
      await this.loadProjects(this.selectedTenantId);
    }
  }

  private async loadProjects(tenantId: string) {
    console.log('Loading projects for tenant:', tenantId);
    this.loading = true;
    try {
      this.projects = await this.appService.GetProjectsList(tenantId);
      console.log('Projects loaded:', this.projects);
    } catch (err) {
      console.error('Failed to load projects:', err);
      await this.showToast('Could not load projects.', 'warning');
    }
    this.loading = false;
  }

  selectProject() {
    console.log('Project selected:', this.selectedProjectId);
    if (!this.selectedProjectId) {
      console.warn('⚠️ No project selected');
      return;
    }
    this.modalCtrl.dismiss({ projectId: this.selectedProjectId });
  }

  cancel() {
    console.warn('User cancelled project selection');
    this.modalCtrl.dismiss({ cancelled: true });
  }

  private async showToast(msg: string, color = 'medium') {
    const toast = await this.toastCtrl.create({ message: msg, duration: 2500, color, position: 'bottom' });
    await toast.present();
  }
}