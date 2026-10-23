import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { Openf1ServiceService } from './openf1-service';

const API = 'https://api.openf1.org/v1';

// le richieste partono dopo un passaggio asincrono (la coda che rispetta i limiti dell'API)
const nextTick = () => new Promise(resolve => setTimeout(resolve));

describe('Openf1ServiceService', () => {
  let service: Openf1ServiceService;
  let http: HttpTestingController;

  beforeEach(() => {
    // la cache del service vive nel localStorage: ogni test parte pulito
    Object.keys(localStorage).filter(k => k.startsWith('openf1:')).forEach(k => localStorage.removeItem(k));

    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(Openf1ServiceService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('copies the API team_colour into team_color', async () => {
    const promise = service.getLatestDrivers();
    await nextTick();
    http.expectOne(`${API}/drivers?session_key=latest`).flush([{ driver_number: 1, team_colour: 'F47600' }]);
    const [driver] = await promise;
    expect(driver.team_color).toBe('F47600');
  });

  it('uses the /pit endpoint and returns an empty list when the API has no data (404)', async () => {
    const promise = service.getPits(123);
    await nextTick();
    http.expectOne(`${API}/pit?session_key=123`).flush({ detail: 'No results found.' }, { status: 404, statusText: 'Not Found' });
    expect(await promise).toEqual([]);
    expect(service.apiStatus()).toBe('ok'); // un 404 non è un problema di connessione
  });

  it('answers repeated requests from the cache without calling the API again', async () => {
    const first = service.getWeather(456);
    await nextTick();
    http.expectOne(`${API}/weather?session_key=456`).flush([{ air_temperature: 20 }]);
    await first;

    const second = await service.getWeather(456);
    http.expectNone(`${API}/weather?session_key=456`);
    expect(second.length).toBe(1);
  });

  it('shares one request between callers asking for the same URL at the same time', async () => {
    const a = service.getStints(789);
    const b = service.getStints(789);
    await nextTick();
    http.expectOne(`${API}/stints?session_key=789`).flush([{ stint_number: 1 }]);
    expect(await a).toEqual(await b);
  });

  it('fetches race control messages via /race_control endpoint', async () => {
    const promise = service.getRaceControl(9001);
    await nextTick();
    http.expectOne(`${API}/race_control?session_key=9001`).flush([
      { meeting_key: 1201, session_key: 9001, category: 'Flag', flag: 'RED', message: 'RED FLAG' }
    ]);
    const res = await promise;
    expect(res.length).toBe(1);
    expect(res[0].flag).toBe('RED');
  });
});
