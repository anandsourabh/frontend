// src/app/components/query-history/query-history.component.ts
import { Component, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { ChatService } from '../../services/chat.service';
import { ApiService } from '../../services/api.service';
import { QueryHistory } from '../../models/message.model';

@Component({
  selector: 'app-query-history',
  template: `
    <div class="history-container">
      <div class="history-tabs">
        <button 
          mat-button 
          [class.active]="activeTab === 'all'"
          (click)="setActiveTab('all')">
          Recent ({{Math.min(allQueriesCount, 20)}})
        </button>
        <button 
          mat-button 
          [class.active]="activeTab === 'bookmarked'"
          (click)="setActiveTab('bookmarked')">
          Bookmarked ({{bookmarkedCount}})
        </button>
        <button 
          mat-button 
          [class.active]="activeTab === 'suggestions'"
          (click)="setActiveTab('suggestions')">
          Suggestions
        </button>
      </div>
      
      <div class="search-box" *ngIf="activeTab !== 'suggestions' && queryHistory.length > 5">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Search queries...</mat-label>
          <input matInput [(ngModel)]="searchQuery" (input)="filterHistory()">
          <mat-icon matSuffix>search</mat-icon>
        </mat-form-field>
      </div>
      
      <div class="history-list">
        <!-- Query History -->
        <mat-list *ngIf="activeTab !== 'suggestions'">
          <mat-list-item 
            *ngFor="let query of filteredHistory; trackBy: trackByQuery"
            class="history-item"
            (click)="selectQuery(query.query)">
            <div class="query-content">
              <div class="query-text" [title]="query.query">{{query.query}}</div>
              <div class="query-meta">
                <span class="timestamp">{{query.timestamp | date:'short'}}</span>
                <div class="actions">
                  <button 
                    mat-icon-button 
                    (click)="toggleBookmark(query); $event.stopPropagation()"
                    [class.bookmarked]="query.isBookmarked"
                    [matTooltip]="query.isBookmarked ? 'Remove bookmark' : 'Add bookmark'">
                    <mat-icon>{{query.isBookmarked ? 'bookmark' : 'bookmark_border'}}</mat-icon>
                  </button>
                </div>
              </div>
            </div>
          </mat-list-item>
        </mat-list>
        
        <!-- Suggestions -->
        <mat-list *ngIf="activeTab === 'suggestions'">
          <mat-list-item 
            *ngFor="let suggestion of suggestions"
            class="history-item suggestion-item"
            (click)="selectQuery(suggestion)">
            <div class="query-content">
              <div class="query-text">{{suggestion}}</div>
            </div>
          </mat-list-item>
        </mat-list>
        
        <div *ngIf="filteredHistory.length === 0 && activeTab !== 'suggestions'" class="empty-state">
          <mat-icon>{{activeTab === 'bookmarked' ? 'bookmark_border' : 'history'}}</mat-icon>
          <p>{{getEmptyStateMessage()}}</p>
        </div>
        
        <div *ngIf="suggestions.length === 0 && activeTab === 'suggestions'" class="empty-state">
          <mat-icon>lightbulb</mat-icon>
          <p>No suggestions available</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
  .history-container {
    height: 100%;
    display: flex;
    flex-direction: column;
    background-color: white;
    color: #333;
  }
  
  .history-tabs {
    display: flex;
    padding: 16px 16px 0 16px;
    border-bottom: 1px solid #e0e0e0;
  }
  
  .history-tabs button {
    color: #666;
    border-bottom: 2px solid transparent;
    font-size: 12px;
    font-weight: 500;
    margin-right: 8px;
    border-radius: 0 !important; /* Remove button border radius */
    background: none !important; /* Remove button background */
    box-shadow: none !important; /* Remove button shadow */
  }
  
  .history-tabs button.active {
    color: #2640e8;
    border-bottom: 2px solid #2640e8; /* Straight line instead of curved */
  }
  
  /* Override Angular Material button styles */
  .history-tabs button:hover {
    background: rgba(38, 64, 232, 0.05) !important;
  }
  
  .search-box {
    padding: 16px;
  }
  
  .history-list {
    flex: 1;
    overflow-y: auto;
    padding: 0 16px 16px 16px;
  }
  
  .history-item {
    background-color: #f8f9fa;
    margin-bottom: 8px;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
    min-height: 60px !important;
    border: 1px solid #e9ecef;
  }
  
  .history-item:hover {
    background-color: #e3f2fd;
    border-color: #2640e8;
  }
  
  .suggestion-item {
    background-color: #f0f8ff;
    border-color: #b3d9ff;
  }
  
  .suggestion-item:hover {
    background-color: #e0f2ff;
  }
  
  .query-content {
    width: 100%;
    padding: 12px 16px;
  }
  
  .query-text {
    font-size: 14px;
    margin-bottom: 8px;
    line-height: 1.4;
    color: #333;
    font-weight: 400;
    
    /* Ellipsis for long text */
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 100%;
  }
  
  .query-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .timestamp {
    font-size: 12px;
    color: #666;
    font-weight: 400;
  }
  
  .actions {
    display: flex;
    gap: 4px;
  }
  
  .actions button {
    color: #666;
    width: 28px;
    height: 28px;
  }
  
  .bookmarked {
    color: #ffc107 !important;
  }
  
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 32px;
    color: #666;
    text-align: center;
  }
  
  .empty-state mat-icon {
    font-size: 48px;
    width: 48px;
    height: 48px;
    margin-bottom: 16px;
    color: #ccc;
  }
  
  .full-width {
    width: 100%;
  }
  
  ::ng-deep .mat-mdc-list-item .mdc-list-item__content {
    padding: 0 !important;
  }
  
  ::ng-deep .mat-mdc-list-item {
    height: auto !important;
    min-height: auto !important;
  }
`]
})
export class QueryHistoryComponent implements OnInit, OnDestroy {
  @Output() querySelected = new EventEmitter<string>();
  
