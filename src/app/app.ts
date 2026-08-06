import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule, HTTP_INTERCEPTORS, HttpClient } from '@angular/common/http';
import { AuthInterceptor } from './auth.interceptor';
import { apiBaseUrl, DiceBagModal, GameMapComponent, NewUserSignUp, MainMenuButtonBar, AccountViewPanel, CharacterSheetEditor, CharacterSheetData, CharacterSheetType, GlobalSettingsComponent, NPCMakerComponent } from '@tabletop/ui-components';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';

interface LoginResponse {
  username: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  id?: number;
}

type MainContentView = 'landing' | 'character-sheet' | 'game-map' | 'global-settings' | 'npc-maker';

interface CharacterSheetTab {
  id: string;
  label: string;
  value: CharacterSheetData;
  sheetType: CharacterSheetType;
}

interface CharacterSheetSaveSummary {
  id: number;
  saveName: string;
  sheetType: string;
}

interface LocalCharacterSheetSave {
  saveName: string;
  sheetType: string;
  sheetJson: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, FormsModule, HttpClientModule, DialogModule, ButtonModule, InputTextModule, DiceBagModal, GameMapComponent, NewUserSignUp, MainMenuButtonBar, AccountViewPanel, CharacterSheetEditor, GlobalSettingsComponent, NPCMakerComponent],
  providers: [{ provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class App {
  protected readonly apiBaseUrl = 'https://tabletop-personal-server-production.up.railway.app/api';
  protected readonly title = signal('Tabletop Personal Server');
  protected diceBagVisible = false;
  protected loginVisible = false;
  protected loggedIn = false;
  protected signupVisible = false;
  protected accountViewVisible = false;
  protected currentView: MainContentView = 'landing';
  protected darkMode = false;
  protected activeCharacterSheetTabId = 'sheet-1';
  protected editingTabId?: string;
  protected characterSheetTabs: CharacterSheetTab[] = [
    { id: 'sheet-1', label: 'Sheet 1', value: this.createEmptyCharacterSheet(), sheetType: 'D&D-5.0' }
  ];
  protected currentUsername = '';
  protected currentFirstName = '';
  protected currentLastName = '';
  protected currentEmail = '';
  protected currentUserId: number | null = null;
  protected characterSheetSaveDialogVisible = false;
  protected characterSheetLoadDialogVisible = false;
  protected characterSheetDeleteDialogVisible = false;
  protected characterSheetSaveName = '';
  protected selectedCharacterSheetSaveName = '';
  protected savedCharacterSheets: CharacterSheetSaveSummary[] = [];
  private readonly localCharacterSheetKey = 'local-character-sheet-saves';

  constructor(private http: HttpClient) {
    this.applyBodyTheme(this.darkMode);
    this.restoreLoginState();
  }

  onLoginSuccess(event: LoginResponse) {
    this.loggedIn = true;
    this.currentUsername = event.username || '';
    this.currentFirstName = event.firstName || '';
    this.currentLastName = event.lastName || '';
    this.currentEmail = event.email || '';
    this.currentUserId = event.id ?? null;
  }

  onOpenCharacterSheetSaveDialog() {
    this.characterSheetSaveDialogVisible = true;
    this.characterSheetSaveName = this.characterSheetTabs.find(tab => tab.id === this.activeCharacterSheetTabId)?.label || '';
  }

  onOpenCharacterSheetLoadDialog() {
    this.characterSheetLoadDialogVisible = true;
    if (this.currentUserId !== null) {
      this.http.get<CharacterSheetSaveSummary[]>(`https://tabletop-personal-server-production.up.railway.app/api/character-sheets/user/${this.currentUserId}`).subscribe({
        next: saves => this.savedCharacterSheets = saves || [],
        error: () => this.savedCharacterSheets = this.getLocalCharacterSheetSaves().map((save, index) => ({ id: index + 1, saveName: save.saveName, sheetType: save.sheetType }))
      });
    }
  }

  onOpenCharacterSheetDeleteDialog() {
    this.characterSheetDeleteDialogVisible = true;
    if (this.currentUserId !== null) {
      this.http.get<CharacterSheetSaveSummary[]>(`https://tabletop-personal-server-production.up.railway.app/api/character-sheets/user/${this.currentUserId}`).subscribe({
        next: saves => this.savedCharacterSheets = saves || [],
        error: () => this.savedCharacterSheets = this.getLocalCharacterSheetSaves().map((save, index) => ({ id: index + 1, saveName: save.saveName, sheetType: save.sheetType }))
      });
    }
  }

  confirmCharacterSheetSave() {
    const activeTab = this.characterSheetTabs.find(tab => tab.id === this.activeCharacterSheetTabId);
    if (!activeTab || this.currentUserId === null || !this.characterSheetSaveName.trim()) {
      console.warn('Character sheet save blocked', {
        hasActiveTab: !!activeTab,
        currentUserId: this.currentUserId,
        saveName: this.characterSheetSaveName
      });
      return;
    }
    this.http.post(`https://tabletop-personal-server-production.up.railway.app/api/character-sheets/user/${this.currentUserId}`, {
      saveName: this.characterSheetSaveName.trim(),
      sheetType: activeTab.sheetType,
      sheetJson: JSON.stringify(activeTab.value)
    }).subscribe({
      next: () => {
        activeTab.label = this.characterSheetSaveName.trim();
        this.characterSheetSaveDialogVisible = false;
        this.characterSheetSaveName = '';
        this.persistLocalCharacterSheetSave(activeTab.sheetType, activeTab.value, activeTab.label);
      },
      error: () => {
        activeTab.label = this.characterSheetSaveName.trim();
        this.persistLocalCharacterSheetSave(activeTab.sheetType, activeTab.value, activeTab.label);
        this.characterSheetSaveDialogVisible = false;
        this.characterSheetSaveName = '';
      }
    });
  }

  confirmCharacterSheetLoad() {
    if (this.currentUserId === null || !this.selectedCharacterSheetSaveName) {
      return;
    }
    this.http.get<any>(`https://tabletop-personal-server-production.up.railway.app/api/character-sheets/user/${this.currentUserId}/${encodeURIComponent(this.selectedCharacterSheetSaveName)}`).subscribe({
      next: record => {
        const activeTab = this.characterSheetTabs.find(tab => tab.id === this.activeCharacterSheetTabId);
        if (activeTab) {
          activeTab.value = JSON.parse(record.sheetJson);
          activeTab.sheetType = record.sheetType;
        }
        this.characterSheetLoadDialogVisible = false;
      },
      error: () => {
        const local = this.getLocalCharacterSheetSave(this.selectedCharacterSheetSaveName);
        if (local) {
          const activeTab = this.characterSheetTabs.find(tab => tab.id === this.activeCharacterSheetTabId);
          if (activeTab) {
            activeTab.value = JSON.parse(local.sheetJson);
            activeTab.sheetType = local.sheetType as CharacterSheetType;
            activeTab.label = local.saveName;
          }
          this.characterSheetLoadDialogVisible = false;
        }
      }
    });
  }

  confirmCharacterSheetDelete() {
    if (this.currentUserId === null || !this.selectedCharacterSheetSaveName) {
      return;
    }
    this.http.delete(`https://tabletop-personal-server-production.up.railway.app/api/character-sheets/user/${this.currentUserId}/${encodeURIComponent(this.selectedCharacterSheetSaveName)}`).subscribe({
      next: () => {
        this.removeLocalCharacterSheetSave(this.selectedCharacterSheetSaveName);
        this.savedCharacterSheets = this.savedCharacterSheetRecordsWithout(this.selectedCharacterSheetSaveName);
        this.characterSheetDeleteDialogVisible = false;
        this.selectedCharacterSheetSaveName = '';
      },
      error: () => {
        this.removeLocalCharacterSheetSave(this.selectedCharacterSheetSaveName);
        this.savedCharacterSheets = this.savedCharacterSheetRecordsWithout(this.selectedCharacterSheetSaveName);
        this.characterSheetDeleteDialogVisible = false;
        this.selectedCharacterSheetSaveName = '';
      }
    });
  }

  onMenuCharacterSheetsClick() { this.currentView = 'character-sheet'; }
  onCharacterSheetChange(tabId: string, value: CharacterSheetData) { this.characterSheetTabs = this.characterSheetTabs.map(tab => tab.id === tabId ? { ...tab, value } : tab); }
  onCharacterSheetSave(tabId: string, value: CharacterSheetData) { this.onCharacterSheetChange(tabId, value); }
  onCharacterSheetTypeChange(tabId: string, type: CharacterSheetType) { this.characterSheetTabs = this.characterSheetTabs.map(tab => tab.id === tabId ? { ...tab, sheetType: type } : tab); }
  onCharacterSheetTabClick(tabId: string) { this.activeCharacterSheetTabId = tabId; }
  startEditingTab(tabId: string) { this.editingTabId = tabId; }
  finishEditingTab(tabId: string, label: string) { const trimmed = label.trim(); if (trimmed) { this.characterSheetTabs = this.characterSheetTabs.map(tab => tab.id === tabId ? { ...tab, label: trimmed } : tab); } this.editingTabId = undefined; }
  trackByTabId(index: number, tab: CharacterSheetTab) { return tab.id; }
  addCharacterSheetTab() { const nextIndex = this.characterSheetTabs.length + 1; const id = `sheet-${nextIndex}`; this.characterSheetTabs = [...this.characterSheetTabs, { id, label: `Sheet ${nextIndex}`, value: this.createEmptyCharacterSheet(), sheetType: 'D&D-5.0' }]; this.activeCharacterSheetTabId = id; }
  removeCharacterSheetTab(tabId: string) {
    if (this.characterSheetTabs.length === 1) {
      this.characterSheetTabs = [{ id: 'sheet-1', label: 'Sheet 1', value: this.createEmptyCharacterSheet(), sheetType: 'D&D-5.0' }];
      this.activeCharacterSheetTabId = 'sheet-1';
      return;
    }
    this.characterSheetTabs = this.characterSheetTabs.filter(tab => tab.id !== tabId);
    if (this.activeCharacterSheetTabId === tabId) {
      this.activeCharacterSheetTabId = this.characterSheetTabs[0].id;
    }
    if (this.editingTabId === tabId) {
      this.editingTabId = undefined;
    }
  }

  private createEmptyCharacterSheet(): CharacterSheetData {
    return { characterName: '', playerName: '', classAndLevel: '', background: '', race: '', alignment: '', experiencePoints: '', inspiration: '', proficiencyBonus: '', armorClass: '', initiative: '', speed: '', hitPointMaximum: '', currentHitPoints: '', temporaryHitPoints: '', hitDice: '', deathSavesSuccesses: '', deathSavesFailures: '', strengthScore: '', strengthModifier: '', dexterityScore: '', dexterityModifier: '', constitutionScore: '', constitutionModifier: '', intelligenceScore: '', intelligenceModifier: '', wisdomScore: '', wisdomModifier: '', charismaScore: '', charismaModifier: '', savingThrows: '', skills: '', passivePerception: '', otherProficienciesAndLanguages: '', equipment: '', featuresAndTraits: '', attacksAndSpellcasting: '', personalityTraits: '', ideals: '', bonds: '', flaws: '', characterAppearance: '', alliesAndOrganizations: '', backstory: '', treasure: '' };
  }

  doLogout() {
    this.http.post(`${apiBaseUrl}/api/auth/logout`, {}).subscribe({
      next: () => this.clearLoginState(),
      error: () => this.clearLoginState()
    });
  }

  }

  onMenuLogin() { this.loginVisible = true; }
  onMenuSignup() { this.signupVisible = true; }
  onMenuLogout() { this.doLogout(); }
  onMenuGameMapClick() { this.currentView = 'game-map'; }
  onMenuDiceBagClick() { this.diceBagVisible = true; }
  onMenuAccountClick() { this.accountViewVisible = true; }
  onMenuNPCMakerClick() { this.currentView = 'npc-maker'; }
  onMenuOptionsClick() { this.currentView = 'global-settings'; }
  onAppThemeChange(darkMode: boolean) { this.darkMode = darkMode; this.applyBodyTheme(this.darkMode); }

  private clearLoginState() { this.loggedIn = false; this.currentUsername = ''; this.currentFirstName = ''; this.currentLastName = ''; this.currentEmail = ''; this.currentUserId = null; }
  private applyBodyTheme(darkMode: boolean) { if (typeof document === 'undefined' || !document.body) return; document.body.classList.toggle('dark-mode', darkMode); }
  private restoreLoginState() {}
  private persistLocalCharacterSheetSave(sheetType: CharacterSheetType, value: CharacterSheetData, saveName: string) {
    try {
      const existing = this.getLocalCharacterSheetSaves();
      const updated = existing.filter(save => save.saveName !== saveName);
      updated.push({ saveName, sheetType, sheetJson: JSON.stringify(value) });
      localStorage.setItem(this.localCharacterSheetKey, JSON.stringify(updated));
    } catch {}
  }
  private removeLocalCharacterSheetSave(saveName: string) {
    try {
      const updated = this.getLocalCharacterSheetSaves().filter(save => save.saveName !== saveName);
      localStorage.setItem(this.localCharacterSheetKey, JSON.stringify(updated));
    } catch {}
  }
  private savedCharacterSheetRecordsWithout(saveName: string): CharacterSheetSaveSummary[] {
    return this.savedCharacterSheets.filter(save => save.saveName !== saveName);
  }
  private getLocalCharacterSheetSaves(): LocalCharacterSheetSave[] {
    try {
      const raw = localStorage.getItem(this.localCharacterSheetKey);
      return raw ? JSON.parse(raw) as LocalCharacterSheetSave[] : [];
    } catch {
      return [];
    }
  }
  private getLocalCharacterSheetSave(saveName: string): LocalCharacterSheetSave | undefined {
    return this.getLocalCharacterSheetSaves().find(save => save.saveName === saveName);
  }
}
