import { Component, EventEmitter, Input, OnChanges, Output, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MenuModule } from 'primeng/menu';
import { Menu } from 'primeng/menu';
import { MenuItem } from 'primeng/api';

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

export type CharacterSheetType = 'D&D-5.0' | 'D&D-3.5' | 'GURPS' | 'pathfinder 1e' | 'Pathfinder 2e' | 'Pathfinder 2eR' | string;

@Component({
  selector: 'character-sheet-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, MenuModule],
  templateUrl: './character-sheet-editor.html',
  styleUrls: ['./character-sheet-editor.css']
})
export class CharacterSheetEditor implements OnChanges {
  @Input() value: CharacterSheetData = this.createEmptySheet();
  @Input() sheetType!: CharacterSheetType;
  @Output() sheetTypeChange = new EventEmitter<CharacterSheetType>();
  @Output() valueChange = new EventEmitter<CharacterSheetData>();
  @Output() saveSheet = new EventEmitter<CharacterSheetData>();
  @ViewChild('dnd50Template', { static: true }) dnd50Template!: TemplateRef<unknown>;
  @ViewChild('dnd35Template', { static: true }) dnd35Template!: TemplateRef<unknown>;
  @ViewChild('gurpsTemplate', { static: true }) gurpsTemplate!: TemplateRef<unknown>;
  @ViewChild('pathfinder1eTemplate', { static: true }) pathfinder1eTemplate!: TemplateRef<unknown>;
  @ViewChild('pathfinder2eTemplate', { static: true }) pathfinder2eTemplate!: TemplateRef<unknown>;
  @ViewChild('pathfinder2erTemplate', { static: true }) pathfinder2erTemplate!: TemplateRef<unknown>;
  @ViewChild('actionMenu') actionMenu!: Menu;
  activeTemplate!: TemplateRef<unknown>;
  actionMenuItems: MenuItem[] = [
    { label: 'Download JSON', icon: 'pi pi-download', command: () => this.downloadSheet() },
    { label: 'Import JSON', icon: 'pi pi-upload', command: () => this.triggerImport() }
  ];

  ngOnChanges(): void {
    this.actionMenuItems = [
      { label: 'Download JSON', icon: 'pi pi-download', command: () => this.downloadSheet() },
      { label: 'Import JSON', icon: 'pi pi-upload', command: () => this.triggerImport() }
    ];
  }

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

  ngOnInit(): void {
    if (!this.sheetType) {
      this.sheetType = 'D&D-5.0';
    }
    this.activeTemplate = this.getTemplateForType(this.sheetType);
  }

  onFieldChange(): void {
    this.valueChange.emit(this.value);
  }

  onSheetTypeChange(type: CharacterSheetType): void {
    this.sheetType = type;
    this.activeTemplate = this.getTemplateForType(type);
    this.sheetTypeChange.emit(type);
  }

  openActionMenu(event: Event): void {
    this.actionMenu.toggle(event);
  }

  private triggerImport(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = (event) => this.onImportFile(event as unknown as Event);
    input.click();
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

  private getTemplateForType(type: CharacterSheetType): TemplateRef<unknown> {
    if (type === 'D&D-3.5') {
      return this.dnd35Template;
    }
    if (type === 'GURPS') {
      return this.gurpsTemplate;
    }
    if (type === 'pathfinder 1e') {
      return this.pathfinder1eTemplate;
    }
    if (type === 'Pathfinder 2e') {
      return this.pathfinder2eTemplate;
    }
    if (type === 'Pathfinder 2eR') {
      return this.pathfinder2erTemplate;
    }
    return this.dnd50Template;
  }

}
