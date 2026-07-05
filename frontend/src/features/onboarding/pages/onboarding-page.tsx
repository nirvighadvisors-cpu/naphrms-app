import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Check, User, MapPin, Heart, Landmark, FileText, FileSignature, ClipboardCheck, ChevronRight, ChevronLeft, Upload, X, Loader2, ScrollText } from 'lucide-react';
import { EMERGENCY_CONTACT_RELATIONS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuthStore } from '@/store/auth-store';
import {
  useOnboardingStatus,
  useUpdatePersonalInfo,
  useUpdateAddress,
  useUpdateEmergencyContact,
  useUpdateBankDetails,
  useUploadDocument,
  useSignOffer,
  useSubmitOfferDetails,
  useCompleteOnboarding,
  useCompleteDocuments,
} from '../api';
import type { OnboardingStatus } from '../api';
import { DatePicker } from '@/components/ui/date-picker';
import { Controller } from 'react-hook-form';

// ── Step definitions ──────────────────────────────────────────
const STEPS = [
  { id: 0, label: 'Personal', icon: User },
  { id: 1, label: 'Address', icon: MapPin },
  { id: 2, label: 'Emergency', icon: Heart },
  { id: 3, label: 'Bank', icon: Landmark },
  { id: 4, label: 'Documents', icon: FileText },
  { id: 5, label: 'E-Sign', icon: FileSignature },
  { id: 6, label: 'Offer Details', icon: ScrollText },
  { id: 7, label: 'Review', icon: ClipboardCheck },
];

// ── Schemas ───────────────────────────────────────────────────
const personalSchema = z.object({
  firstName: z.string().min(2, 'Required'),
  middleName: z.string().optional(),
  lastName: z.string().min(1, 'Required'),
  dateOfBirth: z.string().min(1, 'Required'),
  gender: z.string().min(1, 'Required'),
  maritalStatus: z.string().min(1, 'Required'),
  bloodGroup: z.string().optional(),
  phone: z.string().regex(/^\+91 \d{10}$/, 'Must be +91 followed by exactly 10 digits'),
  personalEmail: z.string().email('Invalid email').optional().or(z.literal('')),
});

const INDIAN_STATES = [
  "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", 
  "Chandigarh", "Chhattisgarh", "Dadra and Nagar Haveli", "Daman and Diu", "Delhi", "Goa", 
  "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", "Karnataka", 
  "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", 
  "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", 
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal"
];

const addressSubSchema = z.object({
  houseNo: z.string().trim().min(1, 'House/Flat No. is required'),
  building: z.string().trim().min(1, 'Building/Society is required'),
  street: z.string().trim().min(1, 'Street/Area is required'),
  landmark: z.string().trim().optional().or(z.literal('')),
  city: z.string().trim().min(1, 'Village/City is required'),
  taluka: z.string().trim().min(1, 'Taluka is required'),
  district: z.string().trim().min(1, 'District is required'),
  state: z.string().trim().min(1, 'State is required'),
  country: z.string().trim().default('India'),
  pinCode: z.string().trim().regex(/^\d{6}$/, 'PIN Code must be exactly 6 digits'),
});

const addressSchema = z.object({
  currentAddress: addressSubSchema,
  permanentAddress: addressSubSchema,
  sameAsCurrent: z.boolean().optional(),
});

const emergencySchema = z.object({
  emergencyContactName: z.string().min(2, 'Required'),
  emergencyContactRel: z.string().min(1, 'Required'),
  emergencyContactPhone: z.string().regex(/^\+91 \d{10}$/, 'Must be +91 followed by exactly 10 digits'),
  emergencyContact2Name: z.string().optional(),
  emergencyContact2Rel: z.string().optional(),
  emergencyContact2Phone: z.string().regex(/^\+91 \d{10}$/, 'Must be +91 followed by exactly 10 digits').optional().or(z.literal('')),
});

const bankSchema = z.object({
  bankName: z.string().min(2, 'Required'),
  bankAccountHolder: z.string().min(2, 'Required'),
  bankAccountNumber: z.string().min(5, 'Required'),
  bankIFSC: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC (e.g. SBIN0001234)'),
  bankBranch: z.string().optional(),
});

