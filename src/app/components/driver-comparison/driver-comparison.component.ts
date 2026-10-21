import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SelectModule } from 'primeng/select';
import { JolpicaService, JolpicaDriverInfo, CareerTotals } from '../../services/jolpica.service';
import { WikipediaService } from '../../services/wikipedia.service';
import { flagUrl } from '../../utils/country-flags';
import { nationalityToCountryCode } from '../../utils/nationality';

export interface RivalryPreset {
  label: string;
  subtitle: string;
  leftId: string;
  rightId: string;
}

export interface ComparedDriver {
  info: JolpicaDriverInfo;
  totals: CareerTotals;
  championships: number;
  championshipYears: number[];
  winRate: number;
  photo?: string;
  flag?: string;
  initials: string;
}

export interface ComparisonMetric {
  key: string;
  label: string;
  icon: string;
  leftValue: number;
  rightValue: number;
  leftDisplay: string;
  rightDisplay: string;
  leftShare: number;
  rightShare: number;
  winner: 'left' | 'right' | 'tie';
}

export const WORLD_CHAMPIONSHIPS_BY_DRIVER: Record<string, number[]> = {
  michael_schumacher: [1994, 1995, 2000, 2001, 2002, 2003, 2004],
  hamilton: [2008, 2014, 2015, 2017, 2018, 2019, 2020],
  fangio: [1951, 1954, 1955, 1956, 1957],
  prost: [1985, 1986, 1989, 1993],
  vettel: [2010, 2011, 2012, 2013],
  max_verstappen: [2021, 2022, 2023, 2024],
  brabham: [1959, 1960, 1966],
  stewart: [1969, 1971, 1973],
  lauda: [1975, 1977, 1984],
  piquet: [1981, 1983, 1987],
  senna: [1988, 1990, 1991],
  ascari: [1952, 1953],
  hill: [1962, 1968],
  graham_hill: [1962, 1968],
  clark: [1963, 1965],
  fittipaldi: [1972, 1974],
  hakkinen: [1998, 1999],
  alonso: [2005, 2006],
  farina: [1950],
  hawthorn: [1958],
  phil_hill: [1961],
  surtees: [1964],
  hulme: [1967],
  rindt: [1970],
  hunt: [1976],
  mario_andretti: [1978],
  scheckter: [1979],
  jones: [1980],
  keke_rosberg: [1982],
  mansell: [1992],
  damon_hill: [1996],
  villeneuve: [1997],
  raikkonen: [2007],
  button: [2009],
  rosberg: [2016],
  norris: [2025]
};

const getInitials = (fullName: string): string => {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

@Component({
  selector: 'app-driver-comparison',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, SelectModule],
  templateUrl: './driver-comparison.component.html',
  styleUrls: ['./driver-comparison.component.css']
})
export class DriverComparisonComponent implements OnInit {
  private readonly jolpicaService = inject(JolpicaService);
  private readonly wikipediaService = inject(WikipediaService);

  readonly presets: RivalryPreset[] = [
    { label: 'Senna vs Prost', subtitle: 'Classico anni ’80-’90', leftId: 'senna', rightId: 'prost' },
    { label: 'Schumacher vs Hamilton', subtitle: 'I Re dei 7 Mondiali', leftId: 'michael_schumacher', rightId: 'hamilton' },
    { label: 'Verstappen vs Leclerc', subtitle: 'Duello generazione moderna', leftId: 'max_verstappen', rightId: 'leclerc' },
    { label: 'Alonso vs Vettel', subtitle: 'Rivali anni 2010', leftId: 'alonso', rightId: 'vettel' },
    { label: 'Lauda vs Hunt', subtitle: 'Sfida leggendaria ’76', leftId: 'lauda', rightId: 'hunt' }
  ];

  allDrivers: JolpicaDriverInfo[] = [];
  leftDriverId = 'max_verstappen';
  rightDriverId = 'leclerc';

  leftDriver?: ComparedDriver;
  rightDriver?: ComparedDriver;
  metrics: ComparisonMetric[] = [];

  loadingDrivers = false;
  loadingComparison = false;
  error?: string;

  private compareSeq = 0;

  async ngOnInit(): Promise<void> {
    await this.loadDriversCatalog();
    await this.loadComparison();
  }

  async loadDriversCatalog(): Promise<void> {
    this.loadingDrivers = true;
    try {
      const list = await this.jolpicaService.getAllDrivers();
      this.allDrivers = [...list].sort((a, b) =>
        (a.familyName || '').localeCompare(b.familyName || '', 'it') ||
        (a.givenName || '').localeCompare(b.givenName || '', 'it')
      );
    } catch {
      this.allDrivers = [];
    } finally {
      this.loadingDrivers = false;
    }
  }

  async selectPreset(preset: RivalryPreset): Promise<void> {
    this.leftDriverId = preset.leftId;
    this.rightDriverId = preset.rightId;
    await this.loadComparison();
  }

  isPresetActive(preset: RivalryPreset): boolean {
    return (
      (this.leftDriverId === preset.leftId && this.rightDriverId === preset.rightId) ||
      (this.leftDriverId === preset.rightId && this.rightDriverId === preset.leftId)
    );
  }

