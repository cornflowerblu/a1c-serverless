// src/tests/api/auth-validation.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import supertest from 'supertest';
import { Database } from '@/types/supabase';

//set up the user type
type User = Database['public']['Tables']['users']['Row'];

describe('API Authentication Validation', () => {
  let testToken: string;
  let testUserId: string;

  // Create a test user before running tests
  beforeAll(async () => {
    // Create test user via our API
    const response = await supertest('http://localhost:3000')
      .post('/api/test/create-user')
      .send({});

    // Extract user and token from response
    const { user, token } = response.body;
    
    testToken = token;
    testUserId = user.id;
    
    console.log('Created test user with token:', testToken);
  });

  // Delete the test user after all tests are done
  afterAll(async () => {
    if (testUserId) {
      const response = await supertest('http://localhost:3000')
        .delete(`/api/test/delete-user/${testUserId}`)
        .set('Authorization', `Bearer ${testToken}`);
      
      
    }
  });

  it('should return 401 for unauthenticated requests to protected endpoints', async () => {
    const response = await supertest('http://localhost:3000').get('/api/readings');
    expect(response.status).toBe(401);
  });
  
  it('should return 401 even with invalid auth token', async () => {
    const response = await supertest('http://localhost:3000')
      .get('/api/readings')
      .set('Authorization', 'Bearer invalid-token');
    expect(response.status).toBe(401);
  });
});
