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
    component.isCurrentSeason = false;
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

  it('initializes all rounds of a past season as completed even before seasonRounds arrives', async () => {
    component.seasonRounds = [];
    await component.loadSchedule();
    expect(component.rounds.length).toBe(2);
    expect(component.rounds.every(r => r.isCompleted)).toBe(true);
  });

  it('allows editing a completed round and automatically swaps positions (Smart Swap)', async () => {
    await component.loadSchedule();
    const round1 = component.rounds[0];

    component.setRacePosition(round1, 0, 'norris');

    expect(round1.isModified).toBe(true);
    expect(component.getRacePosition(round1, 0)).toBe('norris');
    expect(component.getRacePosition(round1, 1)).toBe('verstappen');

    const norris = component.simulationResult?.standings.find(s => s.id === 'norris');
    const verstappen = component.simulationResult?.standings.find(s => s.id === 'verstappen');
    expect(norris?.totalPoints).toBe(43);
    expect(verstappen?.totalPoints).toBe(43);
  });

  it('applies chaser comeback across all target races and flips championship', async () => {
    await component.loadSchedule();
    component.presetAllWinsToSecond();

    expect(component.modifiedRoundsCount).toBe(2);
    expect(component.simulationResult?.standings[0].id).toBe('norris');
    expect(component.simulationResult?.isHistoryRewritten).toBe(true);
  });

  it('applies leader DNF across all target races (not just one race)', async () => {
    await component.loadSchedule();
    component.presetLeaderDnf();

    expect(component.modifiedRoundsCount).toBe(2);
    expect(component.rounds[0].dnfContenderIds).toContain('verstappen');
    expect(component.rounds[1].dnfContenderIds).toContain('verstappen');
    const verstappen = component.simulationResult?.standings.find(s => s.id === 'verstappen');
    expect(verstappen?.totalPoints).toBe(0);
  });
});
