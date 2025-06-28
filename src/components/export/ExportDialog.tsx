import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { ImportExportService } from '../../services/import-export-service';
import type { ExportResult } from '../../types/external-formats';

export interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  collectionId: string;
  collectionName: string;
  onExportSuccess: (result: ExportResult) => void;
}

type ExportFormat = 'postman' | 'curl' | 'openapi';

interface ExportPreview {
  format: ExportFormat;
  fileName: string;
  estimatedSize: string;
  itemCount: number;
}

export const ExportDialog: React.FC<ExportDialogProps> = ({
  isOpen,
  onClose,
  collectionId,
  collectionName,
  onExportSuccess,
}) => {
  const [format, setFormat] = useState<ExportFormat>('postman');
  const [includeEnvironments, setIncludeEnvironments] = useState(false);
  const [includeTests, setIncludeTests] = useState(false);
  const [includeDocumentation, setIncludeDocumentation] = useState(true);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<ExportPreview | null>(null);
  const importExportService = new ImportExportService();

  const formatOptions = [
    { value: 'postman', label: 'Postman Collection v2.1' },
    { value: 'curl', label: 'curl Commands' },
    { value: 'openapi', label: 'OpenAPI 3.0 Specification' },
  ];

  React.useEffect(() => {
    if (isOpen) {
      generatePreview();
    }
  }, [isOpen, format, includeEnvironments, includeTests, includeDocumentation]);

  const generatePreview = async () => {
    try {
      // Get collection info for preview
      const CollectionApiService = (await import('../../services/collection-api')).CollectionApiService;
      const requests = await CollectionApiService.listRequests(collectionId);
      
      const fileExtension = getFileExtension(format);
      const fileName = `${sanitizeFileName(collectionName)}.${fileExtension}`;
      const estimatedSize = estimateFileSize(requests.length, format);
      
      setPreview({
        format,
        fileName,
        estimatedSize,
        itemCount: requests.length,
      });
    } catch (error) {
      console.error('Preview generation failed:', error);
    }
  };

  const getFileExtension = (format: ExportFormat): string => {
    switch (format) {
      case 'postman':
        return 'postman_collection.json';
      case 'curl':
        return 'curl_commands.sh';
      case 'openapi':
        return 'openapi.yaml';
      default:
        return 'json';
    }
  };

  const sanitizeFileName = (name: string): string => {
    return name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  };

  const estimateFileSize = (itemCount: number, format: ExportFormat): string => {
    let baseSize = 0;
    
    switch (format) {
      case 'postman':
        baseSize = itemCount * 200; // ~200 bytes per request
        break;
      case 'curl':
        baseSize = itemCount * 100; // ~100 bytes per curl command
        break;
      case 'openapi':
        baseSize = itemCount * 300; // ~300 bytes per endpoint
        break;
    }
    
    if (baseSize < 1024) {
      return `~${baseSize} bytes`;
    } else if (baseSize < 1024 * 1024) {
      return `~${Math.round(baseSize / 1024)} KB`;
    } else {
      return `~${Math.round(baseSize / (1024 * 1024))} MB`;
    }
  };

  const handleExport = async () => {
    if (!preview) return;

    setLoading(true);
    try {
      let result: ExportResult;
      
      if (format === 'postman') {
        result = await importExportService.exportToPostman(collectionId);
      } else if (format === 'curl') {
        // Export as curl commands
        const CollectionApiService = (await import('../../services/collection-api')).CollectionApiService;
        const requests = await CollectionApiService.listRequests(collectionId);
        
        const curlCommands = requests.map(request => {
          let curlCommand = `curl -X ${request.method}`;
          
          // Add headers
          const headers = JSON.parse(request.headers || '{}');
          Object.entries(headers).forEach(([key, value]) => {
            curlCommand += ` -H "${key}: ${value}"`;
          });
          
          // Add body for POST/PUT/PATCH requests
          if (request.body && ['POST', 'PUT', 'PATCH'].includes(request.method)) {
            curlCommand += ` --data '${request.body}'`;
          }
          
          // Add URL
          curlCommand += ` "${request.url}"`;
          
          return `# ${request.name}\n${curlCommand}\n`;
        }).join('\n');
        
        result = {
          success: true,
          data: curlCommands,
          errors: [],
          summary: {
            totalItems: requests.length,
            exportedItems: requests.length,
            skippedItems: 0,
            duration: 0,
            targetFormat: 'curl Commands',
          },
        };
      } else if (format === 'openapi') {
        // Export as OpenAPI spec
        const CollectionApiService = (await import('../../services/collection-api')).CollectionApiService;
        const collection = await CollectionApiService.getCollection(collectionId);
        const requests = await CollectionApiService.listRequests(collectionId);
        
        const openApiSpec = {
          openapi: '3.0.0',
          info: {
            title: collection?.name || 'API Collection',
            description: collection?.description || 'Exported from Postgirl',
            version: '1.0.0',
          },
          servers: [
            {
              url: 'https://api.example.com',
              description: 'Production server',
            },
          ],
          paths: {} as any,
        };
        
        // Convert requests to OpenAPI paths
        requests.forEach(request => {
          try {
            const url = new URL(request.url);
            const path = url.pathname;
            const method = request.method.toLowerCase();
            
            if (!openApiSpec.paths[path]) {
              openApiSpec.paths[path] = {};
            }
            
            openApiSpec.paths[path][method] = {
              summary: request.name,
              description: request.description || '',
              responses: {
                '200': {
                  description: 'Successful response',
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                      },
                    },
                  },
                },
              },
            };
            
            // Add request body for applicable methods
            if (request.body && ['post', 'put', 'patch'].includes(method)) {
              openApiSpec.paths[path][method].requestBody = {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                    },
                  },
                },
              };
            }
          } catch (error) {
            console.warn('Failed to parse URL for request:', request.name);
          }
        });
        
        result = {
          success: true,
          data: openApiSpec,
          errors: [],
          summary: {
            totalItems: requests.length,
            exportedItems: requests.length,
            skippedItems: 0,
            duration: 0,
            targetFormat: 'OpenAPI 3.0',
          },
        };
      } else {
        throw new Error('Unsupported export format');
      }

      // Download the file
      if (result.success && result.data) {
        downloadFile(result.data, preview.fileName, format);
      }

      onExportSuccess(result);
      handleClose();
    } catch (error) {
      console.error('Export failed:', error);
      // TODO: Show error message to user
    } finally {
      setLoading(false);
    }
  };

  const downloadFile = (data: any, fileName: string, format: ExportFormat) => {
    let content: string;
    let mimeType: string;
    
    if (format === 'curl') {
      content = data;
      mimeType = 'text/plain';
    } else if (format === 'openapi') {
      content = JSON.stringify(data, null, 2);
      mimeType = 'application/json';
    } else {
      content = JSON.stringify(data, null, 2);
      mimeType = 'application/json';
    }
    
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    
    URL.revokeObjectURL(url);
  };

  const handleClose = () => {
    setFormat('postman');
    setIncludeEnvironments(false);
    setIncludeTests(false);
    setIncludeDocumentation(true);
    setLoading(false);
    setPreview(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Export Collection"
      size="lg"
      className="max-w-xl"
    >
      <div className="space-y-6">
        {/* Format Selection */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Export Format
          </label>
          <Select
            value={format}
            onChange={(value) => setFormat(value as ExportFormat)}
            options={formatOptions}
            placeholder="Select format"
          />
        </div>

        {/* Export Options */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
            Export Options
          </label>
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={includeEnvironments}
                onChange={(e) => setIncludeEnvironments(e.target.checked)}
                className="mr-3 h-4 w-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                disabled={format === 'curl'} // curl doesn't support environments
              />
              <span className={`text-sm ${format === 'curl' ? 'text-slate-400' : 'text-slate-700 dark:text-slate-300'}`}>
                Include environments
              </span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={includeTests}
                onChange={(e) => setIncludeTests(e.target.checked)}
                className="mr-3 h-4 w-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                disabled={format === 'curl'} // curl doesn't support tests
              />
              <span className={`text-sm ${format === 'curl' ? 'text-slate-400' : 'text-slate-700 dark:text-slate-300'}`}>
                Include test scripts
              </span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={includeDocumentation}
                onChange={(e) => setIncludeDocumentation(e.target.checked)}
                className="mr-3 h-4 w-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-slate-700 dark:text-slate-300">
                Include documentation
              </span>
            </label>
          </div>
        </div>

        {/* Preview */}
        {preview && (
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
            <h3 className="font-medium text-slate-900 dark:text-slate-100 mb-2">
              Export Preview
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Format:</span>
                <span className="font-medium capitalize">{preview.format}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">File name:</span>
                <span className="font-medium font-mono text-xs">{preview.fileName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Items:</span>
                <span className="font-medium">{preview.itemCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Estimated size:</span>
                <span className="font-medium">{preview.estimatedSize}</span>
              </div>
            </div>
          </div>
        )}

        {/* Format Description */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            {format === 'postman' && 
              'Export as Postman Collection v2.1 format, compatible with Postman app.'
            }
            {format === 'curl' && 
              'Export as shell script with curl commands for each request.'
            }
            {format === 'openapi' && 
              'Export as OpenAPI 3.0 specification for API documentation and code generation.'
            }
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-slate-700">
          <Button
            variant="secondary"
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={!preview || loading}
            loading={loading}
          >
            {loading ? 'Exporting...' : 'Export & Download'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};