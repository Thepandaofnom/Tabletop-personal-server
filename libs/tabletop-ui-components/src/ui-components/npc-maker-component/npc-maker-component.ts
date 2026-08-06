import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { DialogModule } from 'primeng/dialog';
import { apiBaseUrl } from '../../api';

export interface NPCData {
  name: string;
  race: string;
  class: string;
  level: number;
  alignment: string;
  background: string;
  traits: string;
  ideals: string;
  bonds: string;
  flaws: string;
  skills: string;
  equipment: string;
  appearance: string;
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
}

interface KeptNPC {
  id: string;
  label: string;
  data: NPCData;
}

interface NPCMakerState {
  generatedNPC: NPCData | null;
  keptNPCs: KeptNPC[];
  activeKeptNPCId: string | null;
}

interface NPCSaveSummary {
  id: number;
  saveName: string;
}

interface NPCSaveRecord {
  saveName: string;
  npcJson: string;
}

const RACES = ['Human', 'Elf', 'Dwarf', 'Halfling', 'Dragonborn', 'Gnome', 'Half-Elf', 'Half-Orc', 'Tiefling'];
const CLASSES = ['Barbarian', 'Bard', 'Cleric', 'Druid', 'Fighter', 'Monk', 'Paladin', 'Ranger', 'Rogue', 'Sorcerer', 'Warlock', 'Wizard'];
const ALIGNMENTS = ['Lawful Good', 'Neutral Good', 'Chaotic Good', 'Lawful Neutral', 'True Neutral', 'Chaotic Neutral', 'Lawful Evil', 'Neutral Evil', 'Chaotic Evil'];
const BACKGROUNDS = ['Acolyte', 'Charlatan', 'Criminal', 'Entertainer', 'Folk Hero', 'Gladiator', 'Guild Artisan', 'Hermit', 'Sage', 'Soldier', 'Urchin', 'Noble'];
const TRAITS = [
  'Honorable and direct',
  'Quick to laugh',
  'Cunning and sly',
  'Brave and bold',
  'Cautious and careful',
  'Charming and charismatic',
  'Melancholic and withdrawn',
  'Hot-headed and passionate'
];
const IDEALS = [
  'Respect the law above all',
  'Freedom is worth dying for',
  'Power should be held responsibly',
  'People deserve a second chance',
  'Knowledge is the path to power',
  'Protect the weak and innocent',
  'Ambition drives all growth',
  'Vengeance is sweet'
];
const BONDS = [
  'Owes a debt to someone',
  'Seeking revenge',
  'Protecting a loved one',
  'Searching for a lost item',
  'Honor bound to a code',
  'Studying something important',
  'Running from the law',
  'Seeking redemption'
];
const FLAWS = [
  'I am always suspicious',
  'I am judgmental',
  'I am overly confident',
  'I have no respect for authority',
  'I panic under pressure',
  'I am easily angered',
  'I am obsessed with appearance',
  'I am cowardly'
];

const STORAGE_KEY = 'npc-maker-state';

@Component({
  selector: 'npc-maker-component',
  standalone: true,
  imports: [CommonModule, FormsModule, DialogModule],
  templateUrl: './npc-maker-component.html',
  styleUrls: ['./npc-maker-component.css']
})
export class NPCMakerComponent implements OnInit {
  @Output() closeNPC = new EventEmitter<void>();