  queryHistory: QueryHistory[] = [];
  filteredHistory: QueryHistory[] = [];
  suggestions: string[] = [];
  activeTab: 'all' | 'bookmarked' | 'suggestions' = 'all';
  searchQuery = '';
  Math = Math; // Expose Math to template
  
  private destroy$ = new Subject<void>();

  constructor(
    private chatService: ChatService,
    private apiService: ApiService
  ) {}

  ngOnInit(): void {
    this.chatService.queryHistory$
      .pipe(takeUntil(this.destroy$))
      .subscribe(history => {
        this.queryHistory = history.slice(0, 20); // Limit to last 20
        this.filterHistory();
      });
      
    this.loadSuggestions();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadSuggestions(): void {
    // Sample suggestions - you can customize these
    this.suggestions = [
      "What is the total insured value by state?",
      "Show me properties with high earthquake risk",
      "List all buildings built after 2000",
      "Properties in flood zones",
      "Average TIV by construction type",
      "Buildings without sprinkler systems",
      "Revenue distribution by business unit",
      "Properties with basement flood risk",
      "Construction quality analysis by region",
      "Show locations on map"
    ];
  }

  trackByQuery(index: number, query: QueryHistory): string {
    return query.id;
  }

  setActiveTab(tab: 'all' | 'bookmarked' | 'suggestions'): void {
    this.activeTab = tab;
    this.filterHistory();
  }

  toggleBookmark(query: QueryHistory): void {
    this.chatService.toggleBookmark(query.id);
  }

  selectQuery(queryText: string): void {
    this.querySelected.emit(queryText);
  }

  filterHistory(): void {
    if (this.activeTab === 'suggestions') return;
    
    let filtered = this.queryHistory;
    
    if (this.activeTab === 'bookmarked') {
      filtered = filtered.filter(q => q.isBookmarked);
    }
    
    if (this.searchQuery.trim()) {
      const searchTerm = this.searchQuery.toLowerCase();
      filtered = filtered.filter(q => 
        q.query.toLowerCase().includes(searchTerm)
      );
    }
    
    this.filteredHistory = filtered;
  }

  get allQueriesCount(): number {
    return this.queryHistory.length;
  }

  get bookmarkedCount(): number {
    return this.queryHistory.filter(q => q.isBookmarked).length;
  }

  getEmptyStateMessage(): string {
    if (this.activeTab === 'bookmarked') {
      return 'No bookmarked queries yet';
    }
    if (this.searchQuery.trim()) {
      return 'No queries match your search';
    }
    return 'No queries found';
  }

  refreshHistory(): void {
  this.chatService.refreshHistory();
}
}