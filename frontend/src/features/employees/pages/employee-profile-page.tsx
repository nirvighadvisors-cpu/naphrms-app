import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Phone, MapPin, Briefcase, Building2, Calendar, Edit2, ShieldAlert } from 'lucide-react';
import { useMe, useUpdateMe } from '../api/use-employees';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

const editContactSchema = z.object({
  personalEmail: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().max(20).optional().or(z.literal('')),
  alternatePhone: z.string().max(20).optional().or(z.literal('')),
  currentAddress: z.string().max(500).optional().or(z.literal('')),
  permanentAddress: z.string().max(500).optional().or(z.literal('')),
  emergencyContactName: z.string().max(100).optional().or(z.literal('')),
  emergencyContactRel: z.string().max(50).optional().or(z.literal('')),
  emergencyContactPhone: z.string().max(20).optional().or(z.literal('')),
});

type EditContactValues = z.infer<typeof editContactSchema>;

export function EmployeeProfilePage() {
  const { data: employee, isLoading } = useMe();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const updateMe = useUpdateMe();

  const form = useForm<EditContactValues>({
    resolver: zodResolver(editContactSchema),
    defaultValues: {
      personalEmail: '',
      phone: '',
      alternatePhone: '',
      currentAddress: '',
      permanentAddress: '',
      emergencyContactName: '',
      emergencyContactRel: '',
      emergencyContactPhone: '',
    },
  });

  if (isLoading || !employee) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const handleEditClick = () => {
    form.reset({
      personalEmail: employee.personalEmail || '',
      phone: employee.phone || '',
      alternatePhone: employee.alternatePhone || '',
      currentAddress: employee.currentAddress || '',
      permanentAddress: employee.permanentAddress || '',
      emergencyContactName: employee.emergencyContactName || '',
      emergencyContactRel: employee.emergencyContactRel || '',
      emergencyContactPhone: employee.emergencyContactPhone || '',
    });
    setIsEditModalOpen(true);
  };

  const onSubmit = (values: EditContactValues) => {
    updateMe.mutate(values, {
      onSuccess: () => setIsEditModalOpen(false),
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PageHeader
        title="My Profile"
        description="View your personal and employment information"
        actions={
          <Button onClick={handleEditClick}>
            <Edit2 className="w-4 h-4 mr-2" />
            Edit Contact Info
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Summary */}
        <Card className="lg:col-span-1 shadow-sm border-border/50">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <Avatar className="h-24 w-24 border-4 border-surface shadow-sm">
                <AvatarImage src={employee.profilePhotoUrl} />
                <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                  {employee.firstName[0]}
                  {employee.lastName[0]}
                </AvatarFallback>
              </Avatar>
              
              <div>
                <h3 className="text-xl font-bold text-text">
                  {employee.firstName} {employee.lastName}
                </h3>
                <p className="text-primary font-medium">{employee.designation}</p>
                <div className="mt-2">
                  <Badge variant="secondary" className="mr-2">
                    {employee.employeeCode}
                  </Badge>
                  <Badge variant={employee.status === 'ACTIVE' ? 'default' : 'secondary'}>
                    {employee.status}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="mt-8 space-y-4 border-t border-border/50 pt-6">
              <div className="flex items-center text-sm text-text-muted">
                <Mail className="w-4 h-4 mr-3 text-text-muted/70" />
                <span>{employee.user?.email || 'N/A'}</span>
              </div>
              <div className="flex items-center text-sm text-text-muted">
                <Phone className="w-4 h-4 mr-3 text-text-muted/70" />
                <span>{employee.phone || 'N/A'}</span>
              </div>
              <div className="flex items-center text-sm text-text-muted">
                <Building2 className="w-4 h-4 mr-3 text-text-muted/70" />
                <span>{employee.department?.name || 'N/A'}</span>
              </div>
              <div className="flex items-center text-sm text-text-muted">
                <Calendar className="w-4 h-4 mr-3 text-text-muted/70" />
                <span>Joined {new Date(employee.dateOfJoining).toLocaleDateString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right Column: Details */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-sm border-border/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Briefcase className="w-5 h-5 mr-2 text-primary" />
                Employment Details
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-text-muted mb-1">Employment Type</p>
                <p className="font-medium text-text">{employee.employmentType.replace('_', ' ')}</p>
              </div>
              <div>
                <p className="text-sm text-text-muted mb-1">Manager</p>
                <p className="font-medium text-text">
                  {employee.manager 
                    ? `${employee.manager.firstName} ${employee.manager.lastName}` 
                    : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-text-muted mb-1">Date of Birth</p>
                <p className="font-medium text-text">
                  {employee.dateOfBirth ? new Date(employee.dateOfBirth).toLocaleDateString() : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-text-muted mb-1">Gender</p>
                <p className="font-medium text-text">{employee.gender || 'N/A'}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-sm text-text-muted mb-1">Week Off Days</p>
                <div className="flex gap-2 flex-wrap mt-1">
                  {((employee as any).weekOffDays || ['SUNDAY']).map((day: string) => (
                    <Badge key={day} variant="outline" className="text-xs bg-bg">
                      {day.charAt(0) + day.slice(1).toLowerCase()}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <MapPin className="w-5 h-5 mr-2 text-primary" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-text-muted mb-1">Personal Email</p>
                <p className="font-medium text-text">{employee.personalEmail || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-text-muted mb-1">Alternate Phone</p>
                <p className="font-medium text-text">{employee.alternatePhone || 'N/A'}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-sm text-text-muted mb-1">Current Address</p>
                <p className="font-medium text-text">
                  {(() => {
                    try {
                      if (!employee.currentAddress) return 'N/A';
                      const addr = JSON.parse(employee.currentAddress);
                      return [addr.houseNo, addr.building, addr.street, addr.landmark, addr.city, addr.taluka, addr.district, addr.state, addr.pinCode].filter(Boolean).join(', ');
                    } catch {
                      return employee.currentAddress || 'N/A';
                    }
                  })()}
                </p>
              </div>
              <div className="md:col-span-2">
                <p className="text-sm text-text-muted mb-1">Permanent Address</p>
                <p className="font-medium text-text">
                  {(() => {
                    try {
                      if (!employee.permanentAddress) return 'N/A';
                      const addr = JSON.parse(employee.permanentAddress);
                      return [addr.houseNo, addr.building, addr.street, addr.landmark, addr.city, addr.taluka, addr.district, addr.state, addr.pinCode].filter(Boolean).join(', ');
                    } catch {
                      return employee.permanentAddress || 'N/A';
                    }
                  })()}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border/50 bg-error/5 border-error/20">
            <CardHeader>
              <CardTitle className="text-lg flex items-center text-error">
                <ShieldAlert className="w-5 h-5 mr-2" />
                Emergency Contact
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-error/70 mb-1">Name</p>
                <p className="font-medium text-error">{employee.emergencyContactName || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-error/70 mb-1">Relationship</p>
                <p className="font-medium text-error">{employee.emergencyContactRel || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-error/70 mb-1">Phone</p>
                <p className="font-medium text-error">{employee.emergencyContactPhone || 'N/A'}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Contact Information</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="alternatePhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Alternate Phone</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="personalEmail"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Personal Email</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="currentAddress"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Current Address</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="permanentAddress"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Permanent Address</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="col-span-2 mt-4 mb-2">
                  <h4 className="text-sm font-medium text-text">Emergency Contact</h4>
                </div>
                
                <FormField
                  control={form.control}
                  name="emergencyContactName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="emergencyContactRel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Relationship</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="emergencyContactPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateMe.isPending}>
                  {updateMe.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
