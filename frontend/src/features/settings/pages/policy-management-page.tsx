import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { FileText, Loader2, Trash2, Upload, Plus } from 'lucide-react';
import { usePolicies, useUploadPolicy, useDeletePolicy } from '../api/policy-api';

export function PolicyManagementPage() {
  const { data: policies, isLoading } = usePolicies();
  const uploadMutation = useUploadPolicy();
  const deleteMutation = useDeletePolicy();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (selected.type !== 'application/pdf') {
      alert('Only PDF files are allowed.');
      return;
    }

    if (selected.size > 1 * 1024 * 1024) {
      alert('File size must be less than 1MB.');
      return;
    }

    setFile(selected);
  };

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !file) {
      alert('Title and PDF file are required.');
      return;
    }

    uploadMutation.mutate({ title, description, file }, {
      onSuccess: () => {
        setTitle('');
        setDescription('');
        setFile(null);
        // reset file input
        const fileInput = document.getElementById('policy-file') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      },
      onError: (err: any) => {
        alert(err.response?.data?.error?.message || 'Failed to upload policy.');
      }
    });
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this policy? It will be removed from the onboarding flow.')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Company Policies</h1>
          <p className="text-muted-foreground">Manage the policies that employees must read and accept during onboarding.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Upload Form */}
        <Card className="md:col-span-1 h-fit">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><Plus className="w-5 h-5" /> Add New Policy</CardTitle>
            <CardDescription>Upload a PDF document. (Max 1MB)</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpload} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Policy Title *</Label>
                <Input 
                  id="title" 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)} 
                  placeholder="e.g., Leave Policy 2026" 
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Input 
                  id="description" 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  placeholder="Short summary" 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="policy-file">PDF File *</Label>
                <Input 
                  id="policy-file" 
                  type="file" 
                  accept="application/pdf"
                  onChange={handleFileChange}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={uploadMutation.isPending}>
                {uploadMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                Upload Policy
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Policy List */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><FileText className="w-5 h-5" /> Active Policies</CardTitle>
            <CardDescription>These documents will be merged and presented to new employees.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : policies?.length === 0 ? (
              <div className="text-center p-8 border border-dashed rounded-lg bg-muted/20">
                <FileText className="w-10 h-10 mx-auto text-muted-foreground opacity-50 mb-3" />
                <p className="text-muted-foreground font-medium">No active policies found.</p>
                <p className="text-sm text-muted-foreground">Upload your first policy to get started.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {policies?.map((policy) => (
                  <div key={policy.id} className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-muted/10 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className="p-2 bg-primary/10 text-primary rounded-md">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-semibold">{policy.title}</h4>
                        {policy.description && <p className="text-sm text-muted-foreground">{policy.description}</p>}
                        <p className="text-xs text-muted-foreground mt-1">Uploaded: {new Date(policy.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                        onClick={() => handleDelete(policy.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
