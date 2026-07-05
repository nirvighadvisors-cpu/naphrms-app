import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { FileText, Upload, Plus, Download, Trash2, FileArchive, Eye, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useEmployeeDocuments, useUploadEmployeeDocument, useDeleteDocument, useReplaceEmployeeDocument } from '@/features/documents/api/use-documents';
import { supabase, deleteFileFromSupabase } from '@/lib/supabase';

const uploadSchema = z.object({
  type: z.enum(['PAN_CARD', 'AADHAAR_CARD', 'PASSPORT', 'OFFER_LETTER', 'EXPERIENCE_LETTER', 'EDUCATION_CERTIFICATE', 'FITNESS_CERTIFICATE', 'OTHER']),
  fileName: z.string().min(1, 'File name is required'),
  fileUrl: z.string().min(1, 'Please select a file'),
  expiresAt: z.string().optional().nullable(),
});

type UploadFormValues = z.infer<typeof uploadSchema>;

const formatDocType = (type: string) => {
  return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

export const EmployeeDocumentsTab = ({ employeeId }: { employeeId: string }) => {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const { data: documents, isLoading } = useEmployeeDocuments(employeeId);
  const uploadMutation = useUploadEmployeeDocument();
  const deleteMutation = useDeleteDocument();
  const replaceMutation = useReplaceEmployeeDocument();

  const form = useForm<UploadFormValues>({
    resolver: zodResolver(uploadSchema),
    defaultValues: { type: 'OTHER', fileName: '', fileUrl: '' },
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [documentToReplace, setDocumentToReplace] = useState<any>(null);
  const [isUploadingToSupabase, setIsUploadingToSupabase] = useState(false);

  const handleMockUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Clear previous errors
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
    
    // Auto fill file name if empty
    if (!form.getValues('fileName')) {
      form.setValue('fileName', file.name);
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    // Just a placeholder so Zod validation passes
    form.setValue('fileUrl', 'ready-to-upload');
  };

  const onSubmit = async (values: UploadFormValues) => {
    if (!selectedFile) return;

    setIsUploadingToSupabase(true);
    try {
      const fileExt = selectedFile.name.split('.').pop();
      const uniqueFileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      const filePath = `employees/${employeeId}/${uniqueFileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, selectedFile, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      if (documentToReplace) {
        replaceMutation.mutate({
          id: documentToReplace.id,
          data: {
            fileName: values.fileName,
            fileUrl: publicUrl,
            fileSize: selectedFile.size,
          }
        }, {
          onSuccess: async () => {
            await deleteFileFromSupabase(documentToReplace.fileUrl);
            setIsUploadOpen(false);
            form.reset();
            setSelectedFile(null);
            setPreviewUrl(null);
            setDocumentToReplace(null);
          }
        });
      } else {
        uploadMutation.mutate({
          employeeId,
          data: {
            type: values.type,
            fileName: values.fileName,
            fileUrl: publicUrl,
            expiresAt: values.expiresAt || null,
          }
        }, {
          onSuccess: () => {
            setIsUploadOpen(false);
            form.reset();
            setSelectedFile(null);
            setPreviewUrl(null);
          }
        });
      }
    } catch (error: any) {
      console.error('Upload failed:', error);
      form.setError('fileUrl', { message: error.message || 'Failed to upload file.' });
    } finally {
      setIsUploadingToSupabase(false);
    }
  };

  return (
    <Card className="shadow-sm border-border min-h-[400px]">
      <CardHeader className="flex flex-row items-center justify-between border-b border-border/50 pb-4">
        <div>
          <CardTitle>Employee Documents</CardTitle>
          <CardDescription>View and manage documents uploaded by or for this employee.</CardDescription>
        </div>
        
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
            <Button size="sm" onClick={() => {
              setDocumentToReplace(null);
              form.reset();
            }}><Plus className="w-4 h-4 mr-2" /> Upload Document</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{documentToReplace ? 'Replace Document' : 'Upload Document'}</DialogTitle>
              <DialogDescription>{documentToReplace ? 'Upload a new file to replace the existing one.' : 'Add a new document to this employee\'s file.'}</DialogDescription>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
              <div className="space-y-2">
                <input type="hidden" {...form.register('fileName')} />
                <Label>Document Type</Label>
                <Select disabled={!!documentToReplace} onValueChange={(val: any) => form.setValue('type', val)} defaultValue={form.watch('type')} value={form.watch('type')}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
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
                {form.formState.errors.type && <p className="text-xs text-rose-500">{form.formState.errors.type.message}</p>}
              </div>



              <div className="space-y-2">
                <Label>File (PDF/Image)</Label>
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
                  <div className="border-2 border-dashed border-border/50 rounded-xl p-4 text-center hover:border-primary/50 transition-colors bg-background/50 relative">
                    <input 
                      type="file" 
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                      onChange={handleMockUpload}
                      accept=".pdf,.jpg,.jpeg,.png,image/jpeg,image/png"
                    />
                    <div className="flex flex-col items-center pointer-events-none">
                      <Upload className="w-6 h-6 text-text-muted mb-2" />
                      <span className="text-sm font-medium text-text">Select file</span>
                      <span className="text-xs text-text-muted mt-1">PDF, JPG, PNG (Max 2MB)</span>
                    </div>
                  </div>
                )}
                {form.formState.errors.fileUrl && <p className="text-xs text-rose-500">{form.formState.errors.fileUrl.message}</p>}
              </div>

              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={() => setIsUploadOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={uploadMutation.isPending || replaceMutation.isPending || isUploadingToSupabase || !form.watch('fileUrl')}>
                  {uploadMutation.isPending || replaceMutation.isPending || isUploadingToSupabase ? 'Uploading...' : (documentToReplace ? 'Replace Document' : 'Upload')}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto scroll-touch scrollbar-none">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="text-xs text-text-muted uppercase bg-background border-b border-border">
              <tr>
                <th className="px-6 py-4 font-medium">Document Type</th>
                <th className="px-6 py-4 font-medium">File Name</th>
                <th className="px-6 py-4 font-medium">Upload Date</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-text-muted">Loading documents...</td></tr>
              ) : !documents || documents.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-text-muted">
                    <FileArchive className="w-8 h-8 mx-auto mb-3 opacity-50" />
                    No documents found for this employee.
                  </td>
                </tr>
              ) : (
                documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-background/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-text">{formatDocType(doc.type)}</td>
                    <td className="px-6 py-4 text-text-muted flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary" /> {doc.fileName}
                    </td>
                    <td className="px-6 py-4 text-text-muted">{format(new Date(doc.createdAt), 'MMM d, yyyy')}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" asChild title="View Document">
                          <a href={doc.fileUrl} target="_blank" rel="noreferrer">
                            <Eye className="w-4 h-4 text-text-muted hover:text-primary" />
                          </a>
                        </Button>
                        <Button variant="ghost" size="icon" asChild title="Download Document">
                          <a href={doc.fileUrl} download={doc.fileName} target="_blank" rel="noreferrer">
                            <Download className="w-4 h-4 text-text-muted hover:text-primary" />
                          </a>
                        </Button>
                        <Button variant="ghost" size="icon" title="Replace Document" onClick={() => {
                          setDocumentToReplace(doc);
                          form.setValue('type', doc.type);
                          form.setValue('fileName', doc.fileName);
                          setIsUploadOpen(true);
                        }}>
                          <RefreshCcw className="w-4 h-4 text-text-muted hover:text-primary" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          title="Delete Document"
                          onClick={async () => {
                            if(window.confirm('Delete this document?')) {
                              await deleteFileFromSupabase(doc.fileUrl);
                              deleteMutation.mutate(doc.id);
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-error opacity-70 hover:opacity-100" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};
