import { enableProdMode, importProvidersFrom, LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeEsEc from '@angular/common/locales/es-EC';
import { bootstrapApplication } from '@angular/platform-browser';
import { RouteReuseStrategy, provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { IonicModule, IonicRouteStrategy } from '@ionic/angular';

import { provideFirebaseApp } from '@angular/fire/app';
import { provideAuth, getAuth } from '@angular/fire/auth';
import { initializeApp } from 'firebase/app';

import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { environment } from './environments/environment';
import { tokenInterceptor } from './app/core/auth/token.interceptor';

registerLocaleData(localeEsEc);

if (environment.production) {
  enableProdMode();
}

bootstrapApplication(AppComponent, {
  providers: [
    { provide: LOCALE_ID, useValue: 'es-EC' },
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    importProvidersFrom(IonicModule.forRoot()),
    provideRouter(routes, withPreloading(PreloadAllModules)),
    provideHttpClient(withInterceptors([tokenInterceptor])),
    provideFirebaseApp(() => initializeApp((environment as any).firebaseConfig || (environment as any).firebase)),
    provideAuth(() => getAuth()),
  ],
}).catch(err => console.log(err));
