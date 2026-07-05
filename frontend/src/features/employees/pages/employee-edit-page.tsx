import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useUpdateEmployee, useDepartments, useEmployees, useEmployee } from '../api';
import { useWorksites } from '@/features/settings/api/use-worksites';
import { Link } from 'react-router-dom';
import { User, Briefcase, MapPin, Phone } from 'lucide-react';
import { DatePicker } from '@/components/ui/date-picker';
import { EMERGENCY_CONTACT_RELATIONS } from '@/lib/constants';
import { Controller } from 'react-hook-form';
const INDIAN_STATES = [
  "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", 
  "Chandigarh", "Chhattisgarh", "Dadra and Nagar Haveli", "Daman and Diu", "Delhi", "Goa", 
  "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", "Karnataka", 
  "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", 
  "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", 
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal"
];

const addressSchema = z.object({
  houseNo: z.string().trim().min(1, 'House/Flat No. is required'),
  building: z.string().trim().min(1, 'Building/Society is required'),
  street: z.string().trim().min(1, 'Street/Area is required'),
  landmark: z.string().trim().optional().or(z.literal('')),
  city: z.string().trim().min(1, 'Village/City is required'),
  taluka: z.string().trim().min(1, 'Taluka is required'),
  district: z.string().trim().min(1, 'District is required'),
  state: z.string().trim().min(1, 'State is required'),
  country: z.string().trim(),
  pinCode: z.string().trim().regex(/^\d{6}$/, 'PIN Code must be exactly 6 digits'),
});

const emptyAddress = {
  houseNo: '', building: '', street: '', landmark: '', city: '', taluka: '', district: '', state: '', country: 'India', pinCode: ''
};

const safeParseAddress = (addrString: string | null | undefined) => {
  if (!addrString) return emptyAddress;
  try {
    const parsed = JSON.parse(addrString);
    if (typeof parsed === 'object' && parsed !== null) {
      return { ...emptyAddress, ...parsed };
    }
  } catch (e) {
    return { ...emptyAddress, street: addrString };
  }
  return emptyAddress;
};
const formSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().optional().nullable(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']).optional().nullable(),
  dateOfBirth: z.string().optional().nullable().refine((date) => {
    if (!date) return true;
    const dob = new Date(date);
    if (isNaN(dob.getTime())) return false;
    const today = new Date();
    if (dob > today) return false;
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age >= 18;
  }, 'Employee must be at least 18 years old to be registered.'),
  
  dateOfJoining: z.string().min(1, 'Date of joining is required'),
  designation: z.string().min(1, 'Designation is required'),
  departmentId: z.string().uuid('Department is required'),
  workSiteId: z.string().optional().nullable(),
  employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACTOR', 'INTERN']),
  managerId: z.string().optional().nullable(),
  weekOffDays: z.array(z.string()).min(1, 'Select at least one week off'),
  
  currentAddress: addressSchema,
  permanentAddress: addressSchema,
  
  emergencyContactName: z.string().trim().min(1, 'Emergency contact name is required'),
  emergencyContactRel: z.string().trim().min(1, 'Relationship is required'),
  emergencyContactPhone: z.string().trim().regex(/^\+91 \d{10}$/, 'Phone number must be exactly 10 digits after +91'),
  
  isEsicCovered: z.boolean(),
  esicNumber: z.string().optional().nullable(),

  taxRegime: z.enum(['OLD', 'NEW']),
  uanNumber: z.string().optional().nullable(),
  pfAccountNumber: z.string().optional().nullable(),
  panNumber: z.string().optional().nullable(),
});

type FormValues = z.infer<typeof formSchema>;