// ── Main Component ────────────────────────────────────────────
export function OnboardingPage() {
  const navigate = useNavigate();
  const { user, setUser } = useAuthStore();
  const { data: status, isLoading: statusLoading } = useOnboardingStatus();
  const [currentStep, setCurrentStep] = useState(0);

  // Navigate to saved step
  useEffect(() => {
    if (status && status.onboardingStep > 0) {
      setCurrentStep(Math.min(status.onboardingStep, 7));
    }
  }, [status]);

  if (statusLoading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-primary/80 text-white py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="font-display text-3xl font-bold">Complete Your Profile</h1>
          <p className="text-white/80 mt-1">Welcome{status?.firstName ? `, ${status.firstName}` : ''}! Please fill in the details below to get started.</p>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="max-w-4xl mx-auto px-4 -mt-5">
        <div className="bg-surface border border-border rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between overflow-x-auto scroll-touch scrollbar-none gap-1 pb-2 md:pb-0">
            {STEPS.map((step) => {
              const Icon = step.icon;
              const isActive = step.id === currentStep;
              const isDone = step.id < currentStep || (status && isStepComplete(status, step.id));
              return (
                <button
                  key={step.id}
                  onClick={() => step.id <= (status?.onboardingStep ?? 0) && setCurrentStep(step.id)}
                  className={`flex flex-col items-center gap-1 px-2 py-2 rounded-lg transition-all min-w-[70px] ${
                    isActive ? 'bg-primary/10 text-primary' : isDone ? 'text-emerald-600' : 'text-text-muted'
                  } ${step.id <= (status?.onboardingStep ?? 0) ? 'cursor-pointer hover:bg-surface' : 'cursor-default opacity-50'}`}
                >
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                    isActive ? 'border-primary bg-primary text-white' : isDone ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-border bg-bg'
                  }`}>
                    {isDone && !isActive ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">{step.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {currentStep === 0 && <PersonalInfoStep onNext={() => setCurrentStep(1)} />}
        {currentStep === 1 && <AddressStep onNext={() => setCurrentStep(2)} onBack={() => setCurrentStep(0)} />}
        {currentStep === 2 && <EmergencyStep onNext={() => setCurrentStep(3)} onBack={() => setCurrentStep(1)} />}
        {currentStep === 3 && <BankStep onNext={() => setCurrentStep(4)} onBack={() => setCurrentStep(2)} />}
        {currentStep === 4 && <DocumentsStep onNext={() => setCurrentStep(5)} onBack={() => setCurrentStep(3)} status={status} />}
        {currentStep === 5 && <ESignStep onNext={() => setCurrentStep(6)} onBack={() => setCurrentStep(4)} status={status} />}
        {currentStep === 6 && <OfferLetterDetailsStep onNext={() => setCurrentStep(7)} onBack={() => setCurrentStep(5)} status={status} />}
        {currentStep === 7 && <ReviewStep onBack={() => setCurrentStep(6)} />}
      </div>
    </div>
  );
}

function isStepComplete(status: OnboardingStatus, step: number): boolean {
  switch (step) {
    case 0: return status.personalInfoDone;
    case 1: return status.addressDone;
    case 2: return status.emergencyContactDone;
    case 3: return status.bankDetailsDone;
    case 4: return status.documentsDone;
    case 5: return status.offerSigned;
    case 6: return status.offerDetailsDone;
    case 7: return status.isProfileComplete;
    default: return false;
  }
}

// ── Step 1: Personal Information ──────────────────────────────
function PersonalInfoStep({ onNext }: { onNext: () => void }) {
  const mutation = useUpdatePersonalInfo();
  const { data: status } = useOnboardingStatus();
  const form = useForm<z.infer<typeof personalSchema>>({
    resolver: zodResolver(personalSchema),
    defaultValues: { firstName: '', middleName: '', lastName: '', dateOfBirth: '', gender: '', maritalStatus: '', bloodGroup: '', phone: '', personalEmail: '' },
  });

  useEffect(() => {
    if (status) {
      form.reset({ 
        firstName: status.firstName || '', 
        lastName: status.lastName || '',
        middleName: status.middleName || '',
        dateOfBirth: status.dateOfBirth ? new Date(status.dateOfBirth).toISOString().split('T')[0] : '',
        gender: status.gender || '',
        maritalStatus: status.maritalStatus || '',
        bloodGroup: status.bloodGroup || '',
        phone: status.phone || '',
        personalEmail: status.personalEmail || '',
      });
    }
  }, [status, form]);

  const onSubmit = (values: z.infer<typeof personalSchema>) => {
    mutation.mutate(values as any, { onSuccess: () => onNext() });
  };

  return (
    <Card className="bg-surface border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><User className="w-5 h-5 text-primary" /> Personal Information</CardTitle>
        <CardDescription>Your core personal details for HR records.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField label="First Name *" error={form.formState.errors.firstName?.message}>
              <Input {...form.register('firstName')} placeholder="e.g. Rahul" />
            </FormField>
            <FormField label="Middle Name" error={form.formState.errors.middleName?.message}>
              <Input {...form.register('middleName')} placeholder="Optional" />
            </FormField>
            <FormField label="Last Name *" error={form.formState.errors.lastName?.message}>
              <Input {...form.register('lastName')} placeholder="e.g. Sharma" />
            </FormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField label="Date of Birth *" error={form.formState.errors.dateOfBirth?.message}>
              <Controller control={form.control} name="dateOfBirth" render={({ field }) => <DatePicker value={field.value} onChange={field.onChange} />} />
            </FormField>
            <FormField label="Gender *" error={form.formState.errors.gender?.message}>
              <select {...form.register('gender')} className="w-full h-10 rounded-md border border-border bg-bg px-3 text-sm text-text">
                <option value="">Select...</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
                <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
              </select>
            </FormField>
            <FormField label="Marital Status *" error={form.formState.errors.maritalStatus?.message}>
              <select {...form.register('maritalStatus')} className="w-full h-10 rounded-md border border-border bg-bg px-3 text-sm text-text">
                <option value="">Select...</option>
                <option value="SINGLE">Single</option>
                <option value="MARRIED">Married</option>
                <option value="DIVORCED">Divorced</option>
              </select>
            </FormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField label="Blood Group" error={form.formState.errors.bloodGroup?.message}>
              <select {...form.register('bloodGroup')} className="w-full h-10 rounded-md border border-border bg-bg px-3 text-sm text-text">
                <option value="">Select...</option>
                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => <option key={bg} value={bg}>{bg}</option>)}
              </select>
            </FormField>
            <FormField label="Mobile Number *" error={form.formState.errors.phone?.message}>
              <Input {...form.register('phone')} placeholder="e.g. 9876543210" />
            </FormField>
            <FormField label="Personal Email" error={form.formState.errors.personalEmail?.message}>
              <Input {...form.register('personalEmail')} placeholder="Optional" type="email" />
            </FormField>
          </div>

          <div className="flex justify-end pt-4 border-t border-border">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Save & Continue <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ── Step 2: Address ───────────────────────────────────────────
const emptyAddress = {
  houseNo: '', building: '', street: '', landmark: '', city: '', taluka: '', district: '', state: '', country: 'India', pinCode: ''
};

function AddressStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const { data: status } = useOnboardingStatus();
  const mutation = useUpdateAddress();
  const [sameAsCurrent, setSameAsCurrent] = useState(false);
  
  const form = useForm<z.infer<typeof addressSchema>>({
    resolver: zodResolver(addressSchema) as any,
    defaultValues: { 
      currentAddress: emptyAddress, 
      permanentAddress: emptyAddress,
      sameAsCurrent: false
    },
  });

  useEffect(() => {
    if (status) {
      const ca = status.currentAddress ? (typeof status.currentAddress === 'string' ? JSON.parse(status.currentAddress) : status.currentAddress) : emptyAddress;
      const pa = status.permanentAddress ? (typeof status.permanentAddress === 'string' ? JSON.parse(status.permanentAddress) : status.permanentAddress) : emptyAddress;
      form.reset({
        currentAddress: ca,
        permanentAddress: pa,
        sameAsCurrent: false,
      } as any);
    }
  }, [status, form]);

  const onSubmit = (values: z.infer<typeof addressSchema>) => {
    mutation.mutate({
      currentAddress: values.currentAddress,
      permanentAddress: values.permanentAddress,
      sameAsCurrent,
    }, { onSuccess: () => onNext() });
  };

  return (
    <Card className="bg-surface border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            <div>
              <CardTitle>Address Details</CardTitle>
              <CardDescription>Required for official letters and correspondence.</CardDescription>
            </div>
          </div>
          <div className="flex items-center space-x-2 mr-4">
            <input 
              type="checkbox"
              id="sameAsPermanent" 
              className="rounded border-border"
              onChange={(e) => {
                const checked = e.target.checked;
                setSameAsCurrent(checked);
                if (checked) {
                  const perm = form.getValues('permanentAddress');
                  if (perm) {
                    Object.entries(perm).forEach(([key, value]) => {
                      form.setValue(`currentAddress.${key}` as any, value, { shouldValidate: true });
                    });
                  }
                }
              }} 
            />
            <Label htmlFor="sameAsPermanent" className="font-semibold cursor-pointer">
              Same as Permanent Address
            </Label>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {/* Permanent Address */}
            <div className="space-y-4">
              <h3 className="font-semibold text-base border-b pb-2">Permanent Address</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label="House/Flat No. *" error={form.formState.errors.permanentAddress?.houseNo?.message}><Input {...form.register('permanentAddress.houseNo')} /></FormField>
                <FormField label="Building/Society *" error={form.formState.errors.permanentAddress?.building?.message}><Input {...form.register('permanentAddress.building')} /></FormField>
                <div className="md:col-span-2"><FormField label="Street/Area *" error={form.formState.errors.permanentAddress?.street?.message}><Input {...form.register('permanentAddress.street')} /></FormField></div>
                <FormField label="Landmark" error={form.formState.errors.permanentAddress?.landmark?.message}><Input {...form.register('permanentAddress.landmark')} /></FormField>
                <FormField label="Village/City *" error={form.formState.errors.permanentAddress?.city?.message}><Input {...form.register('permanentAddress.city')} /></FormField>
                <FormField label="Taluka *" error={form.formState.errors.permanentAddress?.taluka?.message}><Input {...form.register('permanentAddress.taluka')} /></FormField>
                <FormField label="District *" error={form.formState.errors.permanentAddress?.district?.message}><Input {...form.register('permanentAddress.district')} /></FormField>
                <FormField label="State *" error={form.formState.errors.permanentAddress?.state?.message}>
                  <select {...form.register('permanentAddress.state')} className="w-full h-10 rounded-md border border-border bg-bg px-3 text-sm text-text">
                    <option value="">Select State</option>
                    {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </FormField>
                <FormField label="PIN Code *" error={form.formState.errors.permanentAddress?.pinCode?.message}><Input maxLength={6} {...form.register('permanentAddress.pinCode')} /></FormField>
              </div>
            </div>

            {/* Current Address */}
            <div className="space-y-4">
              <h3 className="font-semibold text-base border-b pb-2">Current Address</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label="House/Flat No. *" error={form.formState.errors.currentAddress?.houseNo?.message}><Input {...form.register('currentAddress.houseNo')} /></FormField>
                <FormField label="Building/Society *" error={form.formState.errors.currentAddress?.building?.message}><Input {...form.register('currentAddress.building')} /></FormField>
                <div className="md:col-span-2"><FormField label="Street/Area *" error={form.formState.errors.currentAddress?.street?.message}><Input {...form.register('currentAddress.street')} /></FormField></div>
                <FormField label="Landmark" error={form.formState.errors.currentAddress?.landmark?.message}><Input {...form.register('currentAddress.landmark')} /></FormField>
                <FormField label="Village/City *" error={form.formState.errors.currentAddress?.city?.message}><Input {...form.register('currentAddress.city')} /></FormField>
                <FormField label="Taluka *" error={form.formState.errors.currentAddress?.taluka?.message}><Input {...form.register('currentAddress.taluka')} /></FormField>
                <FormField label="District *" error={form.formState.errors.currentAddress?.district?.message}><Input {...form.register('currentAddress.district')} /></FormField>
                <FormField label="State *" error={form.formState.errors.currentAddress?.state?.message}>
                  <select {...form.register('currentAddress.state')} className="w-full h-10 rounded-md border border-border bg-bg px-3 text-sm text-text">
                    <option value="">Select State</option>
                    {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </FormField>
                <FormField label="PIN Code *" error={form.formState.errors.currentAddress?.pinCode?.message}><Input maxLength={6} {...form.register('currentAddress.pinCode')} /></FormField>
              </div>
            </div>
          </div>

          <StepNavButtons onBack={onBack} isPending={mutation.isPending} />
        </form>
      </CardContent>
    </Card>
  );
}

// ── Step 3: Emergency Contact ─────────────────────────────────
function EmergencyStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const { data: status } = useOnboardingStatus();
  const mutation = useUpdateEmergencyContact();
  const form = useForm<z.infer<typeof emergencySchema>>({
    resolver: zodResolver(emergencySchema),
    defaultValues: { emergencyContactName: '', emergencyContactRel: '', emergencyContactPhone: '', emergencyContact2Name: '', emergencyContact2Rel: '', emergencyContact2Phone: '' },
  });

  const onSubmit = (values: z.infer<typeof emergencySchema>) => {
    mutation.mutate(values, { onSuccess: () => onNext() });
  };

  useEffect(() => {
    if (status) {
      form.reset({
        emergencyContactName: status.emergencyContactName || '',
        emergencyContactRel: status.emergencyContactRel || '',
        emergencyContactPhone: status.emergencyContactPhone || '',
        emergencyContact2Name: status.emergencyContact2Name || '',
        emergencyContact2Rel: status.emergencyContact2Rel || '',
        emergencyContact2Phone: status.emergencyContact2Phone || '',
      });
    }
  }, [status, form]);

  return (
    <Card className="bg-surface border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Heart className="w-5 h-5 text-primary" /> Emergency Contacts</CardTitle>
        <CardDescription>At least one emergency contact is required for safety and compliance.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <h3 className="font-bold text-text text-sm uppercase tracking-wider">Primary Contact</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField label="Full Name *" error={form.formState.errors.emergencyContactName?.message}><Input {...form.register('emergencyContactName')} /></FormField>
            <FormField label="Relationship *" error={form.formState.errors.emergencyContactRel?.message}>
              <select {...form.register('emergencyContactRel')} className="w-full h-10 rounded-md border border-border bg-bg px-3 text-sm text-text">
                <option value="">Select...</option>
                {EMERGENCY_CONTACT_RELATIONS.map(r => <option key={r} value={r}>{r.charAt(0) + r.slice(1).toLowerCase()}</option>)}
              </select>
            </FormField>
            <FormField label="Phone Number *" error={form.formState.errors.emergencyContactPhone?.message}><Input {...form.register('emergencyContactPhone')} /></FormField>
          </div>

          <h3 className="font-bold text-text text-sm uppercase tracking-wider pt-4 border-t border-border">Secondary Contact (Optional)</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField label="Full Name"><Input {...form.register('emergencyContact2Name')} /></FormField>
            <FormField label="Relationship">
              <select {...form.register('emergencyContact2Rel')} className="w-full h-10 rounded-md border border-border bg-bg px-3 text-sm text-text">
                <option value="">Select...</option>
                {EMERGENCY_CONTACT_RELATIONS.map(r => <option key={r} value={r}>{r.charAt(0) + r.slice(1).toLowerCase()}</option>)}
              </select>
            </FormField>
            <FormField label="Phone Number"><Input {...form.register('emergencyContact2Phone')} /></FormField>
          </div>

          <StepNavButtons onBack={onBack} isPending={mutation.isPending} />
        </form>
      </CardContent>
    </Card>
  );
}

// ── Step 4: Bank Details ──────────────────────────────────────
function BankStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const { data: status } = useOnboardingStatus();
  const mutation = useUpdateBankDetails();
  const form = useForm<z.infer<typeof bankSchema>>({
    resolver: zodResolver(bankSchema),
    defaultValues: { bankName: '', bankAccountHolder: '', bankAccountNumber: '', bankIFSC: '', bankBranch: '' },
  });

  const onSubmit = (values: z.infer<typeof bankSchema>) => {
    mutation.mutate(values, { onSuccess: () => onNext() });
  };

  useEffect(() => {
    if (status) {
      form.reset({
        bankName: status.bankName || '',
        bankAccountHolder: status.bankAccountHolder || '',
        bankAccountNumber: status.bankAccountNumber || '',
        bankIFSC: status.bankIFSC || '',
        bankBranch: status.bankBranch || '',
      });
    }
  }, [status, form]);

  return (
    <Card className="bg-surface border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Landmark className="w-5 h-5 text-primary" /> Bank & Payroll Details</CardTitle>
        <CardDescription>Required for salary credit. Please enter your details carefully.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Bank Name *" error={form.formState.errors.bankName?.message}><Input {...form.register('bankName')} placeholder="e.g. State Bank of India" /></FormField>
            <FormField label="Account Holder Name *" error={form.formState.errors.bankAccountHolder?.message}><Input {...form.register('bankAccountHolder')} placeholder="As on passbook" /></FormField>
            <FormField label="Account Number *" error={form.formState.errors.bankAccountNumber?.message}><Input {...form.register('bankAccountNumber')} placeholder="e.g. 12345678901234" /></FormField>
            <FormField label="IFSC Code *" error={form.formState.errors.bankIFSC?.message}><Input {...form.register('bankIFSC')} placeholder="e.g. SBIN0001234" className="uppercase" /></FormField>
            <FormField label="Branch Name"><Input {...form.register('bankBranch')} placeholder="Optional" /></FormField>
          </div>

          <StepNavButtons onBack={onBack} isPending={mutation.isPending} />
        </form>
      </CardContent>
    </Card>
  );
}

// ── Step 5: Document Uploads ──────────────────────────────────
const DOC_TYPES = [
  { type: 'PAN_CARD', label: 'PAN Card', required: true },
  { type: 'AADHAAR', label: 'Aadhaar Card', required: true },
  { type: 'CANCELLED_CHEQUE', label: 'Cancelled Cheque / Passbook', required: false },
  { type: 'PROFILE_PHOTO', label: 'Profile Photo (Passport Size)', required: true },
  { type: 'EDUCATION_CERT', label: 'Education Certificate', required: true },
  { type: 'EXPERIENCE_CERT', label: 'Experience Letter', required: false },
  { type: 'FITNESS_CERTIFICATE', label: 'Fitness Certificate', required: true },
];

interface DocState {
  name: string;
  id?: string;
  verificationStatus?: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'SKIPPED';
  verificationRemarks?: string;
}

function DocumentsStep({ onNext, onBack, status }: { onNext: () => void; onBack: () => void; status: any }) {
  const uploadMutation = useUploadDocument();
  const completeMutation = useCompleteDocuments();
  const [verifyingType, setVerifyingType] = useState<string | null>(null);
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, DocState>>(() => {
    const initialDocs: Record<string, DocState> = {};
    if (status?.documents && Array.isArray(status.documents)) {
      status.documents.forEach((doc: any) => {
        initialDocs[doc.type] = {
          name: doc.fileName,
          id: doc.id,
          verificationStatus: doc.verificationStatus || 'VERIFIED',
          verificationRemarks: doc.verificationRemarks,
        };
      });
    }
    return initialDocs;
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // 2MB limit
    if (file.size > 2 * 1024 * 1024) {
      alert('File too large. Maximum 2MB allowed.');
      return;
    }

    // Remove old doc if re-uploading
    setUploadedDocs(prev => {
      const n = { ...prev };
      delete n[type];
      return n;
    });

    setVerifyingType(type);

    uploadMutation.mutate(
      { file, type },
      {
        onSuccess: (doc: any) => {
          const verification = doc?.verification;
          setUploadedDocs(prev => ({
            ...prev,
            [type]: {
              name: file.name,
              id: doc?.id,
              verificationStatus: verification?.status || 'VERIFIED',
              verificationRemarks: verification?.reason,
            },
          }));
          setVerifyingType(null);
        },
        onError: () => {
          setVerifyingType(null);
        },
      }
    );
  };

  // Required docs must be uploaded AND verified
  const requiredMissing = DOC_TYPES.filter(
    d => d.required && (!uploadedDocs[d.type] || uploadedDocs[d.type]?.verificationStatus === 'REJECTED')
  );

  return (
    <Card className="bg-surface border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5 text-primary" /> Document Uploads (KYC)</CardTitle>
        <CardDescription>Upload soft copies of your key documents. Each document will be verified by AI before you can proceed. Maximum 2MB per file.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {DOC_TYPES.map((doc) => {
            const docState = uploadedDocs[doc.type];
            const isVerifying = verifyingType === doc.type;
            const isVerified = docState?.verificationStatus === 'VERIFIED';
            const isRejected = docState?.verificationStatus === 'REJECTED';

            return (
              <div key={doc.type} className={`p-4 rounded-lg border transition-all ${
                isVerifying ? 'border-blue-400 bg-blue-50/30 animate-pulse' :
                isVerified ? 'border-emerald-500 bg-emerald-50/50' :
                isRejected ? 'border-rose-400 bg-rose-50/50' :
                'border-border bg-bg'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <span className="font-semibold text-text">{doc.label}</span>
                    {doc.required && <span className="text-rose-500 ml-1 text-xs font-bold">*Required</span>}

                    {/* Scanning state */}
                    {isVerifying && (
                      <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" /> AI is scanning and verifying your document...
                      </p>
                    )}

                    {/* Verified state */}
                    {!isVerifying && isVerified && docState && (
                      <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                        <Check className="w-3 h-3" /> <strong>Verified</strong> — {docState.name}
                      </p>
                    )}

                    {/* Rejected state */}
                    {!isVerifying && isRejected && docState && (
                      <div className="mt-2 p-2 bg-rose-100 border border-rose-300 rounded-md">
                        <p className="text-xs text-rose-700 font-semibold flex items-center gap-1">
                          <X className="w-3 h-3" /> Verification Failed
                        </p>
                        <p className="text-xs text-rose-600 mt-1">
                          {docState.verificationRemarks || 'The uploaded document could not be verified. Please upload a correct document.'}
                        </p>
                      </div>
                    )}

                    {/* Uploaded but not verified yet (e.g. old data without verification) */}
                    {!isVerifying && !isVerified && !isRejected && docState && (
                      <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                        <Loader2 className="w-3 h-3" /> {docState.name} — Pending verification
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    {docState && !isVerifying && (
                      <Button variant="ghost" size="sm" onClick={() => setUploadedDocs(prev => { const n = { ...prev }; delete n[doc.type]; return n; })}>
                        <X className="w-4 h-4 text-rose-500" />
                      </Button>
                    )}
                    <label className="cursor-pointer">
                      <Button variant="outline" size="sm" asChild disabled={isVerifying || (uploadMutation.isPending && verifyingType !== null)}>
                        <span>
                          {isVerifying ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
                          {isRejected ? 'Retry' : docState ? 'Replace' : 'Upload'}
                        </span>
                      </Button>
                      <input type="file" className="hidden" accept="image/*,.pdf" onChange={(e) => handleFileChange(e, doc.type)} disabled={isVerifying} />
                    </label>
                  </div>
                </div>
                {doc.type === 'AADHAAR' && (
                  <div className="mt-4 p-4 bg-muted/30 rounded-lg border border-border/50">
                    <p className="text-sm font-medium mb-3">
                      Sample Aadhaar Card Format – Please upload a clear and readable Aadhaar Card image similar to the example shown below.
                    </p>
                    <img src="/sample-aadhaar.png" alt="Sample Aadhaar Card" className="max-w-full h-auto rounded border border-border shadow-sm mx-auto" style={{ maxHeight: '200px', objectFit: 'contain' }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {requiredMissing.length > 0 && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800 font-semibold">
              ⚠️ The following required documents need to be uploaded and verified: {requiredMissing.map(d => d.label).join(', ')}
            </p>
          </div>
        )}

        <div className="flex justify-between pt-6 border-t border-border mt-6">
          <Button type="button" variant="outline" onClick={onBack} disabled={completeMutation.isPending || verifyingType !== null}><ChevronLeft className="w-4 h-4 mr-2" /> Back</Button>
          <Button onClick={() => completeMutation.mutate(undefined, { onSuccess: onNext })} disabled={requiredMissing.length > 0 || completeMutation.isPending || verifyingType !== null}>
            {completeMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Continue <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Step 6: E-Sign ────────────────────────────────────────────
function ESignStep({ onNext, onBack, status }: { onNext: () => void; onBack: () => void; status: any }) {
  const uploadMutation = useUploadDocument();
  const signMutation = useSignOffer();
  const [signatureUploaded, setSignatureUploaded] = useState(false);
  const [signaturePath, setSignaturePath] = useState('');
  const [signatureUrl, setSignatureUrl] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [policyAccepted, setPolicyAccepted] = useState(false);

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) {
      alert('Signature image must be under 500KB');
      return;
    }
    uploadMutation.mutate(
      { file, type: 'SIGNATURE' },
      {
        onSuccess: (doc: any) => {
          setSignatureUploaded(true);
          setSignaturePath(doc?.data?.fileUrl || doc?.fileUrl || '');
          setSignatureUrl(doc?.data?.signedUrl || doc?.signedUrl || '');
        },
      }
    );
  };

  const handleSign = async () => {
    setIsGenerating(true);
    try {
      const offerContent = `Signature submitted by Employee - ${new Date().toISOString()}`;
      const hash = btoa(offerContent);

      signMutation.mutate({
        signatureStoragePath: signaturePath,
        offerLetterHash: hash,
        ipAddress: 'client-side',
        userAgent: navigator.userAgent,
        policyAccepted: policyAccepted,
      }, { 
        onSuccess: () => {
          setIsGenerating(false);
          onNext();
        },
        onError: () => setIsGenerating(false)
      });
    } catch (error) {
      console.error('Signature submission failed:', error);
      alert('Failed to submit signature');
      setIsGenerating(false);
    }
  };

  return (
    <>
      <Card className="bg-surface border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FileSignature className="w-5 h-5 text-primary" /> Offer Letter & E-Sign</CardTitle>
          <CardDescription>Review your offer letter and sign it digitally.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
        {/* Offer letter preview */}
        <div className="bg-bg border border-border rounded-lg p-6 text-sm text-text-muted space-y-3">
          <h3 className="font-bold text-text text-base">📄 Offer Letter — Nirvigh Advisors</h3>
          <p>This is your official offer of employment with Nirvigh Advisors Pvt. Ltd. By signing below, you acknowledge that you have read and agree to the terms of your employment.</p>
          <p>Your employment details have been provided to you separately via email. By e-signing this document, you confirm your acceptance of the position, compensation, and company policies.</p>
          <p className="text-xs text-text-muted italic">Note: A detailed Appointment Letter will also be generated and shared with you after signing.</p>
        </div>

        {/* Policy Acceptance */}
        <div className="space-y-3 pt-4 border-t border-border">
          <div className="flex items-center justify-between">
            <Label className="font-bold text-base">Company Policies</Label>
            <a href={import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/$/, '') + '/policies/merged' : 'http://localhost:4000/api/policies/merged'} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm font-semibold">
              Click Here to Read the Policy
            </a>
          </div>
          <div className="flex items-start space-x-3 bg-muted/30 p-4 rounded-lg border border-border">
            <Checkbox id="policy" checked={policyAccepted} onCheckedChange={(c) => setPolicyAccepted(c as boolean)} className="mt-1" />
            <div className="grid gap-1.5 leading-none">
              <label
                htmlFor="policy"
                className="text-sm font-medium leading-relaxed peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                I have read, understood, and agree to the company policies and terms.
              </label>
            </div>
          </div>
        </div>

        {/* Signature upload */}
        <div className={`space-y-3 transition-opacity ${!policyAccepted ? 'opacity-50' : 'opacity-100'}`}>
          <Label className="font-bold text-base">Upload Your Signature</Label>
          <p className="text-sm text-text-muted">Upload a clear image of your signature (PNG/JPG, max 500KB). This will be used on official documents.</p>
          <div className={`p-6 border-2 border-dashed rounded-xl text-center transition-all ${signatureUploaded ? 'border-emerald-500 bg-emerald-50/50' : 'border-border'} ${!policyAccepted ? 'cursor-not-allowed bg-gray-50' : ''}`}>
            {signatureUploaded ? (
              <div className="flex flex-col items-center gap-2">
                <Check className="w-8 h-8 text-emerald-500" />
                <p className="font-semibold text-emerald-700">Signature uploaded successfully</p>
                <label className={`cursor-pointer ${!policyAccepted ? 'pointer-events-none' : ''}`}>
                  <Button variant="outline" size="sm" asChild disabled={!policyAccepted}><span>Replace Signature</span></Button>
                  <input type="file" className="hidden" accept="image/*" onChange={handleSignatureUpload} disabled={!policyAccepted} />
                </label>
              </div>
            ) : (
              <label className={`cursor-pointer flex flex-col items-center gap-3 ${!policyAccepted ? 'pointer-events-none' : ''}`}>
                <Upload className="w-10 h-10 text-text-muted" />
                <p className="text-text-muted font-semibold">Click to upload your signature</p>
                <p className="text-xs text-text-muted">PNG, JPG • Max 500KB</p>
                <input type="file" className="hidden" accept="image/*" onChange={handleSignatureUpload} disabled={!policyAccepted} />
              </label>
            )}
          </div>
        </div>

        <div className="flex justify-between pt-4 border-t border-border">
          <Button type="button" variant="outline" onClick={onBack} disabled={isGenerating}><ChevronLeft className="w-4 h-4 mr-2" /> Back</Button>
          <Button onClick={handleSign} disabled={!signatureUploaded || !policyAccepted || signMutation.isPending || isGenerating} className="bg-emerald-600 hover:bg-emerald-700">
            {signMutation.isPending || isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileSignature className="w-4 h-4 mr-2" />}
            {isGenerating ? 'Generating...' : 'Sign & Accept Offer'}
          </Button>
        </div>
      </CardContent>
    </Card>
    </>
  );
}

// ── Step 6: Offer Letter Details ──────────────────────────────
function OfferLetterDetailsStep({ onNext, onBack, status }: { onNext: () => void; onBack: () => void; status: any }) {
  const submitMutation = useSubmitOfferDetails();
  
  const schema = z.object({
    panNumber: z.string().trim().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN Format (e.g. ABCDE1234F)'),
    aadhaarNumber: z.string().trim().regex(/^\d{12}$/, 'Aadhaar must be exactly 12 digits'),
    uanNumber: z.string().trim().regex(/^\d{12}$/, 'UAN must be exactly 12 digits').optional().or(z.literal('')),
  });

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      panNumber: status?.panNumber || '',
      aadhaarNumber: status?.aadhaarNumber || '',
      uanNumber: status?.uanNumber || '',
    },
  });

  const onSubmit = (data: any) => {
    submitMutation.mutate(data, {
      onSuccess: () => onNext(),
    });
  };

  return (
    <Card className="bg-surface border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><ScrollText className="w-5 h-5 text-primary" /> Offer Letter Details</CardTitle>
        <CardDescription>Please provide the required details to prepare your final Offer Letter.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-muted/30 rounded-lg border border-border">
            <h3 className="col-span-full font-bold text-base border-b border-border pb-2">Employee Information (Read-Only)</h3>
            <div className="space-y-1">
              <Label className="text-sm text-text-muted">Full Name</Label>
              <div className="font-semibold">{status?.firstName} {status?.lastName}</div>
            </div>
            <div className="space-y-1">
              <Label className="text-sm text-text-muted">Department</Label>
              <div className="font-semibold">{status?.department?.name || 'N/A'}</div>
            </div>
            <div className="space-y-1">
              <Label className="text-sm text-text-muted">Designation</Label>
              <div className="font-semibold">{status?.designation || 'N/A'}</div>
            </div>
            <div className="space-y-1">
              <Label className="text-sm text-text-muted">Reporting Manager</Label>
              <div className="font-semibold">{status?.manager?.firstName ? `${status.manager.firstName} ${status.manager.lastName}` : 'N/A'}</div>
            </div>
            <div className="space-y-1">
              <Label className="text-sm text-text-muted">Joining Date</Label>
              <div className="font-semibold">{status?.dateOfJoining ? new Date(status.dateOfJoining).toLocaleDateString() : 'Pending'}</div>
            </div>
            <div className="space-y-1">
              <Label className="text-sm text-text-muted">Official Email</Label>
              <div className="font-semibold">{status?.personalEmail || 'N/A'}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField label="PAN Number *" error={errors.panNumber?.message as string}>
              <Input {...register('panNumber')} placeholder="e.g. ABCDE1234F" className="uppercase" />
            </FormField>
            <FormField label="Aadhaar Number *" error={errors.aadhaarNumber?.message as string}>
              <Input {...register('aadhaarNumber')} placeholder="12 digit Aadhaar Number" maxLength={12} />
            </FormField>
            <FormField label="UAN Number (Optional)" error={errors.uanNumber?.message as string}>
              <Input {...register('uanNumber')} placeholder="12 digit UAN Number" maxLength={12} />
            </FormField>
          </div>

          <StepNavButtons onBack={onBack} isPending={submitMutation.isPending} />
        </form>
      </CardContent>
    </Card>
  );
}

// ── Step 7: Review & Confirm ──────────────────────────────────
function ReviewStep({ onBack }: { onBack: () => void }) {
  const navigate = useNavigate();
  const { setUser, user } = useAuthStore();
  const { data: status } = useOnboardingStatus();
  const completeMutation = useCompleteOnboarding();
  const { toast } = useToast();

  const allDone = status?.personalInfoDone && status?.addressDone && status?.emergencyContactDone && status?.bankDetailsDone && status?.documentsDone && status?.offerSigned && status?.offerDetailsDone;

  const handleComplete = () => {
    completeMutation.mutate(undefined, {
      onSuccess: () => {
        toast({
          title: "Onboarding Submitted!",
          description: "HR will provide your offer letter shortly. Your account is now active.",
        });
        // Update the auth store
        if (user) {
          setUser({ ...user, isProfileComplete: true });
        }
        navigate('/employee/dashboard', { replace: true });
      },
    });
  };

  return (
    <Card className="bg-surface border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><ClipboardCheck className="w-5 h-5 text-primary" /> Review & Confirm</CardTitle>
        <CardDescription>Verify all sections are complete, then finish your onboarding.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <ReviewItem label="Personal Information" done={status?.personalInfoDone} />
          <ReviewItem label="Address Details" done={status?.addressDone} />
          <ReviewItem label="Emergency Contacts" done={status?.emergencyContactDone} />
          <ReviewItem label="Bank & Payroll Details" done={status?.bankDetailsDone} />
          <ReviewItem label="Document Uploads (KYC)" done={status?.documentsDone} />
          <ReviewItem label="Offer Letter E-Signed" done={status?.offerSigned} />
          <ReviewItem label="Offer Letter Details" done={status?.offerDetailsDone} />
        </div>

        {!allDone && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm font-semibold">
            ⚠️ Some steps are incomplete. Please go back and fill in all required information.
          </div>
        )}

        <div className="flex justify-between pt-6 border-t border-border">
          <Button type="button" variant="outline" onClick={onBack}><ChevronLeft className="w-4 h-4 mr-2" /> Back</Button>
          <Button onClick={handleComplete} disabled={!allDone || completeMutation.isPending} size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-base px-8">
            {completeMutation.isPending ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Check className="w-5 h-5 mr-2" />}
            🎉 Submit Onboarding to HR
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Helpers ───────────────────────────────────────────────────
function ReviewItem({ label, done }: { label: string; done?: boolean }) {
  return (
    <div className={`flex items-center justify-between p-3 rounded-lg border ${done ? 'border-emerald-200 bg-emerald-50/50' : 'border-rose-200 bg-rose-50/50'}`}>
      <span className="font-semibold text-text">{label}</span>
      {done ? (
        <span className="flex items-center gap-1 text-emerald-600 text-sm font-bold"><Check className="w-4 h-4" /> Complete</span>
      ) : (
        <span className="flex items-center gap-1 text-rose-600 text-sm font-bold"><X className="w-4 h-4" /> Incomplete</span>
      )}
    </div>
  );
}

function FormField({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-sm font-semibold">{label}</Label>
      {children}
      {error && <p className="text-xs text-rose-500">{error}</p>}
    </div>
  );
}

function StepNavButtons({ onBack, isPending }: { onBack: () => void; isPending: boolean }) {
  return (
    <div className="flex justify-between pt-6 border-t border-border">
      <Button type="button" variant="outline" onClick={onBack}><ChevronLeft className="w-4 h-4 mr-2" /> Back</Button>
      <Button type="submit" disabled={isPending}>
        {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
        Save & Continue <ChevronRight className="w-4 h-4 ml-2" />
      </Button>
    </div>
  );
}
