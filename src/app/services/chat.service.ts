import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Message, QueryHistory, QueryResponse, ChatHistory } from '../models/message.model';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private messagesSubject = new BehaviorSubject<Message[]>([]);
  private queryHistorySubject = new BehaviorSubject<QueryHistory[]>([]);
  private typingSubject = new BehaviorSubject<boolean>(false);

  messages$ = this.messagesSubject.asObservable();
  queryHistory$ = this.queryHistorySubject.asObservable();
  typing$ = this.typingSubject.asObservable();

  constructor(private apiService: ApiService) {
    this.loadHistory();
    this.loadChatHistoryFromAPI();
  }

  addMessage(message: Message): void {
    const messages = this.messagesSubject.value;
    this.messagesSubject.next([...messages, message]);
    this.saveHistory();
    
    // FIXED: Refresh query history when a new bot message with query is added
    if (!message.isUser && message.queryResponse) {
      setTimeout(() => {
        this.loadChatHistoryFromAPI();
      }, 500); // Small delay to ensure backend has saved the history
    }
  }

  updateMessage(messageId: string, updates: Partial<Message>): void {
    const messages = this.messagesSubject.value;
    const index = messages.findIndex(m => m.id === messageId);
    if (index !== -1) {
      messages[index] = { ...messages[index], ...updates };
      this.messagesSubject.next([...messages]);
      this.saveHistory();
    }
  }

  setTyping(typing: boolean): void {
    this.typingSubject.next(typing);
  }

  addToHistory(query: QueryHistory): void {
    const history = this.queryHistorySubject.value;
    // Check if query already exists to avoid duplicates
    const existingIndex = history.findIndex(h => h.id === query.id);
    if (existingIndex === -1) {
      this.queryHistorySubject.next([query, ...history.slice(0, 19)]); // Keep only 20 items
      this.saveQueryHistory();
    }
  }

  toggleBookmark(queryId: string): void {
    const history = this.queryHistorySubject.value;
    const index = history.findIndex(q => q.id === queryId);
    if (index !== -1) {
      const query = history[index];
      if (query.isBookmarked) {
        // Remove bookmark
        this.apiService.removeBookmark(queryId).subscribe({
          next: () => {
            query.isBookmarked = false;
            this.queryHistorySubject.next([...history]);
            this.saveQueryHistory();
          },
          error: (error) => console.error('Error removing bookmark:', error)
        });
      } else {
        // Add bookmark
        this.apiService.bookmarkQuery({
          query_id: queryId,
          question: query.query
        }).subscribe({
          next: () => {
            query.isBookmarked = true;
            this.queryHistorySubject.next([...history]);
            this.saveQueryHistory();
          },
          error: (error) => console.error('Error adding bookmark:', error)
        });
      }
    }
  }

  loadChatHistoryFromAPI(): void {
    this.apiService.getChatHistory().subscribe({
      next: (chatHistory: ChatHistory[]) => {
        const queryHistory = chatHistory.slice(0, 20).map(ch => ({ // Limit to 20 items
          id: ch.query_id,
          query: ch.question,
          timestamp: new Date(ch.timestamp),
          isBookmarked: false, // Will be updated from bookmarks API
          sqlQuery: ch.sql_query
        }));
        this.queryHistorySubject.next(queryHistory);
        
        // Load bookmarks status
        this.loadBookmarks();
      },
      error: (error) => {
        console.error('Error loading chat history:', error);
        // Fallback to local storage if API fails
        this.loadQueryHistoryFromStorage();
      }
    });
  }

  private loadBookmarks(): void {
    this.apiService.getBookmarks().subscribe({
      next: (bookmarks) => {
        const history = this.queryHistorySubject.value;
        const bookmarkedIds = new Set(bookmarks.map(b => b.query_id));
        
        history.forEach(h => {
          h.isBookmarked = bookmarkedIds.has(h.id);
        });
        
        this.queryHistorySubject.next([...history]);
      },
      error: (error) => console.error('Error loading bookmarks:', error)
    });
  }

  private loadHistory(): void {
    const saved = localStorage.getItem('chat-messages');
    if (saved) {
      try {
        const messages = JSON.parse(saved).map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        }));
        this.messagesSubject.next(messages);
      } catch (error) {
        console.error('Error loading chat history from localStorage:', error);
      }
    }
  }

  private loadQueryHistoryFromStorage(): void {
    const saved = localStorage.getItem('query-history');
    if (saved) {
      try {
        const history = JSON.parse(saved).map((q: any) => ({
          ...q,
          timestamp: new Date(q.timestamp)
        }));
        this.queryHistorySubject.next(history.slice(0, 20)); // Limit to 20
      } catch (error) {
        console.error('Error loading query history from localStorage:', error);
      }
    }
  }

  private saveHistory(): void {
    localStorage.setItem('chat-messages', JSON.stringify(this.messagesSubject.value));
  }

  private saveQueryHistory(): void {
    localStorage.setItem('query-history', JSON.stringify(this.queryHistorySubject.value));
  }

  clearHistory(): void {
    this.messagesSubject.next([]);
    this.queryHistorySubject.next([]);
    localStorage.removeItem('chat-messages');
    localStorage.removeItem('query-history');
  }

  // ADDED: Method to manually refresh history
  refreshHistory(): void {
    this.loadChatHistoryFromAPI();
  }
}