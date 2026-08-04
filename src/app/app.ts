import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DiceBagModal } from './ui-components/dice-bag-modal/dice-bag-modal';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ButtonModule, DiceBagModal],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class App {
  protected readonly title = signal('Tabletop Personal Server');
  protected diceBagVisible = false;

  openDiceBag() { this.diceBagVisible = true; }
}
