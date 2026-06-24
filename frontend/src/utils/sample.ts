export const sampleApiSpec = `{
  "info": {
    "title": "Sample API",
    "version": "1.0.0",
    "description": "A sample API specification for demonstrating the document generator"
  },
  "servers": [
    { "url": "https://api.example.com", "description": "Production environment" }
  ],
  "tags": [
    { "name": "User Management", "description": "All user-related endpoints" },
    { "name": "Article Management", "description": "All article-related endpoints" }
  ],
  "paths": {
    "/users": {
      "get": {
        "summary": "Get user list",
        "description": "Get all users with pagination",
        "tags": ["User Management"],
        "parameters": [
          {
            "name": "page",
            "in": "query",
            "required": false,
            "description": "Page number, starting from 1",
            "schema": { "type": "integer" }
          },
          {
            "name": "limit",
            "in": "query",
            "required": false,
            "description": "Items per page, default 20",
            "schema": { "type": "integer" }
          }
        ],
        "responses": {
          "200": {
            "description": "Successfully returned user list",
            "content": {
              "application/json": {
                "schema": { "type": "array", "items": { "type": "object" } }
              }
            }
          }
        }
      },
      "post": {
        "summary": "Create new user",
        "tags": ["User Management"],
        "requestBody": {
          "required": true,
          "description": "User information",
          "content": {
            "application/json": {
              "schema": { "type": "object" }
            }
          }
        },
        "responses": {
          "201": {
            "description": "User created successfully",
            "content": {
              "application/json": {
                "schema": { "type": "object" }
              }
            }
          },
          "400": { "description": "Invalid request parameters" }
        }
      }
    },
    "/users/{id}": {
      "get": {
        "summary": "Get user details",
        "tags": ["User Management"],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "description": "User ID",
            "schema": { "type": "string" }
          }
        ],
        "responses": {
          "200": {
            "description": "Successfully returned user details",
            "content": {
              "application/json": {
                "schema": { "type": "object" }
              }
            }
          },
          "404": { "description": "User not found" }
        }
      },
      "delete": {
        "summary": "Delete user",
        "tags": ["User Management"],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "description": "User ID",
            "schema": { "type": "string" }
          }
        ],
        "responses": {
          "204": { "description": "Successfully deleted" },
          "404": { "description": "User not found" }
        }
      }
    },
    "/articles": {
      "get": {
        "summary": "Get article list",
        "tags": ["Article Management"],
        "responses": {
          "200": {
            "description": "Successfully returned article list",
            "content": {
              "application/json": {
                "schema": { "type": "array" }
              }
            }
          }
        }
      }
    }
  }
}`;

export const sampleOpenAPI = `{
  "openapi": "3.0.0",
  "info": {
    "title": "Pet Store API",
    "version": "1.0.0",
    "description": "A simple pet store API"
  },
  "paths": {
    "/pets": {
      "get": {
        "summary": "List all pets",
        "responses": {
          "200": {
            "description": "Success",
            "content": {
              "application/json": {
                "schema": { "type": "array" }
              }
            }
          }
        }
      }
    }
  }
}`;

export const sampleAIDescription = `User login endpoint: accepts email and password via POST request, returns JWT token and user profile information. The token expires in 24 hours.

Additional requirements:
- Input validation for email format
- Password must be at least 8 characters
- Return 401 status code for invalid credentials
- Include refresh token mechanism`;
