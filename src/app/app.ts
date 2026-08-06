import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClientModule, HTTP_INTERCEPTORS, HttpClient } from '@angular/common/http';
import { AuthInterceptor } from './auth.interceptor';
import { apiBaseUrl, DiceBagModal, GameMapComponent, NewUserSignUp, MainMenuButtonBar, AccountViewPanel, CharacterSheetEditor, CharacterSheetData } from '@tabletop/ui-components';

interface LoginResponse {
  username: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

type MainContentView = 'landing' | 'character-sheet' | 'game-map';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, HttpClientModule, DiceBagModal, GameMapComponent, NewUserSignUp, MainMenuButtonBar, AccountViewPanel, CharacterSheetEditor],
  providers: [{ provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class App {
  protected readonly title = signal('Tabletop Personal Server');
  protected diceBagVisible = false;
  protected loginVisible = false;
  protected loggedIn = false;
  protected signupVisible = false;
  protected accountViewVisible = false;
  protected currentView: MainContentView = 'landing';
  protected characterSheet: CharacterSheetData = this.createEmptyCharacterSheet();
  protected currentUsername = '';
  protected currentFirstName = '';
  protected currentLastName = '';
  protected currentEmail = '';

  constructor(private http: HttpClient) {}

  onLoginSuccess(event: LoginResponse) {
    this.loggedIn = true;
    this.currentUsername = event.username || '';
    this.currentFirstName = event.firstName || '';
    this.currentLastName = event.lastName || '';
    this.currentEmail = event.email || '';
  }

  onMenuCharacterSheetsClick() {
    this.currentView = 'character-sheet';
  }

  onCharacterSheetChange(value: CharacterSheetData) {
    this.characterSheet = value;
  }

  onCharacterSheetSave(value: CharacterSheetData) {
    this.characterSheet = value;
  }

  private createEmptyCharacterSheet(): CharacterSheetData {
    return {
      characterName: '', playerName: '', classAndLevel: '', background: '', race: '', alignment: '', experiencePoints: '',
      inspiration: '', proficiencyBonus: '', armorClass: '', initiative: '', speed: '', hitPointMaximum: '', currentHitPoints: '',
      temporaryHitPoints: '', hitDice: '', deathSavesSuccesses: '', deathSavesFailures: '',
      strengthScore: '', strengthModifier: '', dexterityScore: '', dexterityModifier: '', constitutionScore: '', constitutionModifier: '',
      intelligenceScore: '', intelligenceModifier: '', wisdomScore: '', wisdomModifier: '', charismaScore: '', charismaModifier: '',
      savingThrows: '', skills: '', passivePerception: '', otherProficienciesAndLanguages: '', equipment: '', featuresAndTraits: '',
      attacksAndSpellcasting: '', personalityTraits: '', ideals: '', bonds: '', flaws: '', characterAppearance: '', alliesAndOrganizations: '',
      backstory: '', treasure: ''
    };
  }

  doLogout() {
    this.http.post(`${apiBaseUrl}/api/auth/logout`, {}).subscribe({
      next: () => this.clearUserSession(),
      error: () => this.clearUserSession()
    });
  }

  private clearUserSession() {
    this.loggedIn = false;
    this.currentUsername = '';
    this.currentFirstName = '';
    this.currentLastName = '';
    this.currentEmail = '';
  }

  onMenuLogin() { this.loginVisible = true; }
  onMenuSignup() { this.signupVisible = true; }
  onMenuLogout() { this.doLogout(); }
  onMenuGameMapClick() { this.currentView = 'game-map'; }
  onMenuDiceBagClick() { this.diceBagVisible = true; }
  onMenuAccountClick() { this.accountViewVisible = true; }
}
