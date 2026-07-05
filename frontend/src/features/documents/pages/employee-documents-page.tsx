import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { FileText, Upload, Lock, Shield, Trash2, Download, ExternalLink, Calendar, Search, Book, Eye, RefreshCcw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { useMyDocuments, usePolicies, useUploadMyDocument, useDeleteDocument, useReplaceEmployeeDocument } from '../api';
import { supabase, deleteFileFromSupabase } from '@/lib/supabase';
import { DatePicker } from '@/components/ui/date-picker';
import { Controller } from 'react-hook-form';

const uploadSchema = z.object({
  type: z.enum(['PAN_CARD', 'AADHAAR_CARD', 'PASSPORT', 'OFFER_LETTER', 'EXPERIENCE_LETTER', 'EDUCATION_CERTIFICATE', 'FITNESS_CERTIFICATE', 'OTHER']),
  fileName: z.string().min(1, 'File name is required'),
  fileUrl: z.string().min(1, 'Please upload a file'),
  expiresAt: z.string().optional(),
});

export function EmployeeDocumentsPage() {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'my-documents' | 'company-policies'>('my-documents');

  const { data: documents, isLoading: loadingDocs } = useMyDocuments();
  const { data: policies, isLoading: loadingPolicies } = usePolicies();
  
  const uploadMutation = useUploadMyDocument();
  const deleteMutation = useDeleteDocument();
  const replaceMutation = useReplaceEmployeeDocument();

  const form = useForm<z.infer<typeof uploadSchema>>({
    resolver: zodResolver(uploadSchema),
    defaultValues: { type: 'PAN_CARD', fileName: '', fileUrl: '' },
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [documentToReplace, setDocumentToReplace] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);

  const onSubmit = async (values: z.infer<typeof uploadSchema>) => {
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      const fileExt = selectedFile.name.split('.').pop();
      const uniqueFileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      const filePath = `employees/my-documents/${uniqueFileName}`; // In real app, put user ID
      
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, selectedFile, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      if (documentToReplace) {
        replaceMutation.mutate(
          { id: documentToReplace.id, data: { fileName: values.fileName, fileUrl: publicUrl, fileSize: selectedFile.size } },
          {
            onSuccess: async () => {
              await deleteFileFromSupabase(documentToReplace.fileUrl);
              setIsUploadOpen(false);
              form.reset();
              setSelectedFile(null);
              setPreviewUrl(null);
              setDocumentToReplace(null);
            }
          }
        );
      } else {
        uploadMutation.mutate(
          { ...values, fileUrl: publicUrl, expiresAt: values.expiresAt || null },
          {
            onSuccess: () => {
              setIsUploadOpen(false);
              form.reset();
              setSelectedFile(null);
              setPreviewUrl(null);
            },
          }
        );
      }
    } catch (error: any) {
      console.error('Upload failed:', error);
      form.setError('fileUrl', { message: error.message || 'Failed to upload file.' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleMockUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    form.clearErrors('fileUrl');

    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      form.setError('fileUrl', { message: 'Unsupported file type. Only JPG, PNG, and PDF are allowed.' });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      form.setError('fileUrl', { message: 'File size must not exceed 2 MB.' });
      return;
    }

    form.setValue('fileName', file.name);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    form.setValue('fileUrl', 'ready-to-upload');
  };

  const formatDocType = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-page-title font-display text-text">Documents & Policies</h1>
          <p className="text-text-muted">Manage your personal documents and view company handbooks.</p>
        </div>
        
        <div className="flex bg-surface border border-border rounded-lg p-1">
          <button
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'my-documents' ? 'bg-primary text-white shadow-sm' : 'text-text-muted hover:text-text'}`}
            onClick={() => setActiveTab('my-documents')}
          >
            My Vault
          </button>
          <button
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'company-policies' ? 'bg-primary text-white shadow-sm' : 'text-text-muted hover:text-text'}`}
            onClick={() => setActiveTab('company-policies')}
          >
            Company Policies
          </button>
        </div>
      </div>

      {activeTab === 'my-documents' ? (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-primary/5 border border-primary/20 p-4 rounded-xl">
            <div className="flex items-center gap-3 text-primary">
              <Shield className="w-6 h-6" />
              <div>
                <h3 className="font-medium">Secure Encrypted Vault</h3>
                <p className="text-sm text-primary/80">Your documents are securely stored and only accessible by you and authorized HR personnel.</p>
              </div>
            </div>
            
            {(!documents || documents.length === 0) && (
            <Dialog open={isUploadOpen} onOpenChange={(open) => {
              setIsUploadOpen(open);
              if (!open) {
                setDocumentToReplace(null);
                setSelectedFile(null);
                setPreviewUrl(null);
                form.reset();
              }
            }}>
              <DialogTrigger asChild>
                <Button className="shrink-0" onClick={() => {
                  setDocumentToReplace(null);
                  form.reset();
                }}><Upload className="w-4 h-4 mr-2" /> Upload Document</Button>
              </DialogTrigger>
              <DialogContent className="bg-surface border-border/50">
                <DialogHeader>
                  <DialogTitle>{documentToReplace ? 'Replace Document' : 'Upload Secure Document'}</DialogTitle>
                  <DialogDescription>{documentToReplace ? 'Upload a new file to replace the existing one.' : 'Add a new identification or compliance document to your vault.'}</DialogDescription>
                </DialogHeader>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Document Type</Label>
                    <Select disabled={!!documentToReplace} onValueChange={(val) => form.setValue('type', val as any)} defaultValue={form.getValues('type')} value={form.watch('type')}>
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PAN_CARD">PAN Card</SelectItem>
                        <SelectItem value="AADHAAR_CARD">Aadhaar Card</SelectItem>
                        <SelectItem value="PASSPORT">Passport</SelectItem>
                        <SelectItem value="OFFER_LETTER">Offer Letter</SelectItem>
                        <SelectItem value="EXPERIENCE_LETTER">Experience Letter</SelectItem>
                        <SelectItem value="EDUCATION_CERTIFICATE">Education Certificate</SelectItem>
                        <SelectItem value="FITNESS_CERTIFICATE">Fitness Certificate</SelectItem>
                        <SelectItem value="OTHER">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {form.watch('type') === 'AADHAAR_CARD' && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 text-sm text-blue-800 dark:text-blue-300 shadow-sm transition-all">
                      <p className="font-semibold mb-3">Sample Aadhaar Card Format – Please upload a clear and readable Aadhaar Card image similar to the example shown below.</p>
                      <img src="/sample-aadhaar.png" alt="Sample Aadhaar Card" className="max-w-full h-auto rounded-lg border border-border shadow-sm mx-auto" style={{ maxHeight: '200px', objectFit: 'contain' }} />
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <Label>File</Label>
                    {selectedFile && previewUrl ? (
                      <div className="space-y-3">
                        <div className="border border-border/50 rounded-xl overflow-hidden bg-background">
                          {selectedFile.type.includes('image') ? (
                            <img src={previewUrl} alt="Preview" className="w-full h-48 object-contain bg-slate-50" />
                          ) : (
                            <iframe src={previewUrl} className="w-full h-48 border-b border-border/50" title="PDF Preview" />
                          )}
                          <div className="bg-surface p-3 text-sm flex justify-between items-center">
                            <div className="flex items-center gap-2 overflow-hidden">
                              <FileText className="w-4 h-4 text-primary shrink-0" />
                              <span className="truncate font-medium">{selectedFile.name}</span>
                            </div>
                            <span className="text-text-muted text-xs shrink-0 whitespace-nowrap ml-2">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</span>
                          </div>
                        </div>
                        <Button type="button" variant="outline" className="w-full text-text-muted hover:text-text border-dashed" onClick={() => {
                          setSelectedFile(null);
                          setPreviewUrl(null);
                          form.setValue('fileUrl', '');
                        }}>
                          <RefreshCcw className="w-4 h-4 mr-2" />
                          Change File
                        </Button>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-border/50 rounded-xl p-6 text-center hover:border-primary/50 transition-colors bg-background/50">
                        <input 
                          type="file" 
                          className="hidden" 
                          id="fileUpload" 
                          onChange={handleMockUpload}
                          accept=".pdf,.jpg,.jpeg,.png,image/jpeg,image/png"
                        />
                        <label htmlFor="fileUpload" className="cursor-pointer flex flex-col items-center">
                          <Upload className="w-8 h-8 text-text-muted mb-2" />
                          <span className="text-sm font-medium text-text">Click to upload or drag and drop</span>
                          <span className="text-xs text-text-muted mt-1">PDF, JPG, PNG up to 2MB</span>
                        </label>
                      </div>
                    )}
                    {form.formState.errors.fileUrl && <p className="text-xs text-rose-500">{form.formState.errors.fileUrl.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label>Expiration Date (Optional)</Label>
                    <Controller control={form.control} name="expiresAt" render={({ field }) => <DatePicker value={field.value} onChange={field.onChange} className="bg-background" />} />
                  </div>

                  <DialogFooter className="mt-6">
                    <Button type="button" variant="outline" onClick={() => setIsUploadOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={uploadMutation.isPending || replaceMutation.isPending || isUploading || !form.watch('fileUrl')}>
                      {uploadMutation.isPending || replaceMutation.isPending || isUploading ? 'Uploading...' : (documentToReplace ? 'Replace Document' : 'Secure Upload')}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loadingDocs ? (
              <p className="text-text-muted">Loading your vault...</p>
            ) : !documents || documents.length === 0 ? (
              <div className="col-span-full py-12 flex flex-col items-center justify-center border border-dashed border-border rounded-xl">
                <Lock className="w-12 h-12 text-border mb-3" />
                <h3 className="text-lg font-medium text-text">Your vault is empty</h3>
                <p className="text-text-muted mb-4">Upload your first compliance document to get started.</p>
                <Button variant="outline" onClick={() => setIsUploadOpen(true)}>Upload Document</Button>
              </div>
            ) : (
              documents.map((doc) => (
                <Card key={doc.id} className="bg-surface border-border hover:border-primary/30 transition-all group overflow-hidden">
                  <div className="h-2 w-full bg-primary/20"></div>
                  <CardContent className="p-5">
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-text-muted hover:text-primary" asChild title="View Document">
                          <a href={doc.fileUrl} target="_blank" rel="noreferrer">
                            <Eye className="w-4 h-4" />
                          </a>
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-text-muted hover:text-primary" asChild title="Download Document">
                          <a href={doc.fileUrl} target="_blank" rel="noreferrer" download={doc.fileName}>
                            <Download className="w-4 h-4" />
                          </a>
                        </Button>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium text-text truncate" title={doc.fileName}>{doc.fileName}</h4>
                      <p className="text-sm text-primary font-medium mt-1">{formatDocType(doc.type)}</p>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-border/50 space-y-2 text-xs text-text-muted">
                      <div className="flex justify-between">
                        <span>Uploaded</span>
                        <span>{format(new Date(doc.createdAt), 'MMM d, yyyy')}</span>
                      </div>
                      {doc.expiresAt && (
                        <div className="flex justify-between">
                          <span>Expires</span>
                          <span className={new Date(doc.expiresAt) < new Date() ? 'text-rose-500 font-medium' : ''}>
                            {format(new Date(doc.expiresAt), 'MMM d, yyyy')}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-none text-white shadow-lg overflow-hidden relative">
            <div className="absolute right-0 top-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
            <CardContent className="p-8 md:p-10 flex flex-col md:flex-row items-center gap-8 relative z-10">
              <div className="w-24 h-24 rounded-2xl bg-white/10 flex items-center justify-center shrink-0 border border-white/20 shadow-xl">
                <Book className="w-10 h-10 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-display font-bold mb-2">Company Library</h2>
                <p className="text-white/70 max-w-xl text-lg">
                  Access employee handbooks, leave policies, IT security guidelines, and other important company documents.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {loadingPolicies ? (
              <p className="text-text-muted">Loading policies...</p>
            ) : !policies || policies.length === 0 ? (
              <div className="col-span-full py-12 flex flex-col items-center justify-center border border-dashed border-border rounded-xl">
                <p className="text-text-muted">No company policies published yet.</p>
              </div>
            ) : (
              policies.map(policy => (
                <div key={policy.id} className="flex gap-4 p-5 bg-surface border border-border rounded-xl hover:border-primary/40 transition-colors">
                  <div className="w-12 h-12 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-text text-lg">{policy.title}</h4>
                        <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 mt-1">
                          v{policy.version}
                        </span>
                      </div>
                      <Button variant="outline" size="sm" className="shrink-0 h-8 gap-2" asChild>
                        <a href={policy.fileUrl} target="_blank" rel="noreferrer">
                          <ExternalLink className="w-3.5 h-3.5" /> Read
                        </a>
                      </Button>
                    </div>
                    {policy.description && <p className="text-sm text-text-muted mt-3 line-clamp-2">{policy.description}</p>}
                    <p className="text-xs text-text-muted mt-4">
                      Published {format(new Date(policy.publishedAt), 'MMMM d, yyyy')}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
