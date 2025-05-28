import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { catchError, Observable, of } from 'rxjs';
import { retry } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { QueryRequest, QueryResponse, ChatHistory, BookmarkRequest, FeedbackRequest } from '../models/message.model';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = environment.apiUrl;
  
  // Hardcoded values for now
  private readonly COMPANY_NUMBER = '12345';
  private readonly USER_ID = 'user123';

  constructor(private http: HttpClient) {}

  processQuery(queryRequest: QueryRequest): Observable<QueryResponse> {
    return this.http.post<QueryResponse>(`${this.baseUrl}/query`, queryRequest, {
      headers: this.getHeaders()
    });
  }

  getSchema(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/schema`, {
      headers: this.getHeaders()
    });
  }

 getChatHistory(): Observable<ChatHistory[]> {
  return this.http.get<ChatHistory[]>(`${this.baseUrl}/history`, {
    headers: this.getHeaders()
  }).pipe(
    retry(2), // Retry failed requests twice
    catchError((error) => {
      console.error('Error fetching chat history:', error);
      return of([]); // Return empty array on error
    })
  );
}

  getQuerySuggestions(query: string, limit: number = 5): Observable<string[]> {
    return this.http.get<string[]>(`${this.baseUrl}/suggestions`, {
      params: { q: query, limit: limit.toString() },
      headers: this.getHeaders()
    });
  }

  bookmarkQuery(request: BookmarkRequest): Observable<any> {
    return this.http.post(`${this.baseUrl}/bookmark`, request, {
      headers: this.getHeaders()
    });
  }

  getBookmarks(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/bookmarks`, {
      headers: this.getHeaders()
    });
  }

  removeBookmark(queryId: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/bookmark/${queryId}`, {
      headers: this.getHeaders()
    });
  }

  getUserStats(): Observable<any> {
    return this.http.get(`${this.baseUrl}/stats`, {
      headers: this.getHeaders()
    });
  }

  submitFeedback(feedback: FeedbackRequest): Observable<any> {
    return this.http.post(`${this.baseUrl}/feedback`, feedback, {
      headers: this.getHeaders()
    });
  }

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'company_number': this.COMPANY_NUMBER,
      'user_id': this.USER_ID
    });
  }

  // Getters for components that need these values
  getCompanyNumber(): string {
    return this.COMPANY_NUMBER;
  }

  getUserId(): string {
    return this.USER_ID;
  }

  
}
