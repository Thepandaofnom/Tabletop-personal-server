import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface CharacterSheetData {
  characterName: string;
  playerName: string;
  classAndLevel: string;
  background: string;
  race: string;
  alignment: string;
  experiencePoints: string;
  inspiration: string;
  proficiencyBonus: string;
  armorClass: string;
  initiative: string;
  speed: string;
  hitPointMaximum: string;
  currentHitPoints: string;
  temporaryHitPoints: string;
  hitDice: string;
  deathSavesSuccesses: string;
  deathSavesFailures: string;
  strengthScore: string;
  strengthModifier: string;
  dexterityScore: string;
  dexterityModifier: string;
  constitutionScore: string;
  constitutionModifier: string;
  intelligenceScore: string;
  intelligenceModifier: string;
  wisdomScore: string;
  wisdomModifier: string;
  charismaScore: string;
  charismaModifier: string;
  savingThrows: string;
  skills: string;
  passivePerception: string;
  otherProficienciesAndLanguages: string;
  equipment: string;
  featuresAndTraits: string;
  attacksAndSpellcasting: string;
  personalityTraits: string;
  ideals: string;
  bonds: string;
  flaws: string;
  characterAppearance: string;
  alliesAndOrganizations: string;
  backstory: string;
  treasure: string;
}

@Component({
  selector: 'character-sheet-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './character-sheet-editor.html',
  styleUrls: ['./character-sheet-editor.css']
})
export class CharacterSheetEditor {
  @Input() value: CharacterSheetData = this.createEmptySheet();
  @Output() valueChange = new EventEmitter<CharacterSheetData>();
  @Output() saveSheet = new EventEmitter<CharacterSheetData>();

  private createEmptySheet(): CharacterSheetData {
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

  onFieldChange(): void {
    this.valueChange.emit(this.value);
  }

  onSave(): void {
    this.saveSheet.emit(this.value);
  }

  onImportFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      const parsed = JSON.parse(text) as CharacterSheetData;
      this.value = { ...this.createEmptySheet(), ...parsed };
      this.onFieldChange();
    };
    reader.readAsText(file);
  }

  downloadSheet(): void {
    const blob = new Blob([JSON.stringify(this.value, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${this.value.characterName || 'character-sheet'}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }
}
