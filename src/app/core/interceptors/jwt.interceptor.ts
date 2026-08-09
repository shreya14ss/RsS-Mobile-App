import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor
} from '@angular/common/http';
import { Observable, from } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { StorageService } from '../services/storage.service';

@Injectable()
export class JwtInterceptor implements HttpInterceptor {

  constructor(private storageService: StorageService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return from(this.storageService.getToken()).pipe(
      switchMap(token => {
        if (token) {
          const authReq = req.clone({
            setHeaders: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
              'accept': 'application/json'
            }
          });
          return next.handle(authReq);
        }
        // No token — attach JSON headers only (login call)
        const jsonReq = req.clone({
          setHeaders: {
            'Content-Type': 'application/json',
            'accept': 'application/json'
          }
        });
        return next.handle(jsonReq);
      })
    );
  }
}
