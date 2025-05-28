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
          <app-message 
            *ngFor="let message of messages; trackBy: trackByMessage" 
            [message]="message"
            (rerunQuery)="rerunQuery($event)">
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
        <mat-form-field class="message-input" appearance="outline">
          <textarea 
            #messageInput
            matInput 
            [formControl]="messageControl"
            placeholder="Ask a question about your data..."
            cdkTextareaAutosize
            cdkAutosizeMinRows="1"
            cdkAutosizeMaxRows="10"
            (keydown)="onKeyDown($event)"
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
  
  .input-container {
    padding: 16px;
    background-color: white;
    border-top: 1px solid #e0e0e0;
    position: sticky;
    bottom: 0;
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
    color: #666; /* Changed from #2640e8 to #666 to match mic icon */
  }
  
  .send-button:hover {
    color: #333; /* Darker on hover */
  }
  
  .send-button:disabled {
    color: #ccc; /* Light gray when disabled */
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
  
  @media (max-width: 768px) {
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

  private initializeVoiceRecognition(): void {
    // Check if Speech Recognition is supported
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
      
      // Focus back to textarea
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

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
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

  rerunQuery(message: Message): void {
    if (!message.sqlQuery) return;
    
    // Re-run the same question to get fresh data
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

  private processQuery(query: string): void {
  const queryRequest: QueryRequest = {
    question: query,
    visualization_type: undefined
  };

  this.apiService.processQuery(queryRequest)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (response: QueryResponse) => {
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
          queryResponse: response
        };

        // Add message first
        this.chatService.addMessage(botMessage);
        
        // FIXED: Add to query history immediately with the actual response data
        this.chatService.addToHistory({
          id: response.query_id,
          query: response.question,
          timestamp: new Date(response.timestamp),
          isBookmarked: false,
          sqlQuery: response.sql_query,
          data: response.data
        });

        this.isSending = false;
        this.chatService.setTyping(false);
      },
      error: (error) => {
        const errorMessage: Message = {
          id: this.generateId(),
          content: 'Sorry, I encountered an error processing your request.',
          isUser: false,
          timestamp: new Date(),
          status: 'error',
          error: error.error?.detail || error.message || 'Unknown error occurred'
        };

        this.chatService.addMessage(errorMessage);
        this.isSending = false;
        this.chatService.setTyping(false);
      }
    });
}

  private filterColumns(value: string): string[] {
    if (!value || value.length < 2) return [];
    
    const filterValue = value.toLowerCase();
    const words = filterValue.split(' ');
    const lastWord = words[words.length - 1];
    
    // Only show column suggestions if the last word might be a column name
    if (lastWord.length < 2) return [];
    
    return this.columns
      .filter(column => column.toLowerCase().includes(lastWord))
      .slice(0, 8) // Limit to 8 suggestions
      .map(column => {
        // Replace the last word with the column suggestion
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