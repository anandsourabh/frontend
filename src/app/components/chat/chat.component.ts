// src/app/components/chat/chat.component.ts - Updated with welcome greeting

import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked, OnDestroy } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged, startWith, map } from 'rxjs';
import { ChatService } from '../../services/chat.service';
import { ApiService } from '../../services/api.service';
import { Message, QueryRequest, QueryResponse } from '../../models/message.model';

// Declare Speech Recognition types
declare var webkitSpeechRecognition: any;
declare var SpeechRecognition: any;

@Component({
  selector: 'app-chat',
  template: `
    <div class="chat-container">
      <div class="messages-container" #messagesContainer>
        <div class="messages">
          <!-- WELCOME MESSAGE: Show when no messages exist -->
          <div class="welcome-message" *ngIf="messages.length === 0">
            <div class="welcome-content">
              <div class="welcome-header">
                <div class="ai-avatar">
                  <mat-icon>smart_toy</mat-icon>
                </div>
                <h2>Welcome to Your AI Data Assistant! 👋</h2>
              </div>
              
              <div class="welcome-text">
                <p>I'm here to help you explore and analyze your property data using natural language. 
                   Just ask me questions in plain English, and I'll convert them into SQL queries and visualizations!</p>
              </div>
              
              <div class="features-section">
                <h3>🚀 What I can help you with:</h3>
                <div class="features-grid">
                  <div class="feature-item">
                    <mat-icon>analytics</mat-icon>
                    <div class="feature-content">
                      <h4>Data Queries</h4>
                      <p>Ask questions like "What is the total insured value by state?" or "Show me properties with earthquake risk"</p>
                    </div>
                  </div>
                  
                  <div class="feature-item">
                    <mat-icon>bar_chart</mat-icon>
                    <div class="feature-content">
                      <h4>Smart Visualizations</h4>
                      <p>I automatically create charts, maps, and tables to help you understand your data better</p>
                    </div>
                  </div>
                  
                  <div class="feature-item">
                    <mat-icon>support_agent</mat-icon>
                    <div class="feature-content">
                      <h4>Risk Management Insights</h4>
                      <p>Get expert guidance on property risk, insurance concepts, and industry best practices</p>
                    </div>
                  </div>
                  
                  <div class="feature-item">
                    <mat-icon>mic</mat-icon>
                    <div class="feature-content">
                      <h4>Voice Input</h4>
                      <p>Speak your questions using the microphone button for hands-free interaction</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- Animated arrow pointing to hamburger menu -->
              <div class="menu-guide">
                <div class="arrow-container">
                  <div class="animated-arrow">
                    <mat-icon>arrow_upward</mat-icon>
                  </div>
                </div>
                <div class="menu-guide-text">
                  <h4>📚 Check Your Query History</h4>
                  <p>Click the menu button <mat-icon class="inline-icon">menu</mat-icon> in the top-left corner to:</p>
                  <ul>
                    <li>View your recent queries</li>
                    <li>Access bookmarked searches</li>
                    <li>Get helpful suggestions</li>
                    <li>Rerun previous queries</li>
                  </ul>
                </div>
              </div>
              
              <div class="quick-start">
                <h3>💡 Try these example queries:</h3>
                <div class="example-queries">
                  <button 
                    *ngFor="let example of welcomeExamples" 
                    mat-stroked-button 
                    class="example-button"
                    (click)="useExampleQuery(example)">
                    <mat-icon>play_arrow</mat-icon>
                    {{example}}
                  </button>
                </div>
              </div>
              
              <div class="welcome-footer">
                <p>🎯 <strong>Pro Tip:</strong> Be specific in your questions for better results. I understand location names, date ranges, risk categories, and property attributes!</p>
              </div>
            </div>
          </div>
          
          <!-- REGULAR MESSAGES -->
          <app-message 
            *ngFor="let message of messages; trackBy: trackByMessage" 
            [message]="message"
            (rerunQuery)="rerunQuery($event)"
            (editQuery)="onEditQuery($event)"
            (useSuggestion)="onUseSuggestion($event)"
            (showAvailableData)="onShowAvailableData()">
          </app-message>
          
          <div *ngIf="isTyping" class="typing-indicator">
            <div class="typing-bubble">
              <div class="typing-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="input-container">
        <!-- Enhanced helpful text for different states -->
        <div class="input-helper" *ngIf="getInputHelperText()">
          <mat-icon>info</mat-icon>
          <span>{{getInputHelperText()}}</span>
        </div>
        
        <mat-form-field class="message-input" appearance="outline">
          <textarea 
            #messageInput
            matInput 
            [formControl]="messageControl"
            [placeholder]="getInputPlaceholder()"
            cdkTextareaAutosize
            cdkAutosizeMinRows="1"
            cdkAutosizeMaxRows="10"
            (focus)="onInputFocus()"
            (blur)="onInputBlur()"
            [matAutocomplete]="auto">
          </textarea>
          
          <mat-autocomplete #auto="matAutocomplete">
            <mat-option *ngFor="let suggestion of filteredSuggestions" [value]="suggestion">
              {{suggestion}}
            </mat-option>
          </mat-autocomplete>
          
          <!-- Voice Search Button -->
          <button 
            mat-icon-button 
            matSuffix 
            (click)="toggleVoiceRecognition()"
            [disabled]="isSending || !speechRecognitionSupported"
            [class.recording]="isRecording"
            class="voice-button"
            [matTooltip]="getVoiceTooltip()">
            <mat-icon>{{isRecording ? 'mic' : 'mic_none'}}</mat-icon>
          </button>
          
          <!-- Send Button -->
          <button 
            mat-icon-button 
            matSuffix 
            (click)="sendMessage()"
            [disabled]="!messageControl.value?.trim() || isSending"
            class="send-button">
            <mat-icon>send</mat-icon>
          </button>
        </mat-form-field>
        
        <!-- Voice Recognition Status -->
        <div *ngIf="isRecording" class="voice-status">
          <mat-icon class="pulse">mic</mat-icon>
          <span>Listening... Click mic to stop</span>
        </div>
        
        <!-- Voice Recognition Error -->
        <div *ngIf="voiceError" class="voice-error">
          <mat-icon>error</mat-icon>
          <span>{{voiceError}}</span>
          <button mat-button (click)="voiceError = null">Dismiss</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .chat-container {
      height: 100vh;
      display: flex;
      flex-direction: column;
      background-color: #f5f5f5;
    }
    
    .messages-container {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
    }
    
    .messages {
      max-width: 1200px;
      margin: 0 auto;
    }
    
    /* WELCOME MESSAGE STYLES - Official Marsh & McLennan Colors */
    .welcome-message {
      background: linear-gradient(135deg, #002C77 0%, #016D9E 50%, #00A8C7 100%);
      border-radius: 16px;
      padding: 32px;
      margin-bottom: 24px;
      color: white;
      box-shadow: 0 8px 32px rgba(0, 44, 119, 0.3);
      border: 1px solid rgba(0, 168, 199, 0.3);
      animation: welcomeFadeIn 0.8s ease-out;
    }
    
    .welcome-content {
      max-width: 800px;
      margin: 0 auto;
    }
    
    .welcome-header {
      text-align: center;
      margin-bottom: 24px;
    }
    
    .ai-avatar {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: linear-gradient(135deg, #016D9E 0%, #00A8C7 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 16px auto;
      border: 3px solid rgba(0, 168, 199, 0.4);
      box-shadow: 0 0 20px rgba(0, 168, 199, 0.5);
      animation: avatarPulse 2s ease-in-out infinite;
    }
    
    .ai-avatar mat-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
      color: white;
    }
    
    .welcome-header h2 {
      font-size: 28px;
      margin: 0;
      font-weight: 600;
    }
    
    .welcome-text {
      text-align: center;
      margin-bottom: 32px;
      font-size: 16px;
      line-height: 1.6;
      opacity: 0.95;
    }
    
    .features-section {
      margin-bottom: 32px;
    }
    
    .features-section h3 {
      font-size: 20px;
      margin-bottom: 20px;
      text-align: center;
    }
    
    .features-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 20px;
    }
    
    .feature-item {
      background: linear-gradient(135deg, rgba(0, 168, 199, 0.15) 0%, rgba(167, 226, 240, 0.15) 100%);
      border-radius: 12px;
      padding: 20px;
      display: flex;
      align-items: flex-start;
      gap: 16px;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(0, 168, 199, 0.3);
      transition: all 0.3s ease;
    }
    
    .feature-item:hover {
      transform: translateY(-4px);
      background: linear-gradient(135deg, rgba(0, 168, 199, 0.25) 0%, rgba(167, 226, 240, 0.25) 100%);
      border-color: rgba(0, 168, 199, 0.5);
      box-shadow: 0 8px 25px rgba(0, 168, 199, 0.4);
    }
    
    .feature-item mat-icon {
      font-size: 24px;
      width: 24px;
      height: 24px;
      color: #00A8C7;
      flex-shrink: 0;
      margin-top: 4px;
    }
    
    .feature-content h4 {
      margin: 0 0 8px 0;
      font-size: 16px;
      font-weight: 600;
    }
    
    .feature-content p {
      margin: 0;
      font-size: 14px;
      opacity: 0.9;
      line-height: 1.4;
    }
    
    /* ANIMATED ARROW AND MENU GUIDE - Official Marsh Colors */
    .menu-guide {
      background: linear-gradient(135deg, rgba(0, 168, 199, 0.1) 0%, rgba(167, 226, 240, 0.1) 100%);
      border-radius: 12px;
      padding: 24px;
      margin: 24px 0;
      border: 2px dashed rgba(0, 168, 199, 0.4);
      position: relative;
    }
    
    .arrow-container {
      position: absolute;
      top: -32px;
      left: 32px;
      z-index: 10;
    }
    
    .animated-arrow {
      animation: arrowBounce 2s ease-in-out infinite;
      background: linear-gradient(135deg, #016D9E 0%, #00A8C7 100%);
      border-radius: 50%;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 20px rgba(0, 168, 199, 0.6);
      border: 2px solid rgba(167, 226, 240, 0.8);
    }
    
    .animated-arrow mat-icon {
      color: white;
      font-size: 24px;
      width: 24px;
      height: 24px;
      transform: rotate(-45deg);
      font-weight: bold;
    }
    
    .menu-guide-text h4 {
      margin: 0 0 12px 0;
      font-size: 18px;
    }
    
    .menu-guide-text p {
      margin: 0 0 12px 0;
      font-size: 14px;
      opacity: 0.9;
    }
    
    .menu-guide-text ul {
      margin: 0;
      padding-left: 20px;
      font-size: 14px;
      opacity: 0.9;
    }
    
    .menu-guide-text li {
      margin-bottom: 4px;
    }
    
    .inline-icon {
      font-size: 16px !important;
      width: 16px !important;
      height: 16px !important;
      vertical-align: middle;
      margin: 0 4px;
      color: #00A8C7 !important;
      background: rgba(0, 168, 199, 0.15);
      border-radius: 3px;
      padding: 2px;
    }
    
    /* QUICK START EXAMPLES */
    .quick-start {
      margin-bottom: 24px;
    }
    
    .quick-start h3 {
      font-size: 18px;
      margin-bottom: 16px;
      text-align: center;
    }
    
    .example-queries {
      display: flex;
      flex-direction: column;
      gap: 12px;
      max-width: 600px;
      margin: 0 auto;
    }
    
    .example-button {
      background: linear-gradient(135deg, rgba(0, 168, 199, 0.15) 0%, rgba(167, 226, 240, 0.15) 100%) !important;
      border: 1px solid rgba(0, 168, 199, 0.4) !important;
      color: white !important;
      padding: 12px 16px !important;
      text-align: left !important;
      border-radius: 8px !important;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    .example-button:hover {
      background: linear-gradient(135deg, rgba(0, 168, 199, 0.25) 0%, rgba(167, 226, 240, 0.25) 100%) !important;
      border-color: rgba(0, 168, 199, 0.6) !important;
      transform: translateX(8px);
      box-shadow: 0 4px 15px rgba(0, 168, 199, 0.4);
    }
    
    .example-button mat-icon {
      color: #00A8C7 !important;
      font-size: 18px;
      width: 18px;
      height: 18px;
    }
    
    .welcome-footer {
      text-align: center;
      font-size: 14px;
      opacity: 0.9;
      background: linear-gradient(135deg, rgba(0, 168, 199, 0.1) 0%, rgba(167, 226, 240, 0.1) 100%);
      padding: 16px;
      border-radius: 8px;
      border: 1px solid rgba(0, 168, 199, 0.3);
    }
    
    /* ANIMATIONS */
    @keyframes welcomeFadeIn {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    @keyframes avatarPulse {
      0%, 100% {
        transform: scale(1);
        box-shadow: 0 0 0 0 rgba(0, 168, 199, 0.5);
      }
      50% {
        transform: scale(1.05);
        box-shadow: 0 0 0 15px rgba(0, 168, 199, 0);
      }
    }
    
    @keyframes arrowBounce {
      0%, 100% {
        transform: translateY(0);
      }
      50% {
        transform: translateY(-10px);
      }
    }
    
    /* EXISTING STYLES */
    .input-container {
      padding: 16px;
      background-color: white;
      border-top: 1px solid #e0e0e0;
      position: sticky;
      bottom: 0;
    }
    
    .input-helper {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
      padding: 8px 12px;
      background-color: rgba(0, 168, 199, 0.1);
      border-radius: 6px;
      color: #016D9E;
      font-size: 13px;
      max-width: 1200px;
      margin-left: auto;
      margin-right: auto;
      border: 1px solid rgba(0, 168, 199, 0.2);
    }
    
    .input-helper mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }
    
    .message-input {
      width: 100%;
      max-width: 1200px;
      margin: 0 auto;
      display: block;
    }
    
    .voice-button {
      color: #666;
      margin-right: 8px;
    }
    
    .voice-button.recording {
      color: #f44336;
      animation: pulse 1s infinite;
    }
    
    .send-button {
      color: #00A8C7 !important;
      background-color: rgba(0, 168, 199, 0.08) !important;
      border-radius: 50% !important;
    }
    
    .send-button:hover {
      color: #016D9E !important;
      background-color: rgba(0, 168, 199, 0.15) !important;
      transform: scale(1.05);
    }
    
    .send-button:disabled {
      color: #ccc !important;
      background-color: transparent !important;
      transform: none;
    }
    
    .voice-status {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 8px;
      padding: 8px 12px;
      background-color: #e8f5e8;
      border-radius: 6px;
      color: #2e7d32;
      font-size: 14px;
      max-width: 1200px;
      margin-left: auto;
      margin-right: auto;
    }
    
    .voice-status .pulse {
      animation: pulse 1s infinite;
      color: #f44336;
    }
    
    .voice-error {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 8px;
      padding: 8px 12px;
      background-color: #ffebee;
      border-radius: 6px;
      color: #c62828;
      font-size: 14px;
      max-width: 1200px;
      margin-left: auto;
      margin-right: auto;
    }
    
    .typing-indicator {
      display: flex;
      justify-content: flex-start;
      margin: 16px 0;
    }
    
    .typing-bubble {
      background-color: #293340;
      border-radius: 18px;
      padding: 12px 16px;
      max-width: 80px;
    }
    
    .typing-dots {
      display: flex;
      gap: 4px;
    }
    
    .typing-dots span {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background-color: #ffffff;
      animation: typing 1.4s infinite;
    }
    
    .typing-dots span:nth-child(2) {
      animation-delay: 0.2s;
    }
    
    .typing-dots span:nth-child(3) {
      animation-delay: 0.4s;
    }
    
    @keyframes typing {
      0%, 60%, 100% {
        transform: translateY(0);
        opacity: 0.5;
      }
      30% {
        transform: translateY(-10px);
        opacity: 1;
      }
    }
    
    @keyframes pulse {
      0% {
        transform: scale(1);
        opacity: 1;
      }
      50% {
        transform: scale(1.2);
        opacity: 0.7;
      }
      100% {
        transform: scale(1);
        opacity: 1;
      }
    }
    
    /* RESPONSIVE DESIGN */
    @media (max-width: 768px) {
      .welcome-message {
        padding: 24px 16px;
      }
      
      .welcome-header h2 {
        font-size: 24px;
      }
      
      .features-grid {
        grid-template-columns: 1fr;
        gap: 16px;
      }
      
      .feature-item {
        padding: 16px;
      }
      
      .menu-guide {
        padding: 16px;
      }
      
      .arrow-container {
        left: 16px;
      }
      
      .example-queries {
        gap: 8px;
      }
      
      .example-button {
        padding: 10px 12px !important;
        font-size: 14px;
      }
      
      .messages-container {
        padding: 8px;
      }
      
      .input-container {
        padding: 8px;
      }
    }
  `]
})
export class ChatComponent implements OnInit, AfterViewChecked, OnDestroy {
  @ViewChild('messagesContainer') messagesContainer!: ElementRef;
  @ViewChild('messageInput') messageInput!: ElementRef;
  