  async swapDrivers(): Promise<void> {
    const tmpId = this.leftDriverId;
    this.leftDriverId = this.rightDriverId;
    this.rightDriverId = tmpId;
    await this.loadComparison();
  }

  async onDriverChange(): Promise<void> {
    await this.loadComparison();
  }

  async loadComparison(): Promise<void> {
    if (!this.leftDriverId || !this.rightDriverId) return;
    const seq = ++this.compareSeq;
    this.loadingComparison = true;
    this.error = undefined;

    try {
      const [leftProfile, rightProfile] = await Promise.all([
        this.buildComparedDriver(this.leftDriverId),
        this.buildComparedDriver(this.rightDriverId)
      ]);
      if (seq !== this.compareSeq) return;

      this.leftDriver = leftProfile;
      this.rightDriver = rightProfile;
      this.metrics = this.computeMetrics(leftProfile, rightProfile);
    } catch (err: any) {
      if (seq !== this.compareSeq) return;
      this.error = err?.message || 'Impossibile caricare il confronto tra i piloti selezionati.';
    } finally {
      if (seq === this.compareSeq) {
        this.loadingComparison = false;
      }
    }
  }

  private async buildComparedDriver(driverId: string): Promise<ComparedDriver> {
    const cachedInfo = this.allDrivers.find(d => d.driverId === driverId);
    const [info, totals] = await Promise.all([
      cachedInfo ? Promise.resolve(cachedInfo) : this.jolpicaService.getDriver(driverId),
      this.jolpicaService.getCareerTotals(driverId)
    ]);

    if (!info) {
      throw new Error(`Pilota non trovato: ${driverId}`);
    }

    let photo: string | undefined;
    if (info.wikiTitle) {
      const imgMap = await this.wikipediaService.getImages([info.wikiTitle]).catch(() => new Map<string, string>());
      photo = imgMap.get(info.wikiTitle);
    }

    const championshipYears = WORLD_CHAMPIONSHIPS_BY_DRIVER[driverId] ?? [];
    const championships = championshipYears.length;
    const winRate = totals.races > 0 ? Number(((totals.wins / totals.races) * 100).toFixed(1)) : 0;
    const countryCode = info.nationality ? nationalityToCountryCode(info.nationality) : undefined;

    return {
      info,
      totals,
      championships,
      championshipYears,
      winRate,
      photo,
      flag: flagUrl(countryCode) || undefined,
      initials: getInitials(info.fullName)
    };
  }

  private computeMetrics(left: ComparedDriver, right: ComparedDriver): ComparisonMetric[] {
    const raw: Array<{
      key: string;
      label: string;
      icon: string;
      leftValue: number;
      rightValue: number;
      format?: (v: number) => string;
    }> = [
      {
        key: 'championships',
        label: 'Titoli Mondiali',
        icon: 'pi pi-trophy',
        leftValue: left.championships,
        rightValue: right.championships
      },
      {
        key: 'races',
        label: 'Gran Premi Disputati',
        icon: 'pi pi-flag-fill',
        leftValue: left.totals.races,
        rightValue: right.totals.races
      },
      {
        key: 'wins',
        label: 'Vittorie',
        icon: 'pi pi-star-fill',
        leftValue: left.totals.wins,
        rightValue: right.totals.wins
      },
      {
        key: 'winRate',
        label: '% Vittorie su GP',
        icon: 'pi pi-percentage',
        leftValue: left.winRate,
        rightValue: right.winRate,
        format: (v: number) => `${v.toFixed(1)}%`
      },
      {
        key: 'podiums',
        label: 'Podi Totali',
        icon: 'pi pi-chart-bar',
        leftValue: left.totals.podiums,
        rightValue: right.totals.podiums
      },
      {
        key: 'poles',
        label: 'Pole Position',
        icon: 'pi pi-bolt',
        leftValue: left.totals.poles,
        rightValue: right.totals.poles
      },
      {
        key: 'fastestLaps',
        label: 'Giri Veloci in Gara',
        icon: 'pi pi-stopwatch',
        leftValue: left.totals.fastestLaps,
        rightValue: right.totals.fastestLaps
      }
    ];

    return raw.map(item => {
      const sum = item.leftValue + item.rightValue;
      const leftShare = sum > 0 ? Math.round((item.leftValue / sum) * 100) : 50;
      const rightShare = 100 - leftShare;
      const fmt = item.format ?? ((v: number) => v.toString());

      let winner: 'left' | 'right' | 'tie' = 'tie';
      if (item.leftValue > item.rightValue) winner = 'left';
      else if (item.rightValue > item.leftValue) winner = 'right';

      return {
        key: item.key,
        label: item.label,
        icon: item.icon,
        leftValue: item.leftValue,
        rightValue: item.rightValue,
        leftDisplay: fmt(item.leftValue),
        rightDisplay: fmt(item.rightValue),
        leftShare,
        rightShare,
        winner
      };
    });
  }
}
