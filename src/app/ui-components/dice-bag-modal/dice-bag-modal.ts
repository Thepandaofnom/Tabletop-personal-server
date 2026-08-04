import { Component, EventEmitter, Input, Output } from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'dice-bag-modal',
  standalone: true,
  imports: [DialogModule, ButtonModule, CommonModule],
  template: `
    <p-dialog [(visible)]="visibleLocal" [resizable]="true" [modal]="true" header="Dice Bag" [style]="{width: '40vw'}">
      <div style="display:flex;justify-content:center;align-items:center;padding:1rem;">
        <button pButton type="button" label="D4" (click)="rollD4()"></button>
      </div>
    </p-dialog>
  `,
})
export class DiceBagModal {
  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();

  get visibleLocal() {
    return this.visible;
  }
  set visibleLocal(v: boolean) {
    this.visible = v;
    this.visibleChange.emit(v);
  }

  rollD4() {
    const rnd = Math.floor(Math.random() * 4) + 1;
    alert('D4: ' + rnd);
  }
}
