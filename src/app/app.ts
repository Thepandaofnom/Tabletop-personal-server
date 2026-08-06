import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { DiceBagModal, GameMapComponent, MainMenuButtonBar, CharacterSheetEditor, CharacterSheetData, CharacterSheetType, GlobalSettingsComponent, NPCMakerComponent } from '@tabletop/ui-components';

type MainContentView = 'landing' | 'character-sheet' | 'game-map' | 'global-settings' | 'npc-maker';

interface CharacterSheetTab {
  id: string;
  label: string;
  value: CharacterSheetData;
  sheetType: CharacterSheetType;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, DiceBagModal, GameMapComponent, MainMenuButtonBar, CharacterSheetEditor, GlobalSettingsComponent, NPCMakerComponent],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class App {
  protected readonly title = signal('Tabletop');
  protected diceBagVisible = false;
  protected currentView: MainContentView = 'landing';
  protected darkMode = false;
  protected activeCharacterSheetTabId = 'sheet-1';
  protected editingTabId?: string;
  protected characterSheetTabs: CharacterSheetTab[] = [
    { id: 'sheet-1', label: 'Sheet 1', value: this.createEmptyCharacterSheet(), sheetType: 'D&D-5.0' }
  ];
  constructor() {
    this.applyBodyTheme(this.darkMode);
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

  onMenuGameMapClick() { this.currentView = 'game-map'; }
  onMenuDiceBagClick() { this.diceBagVisible = true; }
  onMenuNPCMakerClick() { this.currentView = 'npc-maker'; }
  onMenuOptionsClick() { this.currentView = 'global-settings'; }
  onAppThemeChange(darkMode: boolean) { this.darkMode = darkMode; this.applyBodyTheme(this.darkMode); }

  private applyBodyTheme(darkMode: boolean) { if (typeof document === 'undefined' || !document.body) return; document.body.classList.toggle('dark-mode', darkMode); }
}
