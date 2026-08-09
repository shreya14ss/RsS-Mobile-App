import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { StorageService } from '../services/storage.service';
import { AppService } from '../services/app.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(private storageService: StorageService,
    private router: Router,
    private appService: AppService
  ) { }

  // canActivate(): Observable<boolean | UrlTree> {
  //   return from(this.storageService.getToken()).pipe(
  //     map(token => {
  //       if (token) {
  //         return true;
  //       }
  //       return this.router.createUrlTree(['/login']);
  //     })
  //   );
  // }

  canActivate(): boolean | UrlTree {
    const mode = this.appService.GetLoginModeDetails();

    console.log('AuthGuard mode:', mode);

    if (mode?.mode === 'P') {
      return true;
    }

    return this.router.createUrlTree(['/login']);
  }
}