  messageControl = new FormControl('');
  messages: Message[] = [];
  isTyping = false;
  isSending = false;
  columns: string[] = [];
  filteredSuggestions: string[] = [];
  
  // Voice Recognition Properties
  speechRecognitionSupported = false;
  isRecording = false;
  voiceError: string | null = null;
  private recognition: any;
  
  // Enhanced input state management
  private inputFocused = false;
  private lastFailedQueryType: string | null = null;
  
  // Welcome message examples
  welcomeExamples = [
    "What is the total insured value by state?",
    "Show me properties with high earthquake risk",
    "List all buildings built after 2000",
    "What is the importance of AAL in Property Risk Management",
    "Show locations on map",
    "Can you provide me a portfolio overview?"
  ];
  
  private destroy$ = new Subject<void>();
  private shouldScroll = true;

  constructor(
    private chatService: ChatService,
    private apiService: ApiService
  ) {}

  ngOnInit(): void {
    this.initializeVoiceRecognition();
    
    this.chatService.messages$
      .pipe(takeUntil(this.destroy$))
      .subscribe(messages => {
        this.messages = messages;
        this.shouldScroll = true;
      });

    this.chatService.typing$
      .pipe(takeUntil(this.destroy$))
      .subscribe(typing => this.isTyping = typing);

    // Load schema for autocomplete
    this.apiService.getSchema()
      .pipe(takeUntil(this.destroy$))
      .subscribe(schema => {
        this.columns = schema.map(s => s.name);
      });

    // Auto-complete for column names from schema
    this.messageControl.valueChanges
      .pipe(
        takeUntil(this.destroy$),
        startWith(''),
        debounceTime(300),
        distinctUntilChanged(),
        map(value => this.filterColumns(value || ''))
      )
      .subscribe(filtered => this.filteredSuggestions = filtered);
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    
    if (this.recognition) {
      this.recognition.stop();
    }
  }

