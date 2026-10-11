import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { GranPremiComponent } from './gran-premi.component';

describe('GranPremiComponent', () => {
  let component: GranPremiComponent;
  let fixture: ComponentFixture<GranPremiComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GranPremiComponent, NoopAnimationsModule],
      // router e HTTP finti: i componenti li usano, ma nei test non devono chiamare l'API vera
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();

    fixture = TestBed.createComponent(GranPremiComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
