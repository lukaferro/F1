import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { BehaviorSubject } from 'rxjs';

import { HistoricDriverDetailComponent } from './historic-driver-detail.component';
import { DriverStanding, JolpicaDriverInfo, JolpicaService } from '../../services/jolpica.service';
import { WikipediaService } from '../../services/wikipedia.service';
import { ApiStatus } from '../../services/http-cache';
import { constructorColor } from '../../utils/constructor-branding';
import { routes } from '../../app.routes';

const SENNA: JolpicaDriverInfo = {
  driverId: 'senna', givenName: 'Ayrton', familyName: 'Senna', fullName: 'Ayrton Senna',
  dateOfBirth: '1960-03-21', nationality: 'Brazilian', wikiTitle: 'Ayrton_Senna'
};
const williams: DriverStanding = {
  position: 1, points: 0, wins: 0, driverId: 'senna', fullName: 'Ayrton Senna', nationality: 'Brazilian',
  constructorId: 'williams', constructorName: 'Williams', constructors: [{ id: 'williams', name: 'Williams' }]
};

interface Setup {
  driver?: () => Promise<JolpicaDriverInfo | null>;
  images?: Map<string, string>;
}

describe('HistoricDriverDetailComponent', () => {
  let fixture: ComponentFixture<HistoricDriverDetailComponent>;
  let jolpica: Record<string, any>;
  let wikipedia: Record<string, any>;

  const services = (setup: Setup) => {
    jolpica = {
      apiStatus: signal<ApiStatus>('ok'),
      getDriver: vi.fn(setup.driver ?? (() => Promise.resolve(SENNA))),
      getDriverSeasons: vi.fn(() => Promise.resolve([1994, 1993, 1984])),
      getDriverStandings: vi.fn(() => Promise.resolve([williams])),
      // la sezione carriera resta in caricamento: qui interessa la pagina
      findDriver: vi.fn(() => new Promise(() => {})),
      getCareerTotals: vi.fn(() => new Promise(() => {})),
      getStandingsRound: vi.fn(() => Promise.resolve(0)),
      getSeasonRaceCount: vi.fn(() => Promise.resolve(0))
    };
    wikipedia = {
      getImages: vi.fn(() => Promise.resolve(setup.images ?? new Map([['Ayrton_Senna', 'https://img/senna.jpg']]))),
      getBio: vi.fn(() => new Promise(() => {}))
    };
    return [
      { provide: JolpicaService, useValue: jolpica },
      { provide: WikipediaService, useValue: wikipedia }
    ];
  };

  const settle = async () => {
    for (let i = 0; i < 5; i++) {
      await new Promise(resolve => setTimeout(resolve));
      fixture.detectChanges();
    }
  };

  const create = async (setup: Setup = {}) => {
    await TestBed.configureTestingModule({
      imports: [HistoricDriverDetailComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        ...services(setup),
        { provide: ActivatedRoute, useValue: { paramMap: new BehaviorSubject(convertToParamMap({ driverId: 'senna' })) } }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(HistoricDriverDetailComponent);
    fixture.detectChanges();
    await settle();
  };

  const el = () => fixture.nativeElement as HTMLElement;
  const text = () => el().textContent?.replace(/\s+/g, ' ') ?? '';
  const child = (name: string) => fixture.debugElement.query(d => d.name === name)?.componentInstance;

  it('shows the historic driver', async () => {
    await create();

    expect(el().querySelector('h1')?.textContent).toContain('Ayrton Senna');
    expect(el().querySelector('.country-flag')?.getAttribute('src')).toBe('https://flagcdn.com/w320/br.png');
    expect(el().querySelector('.portrait')?.getAttribute('src')).toBe('https://img/senna.jpg');
    expect(text()).toContain('21 marzo 1960');
    expect(text()).toContain('1984–1994');
    expect(text()).toContain('Williams');
    expect(el().querySelector('.number-badge')).toBeNull();
    expect(child('app-driver-career').driverId).toBe('senna');
    expect(child('app-wikipedia-bio').title).toBe('Ayrton_Senna');
  });

  it('shows initials when there is no photo', async () => {
    await create({ images: new Map() });

    const initials = el().querySelector('.portrait-initials') as HTMLElement;
    expect(initials.textContent?.trim()).toBe('AS');
    expect(initials.style.background).toContain(hexToRgb(constructorColor('williams')));
  });

  it('handles a driver without wikipedia page and nationality', async () => {
    await create({ driver: () => Promise.resolve({ ...SENNA, wikiTitle: undefined, nationality: undefined }) });

    expect(el().querySelector('.country-flag')).toBeNull();
    expect(child('app-wikipedia-bio').title).toBeUndefined();
    expect(child('app-wikipedia-bio').name).toBe('Ayrton Senna');
  });

  it('shows the number of drivers who have a permanent one', async () => {
    await create({ driver: () => Promise.resolve({ ...SENNA, permanentNumber: 44 }) });

    expect(el().querySelector('.number-badge')?.textContent).toContain('#44');
  });

  it('shows not found for an unknown driver', async () => {
    await create({ driver: () => Promise.resolve(null) });

    expect(text()).toContain('Pilota non trovato');
    expect(text()).toContain('Torna ai Piloti');
  });

  it('shows the Jolpica notice when the archive does not answer', async () => {
    let fail = true;
    await create({ driver: () => fail ? Promise.reject(new Error('down')) : Promise.resolve(SENNA) });
    expect(el().querySelector('app-api-unavailable')).toBeTruthy();

    fail = false;
    fixture.debugElement.query(d => d.name === 'app-api-unavailable').componentInstance.retry.emit();
    await settle();
    expect(el().querySelector('h1')?.textContent).toContain('Ayrton Senna');
  });

  it('routes three-letter driver ids to the historic page', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter(routes), ...services({})] });
    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl('/drivers/storico/ide');

    expect(page).toBeInstanceOf(HistoricDriverDetailComponent);
    expect(jolpica['getDriver']).toHaveBeenCalledWith('ide');
  });
});

function hexToRgb(hex: string): string {
  const n = parseInt(hex, 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
}
