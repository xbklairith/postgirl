import React, { useState } from 'react';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Button, Select, VariableHighlighter } from '../ui';
import type { RequestBody } from '../../types/http';

export interface RequestBodyEditorProps {
  body: RequestBody;
  onChange: (body: RequestBody) => void;
  variables?: Record<string, string>;
  className?: string;
}

const BODY_TYPES = [
  { value: 'none', label: 'No Body' },
  { value: 'raw', label: 'Raw Text' },
  { value: 'json', label: 'JSON' },
  { value: 'formData', label: 'Form Data' },
  { value: 'formUrlEncoded', label: 'Form URL Encoded' },
];

const CONTENT_TYPES = [
  { value: 'text/plain', label: 'Text' },
  { value: 'application/json', label: 'JSON' },
  { value: 'application/xml', label: 'XML' },
  { value: 'text/html', label: 'HTML' },
  { value: 'application/javascript', label: 'JavaScript' },
  { value: 'text/css', label: 'CSS' },
];

export const RequestBodyEditor: React.FC<RequestBodyEditorProps> = ({
  body,
  onChange,
  variables = {},
  className = '',
}) => {
  const [newFormKey, setNewFormKey] = useState('');
  const [newFormValue, setNewFormValue] = useState('');

  const handleBodyTypeChange = (bodyType: string) => {
    switch (bodyType) {
      case 'none':
        onChange({ type: 'none' });
        break;
      case 'raw':
        onChange({ type: 'raw', content: '', contentType: 'text/plain' });
        break;
      case 'json':
        onChange({ type: 'json', data: {}, content: '{}' });
        break;
      case 'formData':
        onChange({ type: 'formData', fields: {} });
        break;
      case 'formUrlEncoded':
        onChange({ type: 'formUrlEncoded', fields: {} });
        break;
    }
  };

  const handleRawContentChange = (content: string) => {
    if (body.type === 'raw') {
      onChange({ ...body, content });
    }
  };

  const handleContentTypeChange = (contentType: string) => {
    if (body.type === 'raw') {
      onChange({ ...body, contentType });
    }
  };

  const handleJsonDataChange = (content: string) => {
    if (body.type === 'json') {
      try {
        const data = JSON.parse(content || '{}');
        onChange({ ...body, data, content });
      } catch {
        // Keep the raw string for editing even if JSON is invalid
        onChange({ ...body, content });
      }
    }
  };

  const addFormField = () => {
    if (!newFormKey.trim()) return;

    if (body.type === 'formData' || body.type === 'formUrlEncoded') {
      onChange({
        ...body,
        fields: {
          ...body.fields,
          [newFormKey.trim()]: newFormValue,
        },
      });
      setNewFormKey('');
      setNewFormValue('');
    }
  };

  const removeFormField = (key: string) => {
    if (body.type === 'formData' || body.type === 'formUrlEncoded') {
      const newFields = { ...body.fields };
      delete newFields[key];
      onChange({ ...body, fields: newFields });
    }
  };

  const updateFormField = (key: string, value: string) => {
    if (body.type === 'formData' || body.type === 'formUrlEncoded') {
      onChange({
        ...body,
        fields: {
          ...body.fields,
          [key]: value,
        },
      });
    }
  };

  const formatJsonContent = () => {
    if (body.type === 'json') {
      try {
        // If we have content, try to parse and format it
        if (body.content) {
          const parsed = JSON.parse(body.content);
          const formatted = JSON.stringify(parsed, null, 2);
          onChange({ ...body, data: parsed, content: formatted });
        } else if (body.data) {
          // If we only have data, format it
          const formatted = JSON.stringify(body.data, null, 2);
          onChange({ ...body, data: body.data, content: formatted });
        }
      } catch (error) {
        // If JSON is invalid, keep current content unchanged
        // Don't clear the content on formatting errors
        console.warn('JSON formatting failed:', error);
      }
    }
  };

  const getJsonContent = (): string => {
    if (body.type === 'json') {
      // Use the raw content if available, otherwise stringify the data
      return body.content || JSON.stringify(body.data, null, 2);
    }
    return '';
  };

  return (
    <div className={className}>
      <div className="space-y-4">
        {/* Body Type Selector */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Body Type
          </label>
          <Select
            value={body.type}
            onChange={handleBodyTypeChange}
            options={BODY_TYPES}
            className="w-48"
          />
        </div>

        {/* Body Content Based on Type */}
        {body.type === 'raw' && (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Content Type
              </label>
              <Select
                value={body.contentType}
                onChange={handleContentTypeChange}
                options={CONTENT_TYPES}
                className="w-64"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Content
              </label>
              <VariableHighlighter
                value={body.content}
                onChange={handleRawContentChange}
                variables={variables}
                multiline
                rows={8}
                placeholder="Enter request body content..."
                className="font-mono text-sm"
              />
            </div>
          </div>
        )}

        {body.type === 'json' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                JSON Content
              </label>
              <Button
                variant="ghost"
                size="sm"
                onClick={formatJsonContent}
                className="text-xs"
              >
                Format JSON
              </Button>
            </div>
            <VariableHighlighter
              value={getJsonContent()}
              onChange={handleJsonDataChange}
              variables={variables}
              multiline
              rows={10}
              placeholder='{\n  "key": "value"\n}'
              className="font-mono text-sm"
              style={{
                fontFamily: '"SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace',
                fontSize: '13px',
                fontWeight: '400',
                letterSpacing: '0.025em',
              }}
            />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Content-Type will be automatically set to application/json
            </p>
          </div>
        )}

        {(body.type === 'formData' || body.type === 'formUrlEncoded') && (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              {body.type === 'formData' ? 'Form Data' : 'Form URL Encoded'} Fields
            </label>
            
            {/* Existing Fields */}
            <div className="space-y-2">
              {Object.entries(body.fields).map(([key, value]) => (
                <div key={key} className="flex items-center space-x-2">
                  <div className="flex-1">
                    <VariableHighlighter
                      value={key}
                      onChange={(newKey) => {
                        if (newKey !== key) {
                          const newFields = { ...body.fields };
                          delete newFields[key];
                          newFields[newKey] = value;
                          if (body.type === 'formData' || body.type === 'formUrlEncoded') {
                            onChange({ ...body, fields: newFields });
                          }
                        }
                      }}
                      variables={variables}
                      placeholder="Field name"
                      className="font-mono text-sm"
                    />
                  </div>
                  <div className="flex-1">
                    <VariableHighlighter
                      value={value}
                      onChange={(newValue) => updateFormField(key, newValue)}
                      variables={variables}
                      placeholder="Field value"
                      className="font-mono text-sm"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFormField(key)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Add New Field */}
            <div className="flex items-center space-x-2 pt-2 border-t border-slate-200 dark:border-slate-600">
              <div className="flex-1">
                <VariableHighlighter
                  value={newFormKey}
                  onChange={setNewFormKey}
                  variables={variables}
                  placeholder="New field name"
                  className="font-mono text-sm"
                />
              </div>
              <div className="flex-1">
                <VariableHighlighter
                  value={newFormValue}
                  onChange={setNewFormValue}
                  variables={variables}
                  placeholder="New field value"
                  className="font-mono text-sm"
                />
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={addFormField}
                disabled={!newFormKey.trim()}
                className="flex items-center space-x-1"
              >
                <PlusIcon className="w-4 h-4" />
                <span>Add</span>
              </Button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Content-Type will be automatically set to {' '}
              {body.type === 'formData' ? 'multipart/form-data' : 'application/x-www-form-urlencoded'}
            </p>
          </div>
        )}

        {body.type === 'none' && (
          <div className="text-center py-8 text-slate-500 dark:text-slate-400">
            <p>No request body will be sent</p>
          </div>
        )}
      </div>
    </div>
  );
};