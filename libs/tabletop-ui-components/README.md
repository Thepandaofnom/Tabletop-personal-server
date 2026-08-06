# Tabletop UI Components Library

A standalone, reusable UI components library for the Tabletop application.

## Components

This library exports the following Angular standalone components:

- **DiceBagModal** - Dice rolling interface
- **GameMapComponent** - Game map visualization with Konva.js
- **CharacterSheetEditor** - Editable character sheets with JSON import and export
- **NPCMakerComponent** - Random NPC generator with JSON import and export
- **GlobalSettingsComponent** - Application display settings

## Installation

This is a monorepo workspace package. Install dependencies in the root:

```bash
npm install
```

## Usage

Import components from `@tabletop/ui-components`:

```typescript
import { DiceBagModal, GameMapComponent } from '@tabletop/ui-components';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [DiceBagModal, GameMapComponent],
  template: `
    <game-map-component></game-map-component>
  `
})
export class AppComponent {
  // ...
}
```

## Building

Build the library:

```bash
npm run build:lib
```

Build the entire project including the library:

```bash
npm run build
```

Watch mode for development:

```bash
npm run lib:dev
```

## Development

The library is structured as follows:

```
libs/tabletop-ui-components/
├── src/
│   ├── ui-components/          # Component folders
│   │   ├── dice-bag-modal/
│   │   ├── game-map-component/
│   │   ├── character-sheet-editor/
│   │   ├── npc-maker-component/
│   │   └── global-settings-component/
│   ├── public-api.ts           # Main barrel export
│   └── index.ts                # Entry point
├── tsconfig.json               # Library TypeScript config
├── package.json                # Library package config
└── README.md                   # This file
```

## Dependencies

Peer dependencies:
- `@angular/core` ^20.0.0
- `@angular/common` ^20.0.0
- `@angular/forms` ^20.0.0
- `primeng` ^20.0.0
- `rxjs` ^7.0.0
- `konva` ^10.0.0 (for GameMapComponent)