  generatedNPC: NPCData | null = null;
  keptNPCs: KeptNPC[] = [];
  activeKeptNPCId: string | null = null;
  editingKeptNPCId: string | null = null;
  saveDialogVisible = false;
  loadDialogVisible = false;
  deleteDialogVisible = false;
  saveName = '';
  selectedSaveName = '';
  savedNPCSets: NPCSaveSummary[] = [];
  private readonly apiBaseUrl = `${apiBaseUrl}/api`;
  @Input() currentUserId: number | null = null;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadState();
  }

  private loadState(): void {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const state = JSON.parse(saved) as NPCMakerState;
        this.generatedNPC = state.generatedNPC;
        this.keptNPCs = state.keptNPCs;
        this.activeKeptNPCId = state.activeKeptNPCId;
      }
    } catch (error) {
      console.warn('Failed to load NPC Maker state from localStorage:', error);
    }
  }

  private saveState(): void {
    try {
      const state: NPCMakerState = {
        generatedNPC: this.generatedNPC,
        keptNPCs: this.keptNPCs,
        activeKeptNPCId: this.activeKeptNPCId
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn('Failed to save NPC Maker state to localStorage:', error);
    }
  }

  openSaveDialog(): void { this.saveDialogVisible = true; }
  openLoadDialog(): void { this.loadDialogVisible = true; this.refreshSavedNPCSets(); }
  openDeleteDialog(): void { this.deleteDialogVisible = true; this.refreshSavedNPCSets(); }

  confirmSaveNPCs(): void {
    if (this.currentUserId === null || !this.saveName.trim()) return;
    const payload = JSON.stringify({ generatedNPC: this.generatedNPC, keptNPCs: this.keptNPCs, activeKeptNPCId: this.activeKeptNPCId });
    this.http.post(`${this.apiBaseUrl}/saved-npcs/user/${this.currentUserId}`, { saveName: this.saveName.trim(), npcJson: payload }).subscribe({
      next: () => { this.saveDialogVisible = false; this.saveName = ''; },
      error: () => { this.saveLocalNPCSet(this.saveName.trim(), payload); this.saveDialogVisible = false; this.saveName = ''; }
    });
  }

  confirmLoadNPCs(): void {
    if (this.currentUserId === null || !this.selectedSaveName) return;
    this.http.get<NPCSaveRecord>(`${this.apiBaseUrl}/saved-npcs/user/${this.currentUserId}/${encodeURIComponent(this.selectedSaveName)}`).subscribe({
      next: record => { this.applyNPCSet(record.npcJson); this.loadDialogVisible = false; },
      error: () => {
        const local = this.getLocalNPCSet(this.selectedSaveName);
        if (local) { this.applyNPCSet(local.npcJson); this.loadDialogVisible = false; }
      }
    });
  }

  confirmDeleteNPCs(): void {
    if (this.currentUserId === null || !this.selectedSaveName) return;
    this.http.delete(`${this.apiBaseUrl}/saved-npcs/user/${this.currentUserId}/${encodeURIComponent(this.selectedSaveName)}`).subscribe({
      next: () => { this.deleteLocalNPCSet(this.selectedSaveName); this.refreshSavedNPCSets(); this.deleteDialogVisible = false; this.selectedSaveName = ''; },
      error: () => { this.deleteLocalNPCSet(this.selectedSaveName); this.refreshSavedNPCSets(); this.deleteDialogVisible = false; this.selectedSaveName = ''; }
    });
  }

  private refreshSavedNPCSets(): void {
    if (this.currentUserId === null) return;
    this.http.get<NPCSaveSummary[]>(`${this.apiBaseUrl}/saved-npcs/user/${this.currentUserId}`).subscribe({
      next: saves => this.savedNPCSets = saves || [],
      error: () => this.savedNPCSets = this.getLocalNPCSetList()
    });
  }

  private applyNPCSet(npcJson: string): void {
    const state = JSON.parse(npcJson) as NPCMakerState;
    this.generatedNPC = state.generatedNPC;
    this.keptNPCs = state.keptNPCs || [];
    this.activeKeptNPCId = state.activeKeptNPCId || (this.keptNPCs[0]?.id ?? null);
    this.saveState();
  }

  private getLocalNPCSetList(): NPCSaveSummary[] {
    try {
      const raw = localStorage.getItem('local-npc-sets');
      return raw ? JSON.parse(raw) as NPCSaveSummary[] : [];
    } catch {
      return [];
    }
  }

  private getLocalNPCSet(saveName: string): NPCSaveRecord | null {
    try {
      const raw = localStorage.getItem(`local-npc-sets:${saveName}`);
      return raw ? JSON.parse(raw) as NPCSaveRecord : null;
    } catch {
      return null;
    }
  }

  private saveLocalNPCSet(saveName: string, npcJson: string): void {
    try {
      localStorage.setItem(`local-npc-sets:${saveName}`, JSON.stringify({ saveName, npcJson }));
      const list = this.getLocalNPCSetList().filter(item => item.saveName !== saveName);
      list.unshift({ id: Date.now(), saveName });
      localStorage.setItem('local-npc-sets', JSON.stringify(list));
    } catch {}
  }

  private deleteLocalNPCSet(saveName: string): void {
    try {
      localStorage.removeItem(`local-npc-sets:${saveName}`);
      const list = this.getLocalNPCSetList().filter(item => item.saveName !== saveName);
      localStorage.setItem('local-npc-sets', JSON.stringify(list));
    } catch {}
  }

  generateNPC(): void {
    const level = Math.floor(Math.random() * 20) + 1;
    this.generatedNPC = {
      name: this.generateName(),
      race: RACES[Math.floor(Math.random() * RACES.length)],
      class: CLASSES[Math.floor(Math.random() * CLASSES.length)],
      level,
      alignment: ALIGNMENTS[Math.floor(Math.random() * ALIGNMENTS.length)],
      background: BACKGROUNDS[Math.floor(Math.random() * BACKGROUNDS.length)],
      traits: TRAITS[Math.floor(Math.random() * TRAITS.length)],
      ideals: IDEALS[Math.floor(Math.random() * IDEALS.length)],
      bonds: BONDS[Math.floor(Math.random() * BONDS.length)],
      flaws: FLAWS[Math.floor(Math.random() * FLAWS.length)],
      skills: this.generateSkills(),
      equipment: this.generateEquipment(),
      appearance: this.generateAppearance(),
      strength: this.rollAbilityScore(),
      dexterity: this.rollAbilityScore(),
      constitution: this.rollAbilityScore(),
      intelligence: this.rollAbilityScore(),
      wisdom: this.rollAbilityScore(),
      charisma: this.rollAbilityScore()
    };
    this.saveState();
  }

  keepNPC(): void {
    if (!this.generatedNPC) return;
    const id = `npc-${Date.now()}`;
    const label = this.generatedNPC.name || `NPC ${this.keptNPCs.length + 1}`;
    this.keptNPCs.push({
      id,
      label,
      data: { ...this.generatedNPC }
    });
    this.activeKeptNPCId = id;
    this.generatedNPC = null;
    this.saveState();
  }

  saveAllNPCs(): void {
    const exportData = this.keptNPCs.map(npc => ({ label: npc.label, data: npc.data }));
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `npcs-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  importNPCs(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = (event) => this.onImportFile(event as unknown as Event);
    input.click();
  }

  private onImportFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        parsed.forEach((item, index) => {
          const id = `npc-${Date.now()}-${index}`;
          this.keptNPCs.push({
            id,
            label: item.label || `Imported NPC ${index + 1}`,
            data: item.data
          });
        });
        if (this.keptNPCs.length > 0) {
          this.activeKeptNPCId = this.keptNPCs[0].id;
        }
        this.saveState();
      }
    };
    reader.readAsText(file);
  }

  selectKeptNPC(id: string): void {
    this.activeKeptNPCId = id;
    this.saveState();
  }

  startEditingKeptNPCLabel(id: string): void {
    this.editingKeptNPCId = id;
  }

  finishEditingKeptNPCLabel(id: string, newLabel: string): void {
    const npc = this.keptNPCs.find(n => n.id === id);
    if (npc && newLabel.trim()) {
      npc.label = newLabel.trim();
      this.saveState();
    }
    this.editingKeptNPCId = null;
  }

  deleteKeptNPC(id: string): void {
    this.keptNPCs = this.keptNPCs.filter(n => n.id !== id);
    if (this.activeKeptNPCId === id) {
      this.activeKeptNPCId = this.keptNPCs.length > 0 ? this.keptNPCs[0].id : null;
    }
    this.saveState();
  }

  private generateName(): string {
    const firstNames = ['Aldric', 'Beatrice', 'Cedric', 'Delilah', 'Ezra', 'Freya', 'Gareth', 'Hazel', 'Ivan', 'Jenna', 'Kellan', 'Luna', 'Magnus', 'Nora', 'Orion', 'Piper'];
    const lastNames = ['Blackwood', 'Copperfield', 'Darkblade', 'Evermore', 'Fincher', 'Goldleaf', 'Hammerfist', 'Ironheart', 'Jade', 'Kingslayer', 'Lightbringer', 'Moonwhisper', 'Nightshade', 'Oakenshield', 'Pearson', 'Quicksilver'];
    const first = firstNames[Math.floor(Math.random() * firstNames.length)];
    const last = lastNames[Math.floor(Math.random() * lastNames.length)];
    return `${first} ${last}`;
  }

  private generateSkills(): string {
    const skills = ['Acrobatics', 'Animal Handling', 'Arcana', 'Athletics', 'Deception', 'History', 'Insight', 'Intimidation', 'Investigation', 'Medicine', 'Nature', 'Perception', 'Performance', 'Persuasion', 'Religion', 'Sleight of Hand', 'Stealth', 'Survival'];
    const selected = [];
    for (let i = 0; i < Math.floor(Math.random() * 4) + 2; i++) {
      selected.push(skills[Math.floor(Math.random() * skills.length)]);
    }
    return Array.from(new Set(selected)).join(', ');
  }

  private generateEquipment(): string {
    const equipment = ['Longsword', 'Shortsword', 'Dagger', 'Mace', 'Quarterstaff', 'Bow', 'Crossbow', 'Leather Armor', 'Chain Mail', 'Shield', 'Spell Component Pouch', 'Holy Symbol', 'Bedroll', 'Rope', 'Backpack', 'Waterskin', 'Rations'];
    const selected = [];
    for (let i = 0; i < Math.floor(Math.random() * 4) + 3; i++) {
      selected.push(equipment[Math.floor(Math.random() * equipment.length)]);
    }
    return Array.from(new Set(selected)).join(', ');
  }

  private generateAppearance(): string {
    const builds = ['Athletic', 'Stocky', 'Thin', 'Muscular', 'Delicate'];
    const hair = ['Black', 'Brown', 'Blonde', 'Red', 'Grey', 'White', 'Bald'];
    const eyes = ['Blue', 'Green', 'Brown', 'Grey', 'Amber', 'Violet'];
    const distinguishing = ['Scar on face', 'Missing an eye', 'Tattoo on arm', 'Missing a hand', 'Burn marks', 'No distinguishing marks'];
    
    const build = builds[Math.floor(Math.random() * builds.length)];
    const hairColor = hair[Math.floor(Math.random() * hair.length)];
    const eyeColor = eyes[Math.floor(Math.random() * eyes.length)];
    const mark = distinguishing[Math.floor(Math.random() * distinguishing.length)];
    
    return `${build} build, ${hairColor} hair, ${eyeColor} eyes. ${mark}.`;
  }

  private rollAbilityScore(): number {
    // Roll 4d6, drop the lowest
    const rolls = [
      Math.floor(Math.random() * 6) + 1,
      Math.floor(Math.random() * 6) + 1,
      Math.floor(Math.random() * 6) + 1,
      Math.floor(Math.random() * 6) + 1
    ];
    rolls.sort((a, b) => a - b);
    return rolls[1] + rolls[2] + rolls[3]; // Drop the lowest
  }

  get activeKeptNPC(): KeptNPC | undefined {
    return this.keptNPCs.find(n => n.id === this.activeKeptNPCId);
  }
}
