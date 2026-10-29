import '@angular/compiler';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { Injector, runInInjectionContext } from '@angular/core';
import { StandingsSimulatorComponent } from './standings-simulator.component';
import { JolpicaService } from '../../../services/jolpica.service';

describe('StandingsSimulatorComponent', () => {
  let component: StandingsSimulatorComponent;
  let jolpicaMock: any;

  beforeEach(() => {
    jolpicaMock = {
      getSeasonSchedule: vi.fn().mockResolvedValue([
        {
          season: 2024,
          round: 1,
          raceName: 'Bahrain Grand Prix',
          circuitId: 'bahrain',
          circuitName: 'Bahrain International Circuit',
          locality: 'Sakhir',
          country: 'Bahrain',
          date: '2024-03-02',
          hasSprint: false
        },
        {
          season: 2024,
          round: 2,
          raceName: 'Saudi Arabian Grand Prix',
          circuitId: 'jeddah',
          circuitName: 'Jeddah Corniche Circuit',
          locality: 'Jeddah',
          country: 'Saudi Arabia',
          date: '2024-03-09',
          hasSprint: false
        }
      ])
    };

    const injector = Injector.create({
      providers: [{ provide: JolpicaService, useValue: jolpicaMock }]
    });

    runInInjectionContext(injector, () => {
      component = new StandingsSimulatorComponent();
    });

    component.season = 2024;
    component.driverStandings = [
      {
        position: 1,
        points: 50,
        wins: 2,
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
        points: 36,
        wins: 0,
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
      { position: 1, points: 86, wins: 2, constructorId: 'red_bull', name: 'Red Bull Racing', nationality: 'Austrian' },
      { position: 2, points: 60, wins: 0, constructorId: 'mclaren', name: 'McLaren', nationality: 'British' }
    ];
    component.seasonRounds = [
      {
        round: 1,
        raceName: 'Bahrain Grand Prix',
        locality: 'Sakhir',
        driverPoints: { verstappen: 25, norris: 18 },
        constructorPoints: { red_bull: 25, mclaren: 18 },
        raceOrder: ['verstappen', 'norris'],
        constructorRaceOrder: ['red_bull', 'mclaren']
      },
      {
        round: 2,
        raceName: 'Saudi Arabian Grand Prix',
        locality: 'Jeddah',
        driverPoints: { verstappen: 25, norris: 18 },
        constructorPoints: { red_bull: 25, mclaren: 18 },
        raceOrder: ['verstappen', 'norris'],
        constructorRaceOrder: ['red_bull', 'mclaren']
      }
    ];
  });

  it('initializes all rounds of the season with real race orders and builds comparison chart', async () => {
    await component.loadSchedule();
    expect(jolpicaMock.getSeasonSchedule).toHaveBeenCalledWith(2024);
    expect(component.rounds.length).toBe(2);
    expect(component.rounds[0].isCompleted).toBe(true);
    expect(component.getRacePosition(component.rounds[0], 0)).toBe('verstappen');
    expect(component.getRacePosition(component.rounds[0], 1)).toBe('norris');
    expect(component.comparisonChart).not.toBeNull();
  });

  it('allows editing a completed round and automatically swaps positions (Smart Swap)', async () => {
    await component.loadSchedule();
    const round1 = component.rounds[0];

    // Mettiamo Norris al 1° posto in gara 1 -> Verstappen scivola automaticamente al 2° posto
    component.setRacePosition(round1, 0, 'norris');

    expect(round1.isModified).toBe(true);
    expect(component.getRacePosition(round1, 0)).toBe('norris');
    expect(component.getRacePosition(round1, 1)).toBe('verstappen');

    // In gara 1 Norris guadagna +7 pt (da 18 a 25) -> 43 pt, Verstappen perde -7 pt (da 25 a 18) -> 43 pt
    const norris = component.simulationResult?.standings.find(s => s.id === 'norris');
    const verstappen = component.simulationResult?.standings.find(s => s.id === 'verstappen');
    expect(norris?.totalPoints).toBe(43);
    expect(verstappen?.totalPoints).toBe(43);
  });

  it('switches between drivers and constructors mode and re-syncs real race orders', async () => {
    await component.loadSchedule();
    component.setMode('constructors');
    expect(component.mode).toBe('constructors');
    expect(component.simulationResult?.mode).toBe('constructors');
    expect(component.getRacePosition(component.rounds[0], 0)).toBe('red_bull');
  });

  it('applies chaser comeback scenario and resets back to official reality', async () => {
    await component.loadSchedule();
    component.presetAllWinsToSecond();
    expect(component.modifiedRoundsCount).toBeGreaterThan(0);

    component.resetSimulation();
    expect(component.modifiedRoundsCount).toBe(0);
    expect(component.simulationResult?.standings[0].id).toBe('verstappen');
    expect(component.simulationResult?.standings[0].totalPoints).toBe(50);
  });
});
