import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ActionSheetController, AlertController, ModalController, ToastController } from '@ionic/angular';
import { AppService } from '../../core/services/app.service';
import { LoginSelectorComponent } from './login-selector/login-selector.component';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss']
})
export class LoginPage implements OnInit {

  form: FormGroup;
  loginProgress = false;
  pageTitle = environment.productName;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private appService: AppService,
    // private alertCtrl: AlertController,
    private modalCtrl: ModalController,
    private toastCtrl: ToastController,
    private actionSheetCtrl: ActionSheetController
  ) { }

  async ngOnInit() {
    this.loginProgress = false;
    this.form = this.fb.group({
      username: [null, Validators.required],
      password: [null, Validators.required]
    });

    const isLoggedIn = await this.appService.isLoggedIn();
    if (isLoggedIn) {
      this.handleAlreadyLoggedIn();
    }

    if (!(await this.appService.isLoggedIn())) {
      this.router.navigateByUrl('/login', { replaceUrl: true });
      return;
    }
  }

  ionViewWillEnter() {
    this.loginProgress = false;
    this.form?.enable();
  }
  // ─── Already logged in on app open ────────────────────────────────────────
  //
  // Token exists from a previous session. Check the stored mode:
  //   - mode 'P' → navigate straight to /tabs, NO SetLoginMode call needed
  //   - mode ''  → we have a token but no mode, need to pick a project
  //                but we have no password in hand, so just logout and
  //                let the user login fresh (safe fallback)

  private async handleAlreadyLoggedIn() {
    const modeDetails = await this.appService.GetLoginModeDetails();
    if (modeDetails.mode === 'P') {
      // Session fully intact — go straight to dashboard
      console.log('/project/' + modeDetails.project_id, "handleAlreadyLoggedIn");
      // this.router.navigateByUrl('/project/' + modeDetails.project_id);
      this.router.navigateByUrl('/project/' + modeDetails.project_id, { replaceUrl: true });
    } else {
      // Incomplete session — clear it and let user login fresh
      await this.appService.LogoutUser();
    }
  }

  // ─── Triggered by form submit ─────────────────────────────────────────────

  async login() {
    console.log('LOGIN STARTED');
    if (this.form.invalid) {
      console.warn('Form invalid', this.form.value);
      this.form.markAllAsTouched();
      return;
    }

    this.loginProgress = true;
    const { username, password } = this.form.value;
    console.log('Calling LoginUser with:', { username });
    const result = await this.appService.LoginUser(username, password, '');
    console.log('LoginUser result:', result);
    if (result === '') {
      console.log('Login success going to loginDetailSelection');
      await this.loginDetailSelection();
    } else if (result === 'log') {
      console.warn('Already logged in force login flow');
      this.loginProgress = false;
      await this.showForceLoginActionSheet(username, password);
    } else {
      console.error('Login failed with code:', result);
      this.loginProgress = false;
      await this.showErrorToast(result);
    }
  }

  // ─── loginDetailSelection ─────────────────────────────────────────────────
  //
  // Called only after a successful LoginUser() call, so password is always
  // available. Checks the mode returned by the server:
  //   - mode 'P' → server already set it (direct-mode login) → go to /tabs
  //   - mode ''  → server returned no mode → pick project, call SetLoginMode

  private async loginDetailSelection() {
    console.log('loginDetailSelection START');
    const { username, password } = this.form.value;
    const modeDetails = await this.appService.GetLoginModeDetails();
    console.log('Mode details:', modeDetails);

    if (modeDetails.mode === 'P') {
      // Server set mode directly (e.g. returnUrlType was 'P') — no SetLoginMode needed
      console.log('Mode already set navigating to /project/' + modeDetails.project_id, "loginDetailSelection");
      await this.showSuccessToast();
      this.router.navigateByUrl('/project/' + modeDetails.project_id);
      return;
    }

    // Mode not set yet — need to pick a project and call SetLoginMode
    try {
      console.log('Fetching tenants...');
      const tenants = await this.appService.GetTenantsList();
      if (!tenants || tenants.length === 0) {
        console.error('No tenants found');
        this.loginProgress = false;
        await this.showErrorToast('api');
        return;
      }

      // Collect all projects across all tenants
      const allProjects: { tenantId: string; project: any }[] = [];
      for (const tenant of tenants) {
        console.log('Fetching projects for tenant:', tenant._id);
        const projects = await this.appService.GetProjectsList(tenant._id);
        console.log('Projects for tenant:', tenant._id, projects);
        if (projects?.length) {
          projects.forEach(p => allProjects.push({ tenantId: tenant._id, project: p }));
        }
      }
      console.log('All projects:', allProjects);
      if (allProjects.length === 0) {
        console.error('No projects found');
        this.loginProgress = false;
        await this.showErrorToast('api');
        return;
      }

      if (allProjects.length === 1) {
        // Single project — auto-select silently
        console.log('Single project → auto selecting');
        await this.setProjectAndNavigate(allProjects[0].project._id, password);
      } else {
        // Multiple projects — show selector modal
        console.log('Multiple projects opening selector modal');
        this.loginProgress = false;
        const modal = await this.modalCtrl.create({
          component: LoginSelectorComponent,
          componentProps: { tenants },
          backdropDismiss: false
        });
        await modal.present();

        const { data } = await modal.onWillDismiss();
        console.log('Modal result:', data);
        if (!data || data.cancelled) {
          console.warn('User cancelled project selection');
          await this.appService.LogoutUser();
          this.form.patchValue({ username: '', password: '' });
          this.loginProgress = false;
        } else {
          console.log('Project selected:', data.projectId);
          this.loginProgress = true;
          await this.setProjectAndNavigate(data.projectId, password);
        }
      }

    } catch (err) {
      console.error('loginDetailSelection ERROR:', err);
      this.loginProgress = false;
      await this.showErrorToast(err as string);
      await this.appService.LogoutUser();
      this.form.patchValue({ username: '', password: '' });
    }
  }

  // private async setProjectAndNavigate(projectId: string, password: string) {
  //   try {
  //     await this.appService.SetLoginMode('P', projectId, password);
  //     await this.showSuccessToast();
  //     this.router.navigateByUrl('/tabs', { replaceUrl: true });
  //   } catch (err) {
  //     this.loginProgress = false;
  //     await this.showErrorToast(err as string);
  //     await this.appService.LogoutUser();
  //     this.form.patchValue({ username: '', password: '' });
  //   }
  // }
  private async setProjectAndNavigate(projectId: string, password: string) {
    console.log('setProjectAndNavigate START');

    try {
      console.log('Calling SetLoginMode...');

      await this.appService.SetLoginMode('P', projectId, password);

      console.log('SetLoginMode SUCCESS');

      await this.showSuccessToast();

      console.log('Navigating to /project/' + projectId);

      await this.router.navigateByUrl('/project/' + projectId);

      console.log('Navigation DONE');

    } catch (err) {
      console.error('setProjectAndNavigate ERROR:', err);

      this.loginProgress = false;
      await this.showErrorToast(err as string);
      await this.appService.LogoutUser();
      this.form.patchValue({ username: '', password: '' });
    }
  }

  // ─── Force login ──────────────────────────────────────────────────────────

  private async showForceLoginActionSheet(username: string, password: string) {

    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Session Already Active',
      subHeader: 'Force login will terminate the other session.',
      buttons: [

        {
          text: 'Force Login',
          role: 'destructive', // 🔥 red button like native
          icon: 'log-in-outline',
          handler: async () => {
            this.loginProgress = true;

            const result = await this.appService.ForceLoginUser(username, password, '');

            if (result === '') {
              await this.loginDetailSelection();
            } else {
              this.loginProgress = false;
              await this.showErrorToast(result);
            }
          }
        },

        {
          text: 'Cancel',
          role: 'cancel',
          icon: 'close-outline'
        }

      ]
    });

    await actionSheet.present();
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private async showSuccessToast() {
    const toast = await this.toastCtrl.create({
      message: 'Login successful',
      duration: 2000,
      color: 'success',
      position: 'bottom'
    });
    await toast.present();
  }

  private async showErrorToast(code: string) {
    // Backend returns specific codes per failure reason
    // (see UsersController.cs). Map every known code so the user sees a
    // meaningful message; unknown codes fall back to the generic string.
    const messages: Record<string, string> = {
      api: 'Cannot reach the server. Check your network.',
      pass: 'Wrong password. Please try again.',
      usr: 'User not found.',
      login: 'User not found.',
      notfound: 'User not found.',
      syntax: 'Invalid request.',
      session: 'Session expired. Please login again.',
      invalid: 'Invalid username or password.',
      db: 'A server error occurred. Please try again.'
    };
    // Position at the top: on the login screen the soft keyboard is usually
    // still up when this toast fires, which would hide a bottom-anchored
    // toast entirely. Top position keeps it visible above the keyboard.
    const toast = await this.toastCtrl.create({
      message: messages[code] || 'Login failed. Please try again.',
      duration: 3500,
      color: 'danger',
      position: 'top',
      buttons: [{ icon: 'close', role: 'cancel' }]
    });
    await toast.present();
  }
}