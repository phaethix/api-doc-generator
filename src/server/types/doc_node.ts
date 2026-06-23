// types/doc_node.ts
export interface DocNode {
  api: {
    title: string;
    version: string;
    description?: string;
  };
  endpoints: Endpoint[];
  tags?: TagGroup[];
}

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

export interface ParamDetail {
  name: string;
  location: string;
  type: string;
  required: boolean;
  description?: string;
}

export interface BodyDetail {
  contentType: string;
  type: string;
  required: boolean;
  description?: string;
}

export interface ResponseDetail {
  status: string;
  description: string;
  contentType?: string;
  type?: string;
}

export interface TagGroup {
  name: string;
  description?: string;
  endpoints: Endpoint[];
}
