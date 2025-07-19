import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from './environment.development';

@Injectable({
  providedIn: 'root'
})
export class Authservice {
  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json'
    })
  };
  constructor(private http: HttpClient) {}
  login(username: string, password: string): Observable<any> {
    const body = { username, password };
    return this.http.post(`${environment.apiUrl}/auth/login`, body, this.httpOptions);
  }
}
