import { TestBed } from '@angular/core/testing';

import { Openf1ServiceService } from './openf1-service';

describe('Openf1ServiceService', () => {
  let service: Openf1ServiceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Openf1ServiceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
