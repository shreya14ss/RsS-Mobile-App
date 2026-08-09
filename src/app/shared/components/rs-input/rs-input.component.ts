import { Component, Input } from '@angular/core';
import { AbstractControl } from '@angular/forms';

@Component({
  selector: 'rs-input',
  templateUrl: './rs-input.component.html'
})
export class RsInputComponent {
  @Input() label: string = '';
  @Input() type: string = 'text';
  @Input() control: AbstractControl;
  @Input() errorMsg: string = 'This field is required';
  @Input() disabled: boolean = false;
  @Input() autocomplete: string = 'off';

  get showError(): boolean {
    return this.control && this.control.invalid && (this.control.dirty || this.control.touched);
  }

  /**
   * Detects whether the bound control has `Validators.required` set. We probe
   * the validator with a synthetic empty control — Angular's Validators.required
   * returns `{ required: true }` for empty values. This lets every rs-input
   * across the app show a red "*" on required fields without callers having
   * to opt in — matches the automatic Material Design "*" that mat-label
   * shows in the ClientApp.
   */
  get isRequired(): boolean {
    if (!this.control?.validator) return false;
    const result = this.control.validator({ value: null } as AbstractControl);
    return !!(result && result['required']);
  }
}
