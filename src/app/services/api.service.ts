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
  
  constructor(private http: HttpClient) {}

  processQuery(queryRequest: QueryRequest): Observable<QueryResponse> {
    return this.http.post<QueryResponse>(`${this.baseUrl}/query`, queryRequest, {
  
    });
  }

  getSchema(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/schema`, {
  
    });
  }

 getChatHistory(): Observable<ChatHistory[]> {
  return this.http.get<ChatHistory[]>(`${this.baseUrl}/history`, {

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
    });
  }

  bookmarkQuery(request: BookmarkRequest): Observable<any> {
    return this.http.post(`${this.baseUrl}/bookmark`, request, {
    });
  }

  getBookmarks(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/bookmarks`, {
    });
  }

  removeBookmark(queryId: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/bookmark/${queryId}`, {
    });
  }

  getUserStats(): Observable<any> {
    return this.http.get(`${this.baseUrl}/stats`, {
    });
  }

  submitFeedback(feedback: FeedbackRequest): Observable<any> {
    return this.http.post(`${this.baseUrl}/feedback`, feedback, {
    });
  }


  
}
