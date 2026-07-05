import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useCreateEmployee, useDepartments, useEmployees } from '../api';
import { useWorksites } from '@/features/settings/api/use-worksites';
import { useNavigate } from 'react-router-dom';
import { User, Briefcase, MapPin, Phone } from 'lucide-react';
import { DatePicker } from '@/components/ui/date-picker';
import { EMERGENCY_CONTACT_RELATIONS } from '@/lib/constants';
const phoneRegex = /^\+91 \d{10}$/;

const INDIAN_STATES = [
  "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", 
  "Chandigarh", "Chhattisgarh", "Dadra and Nagar Haveli", "Daman and Diu", "Delhi", "Goa", 
  "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", "Karnataka", 
  "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", 
  "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", 
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal"
];

const formSchema = z.object({
  firstName: z.string().trim().min(2, 'First name must be at least 2 characters').max(50, 'First name cannot exceed 50 characters').regex(/^[a-zA-Z\s]+$/, 'First name can only contain letters'),
  lastName: z.string().trim().min(2, 'Last name must be at least 2 characters').max(50, 'Last name cannot exceed 50 characters').regex(/^[a-zA-Z\s]+$/, 'Last name can only contain letters'),
  email: z.string().trim().email('Please enter a valid email address'),
  phone: z.string().trim().regex(phoneRegex, 'Phone number must be exactly 10 digits after +91'),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'], {
    message: 'Please select a gender',
  }),
  dateOfBirth: z.string().min(1, 'Date of birth is required').refine((date) => {
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
  managerId: z.string().optional(),
  weekOffDays: z.array(z.string()).min(1, 'Select at least one week off'),
  
  emergencyContactName: z.string().trim().min(1, 'Emergency contact name is required'),
  emergencyContactRel: z.string().trim().min(1, 'Relationship is required'),
  emergencyContactPhone: z.string().trim().regex(phoneRegex, 'Phone number must be exactly 10 digits after +91'),
});

type FormValues = z.infer<typeof formSchema>;

export const EmployeeCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const { mutate: createEmployee, isPending } = useCreateEmployee();
  const { data: departments, isLoading: isDeptsLoading } = useDepartments();
  const { data: employeesData, isLoading: isEmpsLoading } = useEmployees({ limit: 100 }); 
  const { data: worksites, isLoading: isWorksitesLoading } = useWorksites();
  
  const [step, setStep] = React.useState(1);
  
  const today = new Date();
  const maxAllowedDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
  
  const stepFields: Record<number, (keyof FormValues)[]> = {
    1: ['firstName', 'lastName', 'email', 'phone', 'gender', 'dateOfBirth'],
    2: ['designation', 'departmentId', 'dateOfJoining', 'employmentType', 'workSiteId', 'managerId', 'weekOffDays'],
    3: ['emergencyContactName', 'emergencyContactRel', 'emergencyContactPhone'],
  };

  const handleNext = async () => {
    const isStepValid = await form.trigger(stepFields[step]);
    if (isStepValid) {
      setStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setStep((prev) => prev - 1);
  };
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      dateOfJoining: new Date().toISOString().split('T')[0],
      designation: '',
      departmentId: '',
      workSiteId: 'none',
      employmentType: 'FULL_TIME',
      managerId: '',
      weekOffDays: ['SUNDAY'],
      emergencyContactName: '',
      emergencyContactRel: '',
      emergencyContactPhone: '',
    } as any,
  });

  const onSubmit = (values: FormValues) => {
    const payload: any = { ...values };
    if (payload.managerId === 'none') {
      payload.managerId = null;
    }
    if (payload.workSiteId === 'none') {
      payload.workSiteId = null;
    }
    createEmployee(payload);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <PageHeader 
        title="Add New Employee" 
        description="Create a new employee profile and send an invitation."
        breadcrumbs={[
          { label: 'Dashboard', href: '/admin/dashboard' },
          { label: 'Employees', href: '/admin/employees' },
          { label: 'Add Employee' }
        ]}
      />

      <Form {...form}>
        <form 
          onSubmit={form.handleSubmit(onSubmit)} 
          className="space-y-6"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
              e.preventDefault();
              if (step < 3) handleNext();
            }
          }}
        >
          
          {/* Section 1: Personal Info */}
          {step === 1 && (
            <Card className="shadow-sm border-border overflow-hidden">
            <CardHeader className="bg-surface-offset/30 border-b border-border/50 pb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary/10 text-primary rounded-md">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">Personal Information</CardTitle>
                  <CardDescription>Basic details about the employee.</CardDescription>
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
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Work Email <span className="text-destructive">*</span></FormLabel>
                  <FormControl><Input type="email" placeholder="rahul.sharma@nirvighadvisors.com" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="+91 98765 43210" 
                      {...field} 
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
              <FormField control={form.control} name="gender" render={({ field }) => (
                <FormItem>
                  <FormLabel>Gender <span className="text-destructive">*</span></FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                  <FormLabel>Date of Birth <span className="text-destructive">*</span></FormLabel>
                  <FormControl><DatePicker value={field.value} onChange={field.onChange} disabled={{ after: maxAllowedDate }} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>
          )}

          {/* Section 2: Employment Details */}
          {step === 2 && (
          <Card className="shadow-sm border-border overflow-hidden">
            <CardHeader className="bg-surface-offset/30 border-b border-border/50 pb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary/10 text-primary rounded-md">
                  <Briefcase className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">Employment Details</CardTitle>
                  <CardDescription>Role, department, and reporting structure.</CardDescription>
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
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
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
          )}

          {/* Section 3: Emergency Contact */}
          {step === 3 && (
          <Card className="shadow-sm border-border overflow-hidden">
            <CardHeader className="bg-surface-offset/30 border-b border-border/50 pb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary/10 text-primary rounded-md">
                  <Phone className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">Emergency Contact</CardTitle>
                  <CardDescription>Who to contact in case of an emergency.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
              <FormField control={form.control} name="emergencyContactName" render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Name <span className="text-destructive">*</span></FormLabel>
                  <FormControl><Input placeholder="e.g. Priya Singh" {...field} /></FormControl>
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
          )}

          <div className="flex justify-between gap-4 pt-4 border-t border-border mt-8">
            <Button variant="outline" type="button" onClick={step === 1 ? () => navigate('/admin/employees') : handleBack} disabled={isPending}>
              {step === 1 ? 'Cancel' : 'Back'}
            </Button>
            
            {step < 3 ? (
              <Button type="button" onClick={handleNext} className="min-w-[150px]">
                Next
              </Button>
            ) : (
              <Button type="submit" disabled={isPending} className="min-w-[150px]">
                {isPending ? <Spinner className="mr-2" /> : null}
                {isPending ? 'Creating...' : 'Create Employee'}
              </Button>
            )}
          </div>
          
        </form>
      </Form>
    </div>
  );
};
