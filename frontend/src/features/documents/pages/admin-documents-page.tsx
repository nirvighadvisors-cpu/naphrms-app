import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { FileText, Upload, Plus, BookOpen, Search, User, ExternalLink, Download, FileArchive, Settings2, Trash2, Eye, RefreshCcw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

import { usePolicies, useCreatePolicy, useUpdatePolicy, useEmployeeDocuments, useDeletePolicy, useReplacePolicy } from '../api';
import { useEmployees } from '@/features/employees/api/use-employees';
import { supabase, deleteFileFromSupabase } from '@/lib/supabase';

const createPolicySchema = z.object({
  title: z.string().min(3, 'Title is required'),
  description: z.string().optional(),
  fileUrl: z.string().min(1, 'Please select a file'),
  version: z.string().min(1, 'Version is required'),
  isActive: z.boolean(),
});

export function AdminDocumentsPage() {
  const [activeTab, setActiveTab] = useState<'policies' | 'employee-vault'>('policies');
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');

  const { data: policies, isLoading: loadingPolicies } = usePolicies();
  const { data: employees } = useEmployees({ limit: 100 }); // Simplified for UI
  const { data: employeeDocs, isLoading: loadingEmployeeDocs } = useEmployeeDocuments(selectedEmployeeId);

  const createPolicyMutation = useCreatePolicy();
  const updatePolicyMutation = useUpdatePolicy();
  const deletePolicyMutation = useDeletePolicy();
  const replacePolicyMutation = useReplacePolicy();

  const policyForm = useForm<z.infer<typeof createPolicySchema>>({
    resolver: zodResolver(createPolicySchema),
    defaultValues: { title: '', description: '', version: '1.0', fileUrl: '', isActive: true },
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [policyToReplace, setPolicyToReplace] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);

  const onPublishPolicy = async (values: z.infer<typeof createPolicySchema>) => {
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      const fileExt = selectedFile.name.split('.').pop();
      const uniqueFileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      const filePath = `policies/${uniqueFileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, selectedFile, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      if (policyToReplace) {
        replacePolicyMutation.mutate(
          { id: policyToReplace.id, data: { fileUrl: publicUrl, version: values.version } },
          {
            onSuccess: async () => {
              await deleteFileFromSupabase(policyToReplace.fileUrl);
              setIsPolicyModalOpen(false);
              policyForm.reset();
              setSelectedFile(null);
              setPreviewUrl(null);
              setPolicyToReplace(null);
            }
          }
        );
      } else {
        createPolicyMutation.mutate(
          { ...values, fileUrl: publicUrl },
          {
            onSuccess: () => {
              setIsPolicyModalOpen(false);
              policyForm.reset();
              setSelectedFile(null);
              setPreviewUrl(null);
            }
          }
        );
      }
    } catch (error: any) {
      console.error('Upload failed:', error);
      policyForm.setError('fileUrl', { message: error.message || 'Failed to upload policy.' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleMockUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    policyForm.clearErrors('fileUrl');

    if (file.type !== 'application/pdf') {
      policyForm.setError('fileUrl', { message: 'Only PDF files are allowed for policies.' });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      policyForm.setError('fileUrl', { message: 'PDF file size must not exceed 2 MB.' });
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    policyForm.setValue('fileUrl', 'ready-to-upload');
  };

  const formatDocType = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-page-title font-display text-text">Documents Hub</h1>
          <p className="text-text-muted">Manage company policies and review employee compliance documents.</p>
        </div>

        <div className="flex bg-surface border border-border rounded-lg p-1">
          <button
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'policies' ? 'bg-primary text-white shadow-sm' : 'text-text-muted hover:text-text'}`}
            onClick={() => setActiveTab('policies')}
          >
            <BookOpen className="w-4 h-4" /> Policies
          </button>
          <button
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'employee-vault' ? 'bg-primary text-white shadow-sm' : 'text-text-muted hover:text-text'}`}
            onClick={() => setActiveTab('employee-vault')}
          >
            <User className="w-4 h-4" /> Employee Vaults
          </button>
        </div>
      </div>

      {activeTab === 'policies' ? (
        <Card className="bg-surface border-border">
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/50 pb-4">
            <div className="space-y-1">
              <CardTitle>Company Policies</CardTitle>
              <CardDescription>Publish and manage global documents visible to all employees</CardDescription>
            </div>
            
            <Dialog open={isPolicyModalOpen} onOpenChange={(open) => {
              setIsPolicyModalOpen(open);
              if (!open) {
                setPolicyToReplace(null);
                setSelectedFile(null);
                setPreviewUrl(null);
                policyForm.reset();
              }
            }}>
              <DialogTrigger asChild>
                <Button className="shrink-0 gap-2 w-full sm:w-auto" onClick={() => {
                  setPolicyToReplace(null);
                  policyForm.reset();
                }}><Plus className="w-4 h-4" /> Publish Policy</Button>
              </DialogTrigger>
              <DialogContent className="bg-surface border-border/50 sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>{policyToReplace ? 'Replace Policy Document' : 'Publish New Policy'}</DialogTitle>
                  <DialogDescription>{policyToReplace ? 'Upload a new PDF to replace the existing policy document.' : 'This document will be visible to all active employees immediately.'}</DialogDescription>
                </DialogHeader>
                <form onSubmit={policyForm.handleSubmit(onPublishPolicy)} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Policy Title</Label>
                    <Input disabled={!!policyToReplace} {...policyForm.register('title')} placeholder="e.g. Remote Work Policy 2026" className="bg-background" />
                    {policyForm.formState.errors.title && <p className="text-xs text-rose-500">{policyForm.formState.errors.title.message}</p>}
                  </div>
                  
                  <div className="flex gap-4">
                    <div className="space-y-2 flex-1">
                      <Label>Version</Label>
                      <Input {...policyForm.register('version')} placeholder="1.0" className="bg-background" />
                    </div>
                    <div className="space-y-2 flex flex-col justify-end">
                      <Label className="mb-2">Publish Immediately</Label>
                      <Switch 
                        checked={policyForm.watch('isActive')}
                        onCheckedChange={(val) => policyForm.setValue('isActive', val)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Short Description</Label>
                    <Textarea disabled={!!policyToReplace} {...policyForm.register('description')} className="bg-background min-h-[80px]" placeholder="Summary of what this policy covers..." />
                  </div>

                  <div className="space-y-2">
                    <Label>Policy Document (PDF)</Label>
                    {selectedFile && previewUrl ? (
                      <div className="space-y-3">
                        <div className="border border-border/50 rounded-xl overflow-hidden bg-background">
                          <iframe src={previewUrl} className="w-full h-48 border-b border-border/50" title="PDF Preview" />
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
                          policyForm.setValue('fileUrl', '');
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
                          accept=".pdf"
                        />
                        <div className="flex flex-col items-center pointer-events-none">
                          <Upload className="w-6 h-6 text-text-muted mb-2" />
                          <span className="text-sm font-medium text-text">Select PDF file</span>
                          <span className="text-xs text-text-muted mt-1">PDF only (Max 2MB)</span>
                        </div>
                      </div>
                    )}
                    {policyForm.formState.errors.fileUrl && <p className="text-xs text-rose-500">{policyForm.formState.errors.fileUrl.message}</p>}
                  </div>

                  <DialogFooter className="mt-6">
                    <Button type="button" variant="outline" onClick={() => setIsPolicyModalOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={createPolicyMutation.isPending || replacePolicyMutation.isPending || isUploading || !policyForm.watch('fileUrl')}>
                      {createPolicyMutation.isPending || replacePolicyMutation.isPending || isUploading ? 'Publishing...' : (policyToReplace ? 'Replace Policy' : 'Publish Policy')}
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
                    <th className="px-6 py-4 font-medium">Policy Name</th>
                    <th className="px-6 py-4 font-medium">Version</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium">Published Date</th>
                    <th className="px-6 py-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loadingPolicies ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-text-muted">Loading policies...</td>
                    </tr>
                  ) : !policies || policies.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-text-muted">
                        <FileArchive className="w-8 h-8 mx-auto mb-3 opacity-50" />
                        No policies found.
                      </td>
                    </tr>
                  ) : (
                    policies.map(policy => (
                      <tr key={policy.id} className="hover:bg-background/50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-primary/10 text-primary flex items-center justify-center">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="font-medium text-text">{policy.title}</div>
                              <div className="text-xs text-text-muted truncate max-w-[300px]">{policy.description}</div>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-text-muted hover:text-rose-500 gap-2 h-8 px-0"
                                onClick={async () => {
                                  if (window.confirm('Are you sure you want to delete this policy?')) {
                                    await deleteFileFromSupabase(policy.fileUrl);
                                    deletePolicyMutation.mutate(policy.id);
                                  }
                                }}
                              >
                                Delete
                              </Button>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-medium text-text">v{policy.version}</td>
                        <td className="px-6 py-4">
                          <Switch 
                            checked={policy.isActive} 
                            onCheckedChange={(val) => updatePolicyMutation.mutate({ id: policy.id, isActive: val })}
                            disabled={updatePolicyMutation.isPending}
                          />
                        </td>
                        <td className="px-6 py-4 text-text-muted">
                          {format(new Date(policy.publishedAt), 'MMM d, yyyy')}
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <Button variant="outline" size="sm" asChild title="View Policy">
                            <a href={policy.fileUrl} target="_blank" rel="noreferrer">
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </Button>
                          <Button variant="outline" size="sm" asChild title="Download Policy">
                            <a href={policy.fileUrl} download={`${policy.title}.pdf`} target="_blank" rel="noreferrer">
                              <Download className="w-4 h-4" />
                            </a>
                          </Button>
                          <Button variant="outline" size="sm" title="Replace Policy" onClick={() => {
                            setPolicyToReplace(policy);
                            policyForm.setValue('title', policy.title);
                            policyForm.setValue('description', policy.description || '');
                            policyForm.setValue('version', policy.version);
                            policyForm.setValue('isActive', policy.isActive);
                            setIsPolicyModalOpen(true);
                          }}>
                            <RefreshCcw className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-6 items-start">
          <Card className="bg-surface border-border sticky top-6">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Select Employee</CardTitle>
              <CardDescription>Search directory to view secure vaults</CardDescription>
              <div className="mt-4 relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-text-muted" />
                <Input 
                  placeholder="Search name..." 
                  className="pl-9 bg-background"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/50 max-h-[500px] overflow-y-auto">
                {employees?.data.map(emp => (
                  <button
                    key={emp.id}
                    onClick={() => setSelectedEmployeeId(emp.id)}
                    className={`w-full flex items-center gap-3 p-4 text-left transition-colors hover:bg-background ${selectedEmployeeId === emp.id ? 'bg-primary/5 border-l-2 border-primary' : 'border-l-2 border-transparent'}`}
                  >
                    {emp.profilePhotoUrl ? (
                      <img src={emp.profilePhotoUrl} alt="Profile" className="w-10 h-10 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold font-display shrink-0">
                        {emp.firstName[0]}{emp.lastName[0]}
                      </div>
                    )}
                    <div className="overflow-hidden">
                      <p className="font-medium text-text truncate">{emp.firstName} {emp.lastName}</p>
                      <p className="text-xs text-text-muted truncate">{emp.employeeCode}</p>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-surface border-border min-h-[600px]">
            <CardHeader className="border-b border-border/50">
              <CardTitle>Vault Contents</CardTitle>
              <CardDescription>
                {selectedEmployeeId ? 'Viewing compliance documents for selected employee.' : 'Select an employee to view their vault.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {!selectedEmployeeId ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-20">
                  <User className="w-16 h-16 text-text-muted/30 mb-4" />
                  <h3 className="text-xl font-display text-text">No Employee Selected</h3>
                  <p className="text-text-muted mt-2 max-w-sm">Select an employee from the directory on the left to review their KYC and employment documents.</p>
                </div>
              ) : loadingEmployeeDocs ? (
                <p className="text-center text-text-muted py-10">Loading documents...</p>
              ) : !employeeDocs || employeeDocs.length === 0 ? (
                <div className="text-center py-20 border-2 border-dashed border-border/50 rounded-xl bg-background/50">
                  <FileText className="w-10 h-10 text-text-muted/50 mx-auto mb-3" />
                  <p className="text-text-muted font-medium">This employee has not uploaded any documents.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {employeeDocs.map(doc => (
                    <div key={doc.id} className="flex gap-4 p-4 rounded-xl border border-border bg-background items-start">
                       <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                          <FileText className="w-6 h-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-text truncate" title={doc.fileName}>{doc.fileName}</h4>
                          <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider bg-primary/10 text-primary border border-primary/20">
                            {formatDocType(doc.type)}
                          </span>
                          <p className="text-xs text-text-muted mt-2">
                            Uploaded: {format(new Date(doc.createdAt), 'MMM d, yyyy')}
                          </p>
                          {doc.expiresAt && (
                            <p className={`text-xs mt-1 ${new Date(doc.expiresAt) < new Date() ? 'text-rose-500 font-medium' : 'text-text-muted'}`}>
                              Expires: {format(new Date(doc.expiresAt), 'MMM d, yyyy')}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-1 shrink-0">
                           <Button variant="outline" size="icon" className="h-8 w-8" asChild title="View Document">
                            <a href={doc.fileUrl} target="_blank" rel="noreferrer">
                              <Eye className="w-4 h-4" />
                            </a>
                           </Button>
                           <Button variant="outline" size="icon" className="h-8 w-8" asChild title="Download Document">
                            <a href={doc.fileUrl} target="_blank" rel="noreferrer" download={doc.fileName}>
                              <Download className="w-4 h-4" />
                            </a>
                           </Button>
                        </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
