# Tabletop UI Components Library

A standalone, reusable UI components library for the Tabletop Personal Server application.

## Components

This library exports the following Angular standalone components:

- **LoginModal** - User login dialog
- **AccountModal** - User account management dialog  
- **DiceBagModal** - Dice rolling interface
- **GameMapModal** - Game map visualization with Konva.js
- **NewUserSignUp** - User registration dialog

## Installation

This is a monorepo workspace package. Install dependencies in the root:

```bash
npm install
```

## Usage

Import components from `@tabletop/ui-components`:

```typescript
import { LoginModal, GameMapModal } from '@tabletop/ui-components';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [LoginModal, GameMapModal],
  template: `
    <login-modal [visible]="loginVisible" (visibleChange)="onLoginChange($event)"></login-modal>
    <game-map-modal [visible]="mapVisible" (visibleChange)="onMapChange($event)"></game-map-modal>
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
│   │   ├── login-modal/
│   │   ├── account-modal/
│   │   ├── dice-bag-modal/
│   │   ├── game-map-modal/
│   │   └── new-user-sign-up/
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
- `konva` ^10.0.0 (for GameMapModal)
