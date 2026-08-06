import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (req.url.includes('/api/auth') || (req.url.includes('/api/users') && req.method === 'POST')) {
      return next.handle(req);
    }

    try {
      const token = localStorage.getItem('jwt');
      if (token) {
        const authReq = req.clone({ setHeaders: { Authorization: 'Bearer ' + token } });
        return next.handle(authReq);
      }
    } catch (e) {
      console.warn('AuthInterceptor error', e);
    }

    return next.handle(req);
  }
}
