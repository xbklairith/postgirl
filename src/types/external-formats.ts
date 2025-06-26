// Postman Collection v2.1 format types
export interface PostmanCollection {
  info: PostmanInfo;
  item: PostmanItem[];
  auth?: PostmanAuth;
  event?: PostmanEvent[];
  variable?: PostmanVariable[];
}

export interface PostmanInfo {
  name: string;
  description?: PostmanDescription;
  version?: PostmanVersion;
  schema: string;
  _postman_id?: string;
}

export interface PostmanDescription {
  content?: string;
  type?: string;
  version?: PostmanVersion;
}

export interface PostmanVersion {
  major: number;
  minor: number;
  patch: number;
  identifier?: string;
  meta?: any;
}

export interface PostmanItem {
  id?: string;
  name: string;
  description?: PostmanDescription;
  item?: PostmanItem[];
  request?: PostmanRequest;
  response?: PostmanResponse[];
  event?: PostmanEvent[];
  protocolProfileBehavior?: any;
}

export interface PostmanRequest {
  url?: PostmanUrl | string;
  method?: string;
  header?: PostmanHeader[];
  body?: PostmanRequestBody;
  auth?: PostmanAuth;
  proxy?: PostmanProxy;
  certificate?: PostmanCertificate;
  description?: PostmanDescription;
}

export interface PostmanUrl {
  raw?: string;
  protocol?: string;
  host?: string[];
  port?: string;
  path?: string[];
  query?: PostmanQueryParam[];
  hash?: string;
  variable?: PostmanVariable[];
}

export interface PostmanHeader {
  key: string;
  value: string;
  disabled?: boolean;
  description?: PostmanDescription;
}

export interface PostmanQueryParam {
  key: string;
  value?: string;
  disabled?: boolean;
  description?: PostmanDescription;
}

export interface PostmanRequestBody {
  mode?: 'raw' | 'urlencoded' | 'formdata' | 'file' | 'graphql';
  raw?: string;
  urlencoded?: PostmanFormParameter[];
  formdata?: PostmanFormParameter[];
  file?: PostmanFile;
  graphql?: PostmanGraphQL;
  options?: PostmanRequestBodyOptions;
  disabled?: boolean;
}

export interface PostmanFormParameter {
  key: string;
  value?: string;
  disabled?: boolean;
  type?: 'text' | 'file';
  src?: string | string[];
  description?: PostmanDescription;
}

export interface PostmanFile {
  src?: string;
  content?: string;
}

export interface PostmanGraphQL {
  query?: string;
  variables?: string;
}

export interface PostmanRequestBodyOptions {
  raw?: {
    language?: string;
  };
}

export interface PostmanAuth {
  type: string;
  noauth?: any;
  apikey?: PostmanApiKeyAuth[];
  awsv4?: PostmanAwsAuth[];
  basic?: PostmanBasicAuth[];
  bearer?: PostmanBearerAuth[];
  digest?: PostmanDigestAuth[];
  hawk?: PostmanHawkAuth[];
  ntlm?: PostmanNtlmAuth[];
  oauth1?: PostmanOAuth1Auth[];
  oauth2?: PostmanOAuth2Auth[];
}

export interface PostmanApiKeyAuth {
  key: string;
  value: any;
  type?: string;
}

export interface PostmanBasicAuth {
  key: string;
  value: any;
  type?: string;
}

export interface PostmanBearerAuth {
  key: string;
  value: any;
  type?: string;
}

export interface PostmanDigestAuth {
  key: string;
  value: any;
  type?: string;
}

export interface PostmanHawkAuth {
  key: string;
  value: any;
  type?: string;
}

export interface PostmanNtlmAuth {
  key: string;
  value: any;
  type?: string;
}

export interface PostmanOAuth1Auth {
  key: string;
  value: any;
  type?: string;
}

export interface PostmanOAuth2Auth {
  key: string;
  value: any;
  type?: string;
}

export interface PostmanAwsAuth {
  key: string;
  value: any;
  type?: string;
}

export interface PostmanResponse {
  id?: string;
  name?: string;
  originalRequest?: PostmanRequest;
  status?: string;
  code?: number;
  header?: PostmanHeader[];
  body?: string;
  cookie?: PostmanCookie[];
  responseTime?: number;
}

export interface PostmanCookie {
  key: string;
  value: string;
  expires?: string;
  maxAge?: number;
  domain?: string;
  path?: string;
  secure?: boolean;
  httpOnly?: boolean;
  hostOnly?: boolean;
  creation?: string;
  lastAccessed?: string;
}

export interface PostmanVariable {
  id?: string;
  key: string;
  value?: any;
  type?: string;
  name?: string;
  description?: PostmanDescription;
  system?: boolean;
  disabled?: boolean;
}

export interface PostmanEvent {
  id?: string;
  listen: string;
  script?: PostmanScript;
  disabled?: boolean;
}

export interface PostmanScript {
  id?: string;
  type?: string;
  exec?: string[];
  src?: PostmanUrl;
  name?: string;
}

export interface PostmanProxy {
  match?: string;
  host?: string;
  port?: number;
  tunnel?: boolean;
  disabled?: boolean;
}

