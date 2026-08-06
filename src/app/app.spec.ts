import { TestBed } from '@angular/core/testing';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render title', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Tabletop');
  });

  it('renders the main menu as a visible block below the header', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const menu = compiled.querySelector('main-menu-button-bar') as HTMLElement;

    expect(menu.previousElementSibling?.matches('header.site-header')).toBeTrue();
    expect(getComputedStyle(menu).display).toBe('block');
    expect(getComputedStyle(menu).zIndex).toBe('9');
  });
});
