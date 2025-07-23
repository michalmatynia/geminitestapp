
'use client';

import React, { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const CSVImportPage = () => {
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (!file) {
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    await fetch('/api/import', {
      method: 'POST',
      body: formData,
    });
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Import Products from CSV</h1>
      <div className="flex w-full max-w-sm items-center space-x-2">
        <Input type="file" onChange={handleFileChange} />
        <Button onClick={() => {
          void handleSubmit();
        }}>Import</Button>
      </div>
    </div>
  );
};

export default CSVImportPage;