export interface PostmanCertificate {
  name?: string;
  matches?: string[];
  key?: PostmanCertificateFile;
  cert?: PostmanCertificateFile;
  passphrase?: string;
}

export interface PostmanCertificateFile {
  src?: string;
}

// Insomnia format types
export interface InsomniaExport {
  _type: 'export';
  __export_format: number;
  __export_date: string;
  __export_source: string;
  resources: InsomniaResource[];
}

export interface InsomniaResource {
  _id: string;
  _type: string;
  parentId?: string;
  modified: number;
  created: number;
  name?: string;
  description?: string;
  [key: string]: any;
}

export interface InsomniaWorkspace extends InsomniaResource {
  _type: 'workspace';
  name: string;
  description?: string;
  scope?: string;
}

export interface InsomniaRequestGroup extends InsomniaResource {
  _type: 'request_group';
  name: string;
  description?: string;
  environment?: Record<string, any>;
  environmentPropertyOrder?: Record<string, string[]>;
  metaSortKey?: number;
}

export interface InsomniaRequest extends InsomniaResource {
  _type: 'request';
  name: string;
  url: string;
  method: string;
  body?: InsomniaRequestBody;
  headers?: InsomniaHeader[];
  authentication?: InsomniaAuthentication;
  parameters?: InsomniaParameter[];
  settingStoreCookies?: boolean;
  settingSendCookies?: boolean;
  settingDisableRenderRequestBody?: boolean;
  settingEncodeUrl?: boolean;
  settingRebuildPath?: boolean;
  settingFollowRedirects?: string;
  metaSortKey?: number;
}

export interface InsomniaRequestBody {
  mimeType?: string;
  text?: string;
  params?: InsomniaFormDataParam[];
}

export interface InsomniaFormDataParam {
  id?: string;
  name: string;
  value: string;
  description?: string;
  type?: string;
  fileName?: string;
}

export interface InsomniaHeader {
  id?: string;
  name: string;
  value: string;
  description?: string;
  disabled?: boolean;
}

export interface InsomniaParameter {
  id?: string;
  name: string;
  value: string;
  description?: string;
  disabled?: boolean;
}

export interface InsomniaAuthentication {
  type: string;
  disabled?: boolean;
  username?: string;
  password?: string;
  token?: string;
  prefix?: string;
  [key: string]: any;
}

export interface InsomniaEnvironment extends InsomniaResource {
  _type: 'environment';
  name: string;
  data: Record<string, any>;
  dataPropertyOrder?: Record<string, string[]>;
  color?: string;
  isPrivate?: boolean;
  metaSortKey?: number;
}

// Import/Export result types
export interface ImportResult {
  success: boolean;
  collections: ImportedCollection[];
  environments: ImportedEnvironment[];
  errors: ImportError[];
  warnings: ImportWarning[];
  summary: ImportSummary;
}

export interface ImportedCollection {
  id: string;
  name: string;
  description?: string;
  requestCount: number;
  folderCount: number;
  sourceFormat: 'postman' | 'insomnia' | 'curl' | 'openapi';
  originalId?: string;
}

export interface ImportedEnvironment {
  id: string;
  name: string;
  variableCount: number;
  sourceFormat: 'postman' | 'insomnia';
  originalId?: string;
}

export interface ImportError {
  type: 'parsing' | 'validation' | 'conversion' | 'unknown';
  message: string;
  details?: string;
  line?: number;
  column?: number;
  itemName?: string;
}

export interface ImportWarning {
  type: 'unsupported_feature' | 'data_loss' | 'format_issue';
  message: string;
  details?: string;
  itemName?: string;
}

export interface ImportSummary {
  totalItems: number;
  successfulItems: number;
  failedItems: number;
  warningItems: number;
  duration: number;
  sourceFormat: string;
  sourceVersion?: string;
}

// Export types
export interface ExportOptions {
  format: 'postman' | 'insomnia' | 'curl' | 'openapi';
  includeEnvironments: boolean;
  includeTests: boolean;
  includeDocumentation: boolean;
  exportPath?: string;
}

export interface ExportResult {
  success: boolean;
  filePath?: string;
  data?: any;
  errors: ExportError[];
  summary: ExportSummary;
}

export interface ExportError {
  type: 'conversion' | 'file_write' | 'validation' | 'unknown';
  message: string;
  details?: string;
  itemName?: string;
}

export interface ExportSummary {
  totalItems: number;
  exportedItems: number;
  skippedItems: number;
  duration: number;
  targetFormat: string;
  fileSize?: number;
}

// Utility types for conversion
export interface ConversionContext {
  workspaceId: string;
  sourceFormat: 'postman' | 'insomnia' | 'curl' | 'openapi';
  targetFormat: 'postgirl';
  preserveIds: boolean;
  validateData: boolean;
  options: ConversionOptions;
}

export interface ConversionOptions {
  mergeHeaders: boolean;
  preserveScripts: boolean;
  convertVariables: boolean;
  includeExamples: boolean;
  flattenFolders: boolean;
  maxDepth: number;
}