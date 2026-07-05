import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileDown, Upload, FileCheck2, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';

export const EmployeeOfferLetterCard = ({ employee }: { employee: any }) => {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // No longer needed, as we'll send it directly in handleUploadFinal

  if (!employee.offerLetterStatus || employee.offerLetterStatus === 'PENDING' || employee.offerLetterStatus === 'E_SIGN_SUBMITTED' || employee.offerLetterStatus === 'OFFER_DETAILS_SUBMITTED') {
    return null; // Not ready for HR yet
  }

  const handleDownloadPartial = async () => {
    if (!employee.partialOfferLetterUrl) return;
    try {
      const { data } = await apiClient.get(`/employees/${employee.id}/offer-letter-urls`);
      if (data?.data?.partialUrl) {
        window.open(data.data.partialUrl, '_blank');
      }
    } catch (error) {
      console.error('Failed to get partial URL', error);
    }
  };

  const handleUploadFinal = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setUploadError('Only PDF files are allowed for the final offer letter.');
      return;
    }

    setIsUploading(true);
    setUploadError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      
      // Finalize via backend which handles the upload and DB update
      await apiClient.patch(`/employees/${employee.id}/finalize-offer`, formData);
      
      
      qc.invalidateQueries({ queryKey: ['employees', employee.id] });
      qc.invalidateQueries({ queryKey: ['documents', 'employee', employee.id] });
      toast({ title: 'Success', description: 'Final offer letter uploaded successfully.' });
      
    } catch (err: any) {
      console.error(err);
      setUploadError('Failed to upload the final offer letter.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleViewFinal = async () => {
    if (!employee.finalOfferLetterUrl) return;
    try {
      const { data } = await apiClient.get(`/employees/${employee.id}/offer-letter-urls`);
      if (data?.data?.finalUrl) {
        window.open(data.data.finalUrl, '_blank');
      }
    } catch (error) {
      console.error('Failed to get final URL', error);
    }
  };

  return (
    <Card className="shadow-sm border-border bg-gradient-to-br from-primary/5 to-surface mb-6">
      <CardHeader className="pb-3 border-b border-border/50">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-lg">Offer Letter Management</CardTitle>
            <CardDescription>Review and finalize the employee's offer letter</CardDescription>
          </div>
          <Badge variant={employee.offerLetterStatus === 'OFFER_FINALIZED' ? 'default' : 'secondary'} className={employee.offerLetterStatus === 'OFFER_FINALIZED' ? 'bg-success text-white border-0' : 'bg-warning text-warning-foreground'}>
            {employee.offerLetterStatus === 'OFFER_FINALIZED' ? 'Completed' : 'Awaiting HR'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {employee.offerLetterStatus === 'AWAITING_HR_COMPLETION' && (
          <div className="space-y-4">
            <p className="text-sm text-text-muted">
              The employee has submitted their details and E-Sign. Please download the partially completed Word document, fill in the remaining compensation details, and upload the finalized PDF.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Button onClick={handleDownloadPartial} variant="outline" className="flex-1">
                <FileDown className="w-4 h-4 mr-2" /> Download Partial Docx
              </Button>
              
              <div className="flex-1 relative">
                <Button disabled={isUploading} className="w-full">
                  {isUploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                  {isUploading ? 'Uploading...' : 'Upload Final PDF'}
                </Button>
                <input 
                  type="file" 
                  accept="application/pdf" 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                  onChange={handleUploadFinal}
                  disabled={isUploading}
                />
              </div>
            </div>
            {uploadError && <p className="text-sm text-rose-500 font-medium">{uploadError}</p>}
          </div>
        )}

        {employee.offerLetterStatus === 'OFFER_FINALIZED' && (
          <div className="space-y-4">
            <div className="p-4 bg-success/10 border border-success/20 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-3 text-success">
                <FileCheck2 className="w-6 h-6" />
                <div>
                  <h4 className="font-semibold text-sm">Offer Letter Finalized</h4>
                  <p className="text-xs opacity-90">The final PDF has been uploaded and linked.</p>
                </div>
              </div>
              <Button onClick={handleViewFinal} variant="outline" size="sm" className="border-success text-success hover:bg-success/20">
                View Final PDF
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
