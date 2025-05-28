import { Component, OnInit, ViewChild } from '@angular/core';
import { MatSidenav } from '@angular/material/sidenav';
import { ChatService } from './services/chat.service';

@Component({
  selector: 'app-root',
  template: `
        <mat-sidenav-container class="sidenav-container">
            <mat-sidenav #sidenav mode="over" class="sidenav">
              <div class="sidenav-header">
                <button mat-icon-button (click)="sidenav.toggle()" class="menu-button">
                  <mat-icon>menu</mat-icon>
                </button>
                <span class="sidenav-title">Query History</span>
              </div>
              <app-query-history (querySelected)="onQuerySelected($event)"></app-query-history>
            </mat-sidenav>
            
            <mat-sidenav-content>
              <div class="floating-menu-button">
                <button (click)="sidenav.toggle()" class="floating-menu-icon">
                  <mat-icon>menu</mat-icon>
                </button>
              </div>
              
              <app-chat #chatComponent></app-chat>
            </mat-sidenav-content>
          </mat-sidenav-container>
  `,
styles: [`
  .sidenav-container {
    height: 100vh;
  }
  
  .sidenav {
    width: 450px;
    background-color: white;
  }
  
  .sidenav-header {
    display: flex;
    align-items: center;
    padding: 16px;
    border-bottom: 1px solid #e0e0e0;
    background-color: #f8f9fa;
  }
  
  .menu-button {
    margin-right: 12px;
    background: none !important;
    box-shadow: none !important;
    border: none !important;
    color: #293340;
    padding: 8px;
    border-radius: 4px;
    transition: background-color 0.2s;
  }
  
  .menu-button:hover {
    background-color: rgba(41, 51, 64, 0.1) !important;
  }
  
  .sidenav-title {
    font-weight: 500;
    color: #293340;
  }
  
  .floating-menu-button {
    position: fixed;
    top: 16px;
    left: 16px;
    z-index: 1000;
  }
  
  .floating-menu-icon {
    background: none !important;
    border: none !important;
    box-shadow: none !important;
    color: #293340;
    font-size: 24px;
    width: 40px;
    height: 40px;
    border-radius: 8px;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }
  
  .floating-menu-icon:hover {
    background-color: rgba(41, 51, 64, 0.1) !important;
    transform: translateY(-1px);
  }
  
  .floating-menu-icon mat-icon {
    font-size: 24px;
    width: 24px;
    height: 24px;
  }
`]
})
export class AppComponent implements OnInit {
  @ViewChild('sidenav') sidenav!: MatSidenav;
  @ViewChild('chatComponent') chatComponent!: any;

  constructor(private chatService: ChatService) {}

  ngOnInit(): void {
    // Ensure chat service is initialized
    // The service will automatically load history on construction
  }

  onQuerySelected(query: string): void {
    if (this.chatComponent && this.chatComponent.messageControl) {
      this.chatComponent.messageControl.setValue(query);
      this.sidenav.close();
      setTimeout(() => {
        const textarea = document.querySelector('textarea[matInput]') as HTMLTextAreaElement;
        if (textarea) {
          textarea.focus();
        }
      }, 100);
    }
  }
}