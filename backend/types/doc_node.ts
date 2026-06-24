// types/doc_node.ts
// DocNode: top-level IR, decouples ApiSpec from rendering
export interface DocNode {
  api: {
    title: string;
    version: string;
    description?: string;
  };
  endpoints: Endpoint[];
  tags?: TagGroup[];
}

// Endpoint: flattened single API operation
export interface Endpoint {
  method: string;
  path: string;
  summary: string;
  description?: string;
  tags: string[];
  parameters: ParamDetail[];
  requestBody?: BodyDetail;
  responses: ResponseDetail[];
}

// ParamDetail
export interface ParamDetail {
  name: string;
  location: string;
  type: string;
  required: boolean;
  description?: string;
}

// BodyDetail
export interface BodyDetail {
  contentType: string;
  type: string;
  required: boolean;
  description?: string;
}

// ResponseDetail
export interface ResponseDetail {
  status: string;
  description: string;
  contentType?: string;
  type?: string;
}

// TagGroup
export interface TagGroup {
  name: string;
  description?: string;
  endpoints: Endpoint[];
}
