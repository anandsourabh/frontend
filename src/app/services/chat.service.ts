import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
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
    // Load initial data from backend APIs
    this.loadChatHistoryFromAPI();
    
    // COMMENTED: Local storage fallback - uncomment if needed
    // this.loadHistory();
  }

  /**
   * Add a new message to the chat
   * Messages are stored in memory and successful SQL queries are saved to backend
   */
  addMessage(message: Message): void {
    const messages = this.messagesSubject.value;
    this.messagesSubject.next([...messages, message]);
    
    // COMMENTED: Local storage saving
    // this.saveHistory();
    
    // Auto-save successful bot messages with SQL queries to backend via chat history API
    if (!message.isUser && message.queryResponse && message.queryResponse.response_type === 'sql_convertible') {
      // The backend already saves to chat_history table when processing queries
      // So we just need to refresh our local history
      setTimeout(() => {
        this.loadChatHistoryFromAPI();
      }, 500); // Small delay to ensure backend has processed and saved
    }
  }

  /**
   * Update an existing message
   */
  updateMessage(messageId: string, updates: Partial<Message>): void {
    const messages = this.messagesSubject.value;
    const index = messages.findIndex(m => m.id === messageId);
    if (index !== -1) {
      messages[index] = { ...messages[index], ...updates };
      this.messagesSubject.next([...messages]);
      
      // COMMENTED: Local storage saving
      // this.saveHistory();
    }
  }

  /**
   * Set typing indicator state
   */
  setTyping(typing: boolean): void {
    this.typingSubject.next(typing);
  }

  /**
   * Add query to history (called when queries are successful)
   * This is primarily for immediate UI updates, backend handles persistence
   */
  addToHistory(query: QueryHistory): void {
    const history = this.queryHistorySubject.value;
    // Check if query already exists to avoid duplicates
    const existingIndex = history.findIndex(h => h.id === query.id);
    if (existingIndex === -1) {
      this.queryHistorySubject.next([query, ...history.slice(0, 19)]); // Keep only 20 items
      
      // COMMENTED: Local storage saving
      // this.saveQueryHistory();
      
      // Backend persistence is handled by the query processing endpoint
      // No additional API call needed here
    }
  }

  /**
   * Toggle bookmark status using backend API
   */
  toggleBookmark(queryId: string): void {
    const history = this.queryHistorySubject.value;
    const index = history.findIndex(q => q.id === queryId);
    if (index !== -1) {
      const query = history[index];
      
      if (query.isBookmarked) {
        // Remove bookmark via API
        this.apiService.removeBookmark(queryId).pipe(
          tap(() => {
            query.isBookmarked = false;
            this.queryHistorySubject.next([...history]);
            console.log('Bookmark removed successfully');
          }),
          catchError((error) => {
            console.error('Error removing bookmark:', error);
            // Revert the optimistic update on error
            return of(null);
          })
        ).subscribe();
      } else {
        // Add bookmark via API
        this.apiService.bookmarkQuery({
          query_id: queryId,
          question: query.query
        }).pipe(
          tap(() => {
            query.isBookmarked = true;
            this.queryHistorySubject.next([...history]);
            console.log('Bookmark added successfully');
          }),
          catchError((error) => {
            console.error('Error adding bookmark:', error);
            // Revert the optimistic update on error
            return of(null);
          })
        ).subscribe();
      }
    }
  }

  /**
   * Load chat history from backend API
   * This replaces localStorage-based history loading
   */
  loadChatHistoryFromAPI(): void {
    this.apiService.getChatHistory().pipe(
      tap((chatHistory: ChatHistory[]) => {
        // Convert backend chat history to QueryHistory format
        const queryHistory = chatHistory.slice(0, 20).map(ch => ({
          id: ch.query_id,
          query: ch.question,
          timestamp: new Date(ch.timestamp),
          isBookmarked: false, // Will be updated from bookmarks API
          sqlQuery: ch.sql_query
        }));
        
        this.queryHistorySubject.next(queryHistory);
        console.log(`Loaded ${queryHistory.length} queries from chat history API`);
        
        // Load bookmark status for the queries
        this.loadBookmarksStatus();
      }),
      catchError((error) => {
        console.error('Error loading chat history from API:', error);
        
        // COMMENTED: Fallback to localStorage if API fails
        // this.loadQueryHistoryFromStorage();
        
        // Instead, just log the error and continue with empty history
        this.queryHistorySubject.next([]);
        return of([]);
      })
    ).subscribe();
  }

  /**
   * Load bookmarks status from backend API
   */
  private loadBookmarksStatus(): void {
    this.apiService.getBookmarks().pipe(
      tap((bookmarks) => {
        const history = this.queryHistorySubject.value;
        const bookmarkedIds = new Set(bookmarks.map(b => b.query_id));
        
        // Update bookmark status for existing queries
        history.forEach(h => {
          h.isBookmarked = bookmarkedIds.has(h.id);
        });
        
        this.queryHistorySubject.next([...history]);
        console.log(`Updated bookmark status for ${bookmarks.length} bookmarked queries`);
      }),
      catchError((error) => {
        console.error('Error loading bookmarks from API:', error);
        return of([]);
      })
    ).subscribe();
  }

  /**
   * Submit feedback for a query via backend API
   */
  submitFeedback(queryId: string, rating: number, feedback?: string, helpful: boolean = true): Observable<any> {
    return this.apiService.submitFeedback({
      query_id: queryId,
      rating: rating,
      feedback: feedback,
      helpful: helpful
    }).pipe(
      tap(() => {
        console.log('Feedback submitted successfully');
      }),
      catchError((error) => {
        console.error('Error submitting feedback:', error);
        return of(null);
      })
    );
  }

  /**
   * Get user statistics from backend API
   */
  getUserStats(): Observable<any> {
    return this.apiService.getUserStats().pipe(
      catchError((error) => {
        console.error('Error loading user stats:', error);
        return of({
          query_types: [],
          recent_activity: [],
          generated_at: new Date()
        });
      })
    );
  }

  /**
   * Refresh history data from backend
   * Useful for manual refresh or after operations that might change history
   */
  refreshHistory(): void {
    console.log('Refreshing history from backend...');
    this.loadChatHistoryFromAPI();
  }

  /**
   * Clear all chat data
   * This clears in-memory data and could optionally call backend to clear history
   */
  clearHistory(): void {
    this.messagesSubject.next([]);
    this.queryHistorySubject.next([]);
    
    // COMMENTED: localStorage clearing
    // localStorage.removeItem('chat-messages');
    // localStorage.removeItem('query-history');
    
    console.log('Chat history cleared');
    
    // Note: We don't automatically clear backend data for safety
    // If you want to add a backend clear endpoint, you can call it here
    // this.apiService.clearChatHistory().subscribe();
  }

  // COMMENTED: localStorage-based methods - keep for potential fallback
  /*
  private loadHistory(): void {
    const saved = localStorage.getItem('chat-messages');
    if (saved) {
      try {
        const messages = JSON.parse(saved).map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        }));
        this.messagesSubject.next(messages);
        console.log('Loaded messages from localStorage');
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
        this.queryHistorySubject.next(history.slice(0, 20));
        console.log('Loaded query history from localStorage');
      } catch (error) {
        console.error('Error loading query history from localStorage:', error);
      }
    }
  }

  private saveHistory(): void {
    try {
      localStorage.setItem('chat-messages', JSON.stringify(this.messagesSubject.value));
    } catch (error) {
      console.error('Error saving messages to localStorage:', error);
    }
  }

  private saveQueryHistory(): void {
    try {
      localStorage.setItem('query-history', JSON.stringify(this.queryHistorySubject.value));
    } catch (error) {
      console.error('Error saving query history to localStorage:', error);
    }
  }
  */

  // UTILITY METHODS

  /**
   * Get current messages count
   */
  getMessagesCount(): number {
    return this.messagesSubject.value.length;
  }

  /**
   * Get current query history count
   */
  getQueryHistoryCount(): number {
    return this.queryHistorySubject.value.length;
  }

  /**
   * Get bookmarked queries count
   */
  getBookmarkedCount(): number {
    return this.queryHistorySubject.value.filter(q => q.isBookmarked).length;
  }

  /**
   * Check if a query is bookmarked
   */
  isQueryBookmarked(queryId: string): boolean {
    const history = this.queryHistorySubject.value;
    const query = history.find(q => q.id === queryId);
    return query ? query.isBookmarked : false;
  }

  /**
   * Get the last N successful queries
   */
  getRecentSuccessfulQueries(count: number = 5): QueryHistory[] {
    return this.queryHistorySubject.value
      .filter(q => q.sqlQuery && q.data && q.data.length > 0)
      .slice(0, count);
  }

  /**
   * Search queries by text
   */
  searchQueries(searchTerm: string): QueryHistory[] {
    if (!searchTerm.trim()) return this.queryHistorySubject.value;
    
    const term = searchTerm.toLowerCase();
    return this.queryHistorySubject.value.filter(q =>
      q.query.toLowerCase().includes(term)
    );
  }

  /**
   * Export chat data (for backup/debugging purposes)
   */
  exportChatData(): { messages: Message[], queryHistory: QueryHistory[] } {
    return {
      messages: this.messagesSubject.value,
      queryHistory: this.queryHistorySubject.value
    };
  }
}