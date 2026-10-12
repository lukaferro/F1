import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WikipediaBioComponent } from './wikipedia-bio.component';
import { WikipediaBio, WikipediaService } from '../../services/wikipedia.service';

const SENNA: WikipediaBio = { extract: 'Ayrton Senna da Silva è stato un pilota.', url: 'https://it.wikipedia.org/wiki/Ayrton_Senna' };

@Component({
  standalone: true,
  imports: [WikipediaBioComponent],
  template: `<app-wikipedia-bio [title]="title" [name]="name" [waiting]="waiting"><p class="intro">Introduzione</p></app-wikipedia-bio>`
})
class HostComponent {
  title?: string = 'Ayrton_Senna';
  name = 'Ayrton Senna';
  waiting = false;
}

describe('WikipediaBioComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let getBio: ReturnType<typeof vi.fn>;

  const settle = async () => {
    for (let i = 0; i < 3; i++) {
      await new Promise(resolve => setTimeout(resolve));
      fixture.detectChanges();
    }
  };
  const el = () => fixture.nativeElement as HTMLElement;

  const create = async (bio: (options: { title?: string; name: string }) => Promise<WikipediaBio | null>, host: Partial<HostComponent> = {}) => {
    getBio = vi.fn(bio);
    await TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [{ provide: WikipediaService, useValue: { getBio } }]
    }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    Object.assign(fixture.componentInstance, host);
    fixture.detectChanges();
    await settle();
  };

  it('shows the bio text and link', async () => {
    await create(() => Promise.resolve(SENNA));

    expect(getBio).toHaveBeenCalledWith({ title: 'Ayrton_Senna', name: 'Ayrton Senna' });
    expect(el().querySelector('.wiki-content p')?.textContent).toContain('Ayrton Senna da Silva');
    expect(el().querySelector('.wiki-link')?.getAttribute('href')).toBe(SENNA.url);
  });

  it('shows the skeleton while waiting and makes no request', async () => {
    await create(() => Promise.resolve(SENNA), { waiting: true });

    expect(getBio).not.toHaveBeenCalled();
    expect(el().querySelectorAll('.skeleton-line').length).toBe(5);
  });

  it('shows the missing-bio message', async () => {
    await create(() => Promise.resolve(null));

    expect(el().textContent).toContain('Dati biografici non ancora disponibili. Questo pilota potrebbe essere nuovo in F1 o i dati non sono ancora su Wikipedia.');
  });

  it('ignores a bio that arrives after the inputs changed', async () => {
    let releaseFirst!: (bio: WikipediaBio) => void;
    await create(options => options.title === 'Ayrton_Senna'
      ? new Promise(resolve => { releaseFirst = resolve; })
      : Promise.resolve({ extract: 'Alain Prost è un ex pilota.', url: 'https://it.wikipedia.org/wiki/Alain_Prost' }));

    fixture.componentInstance.title = 'Alain_Prost';
    fixture.componentInstance.name = 'Alain Prost';
    fixture.detectChanges();
    await settle();
    releaseFirst(SENNA);
    await settle();

    expect(el().querySelector('.wiki-content p')?.textContent).toContain('Alain Prost');
  });

  it('projects the intro above the bio', async () => {
    await create(() => Promise.resolve(SENNA));

    expect(el().querySelector('.intro')?.textContent).toBe('Introduzione');
  });
});