  // WELCOME MESSAGE: Use example query
  useExampleQuery(example: string): void {
    this.messageControl.setValue(example);
    setTimeout(() => {
      if (this.messageInput?.nativeElement) {
        this.messageInput.nativeElement.focus();
      }
    }, 100);
  }

  // Enhanced input helpers
  getInputPlaceholder(): string {
    if (this.messages.length === 0) {
      return 'Try one of the examples above or ask your own question...';
    } else if (this.lastFailedQueryType === 'no_data_found') {
      return 'Try a broader search or ask "What data do we have?" - Click Send button to submit';
    } else if (this.lastFailedQueryType === 'query_generation_failed') {
      return 'Try a simpler question like "Show me all properties" - Click Send button to submit';
    } else if (this.inputFocused && this.messageControl.value) {
      return 'Click the Send button to submit your query...';
    }
    return 'Ask a question about your data... (Click Send button to submit)';
  }

  getInputHelperText(): string | null {
    if (!this.inputFocused) return null;
    
    if (this.lastFailedQueryType === 'no_data_found') {
      return 'Your last query found no results. Try making it less specific and click Send.';
    } else if (this.lastFailedQueryType === 'query_generation_failed') {
      return 'I had trouble understanding your last question. Try using simpler terms and click Send.';
    } else if (this.lastFailedQueryType === 'processing_error') {
      return 'There was a technical issue. Try a simpler query and click Send.';
    }
    return null;
  }

