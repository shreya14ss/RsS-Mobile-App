import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'rs-button',
  templateUrl: './rs-button.component.html'
})
export class RsButtonComponent {
  @Input() label: string = 'Submit';
  @Input() icon: string = null;
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() color: string = 'primary';
  @Input() expand: 'block' | 'full' | null = 'block';
  @Input() fill: 'solid' | 'outline' | 'clear' = 'solid';
  @Input() disabled: boolean = false;
  @Input() loading: boolean = false;

  @Output() clicked = new EventEmitter<void>();

  onClick() {
    if (!this.disabled && !this.loading) {
      this.clicked.emit();
    }
  }
}
