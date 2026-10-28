import { describe, expect, it, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StandingsSimulatorComponent } from './standings-simulator.component';
import { JolpicaService, DriverStanding, ConstructorStanding } from '../../../services/jolpica.service';

describe('StandingsSimulatorComponent', () => {
  let component: StandingsSimulatorComponent;
  let fixture: ComponentFixture<StandingsSimulatorComponent>;
  let jolpicaMock: any;

  beforeEach(async () => {
    jolpicaMock = {
      getSeasonSchedule: vi.fn().mockResolvedValue([
        {
          season: 2024,
          round: 23,
          raceName: 'Qatar Grand Prix',
          circuitId: 'losail',
          circuitName: 'Losail International Circuit',
          locality: 'Lusail',
          country: 'Qatar',
          date: '2024-12-01',
          hasSprint: true
        },
        {
          season: 2024,
          round: 24,
          raceName: 'Abu Dhabi Grand Prix',
          circuitId: 'yas_marina',
          circuitName: 'Yas Marina Circuit',
          locality: 'Abu Dhabi',
          country: 'UAE',
          date: '2024-12-08',
          hasSprint: false
        }
      ])
    };

    await TestBed.configureTestingModule({
      imports: [StandingsSimulatorComponent],
      providers: [
        { provide: JolpicaService, useValue: jolpicaMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(StandingsSimulatorComponent);
    component = fixture.componentInstance;
    component.season = 2024;
    component.driverStandings = [
      {
        position: 1,
        points: 300,
        wins: 7,
        driverId: 'verstappen',
        code: 'VER',
        fullName: 'Max Verstappen',
        nationality: 'Dutch',
        constructorId: 'red_bull',
        constructorName: 'Red Bull Racing',
        constructors: [{ id: 'red_bull', name: 'Red Bull Racing' }]
      },
      {
        position: 2,
        points: 260,
        wins: 3,
        driverId: 'norris',
        code: 'NOR',
        fullName: 'Lando Norris',
        nationality: 'British',
        constructorId: 'mclaren',
        constructorName: 'McLaren',
        constructors: [{ id: 'mclaren', name: 'McLaren' }]
      }
    ];
    component.constructorStandings = [
      { position: 1, points: 550, wins: 7, constructorId: 'mclaren', name: 'McLaren', nationality: 'British' },
      { position: 2, points: 530, wins: 5, constructorId: 'ferrari', name: 'Ferrari', nationality: 'Italian' }
    ];
  });

  it('initializes schedule and computes initial simulation', async () => {
    await component.loadSchedule();
    expect(jolpicaMock.getSeasonSchedule).toHaveBeenCalledWith(2024);
    expect(component.rounds.length).toBe(2);
    expect(component.simulationResult).not.toBeNull();
    expect(component.simulationResult?.standings[0].id).toBe('verstappen');
  });

  it('switches between drivers and constructors mode', async () => {
    await component.loadSchedule();
    component.setMode('constructors');
    expect(component.mode).toBe('constructors');
    expect(component.simulationResult?.mode).toBe('constructors');
    expect(component.simulationResult?.standings[0].id).toBe('mclaren');
  });

  it('presets all remaining wins to leader', async () => {
    await component.loadSchedule();
    component.presetAllWinsToLeader();
    const leader = component.simulationResult?.standings[0];
    expect(leader?.id).toBe('verstappen');
    expect(leader?.simulatedPoints).toBeGreaterThan(0);
  });

  it('resets simulation results', async () => {
    await component.loadSchedule();
    component.presetAllWinsToLeader();
    component.resetSimulation();
    const leader = component.simulationResult?.standings[0];
    expect(leader?.simulatedPoints).toBe(0);
    expect(leader?.totalPoints).toBe(300);
  });
});
