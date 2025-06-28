import React, { useState, useRef } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Textarea } from '../ui/Textarea';
import { Select } from '../ui/Select';
import { ImportExportService } from '../../services/import-export-service';
import { CollectionApiService } from '../../services/collection-api';
import { tabManager } from '../../services/tab-manager';
import type { ImportResult, PostmanCollection, InsomniaExport } from '../../types/external-formats';
import type { OpenAPIDocument } from '../../types/openapi';

export interface ImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  onImportSuccess: (result: ImportResult) => void;
  openInTabs?: boolean;
}

type ImportFormat = 'postman' | 'insomnia' | 'curl' | 'openapi' | 'auto';

interface ImportPreview {
  format: ImportFormat;
  name?: string;
  description?: string;
  itemCount: number;
  errors: string[];
  warnings: string[];
}

export const ImportDialog: React.FC<ImportDialogProps> = ({
  isOpen,
  onClose,
  workspaceId,
  onImportSuccess,
  openInTabs = false,
}) => {
  const [format, setFormat] = useState<ImportFormat>('auto');
  const [importType, setImportType] = useState<'file' | 'text'>('file');
  const [textContent, setTextContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [shouldOpenInTabs, setShouldOpenInTabs] = useState(openInTabs);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importService = new ImportExportService();

  const formatOptions = [
    { value: 'auto', label: 'Auto-detect' },
    { value: 'postman', label: 'Postman Collection v2.1' },
    { value: 'insomnia', label: 'Insomnia Export' },
    { value: 'curl', label: 'curl Command' },
    { value: 'openapi', label: 'OpenAPI 3.0 Specification' },
  ];

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    await generatePreview(file, null);
  };

  const handleTextContentChange = async (content: string) => {
    setTextContent(content);
    if (content.trim()) {
      await generatePreview(null, content);
    } else {
      setPreview(null);
    }
  };

  const generatePreview = async (file: File | null, text: string | null) => {
    try {
      let content: string;
      
      if (file) {
        content = await file.text();
      } else if (text) {
        content = text;
      } else {
        return;
      }

      const detectedFormat = detectFormat(content);
      const previewData: ImportPreview = {
        format: detectedFormat,
        itemCount: 0,
        errors: [],
        warnings: [],
      };

      try {
        if (detectedFormat === 'postman') {
          const parsed = JSON.parse(content) as PostmanCollection;
          previewData.name = parsed.info.name;
          previewData.description = parsed.info.description?.content || '';
          previewData.itemCount = countPostmanItems(parsed.item || []);
        } else if (detectedFormat === 'insomnia') {
          const parsed = JSON.parse(content) as InsomniaExport;
          const workspace = parsed.resources.find(r => r._type === 'workspace');
          const requests = parsed.resources.filter(r => r._type === 'request');
          previewData.name = workspace?.name || 'Insomnia Workspace';
          previewData.description = workspace?.description || '';
          previewData.itemCount = requests.length;
        } else if (detectedFormat === 'curl') {
          previewData.name = 'curl Command';
          previewData.itemCount = 1;
        } else if (detectedFormat === 'openapi') {
          const parsed = JSON.parse(content) as OpenAPIDocument;
          previewData.name = parsed.info.title;
          previewData.description = parsed.info.description || '';
          previewData.itemCount = countOpenAPIOperations(parsed.paths);
        }
      } catch (error) {
        previewData.errors.push('Failed to parse content: ' + (error instanceof Error ? error.message : 'Unknown error'));
      }

      setPreview(previewData);
    } catch (error) {
      console.error('Preview generation failed:', error);
    }
  };

  const detectFormat = (content: string): ImportFormat => {
    const trimmed = content.trim();
    
    if (trimmed.startsWith('curl ')) {
      return 'curl';
    }
    
    try {
      const parsed = JSON.parse(trimmed);
      
      if (parsed.info && parsed.info.schema && parsed.info.schema.includes('postman')) {
        return 'postman';
      }
      
      if (parsed._type === 'export' && parsed.__export_format && parsed.resources) {
        return 'insomnia';
      }
      
      if (parsed.openapi && parsed.info && parsed.paths) {
        return 'openapi';
      }
    } catch {
      // Not valid JSON
    }
    
    return 'postman'; // Default fallback
  };

  const countPostmanItems = (items: any[]): number => {
    let count = 0;
    for (const item of items) {
      if (item.request) {
        count++;
      }
      if (item.item) {
        count += countPostmanItems(item.item);
      }
    }
    return count;
  };

  const countOpenAPIOperations = (paths: any): number => {
    let count = 0;
    for (const path of Object.values(paths)) {
      const methods = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'];
      for (const method of methods) {
        if ((path as any)[method]) {
          count++;
        }
      }
    }
    return count;
  };

  const openImportedRequestsInTabs = async (result: ImportResult) => {
    try {
      // Get the first few requests from imported collections and open them in tabs
      const maxTabsToOpen = 5; // Limit to avoid overwhelming the user
      let openedTabs = 0;

      for (const collection of result.collections) {
        if (openedTabs >= maxTabsToOpen) break;
        
        try {
          const requests = await CollectionApiService.listRequests(collection.id);
          
          for (const request of requests.slice(0, maxTabsToOpen - openedTabs)) {
            tabManager.openRequestInTab(request, openedTabs === 0); // Make first tab active
            openedTabs++;
          }
        } catch (error) {
          console.warn('Failed to open requests from collection:', collection.name, error);
        }
      }
    } catch (error) {
      console.error('Failed to open imported requests in tabs:', error);
    }
  };

  const handleImport = async () => {
    if (!preview) return;

    setLoading(true);
    try {
      let result: ImportResult;
      
      if (preview.format === 'postman') {
        const content = selectedFile ? await selectedFile.text() : textContent;
        const collection = JSON.parse(content) as PostmanCollection;
        result = await importService.importPostmanCollection(workspaceId, collection);
      } else if (preview.format === 'insomnia') {
        const content = selectedFile ? await selectedFile.text() : textContent;
        const workspace = JSON.parse(content) as InsomniaExport;
        result = await importService.importInsomniaWorkspace(workspaceId, workspace);
      } else if (preview.format === 'openapi') {
        const content = selectedFile ? await selectedFile.text() : textContent;
        const spec = JSON.parse(content) as OpenAPIDocument;
        result = await importService.importOpenAPISpec(workspaceId, spec);
      } else if (preview.format === 'curl') {
        // For curl, we need to create a collection first
        const CollectionApiService = (await import('../../services/collection-api')).CollectionApiService;
        const newCollection = await CollectionApiService.createCollection({
          workspace_id: workspaceId,
          name: 'Imported from curl',
          description: 'Collection created from curl command import',
        });
        
        const curlRequest = await importService.importCurlCommand(newCollection.id, textContent);
        await CollectionApiService.createRequest(curlRequest);
        
        result = {
          success: true,
          collections: [{
            id: newCollection.id,
            name: newCollection.name,
            description: newCollection.description || '',
            requestCount: 1,
            folderCount: 0,
            sourceFormat: 'curl' as const,
          }],
          environments: [],
          errors: [],
          warnings: [],
          summary: {
            totalItems: 1,
            successfulItems: 1,
            failedItems: 0,
            warningItems: 0,
            duration: 0,
            sourceFormat: 'curl',
          },
        };
      } else {
        throw new Error('Unsupported format');
      }

      // Open imported requests in tabs if requested
      if (shouldOpenInTabs && result.success && result.collections.length > 0) {
        await openImportedRequestsInTabs(result);
      }

      onImportSuccess(result);
      handleClose();
    } catch (error) {
      console.error('Import failed:', error);
      // TODO: Show error message to user
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormat('auto');
    setImportType('file');
    setTextContent('');
    setSelectedFile(null);
    setPreview(null);
    setLoading(false);
    setShouldOpenInTabs(openInTabs);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Import Collection"
      size="lg"
      className="max-w-2xl"
    >
      <div className="space-y-6">
        {/* Import Type Selection */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Import Method
          </label>
          <div className="flex space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                value="file"
                checked={importType === 'file'}
                onChange={(e) => setImportType(e.target.value as 'file' | 'text')}
                className="mr-2"
              />
              Upload File
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="text"
                checked={importType === 'text'}
                onChange={(e) => setImportType(e.target.value as 'file' | 'text')}
                className="mr-2"
              />
              Paste Content
            </label>
          </div>
        </div>

        {/* Format Selection */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Format
          </label>
          <Select
            value={format}
            onChange={(value) => setFormat(value as ImportFormat)}
            options={formatOptions}
            placeholder="Select format"
          />
        </div>

        {/* File Upload */}
        {importType === 'file' && (
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Select File
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.txt,.yaml,.yml"
              onChange={handleFileSelect}
              className="block w-full text-sm text-slate-500 dark:text-slate-400
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-medium
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100
                dark:file:bg-blue-900 dark:file:text-blue-300"
            />
          </div>
        )}

        {/* Text Input */}
        {importType === 'text' && (
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Paste Content
            </label>
            <Textarea
              value={textContent}
              onChange={(e) => handleTextContentChange(e.target.value)}
              placeholder="Paste your Postman collection, Insomnia export, or curl command here..."
              rows={8}
              className="font-mono text-sm"
            />
          </div>
        )}

        {/* Import Options */}
        {preview && preview.itemCount > 0 && (
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
              Import Options
            </label>
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={shouldOpenInTabs}
                  onChange={(e) => setShouldOpenInTabs(e.target.checked)}
                  className="mr-3 h-4 w-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  Open imported requests in tabs for immediate editing
                </span>
              </label>
            </div>
          </div>
        )}

        {/* Preview */}
        {preview && (
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
            <h3 className="font-medium text-slate-900 dark:text-slate-100 mb-2">
              Preview
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Format:</span>
                <span className="font-medium capitalize">{preview.format}</span>
              </div>
              {preview.name && (
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Name:</span>
                  <span className="font-medium">{preview.name}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Items:</span>
                <span className="font-medium">{preview.itemCount}</span>
              </div>
              
              {preview.errors.length > 0 && (
                <div className="mt-3">
                  <span className="text-red-600 dark:text-red-400 font-medium">Errors:</span>
                  <ul className="mt-1 text-red-600 dark:text-red-400 text-xs">
                    {preview.errors.map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {preview.warnings.length > 0 && (
                <div className="mt-3">
                  <span className="text-yellow-600 dark:text-yellow-400 font-medium">Warnings:</span>
                  <ul className="mt-1 text-yellow-600 dark:text-yellow-400 text-xs">
                    {preview.warnings.map((warning, index) => (
                      <li key={index}>• {warning}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

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
            onClick={handleImport}
            disabled={!preview || preview.errors.length > 0 || loading}
            loading={loading}
          >
            {loading ? 'Importing...' : 'Import'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};