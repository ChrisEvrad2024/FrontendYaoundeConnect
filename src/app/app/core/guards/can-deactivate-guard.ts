import { CanDeactivateFn } from '@angular/router';
import { Observable } from 'rxjs';

export interface CanComponentDeactivate {
  canDeactivate: () => Observable<boolean> | Promise<boolean> | boolean;
}

export const canDeactivateGuard: CanDeactivateFn<CanComponentDeactivate> = (
  component: CanComponentDeactivate
) => {
  return component.canDeactivate ? component.canDeactivate() : true;
};

// Exemple d'utilisation dans un composant avec formulaire :
/*
export class PoiCreate implements CanComponentDeactivate {
  @ViewChild('poiForm') form!: NgForm;
  
  canDeactivate(): Observable<boolean> | boolean {
    if (this.form.dirty && !this.form.submitted) {
      return confirm('Vous avez des modifications non sauvegardées. Voulez-vous vraiment quitter cette page ?');
    }
    return true;
  }
}
*/