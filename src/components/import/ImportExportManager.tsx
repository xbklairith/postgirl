import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { ImportDialog } from './ImportDialog';
import { ExportDialog } from '../export/ExportDialog';
import { ArrowUpTrayIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import type { ImportResult, ExportResult } from '../../types/external-formats';

export interface ImportExportManagerProps {
  workspaceId: string;
  selectedCollectionId?: string | null;
  selectedCollectionName?: string;
  onImportSuccess?: (result: ImportResult) => void;
  onExportSuccess?: (result: ExportResult) => void;
  className?: string;
}

export const ImportExportManager: React.FC<ImportExportManagerProps> = ({
  workspaceId,
  selectedCollectionId,
  selectedCollectionName,
  onImportSuccess,
  onExportSuccess,
  className,
}) => {
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);

  const handleImportSuccess = (result: ImportResult) => {
    onImportSuccess?.(result);
    // You might want to trigger a refresh of collections here
  };

  const handleExportSuccess = (result: ExportResult) => {
    onExportSuccess?.(result);
  };

  return (
    <div className={className}>
      <div className="flex space-x-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setIsImportDialogOpen(true)}
          className="flex items-center space-x-1"
        >
          <ArrowDownTrayIcon className="w-4 h-4" />
          <span>Import</span>
        </Button>
        
        {selectedCollectionId && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsExportDialogOpen(true)}
            className="flex items-center space-x-1"
          >
            <ArrowUpTrayIcon className="w-4 h-4" />
            <span>Export</span>
          </Button>
        )}
      </div>

      <ImportDialog
        isOpen={isImportDialogOpen}
        onClose={() => setIsImportDialogOpen(false)}
        workspaceId={workspaceId}
        onImportSuccess={handleImportSuccess}
        openInTabs={true} // Open imported requests in tabs by default
      />

      {selectedCollectionId && (
        <ExportDialog
          isOpen={isExportDialogOpen}
          onClose={() => setIsExportDialogOpen(false)}
          collectionId={selectedCollectionId}
          collectionName={selectedCollectionName || 'Collection'}
          onExportSuccess={handleExportSuccess}
        />
      )}
    </div>
  );
};