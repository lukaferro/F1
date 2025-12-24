import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { Circuit } from '../../models/circuit';
import { CircuitsService } from '../../services/circuits.service';

@Component({
  selector: 'app-circuits',
  imports: [CommonModule, CardModule, ButtonModule, TagModule],
  templateUrl: './circuits.component.html',
  styleUrl: './circuits.component.css'
})
export class CircuitsComponent implements OnInit {
  circuits: Circuit[] = [];
  expandedCircuits: Set<string> = new Set();

  constructor(private circuitsService: CircuitsService) {}

  ngOnInit(): void {
    this.circuits = this.circuitsService.getCircuits();
  }

  toggleExpand(circuitId: string): void {
    if (this.expandedCircuits.has(circuitId)) {
      this.expandedCircuits.delete(circuitId);
    } else {
      this.expandedCircuits.add(circuitId);
    }
  }

  isExpanded(circuitId: string): boolean {
    return this.expandedCircuits.has(circuitId);
  }
}