export const EmployeeEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const today = new Date();
  const maxAllowedDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
  
  const { data: employee, isLoading: isEmployeeLoading } = useEmployee(id!);
  const { mutate: updateEmployee, isPending } = useUpdateEmployee();
  const { data: departments, isLoading: isDeptsLoading } = useDepartments();
  const { data: employeesData, isLoading: isEmpsLoading } = useEmployees({ limit: 100 }); 
  const { data: worksites, isLoading: isWorksitesLoading } = useWorksites();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    values: employee ? ({
      firstName: employee.firstName,
      lastName: employee.lastName,
      phone: employee.phone || '',
      gender: (employee.gender as FormValues['gender']) || undefined,
      dateOfBirth: employee.dateOfBirth ? new Date(employee.dateOfBirth).toISOString().split('T')[0] : '',
      dateOfJoining: employee.dateOfJoining ? new Date(employee.dateOfJoining).toISOString().split('T')[0] : '',
      designation: employee.designation,
      departmentId: employee.departmentId || '',
      workSiteId: employee.workSiteId || 'none',
      employmentType: (employee.employmentType || 'FULL_TIME') as FormValues['employmentType'],
      managerId: employee.managerId || 'none',
      weekOffDays: (employee as any).weekOffDays || ['SUNDAY'],
      currentAddress: safeParseAddress(employee.currentAddress),
      permanentAddress: safeParseAddress(employee.permanentAddress),
      emergencyContactName: employee.emergencyContactName || '',
      emergencyContactRel: employee.emergencyContactRel || '',
      emergencyContactPhone: employee.emergencyContactPhone || '',
      isEsicCovered: Boolean((employee as any).isEsicCovered),
      esicNumber: (employee as any).esicNumber || '',
      taxRegime: ((employee as any).taxRegime || 'NEW') as 'NEW' | 'OLD',
      uanNumber: (employee as any).uanNumber || '',
      pfAccountNumber: (employee as any).pfAccountNumber || '',
      panNumber: (employee as any).panNumber || '',
    } as FormValues) : undefined,
    defaultValues: {
      firstName: '',
      lastName: '',
      phone: '',
      dateOfJoining: '',
      designation: '',
      departmentId: '',
      workSiteId: 'none',
      employmentType: 'FULL_TIME',
      managerId: 'none',
      weekOffDays: ['SUNDAY'],
      currentAddress: emptyAddress,
      permanentAddress: emptyAddress,
      emergencyContactName: '',
      emergencyContactRel: '',
      emergencyContactPhone: '',
      taxRegime: 'NEW',
    },
  });

  const onSubmit = (values: FormValues) => {
    const payload: any = { ...values };
    if (payload.managerId === 'none') {
      payload.managerId = null;
    }
    if (payload.workSiteId === 'none') {
      payload.workSiteId = null;
    }
    // Clean up empty strings to avoid backend validation errors
    if (!payload.phone) delete payload.phone;
    if (!payload.dateOfBirth) delete payload.dateOfBirth;
    if (!payload.gender) delete payload.gender;
    if (!payload.alternatePhone) delete payload.alternatePhone;

    payload.currentAddress = JSON.stringify(payload.currentAddress);
    payload.permanentAddress = JSON.stringify(payload.permanentAddress);
    
    updateEmployee({ id: id!, data: payload as any }, {
      onSuccess: () => navigate(`/admin/employees/${id}`)
    });
  };

  if (isEmployeeLoading || isDeptsLoading || isEmpsLoading || isWorksitesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!employee) {
    return <div>Employee not found</div>;
  }

  const fullName = `${employee.firstName} ${employee.lastName}`;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <PageHeader 
        title="Edit Employee" 
        description={`Update information for ${fullName}.`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/admin/dashboard' },
          { label: 'Employees', href: '/admin/employees' },
          { label: fullName, href: `/admin/employees/${id}` },
          { label: 'Edit' }
        ]}
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          
          <Card className="shadow-sm border-border overflow-hidden">
            <CardHeader className="bg-surface-offset/30 border-b border-border/50 pb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary/10 text-primary rounded-md">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">Personal Information</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField control={form.control} name="firstName" render={({ field }) => (
                <FormItem>
                  <FormLabel>First Name <span className="text-destructive">*</span></FormLabel>
                  <FormControl><Input placeholder="e.g. Rahul" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="lastName" render={({ field }) => (
                <FormItem>
                  <FormLabel>Last Name <span className="text-destructive">*</span></FormLabel>
                  <FormControl><Input placeholder="e.g. Sharma" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl><Input placeholder="+91 98765 43210" {...field} value={field.value || ''} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="gender" render={({ field }) => (
                <FormItem>
                  <FormLabel>Gender</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || undefined}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="MALE">Male</SelectItem>
                      <SelectItem value="FEMALE">Female</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                      <SelectItem value="PREFER_NOT_TO_SAY">Prefer not to say</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="dateOfBirth" render={({ field }) => (
                <FormItem>
                  <FormLabel>Date of Birth</FormLabel>
                  <FormControl><DatePicker value={field.value || undefined} onChange={field.onChange} disabled={{ after: maxAllowedDate }} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border overflow-hidden">
            <CardHeader className="bg-surface-offset/30 border-b border-border/50 pb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary/10 text-primary rounded-md">
                  <Briefcase className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">Employment Details</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField control={form.control} name="designation" render={({ field }) => (
                <FormItem>
                  <FormLabel>Designation <span className="text-destructive">*</span></FormLabel>
                  <FormControl><Input placeholder="e.g. Senior Analyst" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="departmentId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Department <span className="text-destructive">*</span></FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {departments?.map(dept => (
                        <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="dateOfJoining" render={({ field }) => (
                <FormItem>
                  <FormLabel>Date of Joining <span className="text-destructive">*</span></FormLabel>
                  <FormControl><DatePicker value={field.value} onChange={field.onChange} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="employmentType" render={({ field }) => (
                <FormItem>
                  <FormLabel>Employment Type <span className="text-destructive">*</span></FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="FULL_TIME">Full-time</SelectItem>
                      <SelectItem value="PART_TIME">Part-time</SelectItem>
                      <SelectItem value="CONTRACTOR">Contractor</SelectItem>
                      <SelectItem value="INTERN">Intern</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="workSiteId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Work Site</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || 'none'}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select work site" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="none">Unassigned (No Geofencing)</SelectItem>
                      {worksites?.map(site => (
                        <SelectItem key={site.id} value={site.id}>{site.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="managerId" render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Reporting Manager</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || 'none'}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select manager" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="none">No Manager (Top Level)</SelectItem>
                      {employeesData?.data?.map(emp => (
                        <SelectItem key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName} ({emp.employeeCode})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="weekOffDays" render={() => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Week Off Days <span className="text-destructive">*</span></FormLabel>
                  <div className="flex flex-wrap gap-4 mt-2">
                    {['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'].map((day) => (
                      <FormField key={day} control={form.control} name="weekOffDays" render={({ field }) => {
                        return (
                          <FormItem key={day} className="flex flex-row items-start space-x-2 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(day)}
                                onCheckedChange={(checked) => {
                                  return checked
                                    ? field.onChange([...(field.value || []), day])
                                    : field.onChange(field.value?.filter((value) => value !== day))
                                }}
                              />
                            </FormControl>
                            <FormLabel className="font-normal">{day.charAt(0) + day.slice(1).toLowerCase()}</FormLabel>
                          </FormItem>
                        )
                      }} />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border overflow-hidden">
            <CardHeader className="bg-surface-offset/30 border-b border-border/50 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-primary/10 text-primary rounded-md">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Address Details</CardTitle>
                    <CardDescription>Residential and permanent addresses.</CardDescription>
                  </div>
                </div>
                <div className="flex items-center space-x-2 mr-4">
                  <Checkbox 
                    id="sameAsPermanent" 
                    onCheckedChange={(checked) => {
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
                  <label htmlFor="sameAsPermanent" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Same as Permanent Address
                  </label>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 grid grid-cols-1 xl:grid-cols-2 gap-8">
              
              {/* Permanent Address */}
              <div className="space-y-4">
                <h3 className="font-semibold text-base border-b pb-2">Permanent Address</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="permanentAddress.houseNo" render={({ field }) => (
                    <FormItem><FormLabel>House/Flat No. <span className="text-destructive">*</span></FormLabel><FormControl><Input placeholder="e.g. Flat 101" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="permanentAddress.building" render={({ field }) => (
                    <FormItem><FormLabel>Building/Society <span className="text-destructive">*</span></FormLabel><FormControl><Input placeholder="e.g. Shreeji Towers" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="permanentAddress.street" render={({ field }) => (
                    <FormItem className="md:col-span-2"><FormLabel>Street/Area <span className="text-destructive">*</span></FormLabel><FormControl><Input placeholder="e.g. MG Road, Near Station" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="permanentAddress.landmark" render={({ field }) => (
                    <FormItem><FormLabel>Landmark</FormLabel><FormControl><Input placeholder="Optional" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="permanentAddress.city" render={({ field }) => (
                    <FormItem><FormLabel>Village/City <span className="text-destructive">*</span></FormLabel><FormControl><Input placeholder="e.g. Mumbai" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="permanentAddress.taluka" render={({ field }) => (
                    <FormItem><FormLabel>Taluka <span className="text-destructive">*</span></FormLabel><FormControl><Input placeholder="e.g. Andheri" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="permanentAddress.district" render={({ field }) => (
                    <FormItem><FormLabel>District <span className="text-destructive">*</span></FormLabel><FormControl><Input placeholder="e.g. Mumbai Suburban" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="permanentAddress.state" render={({ field }) => (
                    <FormItem>
                      <FormLabel>State <span className="text-destructive">*</span></FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select State" /></SelectTrigger></FormControl>
                        <SelectContent>{INDIAN_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="permanentAddress.pinCode" render={({ field }) => (
                    <FormItem><FormLabel>PIN Code <span className="text-destructive">*</span></FormLabel><FormControl><Input placeholder="e.g. 400001" maxLength={6} {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
              </div>

              {/* Current Address */}
              <div className="space-y-4">
                <h3 className="font-semibold text-base border-b pb-2">Current Address</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="currentAddress.houseNo" render={({ field }) => (
                    <FormItem><FormLabel>House/Flat No. <span className="text-destructive">*</span></FormLabel><FormControl><Input placeholder="e.g. Flat 101" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="currentAddress.building" render={({ field }) => (
                    <FormItem><FormLabel>Building/Society <span className="text-destructive">*</span></FormLabel><FormControl><Input placeholder="e.g. Shreeji Towers" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="currentAddress.street" render={({ field }) => (
                    <FormItem className="md:col-span-2"><FormLabel>Street/Area <span className="text-destructive">*</span></FormLabel><FormControl><Input placeholder="e.g. MG Road, Near Station" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="currentAddress.landmark" render={({ field }) => (
                    <FormItem><FormLabel>Landmark</FormLabel><FormControl><Input placeholder="Optional" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="currentAddress.city" render={({ field }) => (
                    <FormItem><FormLabel>Village/City <span className="text-destructive">*</span></FormLabel><FormControl><Input placeholder="e.g. Mumbai" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="currentAddress.taluka" render={({ field }) => (
                    <FormItem><FormLabel>Taluka <span className="text-destructive">*</span></FormLabel><FormControl><Input placeholder="e.g. Andheri" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="currentAddress.district" render={({ field }) => (
                    <FormItem><FormLabel>District <span className="text-destructive">*</span></FormLabel><FormControl><Input placeholder="e.g. Mumbai Suburban" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="currentAddress.state" render={({ field }) => (
                    <FormItem>
                      <FormLabel>State <span className="text-destructive">*</span></FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select State" /></SelectTrigger></FormControl>
                        <SelectContent>{INDIAN_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="currentAddress.pinCode" render={({ field }) => (
                    <FormItem><FormLabel>PIN Code <span className="text-destructive">*</span></FormLabel><FormControl><Input placeholder="e.g. 400001" maxLength={6} {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
              </div>

            </CardContent>
          </Card>

          <Card className="shadow-sm border-border overflow-hidden">
            <CardHeader className="bg-surface-offset/30 border-b border-border/50 pb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary/10 text-primary rounded-md">
                  <Phone className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">Emergency Contact</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
              <FormField control={form.control} name="emergencyContactName" render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Name <span className="text-destructive">*</span></FormLabel>
                  <FormControl><Input placeholder="e.g. Priya Singh" {...field} value={field.value || ''} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="emergencyContactRel" render={({ field }) => (
                <FormItem>
                  <FormLabel>Relationship <span className="text-destructive">*</span></FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select relationship" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {EMERGENCY_CONTACT_RELATIONS.map((rel) => (
                        <SelectItem key={rel} value={rel}>{rel.charAt(0) + rel.slice(1).toLowerCase()}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="emergencyContactPhone" render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="+91 98765 43210" 
                      {...field} 
                      value={field.value || ''}
                      onChange={(e) => {
                        let val = e.target.value;
                        if (val && !val.startsWith('+91 ')) {
                          val = val.startsWith('+91') 
                            ? '+91 ' + val.substring(3).trim() 
                            : '+91 ' + val.replace(/^\+91\s*/, '');
                        }
                        field.onChange(val);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border overflow-hidden">
            <CardHeader className="bg-surface-offset/30 border-b border-border/50 pb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary/10 text-primary rounded-md">
                  <Briefcase className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">Statutory & Payroll Details</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField control={form.control} name="isEsicCovered" render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 space-y-0">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">ESIC Coverage</FormLabel>
                    <CardDescription>Enable if the employee is eligible for Employee State Insurance Corporation benefits.</CardDescription>
                  </div>
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="esicNumber" render={({ field }) => (
                <FormItem>
                  <FormLabel>ESIC Number</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter ESIC Number" {...field} value={field.value || ''} disabled={!form.watch('isEsicCovered')} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              
              <div className="col-span-1 md:col-span-2 border-t border-border pt-4 mt-2">
                <h4 className="text-sm font-semibold mb-4">Tax & Provident Fund Details</h4>
              </div>

              <FormField control={form.control} name="taxRegime" render={({ field }) => (
                <FormItem>
                  <FormLabel>Tax Regime</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select Tax Regime" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="NEW">New Tax Regime</SelectItem>
                      <SelectItem value="OLD">Old Tax Regime</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="panNumber" render={({ field }) => (
                <FormItem>
                  <FormLabel>PAN Number</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. ABCDE1234F" {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="uanNumber" render={({ field }) => (
                <FormItem>
                  <FormLabel>UAN Number</FormLabel>
                  <FormControl>
                    <Input placeholder="12-digit UAN" {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="pfAccountNumber" render={({ field }) => (
                <FormItem>
                  <FormLabel>PF Account Number</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. MH/BAN/1234567/000/1234567" {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4 pt-4 border-t border-border mt-8">
            <Button variant="outline" type="button" asChild>
              <Link to={`/admin/employees/${id}`}>Cancel</Link>
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Spinner className="mr-2 h-4 w-4" />}
              Save Changes
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};
