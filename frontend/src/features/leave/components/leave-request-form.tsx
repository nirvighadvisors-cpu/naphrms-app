import React, { useState, useMemo } from 'react';
import type { LeaveType } from '../api/leave-api';
import { useApplyLeave, useUploadLeaveAttachment } from '../api/use-leave';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CalendarDays, Loader2, Upload, X, Check } from 'lucide-react';
import { differenceInCalendarDays, eachDayOfInterval, isWeekend, parseISO } from 'date-fns';
import { DatePicker } from '@/components/ui/date-picker';

interface LeaveRequestFormProps {
  leaveTypes: LeaveType[];
  trigger: React.ReactNode;
  isProbationActive?: boolean;
  probationDaysRemaining?: number;
}

function countWeekdays(start: string, end: string): number {
  try {
    const startDate = parseISO(start);
    const endDate = parseISO(end);
    if (endDate < startDate) return 0;
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    return days.filter((d) => !isWeekend(d)).length;
  } catch {
    return 0;
  }
}

export function LeaveRequestForm({ 
  leaveTypes, 
  trigger, 
  isProbationActive = false, 
  probationDaysRemaining = 0 
}: LeaveRequestFormProps) {
  const [open, setOpen] = useState(false);
  const [leaveTypeId, setLeaveTypeId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [attachment, setAttachment] = useState('');
  const [childNumber, setChildNumber] = useState('');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploadingName, setUploadingName] = useState('');

  const applyMutation = useApplyLeave();
  const uploadMutation = useUploadLeaveAttachment();

  const selectedLeaveType = useMemo(() => {
    return leaveTypes.find(lt => lt.id === leaveTypeId);
  }, [leaveTypeId, leaveTypes]);

  const isMaternityLeave = selectedLeaveType && (selectedLeaveType.code === 'ML' || selectedLeaveType.name.toLowerCase().includes('maternity'));

  const totalDays = useMemo(() => {
    if (!startDate || !endDate) return 0;
    if (isMaternityLeave) {
      try {
        const start = parseISO(startDate);
        const end = parseISO(endDate);
        if (end < start) return 0;
        return differenceInCalendarDays(end, start) + 1;
      } catch {
        return 0;
      }
    }
    return countWeekdays(startDate, endDate);
  }, [startDate, endDate, isMaternityLeave]);

  const isSickLeave = selectedLeaveType && (selectedLeaveType.code === 'SL' || selectedLeaveType.name.toLowerCase().includes('sick'));
  const needsCertificate = isSickLeave && totalDays >= 3;

  const isProbationRestricted = isProbationActive && selectedLeaveType && (selectedLeaveType.code === 'CL' || selectedLeaveType.code === 'PL');

  const resetForm = () => {
    setLeaveTypeId('');
    setStartDate('');
    setEndDate('');
    setReason('');
    setAttachment('');
    setChildNumber('');
    setExpectedDeliveryDate('');
    setErrors({});
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!leaveTypeId) newErrors.leaveTypeId = 'Please select a leave type';
    if (!startDate) newErrors.startDate = 'Start date is required';
    if (!endDate) newErrors.endDate = 'End date is required';
    if (startDate && endDate && parseISO(endDate) < parseISO(startDate)) {
      newErrors.endDate = 'End date must be after start date';
    }
    if (!reason || reason.trim().length < 10) {
      newErrors.reason = 'Reason must be at least 10 characters';
    }
    if (totalDays === 0 && startDate && endDate) {
      newErrors.endDate = isMaternityLeave ? 'Invalid date range' : 'Selected dates must include at least one weekday';
    }

    if (isMaternityLeave) {
      if (!childNumber) newErrors.childNumber = 'Child number is required';
      if (!expectedDeliveryDate) newErrors.expectedDeliveryDate = 'Expected delivery date is required';
      
      if (childNumber && expectedDeliveryDate && startDate) {
        const cn = parseInt(childNumber, 10);
        const maxTotal = cn <= 2 ? 182 : 84;
        const maxPre = cn <= 2 ? 56 : 42;
        
        if (totalDays > maxTotal) {
          newErrors.endDate = `Maximum maternity leave allowed is ${maxTotal} days for child #${cn}.`;
        }
        
        const edd = parseISO(expectedDeliveryDate);
        const start = parseISO(startDate);
        if (start < edd) {
          const preDays = differenceInCalendarDays(edd, start);
          if (preDays > maxPre) {
            newErrors.startDate = `Maximum pre-delivery leave allowed is ${maxPre} days (${maxPre / 7} weeks).`;
          }
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    applyMutation.mutate(
      {
        leaveTypeId,
        startDate,
        endDate,
        reason: reason.trim(),
        ...(attachment ? { attachment } : {}),
        ...(isMaternityLeave ? { 
          childNumber: parseInt(childNumber, 10), 
          expectedDeliveryDate 
        } : {}),
      },
      {
        onSuccess: () => {
          resetForm();
          setOpen(false);
        },
      }
    );
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, attachment: 'File size must be less than 2MB' }));
      return;
    }

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      setErrors((prev) => ({ ...prev, attachment: 'Only PDF, JPG, and PNG files are allowed' }));
      return;
    }

    setErrors((prev) => {
      const next = { ...prev };
      delete next.attachment;
      return next;
    });

    setUploadingName(file.name);
    uploadMutation.mutate(file, {
      onSuccess: (data) => {
        setAttachment(data.fileUrl);
      },
      onError: () => {
        setUploadingName('');
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            Apply for Leave
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          {/* Leave Type */}
          <div className="space-y-2">
            <Label htmlFor="leaveType">Leave Type</Label>
            <Select value={leaveTypeId} onValueChange={(val) => {
              setLeaveTypeId(val);
              setChildNumber('');
              setExpectedDeliveryDate('');
              setAttachment('');
              setUploadingName('');
              setErrors({});
            }}>
              <SelectTrigger id="leaveType" className={errors.leaveTypeId ? 'border-destructive' : ''}>
                <SelectValue placeholder="Select leave type" />
              </SelectTrigger>
              <SelectContent>
                {leaveTypes.map((lt) => (
                  <SelectItem key={lt.id} value={lt.id}>
                    {lt.name} ({lt.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.leaveTypeId && <p className="text-xs text-destructive">{errors.leaveTypeId}</p>}
            
            {isProbationRestricted && (
              <div className="bg-amber-500/10 border border-amber-500/20 text-amber-500 p-3 rounded-lg text-xs font-medium">
                Casual Leave (CL) and Privilege Leave (PL) will be available after your probation period is completed. You are currently in your probation period. Please wait {probationDaysRemaining} more day(s) to unlock these leave types.
              </div>
            )}
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <DatePicker
                value={startDate}
                onChange={(val) => setStartDate(val)}
                className={errors.startDate ? 'border-destructive' : ''}
              />
              {errors.startDate && <p className="text-xs text-destructive">{errors.startDate}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <DatePicker
                value={endDate}
                onChange={(val) => setEndDate(val)}
                className={errors.endDate ? 'border-destructive' : ''}
              />
              {errors.endDate && <p className="text-xs text-destructive">{errors.endDate}</p>}
            </div>
          </div>

          {/* Maternity Leave Specific Fields */}
          {isMaternityLeave && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="childNumber">Child Number</Label>
                <Select value={childNumber} onValueChange={setChildNumber}>
                  <SelectTrigger id="childNumber" className={errors.childNumber ? 'border-destructive' : ''}>
                    <SelectValue placeholder="Select child number" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1st Child</SelectItem>
                    <SelectItem value="2">2nd Child</SelectItem>
                    <SelectItem value="3">3rd Child or more</SelectItem>
                  </SelectContent>
                </Select>
                {errors.childNumber && <p className="text-xs text-destructive">{errors.childNumber}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="expectedDeliveryDate">Expected Delivery Date</Label>
                <DatePicker
                  value={expectedDeliveryDate}
                  onChange={(val) => setExpectedDeliveryDate(val)}
                  className={errors.expectedDeliveryDate ? 'border-destructive' : ''}
                />
                {errors.expectedDeliveryDate && <p className="text-xs text-destructive">{errors.expectedDeliveryDate}</p>}
              </div>
            </div>
          )}

          {/* Maternity Leave Summary Panel */}
          {isMaternityLeave && childNumber && expectedDeliveryDate && (
            <div className="p-4 bg-primary/5 rounded-xl border border-primary/20 space-y-2">
              <h4 className="text-sm font-semibold text-primary">Maternity Leave Eligibility</h4>
              <div className="grid grid-cols-2 gap-2 text-sm text-text-muted">
                <div>Max Total Leave:</div>
                <div className="font-medium text-text">{parseInt(childNumber, 10) <= 2 ? '26 weeks (182 days)' : '12 weeks (84 days)'}</div>
                <div>Max Pre-Delivery Leave:</div>
                <div className="font-medium text-text">{parseInt(childNumber, 10) <= 2 ? '8 weeks (56 days)' : '6 weeks (42 days)'}</div>
              </div>
            </div>
          )}

          {/* Total Days Indicator */}
          {startDate && endDate && totalDays > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/20">
              <CalendarDays className="h-4 w-4 text-primary" />
              <span className="text-sm text-text">
                <strong>{totalDays}</strong> {isMaternityLeave ? 'calendar day' : 'working day'}{totalDays !== 1 ? 's' : ''}
              </span>
            </div>
          )}

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason</Label>
            <Textarea
              id="reason"
              placeholder="Please provide a detailed reason for your leave (min 10 characters)..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className={errors.reason ? 'border-destructive' : ''}
            />
            {errors.reason && <p className="text-xs text-destructive">{errors.reason}</p>}
          </div>

          {/* Attachment Upload */}
          {(needsCertificate || true) && (
            <div className="space-y-2">
              <Label htmlFor="attachment">
                {needsCertificate ? 'Medical Certificate' : 'Supporting Document (optional)'}
              </Label>
              {needsCertificate && (
                <div className="text-xs text-amber-700 bg-amber-50 p-3 rounded-md border border-amber-200">
                  <strong>Notice:</strong> You are applying for 3 or more days of Sick Leave. A medical certificate is mandatory. If you submit without it, your leave will be flagged as <strong>Pending Documentation</strong> and may result in Loss of Pay if not provided before payroll.
                </div>
              )}
              
              <div className={`p-4 border-2 border-dashed rounded-xl text-center transition-all ${attachment ? 'border-emerald-500 bg-emerald-50/50' : errors.attachment ? 'border-destructive bg-destructive/5' : 'border-border'}`}>
                {attachment ? (
                  <div className="flex flex-col items-center gap-2">
                    <Check className="w-6 h-6 text-emerald-500" />
                    <p className="font-medium text-emerald-700 text-sm">Document uploaded successfully</p>
                    <p className="text-xs text-emerald-600/70">{uploadingName || 'attachment.pdf'}</p>
                    <Button type="button" variant="ghost" size="sm" onClick={() => { setAttachment(''); setUploadingName(''); }} className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 mt-1">
                      <X className="w-3 h-3 mr-1" /> Remove Document
                    </Button>
                  </div>
                ) : uploadMutation.isPending ? (
                  <div className="flex flex-col items-center gap-3 py-2">
                    <Loader2 className="w-6 h-6 text-primary animate-spin" />
                    <p className="text-sm font-medium text-text">Uploading {uploadingName}...</p>
                  </div>
                ) : (
                  <label className="cursor-pointer flex flex-col items-center gap-2">
                    <Upload className="w-8 h-8 text-text-muted" />
                    <p className="text-sm text-text-muted font-medium">Click to upload document</p>
                    <p className="text-xs text-text-muted">PDF, JPG, PNG • Max 2MB</p>
                    <input type="file" className="hidden" accept=".pdf,image/jpeg,image/png" onChange={handleFileUpload} disabled={uploadMutation.isPending} />
                  </label>
                )}
              </div>
              {errors.attachment && <p className="text-xs text-destructive">{errors.attachment}</p>}
            </div>
          )}

          <DialogFooter className="mt-6 border-t border-border pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={applyMutation.isPending || isProbationRestricted}
              onClick={handleSubmit}
            >
              {applyMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Submit Request
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
