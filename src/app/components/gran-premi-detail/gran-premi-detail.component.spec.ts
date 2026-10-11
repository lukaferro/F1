import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { GranPremiDetailComponent } from './gran-premi-detail.component';

describe('GranPremiDetailComponent', () => {
  let component: GranPremiDetailComponent;
  let fixture: ComponentFixture<GranPremiDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GranPremiDetailComponent],
      // router e HTTP finti: i componenti li usano, ma nei test non devono chiamare l'API vera
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GranPremiDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
