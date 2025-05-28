import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Message } from '../../models/message.model';
import { marked } from 'marked';

@Component({
  selector: 'app-message',
template: `
  <div class="message" [class.user-message]="message.isUser" [class.bot-message]="!message.isUser">
    <div class="message-content">
      <div class="message-header">
        <div class="avatar">
          <mat-icon>{{message.isUser ? 'person' : 'smart_toy'}}</mat-icon>
        </div>
        <div class="message-info">
          <span class="sender">{{message.isUser ? 'You' : 'AI Assistant'}}</span>
          <span class="timestamp">{{message.timestamp | date:'short'}}</span>
        </div>
        <div class="message-status" *ngIf="message.isUser">
          <mat-icon *ngIf="message.status === 'sending'">schedule</mat-icon>
          <mat-icon *ngIf="message.status === 'sent'">check</mat-icon>
          <mat-icon *ngIf="message.status === 'error'" class="error">error</mat-icon>
        </div>
      </div>
      
      <div class="message-body">
        <!-- Show summary instead of full content for bot messages -->
        <div class="message-text" *ngIf="message.isUser" [innerHTML]="getFormattedContent()"></div>
        <div class="message-text" *ngIf="!message.isUser && message.summary" [innerHTML]="getFormattedSummary()"></div>
        <div class="message-text" *ngIf="!message.isUser && !message.summary" [innerHTML]="getFormattedContent()"></div>
        
        <div *ngIf="message.error" class="error-message">
          <mat-icon>error</mat-icon>
          <span>{{message.error}}</span>
        </div>
        
        <div *ngIf="message.sqlQuery && !message.isUser" class="sql-section">
          <app-sql-code [sql]="message.sqlQuery" (rerun)="onRerun()"></app-sql-code>
        </div>
        
        <!-- Only show AI Explanation for SQL queries -->
        <div *ngIf="message.explanation && !message.isUser && message.queryResponse?.response_type === 'sql_convertible'" class="explanation-section">
          <mat-expansion-panel>
            <mat-expansion-panel-header>
              <mat-panel-title>AI Explanation</mat-panel-title>
            </mat-expansion-panel-header>
            <div [innerHTML]="getFormattedExplanation()"></div>
          </mat-expansion-panel>
        </div>
        
        <div *ngIf="message.data && message.data.length > 0" class="data-section">
          <mat-expansion-panel [expanded]="true">
            <mat-expansion-panel-header>
              <mat-panel-title>Query Results ({{message.data.length}} rows)</mat-panel-title>
              <mat-panel-description *ngIf="message.queryResponse?.response_type">
                Type: {{message.queryResponse?.response_type}}
              </mat-panel-description>
            </mat-expansion-panel-header>
            
            <div class="data-content">
              <mat-tab-group>
                <mat-tab label="Table">
                  <app-data-table [data]="message.data"></app-data-table>
                </mat-tab>
                <mat-tab label="Chart" *ngIf="message.queryResponse?.visualization">
                  <app-chart 
                    [data]="message.data"
                    [visualizationConfig]="message.queryResponse?.visualization">
                  </app-chart>
                </mat-tab>
              </mat-tab-group>
            </div>
          </mat-expansion-panel>
        </div>
        
        <!-- AI Generated Notice for bot messages - only show if not an error -->
        <div *ngIf="!message.isUser && message.status !== 'error'" class="ai-notice">
          <mat-icon>info</mat-icon>
          <span>This response is AI-generated. Please verify the accuracy and relevance of the information before use.</span>
        </div>
      </div>
    </div>
  </div>
`,
  styles: [`
    .message {
      margin-bottom: 24px;
      display: flex;
    }
    
    .user-message {
      justify-content: flex-end;
    }
    
    .bot-message {
      justify-content: flex-start;
    }
    
    .message-content {
      max-width: 80%;
      background-color: white;
      border-radius: 16px;
      padding: 16px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    
    .user-message .message-content {
      //background-color: #2640e8;
      color: black;
      border: 1px solid steelblue;
    }
    
    .message-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
    }
    
    .avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background-color: #293340;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
    }
    
    .user-message .avatar {
      //background-color: rgba(255,255,255,0.2);
    }
    
    .message-info {
      flex: 1;
    }
    
    .sender {
      font-weight: 500;
      display: block;
    }
    
    .timestamp {
      font-size: 12px;
      opacity: 0.7;
    }
    
    .message-status {
      color: #4caf50;
    }
    
    .message-status .error {
      color: #f44336;
    }
    
    .message-text {
      line-height: 1.5;
    }
    
    .error-message {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #f44336;
      background-color: #ffebee;
      padding: 12px;
      border-radius: 8px;
      margin-top: 12px;
    }
    
    .sql-section,
    .explanation-section,
    .data-section {
      margin-top: 16px;
    }
    
    .data-content {
      margin-top: 16px;
    }
    
    @media (max-width: 768px) {
      .message-content {
        max-width: 95%;
      }
    }

      .ai-notice {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 12px;
    padding: 8px 12px;
    background-color: rgba(255, 193, 7, 0.1);
    border-radius: 6px;
    font-size: 12px;
    color: #f57c00;
    border-left: 3px solid #ffc107;
  }
  
  .ai-notice mat-icon {
    font-size: 14px;
    width: 14px;
    height: 14px;
  }
  `]
})
export class MessageComponent {
  @Input() message!: Message;
  @Output() rerunQuery = new EventEmitter<Message>();

  getFormattedContent(): string {
    return marked(this.message.content);
  }

  getFormattedSummary(): string {
    return this.message.summary ? marked(this.message.summary) : marked(this.message.content);
  }

  getFormattedExplanation(): string {
    return this.message.explanation ? marked(this.message.explanation) : '';
  }

  onRerun(): void {
    this.rerunQuery.emit(this.message);
  }
}