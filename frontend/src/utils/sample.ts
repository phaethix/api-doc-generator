export const sampleApiSpec = `{
  "info": {
    "title": "示例 API",
    "version": "1.0.0",
    "description": "这是一个示例 API 规范，用于演示文档生成器的功能"
  },
  "servers": [
    { "url": "https://api.example.com", "description": "生产环境" }
  ],
  "tags": [
    { "name": "用户管理", "description": "用户相关的所有接口" },
    { "name": "文章管理", "description": "文章相关的所有接口" }
  ],
  "paths": {
    "/users": {
      "get": {
        "summary": "获取用户列表",
        "description": "分页获取所有用户",
        "tags": ["用户管理"],
        "parameters": [
          {
            "name": "page",
            "in": "query",
            "required": false,
            "description": "页码，从 1 开始",
            "schema": { "type": "integer" }
          },
          {
            "name": "limit",
            "in": "query",
            "required": false,
            "description": "每页数量，默认 20",
            "schema": { "type": "integer" }
          }
        ],
        "responses": {
          "200": {
            "description": "成功返回用户列表",
            "content": {
              "application/json": {
                "schema": { "type": "array", "items": { "type": "object" } }
              }
            }
          }
        }
      },
      "post": {
        "summary": "创建新用户",
        "tags": ["用户管理"],
        "requestBody": {
          "required": true,
          "description": "用户信息",
          "content": {
            "application/json": {
              "schema": { "type": "object" }
            }
          }
        },
        "responses": {
          "201": {
            "description": "用户创建成功",
            "content": {
              "application/json": {
                "schema": { "type": "object" }
              }
            }
          },
          "400": { "description": "请求参数无效" }
        }
      }
    },
    "/users/{id}": {
      "get": {
        "summary": "获取用户详情",
        "tags": ["用户管理"],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "description": "用户 ID",
            "schema": { "type": "string" }
          }
        ],
        "responses": {
          "200": {
            "description": "成功返回用户详情",
            "content": {
              "application/json": {
                "schema": { "type": "object" }
              }
            }
          },
          "404": { "description": "用户不存在" }
        }
      },
      "delete": {
        "summary": "删除用户",
        "tags": ["用户管理"],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "description": "用户 ID",
            "schema": { "type": "string" }
          }
        ],
        "responses": {
          "204": { "description": "删除成功" },
          "404": { "description": "用户不存在" }
        }
      }
    },
    "/articles": {
      "get": {
        "summary": "获取文章列表",
        "tags": ["文章管理"],
        "responses": {
          "200": {
            "description": "成功返回文章列表",
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
    "description": "一个简单的宠物商店 API"
  },
  "paths": {
    "/pets": {
      "get": {
        "summary": "列出所有宠物",
        "responses": {
          "200": {
            "description": "成功",
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