  onInputFocus(): void {
    this.inputFocused = true;
  }

  onInputBlur(): void {
    this.inputFocused = false;
  }

  // ... rest of existing methods (voice recognition, message handling, etc.) remain the same ...

  private initializeVoiceRecognition(): void {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      this.speechRecognitionSupported = false;
      console.warn('Speech Recognition not supported in this browser');
      return;
    }
    
    this.speechRecognitionSupported = true;
    this.recognition = new SpeechRecognition();
    this.recognition.continuous = false;
    this.recognition.interimResults = false;
    this.recognition.lang = 'en-US';
    
    this.recognition.onstart = () => {
      this.isRecording = true;
      this.voiceError = null;
    };
    
    this.recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      const currentValue = this.messageControl.value || '';
      const newValue = currentValue + (currentValue ? ' ' : '') + transcript;
      this.messageControl.setValue(newValue);
      
      if (this.messageInput?.nativeElement) {
        this.messageInput.nativeElement.focus();
      }
    };
    
    this.recognition.onerror = (event: any) => {
      this.isRecording = false;
      switch (event.error) {
        case 'network':
          this.voiceError = 'Network error occurred during voice recognition';
          break;
        case 'not-allowed':
          this.voiceError = 'Microphone access denied. Please enable microphone permissions.';
          break;
        case 'no-speech':
          this.voiceError = 'No speech detected. Please try again.';
          break;
        case 'audio-capture':
          this.voiceError = 'No microphone found. Please check your microphone.';
          break;
        default:
          this.voiceError = 'Voice recognition error occurred. Please try again.';
      }
    };
    
    this.recognition.onend = () => {
      this.isRecording = false;
    };
  }

  toggleVoiceRecognition(): void {
    if (!this.speechRecognitionSupported) {
      this.voiceError = 'Voice recognition is not supported in this browser';
      return;
    }
    
    if (this.isRecording) {
      this.recognition.stop();
    } else {
      this.voiceError = null;
      try {
        this.recognition.start();
      } catch (error) {
        this.voiceError = 'Failed to start voice recognition. Please try again.';
        console.error('Voice recognition error:', error);
      }
    }
  }

  getVoiceTooltip(): string {
    if (!this.speechRecognitionSupported) {
      return 'Voice recognition not supported';
    }
    return this.isRecording ? 'Stop recording' : 'Start voice input';
  }

  trackByMessage(index: number, message: Message): string {
    return message.id;
  }

  sendMessage(): void {
    const content = this.messageControl.value?.trim();
    if (!content || this.isSending) return;

    const userMessage: Message = {
      id: this.generateId(),
      content,
      isUser: true,
      timestamp: new Date(),
      status: 'sent'
    };

    this.chatService.addMessage(userMessage);
    this.messageControl.setValue('');
    this.isSending = true;
    this.chatService.setTyping(true);

    this.processQuery(content);
  }

  onEditQuery(queryText: string): void {
    this.messageControl.setValue(queryText);
    this.focusAndSelectText(queryText);
  }

  onUseSuggestion(suggestion: string): void {
    this.messageControl.setValue(suggestion);
    this.focusAndSelectText(suggestion);
  }

  onShowAvailableData(): void {
    const availableDataQuery = 'What data do we have available?';
    this.messageControl.setValue(availableDataQuery);
    
    setTimeout(() => {
      this.sendMessage();
    }, 300);
  }

  rerunQuery(message: Message): void {
    if (!message.sqlQuery) return;
    
    if (message.queryResponse) {
      this.isSending = true;
      this.chatService.setTyping(true);
      
      const queryRequest: QueryRequest = {
        question: message.queryResponse.question,
        visualization_type: undefined
      };
      
      this.apiService.processQuery(queryRequest)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response: QueryResponse) => {
            const newMessage: Message = {
              id: response.query_id,
              content: `Re-executed: ${response.explanation}`,
              isUser: false,
              timestamp: new Date(response.timestamp),
              status: 'sent',
              sqlQuery: response.sql_query,
              explanation: response.explanation,
              summary: response.summary,
              data: response.data,
              queryResponse: response
            };
            
            this.chatService.addMessage(newMessage);
            this.isSending = false;
            this.chatService.setTyping(false);
          },
          error: (error) => {
            const errorMessage: Message = {
              id: this.generateId(),
              content: 'Failed to re-execute query',
              isUser: false,
              timestamp: new Date(),
              status: 'error',
              error: error.error?.detail || error.message
            };
            
            this.chatService.addMessage(errorMessage);
            this.isSending = false;
            this.chatService.setTyping(false);
          }
        });
    }
  }

  private focusAndSelectText(text: string): void {
    setTimeout(() => {
      if (this.messageInput?.nativeElement) {
        const textArea = this.messageInput.nativeElement;
        textArea.focus();
        
        textArea.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
        
        textArea.setSelectionRange(0, text.length);
        
        textArea.placeholder = 'Edit your query or press Enter to send...';
        
        setTimeout(() => {
          if (document.activeElement !== textArea) {
            textArea.placeholder = 'Ask a question about your data...';
          }
        }, 5000);
      }
    }, 100);
  }

  private processQuery(query: string): void {
    const queryRequest: QueryRequest = {
      question: query,
      visualization_type: undefined
    };

    this.apiService.processQuery(queryRequest)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: QueryResponse) => {
          // Track the response type for better input helpers
          if (['no_data_found', 'query_generation_failed', 'processing_error'].includes(response.response_type)) {
            this.lastFailedQueryType = response.response_type;
          } else {
            this.lastFailedQueryType = null;
          }

          const botMessage: Message = {
            id: response.query_id,
            content: response.explanation,
            isUser: false,
            timestamp: new Date(response.timestamp),
            status: 'sent',
            sqlQuery: response.sql_query,
            explanation: response.explanation,
            summary: response.summary,
            data: response.data,
            queryResponse: response,
            isRetryable: ['no_data_found', 'query_generation_failed', 'processing_error'].includes(response.response_type),
            isEditable: ['no_data_found', 'query_generation_failed'].includes(response.response_type)
          };

          this.chatService.addMessage(botMessage);
          
          // Only add successful queries to history
          if (response.response_type === 'sql_convertible' && response.data && response.data.length > 0) {
            this.chatService.addToHistory({
              id: response.query_id,
              query: response.question,
              timestamp: new Date(response.timestamp),
              isBookmarked: false,
              sqlQuery: response.sql_query,
              data: response.data
            });
          }

          this.isSending = false;
          this.chatService.setTyping(false);
          this.handleFollowUpSuggestions(response);
        },
        error: (error) => {
          this.lastFailedQueryType = 'processing_error';
          
          let errorMessage = 'Sorry, I encountered an error processing your request.';
          let isRetryable = true;
          
          if (error.status === 0) {
            errorMessage = 'Connection error. Please check your internet connection and try again.';
          } else if (error.status === 400) {
            errorMessage = 'There was an issue with your query. Please try rephrasing it.';
          } else if (error.status >= 500) {
            errorMessage = 'Server error occurred. Please try again in a moment.';
          } else if (error.error?.detail) {
            errorMessage = error.error.detail;
          }

          const errorBotMessage: Message = {
            id: this.generateId(),
            content: errorMessage,
            isUser: false,
            timestamp: new Date(),
            status: 'error',
            error: error.error?.detail || error.message || 'Unknown error occurred',
            isRetryable: isRetryable,
            isEditable: true
          };

          this.chatService.addMessage(errorBotMessage);
          this.isSending = false;
          this.chatService.setTyping(false);
        }
      });
  }

  private handleFollowUpSuggestions(response: QueryResponse): void {
    if (response.response_type === 'no_data_found') {
      setTimeout(() => {
        this.addSystemMessage(
          '💡 **Tip:** You can ask "What data do we have available?" to see what information is in the system.',
          'suggestion'
        );
      }, 2000);
    } else if (response.response_type === 'query_generation_failed') {
      setTimeout(() => {
        this.addSystemMessage(
          '💡 **Tip:** Try starting with a simple query like "Show me all properties" and then get more specific.',
          'suggestion'
        );
      }, 2000);
    }
  }

  private addSystemMessage(content: string, type: 'tip' | 'suggestion' | 'info'): void {
    const systemMessage: Message = {
      id: this.generateId(),
      content: content,
      isUser: false,
      timestamp: new Date(),
      status: 'sent',
      queryResponse: {
        query_id: this.generateId(),
        question: '',
        explanation: content,
        timestamp: new Date().toISOString(),
        response_type: 'system_message'
      }
    };

    this.chatService.addMessage(systemMessage);
  }

  private filterColumns(value: string): string[] {
    if (!value || value.length < 2) return [];
    
    const filterValue = value.toLowerCase();
    const words = filterValue.split(' ');
    const lastWord = words[words.length - 1];
    
    if (lastWord.length < 2) return [];
    
    return this.columns
      .filter(column => column.toLowerCase().includes(lastWord))
      .slice(0, 8)
      .map(column => {
        const newWords = [...words];
        newWords[newWords.length - 1] = column;
        return newWords.join(' ');
      });
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  private scrollToBottom(): void {
    try {
      const container = this.messagesContainer.nativeElement;
      container.scrollTop = container.scrollHeight;
    } catch (err) {
      console.error('Error scrolling to bottom:', err);
    }
  }
}