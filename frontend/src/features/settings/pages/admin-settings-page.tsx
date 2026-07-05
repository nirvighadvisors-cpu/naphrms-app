import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, Marker, Autocomplete } from '@react-google-maps/api';
import { 
  Building2, 
  Briefcase, 
  MapPin, 
  Clock, 
  Calendar, 
  Bell, 
  Settings as SettingsIcon,
  Plus,
  Save,
  Trash2,
  FileText
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { 
  useDepartments, useCreateDepartment, useUpdateDepartment, useDeleteDepartment, 
  useSettings, useUpsertSettings, 
  useWorksites, useCreateWorksite, useUpdateWorksite, useDeleteWorksite,
  useHolidays, useCreateHoliday, useUpdateHoliday, useDeleteHoliday,
  useLeaveTypes, useCreateLeaveType, useUpdateLeaveType, useDeleteLeaveType
} from '../api';
import { useStatutoryRules, useUpdateStatutoryRule } from '../../payroll/api/use-payroll';
import type { Department, WorkSite, Holiday, LeaveType } from '../api';
import { DatePicker } from '@/components/ui/date-picker';
import { Controller } from 'react-hook-form';

const tabs = [
  { id: 'company', label: 'Company Profile', icon: Building2 },
  { id: 'worksites', label: 'Work Sites & Geofencing', icon: MapPin },
  { id: 'shifts', label: 'Attendance & Shifts', icon: Clock },
  { id: 'leaves', label: 'Leave Configuration', icon: Calendar },
  { id: 'holidays', label: 'Company Holidays', icon: Calendar },
  { id: 'statutory', label: 'Statutory Compliance', icon: FileText },
  { id: 'notifications', label: 'Email & Notifications', icon: Bell },
];

export function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState(tabs[0].id);

  return (
    <div className="flex flex-col md:flex-row gap-6 h-full">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 shrink-0">
        <h1 className="text-page-title font-display text-text mb-6">Settings</h1>
        <nav className="flex flex-col space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-primary text-white shadow-md' 
                    : 'text-text-muted hover:bg-surface hover:text-text'
                }`}
              >
                <Icon className="w-5 h-5" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 bg-surface rounded-xl border border-border overflow-hidden flex flex-col">
        <div className="p-6 border-b border-border bg-background/50">
          <h2 className="text-xl font-display font-semibold text-text">
            {tabs.find(t => t.id === activeTab)?.label}
          </h2>
          <p className="text-text-muted text-sm mt-1">
            Manage your global system configurations and settings.
          </p>
        </div>
        
        <div className="flex-1 overflow-auto p-6">
          {activeTab === 'company' && <CompanyProfileTab />}
          {activeTab === 'worksites' && <WorkSitesTab />}
          {activeTab === 'shifts' && <ShiftsTab />}
          { activeTab === 'leaves' && <LeavesTab /> }
          { activeTab === 'holidays' && <HolidaysTab /> }
          { activeTab === 'statutory' && <StatutoryTab /> }
          { activeTab === 'notifications' && <NotificationsTab /> }
        </div>
      </main>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// TAB COMPONENTS (Scaffolding)
// ────────────────────────────────────────────────────────────

const companyProfileSchema = z.object({
  companyName: z.string().min(2),
  timezone: z.string().min(2),
  employeeCodePrefix: z.string().min(1),
});

function CompanyProfileTab() {
  const { data: settings, isLoading } = useSettings();
  const upsertMutation = useUpsertSettings();

  const form = useForm<z.infer<typeof companyProfileSchema>>({
    resolver: zodResolver(companyProfileSchema),
    defaultValues: {
      companyName: 'Nirvigh Advisors',
      timezone: 'Asia/Kolkata',
      employeeCodePrefix: 'NVA-',
    },
  });

  // Update form default values when settings load
  React.useEffect(() => {
    if (settings) {
      const getVal = (key: string) => settings.find(s => s.key === key)?.value;
      form.reset({
        companyName: getVal('COMPANY_NAME') || 'Nirvigh Advisors',
        timezone: getVal('TIMEZONE') || 'Asia/Kolkata',
        employeeCodePrefix: getVal('EMPLOYEE_CODE_PREFIX') || 'NVA-',
      });
    }
  }, [settings, form]);

  const onSubmit = (values: z.infer<typeof companyProfileSchema>) => {
    upsertMutation.mutate([
      { key: 'COMPANY_NAME', value: values.companyName, isPublic: true },
      { key: 'TIMEZONE', value: values.timezone, isPublic: true },
      { key: 'EMPLOYEE_CODE_PREFIX', value: values.employeeCodePrefix, isPublic: false },
    ]);
  };

  if (isLoading) return <div className="p-8 text-center text-text-muted">Loading profile...</div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <Card className="bg-background border-border">
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>Update your company name, logo, and primary timezone.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Company Name</Label>
              <Input {...form.register('companyName')} className="bg-surface" />
              {form.formState.errors.companyName && <p className="text-xs text-rose-500">{form.formState.errors.companyName.message}</p>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Timezone</Label>
                <Input {...form.register('timezone')} className="bg-surface" />
              </div>
              <div className="space-y-2">
                <Label>Employee Code Prefix</Label>
                <Input {...form.register('employeeCodePrefix')} className="bg-surface" />
              </div>
            </div>
            <Button type="submit" disabled={upsertMutation.isPending} className="mt-4">
              <Save className="w-4 h-4 mr-2" /> Save Profile
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

const departmentSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  code: z.string().min(2, 'Code is required').toUpperCase(),
  codeInitial: z.string().length(1, 'Must be 1 character').toUpperCase(),
  parentId: z.string().optional().nullable(),
});

function DepartmentsTab() {
  const { data: departments, isLoading } = useDepartments();
  const createMutation = useCreateDepartment();
  const updateMutation = useUpdateDepartment();
  const deleteMutation = useDeleteDepartment();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);

  const form = useForm<z.infer<typeof departmentSchema>>({
    resolver: zodResolver(departmentSchema),
    defaultValues: { name: '', code: '', codeInitial: '', parentId: '' },
  });

  const handleEdit = (dept: Department) => {
    setEditingDept(dept);
    form.reset({
      name: dept.name,
      code: dept.code || '',
      codeInitial: dept.codeInitial || '',
      parentId: dept.parentId || '',
    });
    setIsDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingDept(null);
    form.reset({ name: '', code: '', codeInitial: '', parentId: '' });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this department?')) {
      deleteMutation.mutate(id);
    }
  };

  const onSubmit = (values: z.infer<typeof departmentSchema>) => {
    const payload = { ...values, parentId: values.parentId || undefined };
    if (editingDept) {
      updateMutation.mutate(
        { id: editingDept.id, data: payload },
        {
          onSuccess: () => {
            setIsDialogOpen(false);
            setEditingDept(null);
          },
        }
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => {
          setIsDialogOpen(false);
          form.reset();
        },
      });
    }
  };

  // Group departments into parent/child
  const parentDepts = departments?.filter(d => !d.parentId) || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <Button onClick={handleAdd}><Plus className="w-4 h-4 mr-2" /> Add Department</Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingDept ? 'Edit Department' : 'Create Department'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label>Department Name</Label>
                <Input {...form.register('name')} placeholder="e.g. Sales" />
                {form.formState.errors.name && <p className="text-xs text-rose-500">{form.formState.errors.name.message}</p>}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Code</Label>
                  <Input {...form.register('code')} placeholder="e.g. SLS" />
                  {form.formState.errors.code && <p className="text-xs text-rose-500">{form.formState.errors.code.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Prefix Initial</Label>
                  <Input {...form.register('codeInitial')} placeholder="e.g. S" maxLength={1} />
                  {form.formState.errors.codeInitial && <p className="text-xs text-rose-500">{form.formState.errors.codeInitial.message}</p>}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Parent Department (Optional)</Label>
                <select 
                  {...form.register('parentId')} 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">None (Top Level)</option>
                  {parentDepts.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingDept ? 'Update' : 'Save'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-background border-border">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-text-muted">Loading departments...</div>
          ) : !departments?.length ? (
            <div className="p-8 text-center text-text-muted">No departments configured.</div>
          ) : (
            <div className="divide-y divide-border">
              {parentDepts.map((dept) => (
                <div key={dept.id}>
                  {/* Parent Row */}
                  <div className="p-4 flex justify-between items-center hover:bg-surface/50 bg-background">
                    <div>
                      <h4 className="font-bold text-text text-lg">{dept.name}</h4>
                      <p className="text-xs text-text-muted">Code: {dept.code || 'N/A'} • Prefix: {dept.codeInitial} • Employees: {dept.employeeCount}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(dept as any)}>Edit</Button>
                      <Button variant="ghost" size="sm" className="text-rose-500 hover:text-rose-600 hover:bg-rose-50" onClick={() => handleDelete(dept.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Child Rows */}
                  {dept.children && dept.children.length > 0 && (
                    <div className="bg-surface/30 pl-8 divide-y divide-border/50 border-t border-border/50">
                      {dept.children.map(child => (
                        <div key={child.id} className="p-3 flex justify-between items-center hover:bg-surface/80">
                           <div className="flex items-center gap-2">
                             <div className="w-4 h-px bg-border"></div>
                             <div>
                               <h5 className="font-medium text-text text-sm">{child.name}</h5>
                               <p className="text-xs text-text-muted">Code: {child.code || 'N/A'} • Prefix: {child.codeInitial}</p>
                             </div>
                           </div>
                           <div className="flex gap-2">
                             <Button variant="ghost" size="sm" className="text-xs" onClick={() => handleEdit(child as any)}>Edit</Button>
                             <Button variant="ghost" size="sm" className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 px-2" onClick={() => handleDelete(child.id)}>
                               <Trash2 className="w-3 h-3" />
                             </Button>
                           </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

const worksiteSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  address: z.string().optional(),
  latitude: z.coerce.number().min(-90).max(90).optional().or(z.literal('')),
  longitude: z.coerce.number().min(-180).max(180).optional().or(z.literal('')),
  radius: z.coerce.number().min(10).max(10000).optional().or(z.literal('')),
});

const GOOGLE_MAPS_LIBRARIES: any[] = ['places'];

function WorkSitesTab() {
  const { data: worksites, isLoading } = useWorksites();
  const createMutation = useCreateWorksite();
  const updateMutation = useUpdateWorksite();
  const deleteMutation = useDeleteWorksite();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<WorkSite | null>(null);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  const [mapCenter, setMapCenter] = useState({ lat: 19.0760, lng: 72.8777 });
  const [mapZoom, setMapZoom] = useState(14);
  const [mapUpdateCounter, setMapUpdateCounter] = useState(0);
  const autocompleteRef = useRef<any>(null);
  const mapRef = useRef<any>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const onMapLoad = useCallback((map: any) => {
    mapRef.current = map;
  }, []);

  // Reliably pan map whenever mapCenter or mapUpdateCounter changes
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.panTo(mapCenter);
      mapRef.current.setZoom(mapZoom);
    }
  }, [mapCenter, mapZoom, mapUpdateCounter]);

  // Helper to update map center and force a re-pan
  const updateMapPosition = useCallback((lat: number, lng: number, zoom?: number) => {
    setMapCenter({ lat, lng });
    if (zoom !== undefined) setMapZoom(zoom);
    setMapUpdateCounter(c => c + 1);
  }, []);

  const form = useForm<z.infer<typeof worksiteSchema>>({
    resolver: zodResolver(worksiteSchema) as any,
    defaultValues: { name: '', address: '', latitude: '', longitude: '', radius: 100 },
  });

  const handleEdit = (site: WorkSite) => {
    setEditingSite(site);
    form.reset({
      name: site.name,
      address: site.address || '',
      latitude: site.latitude ?? '',
      longitude: site.longitude ?? '',
      radius: site.radius ?? 100,
    });
    if (site.latitude && site.longitude) {
      const lat = Number(site.latitude);
      const lng = Number(site.longitude);
      updateMapPosition(lat, lng, 15);
    }
    setIsDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingSite(null);
    form.reset({ name: '', address: '', latitude: '', longitude: '', radius: 100 });
    updateMapPosition(19.0760, 72.8777, 14);
    if (searchInputRef.current) {
      searchInputRef.current.value = '';
    }
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this Work Site?')) {
      deleteMutation.mutate(id);
    }
  };

  const onMapClick = useCallback((e: any) => {
    if (e.latLng) {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      form.setValue('latitude', lat, { shouldValidate: true, shouldDirty: true });
      form.setValue('longitude', lng, { shouldValidate: true, shouldDirty: true });
      updateMapPosition(lat, lng, 15);
    }
  }, [form, updateMapPosition]);

  const onMarkerDragEnd = useCallback((e: any) => {
    if (e.latLng) {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      form.setValue('latitude', lat, { shouldValidate: true, shouldDirty: true });
      form.setValue('longitude', lng, { shouldValidate: true, shouldDirty: true });
      updateMapPosition(lat, lng);
    }
  }, [form, updateMapPosition]);

  const onPlaceChanged = useCallback(() => {
    const place = autocompleteRef.current?.getPlace();
    if (place && place.geometry?.location) {
      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();
      const fullAddress = place.formatted_address || place.name || '';

      // Update the search input to show the full address
      if (searchInputRef.current) {
        searchInputRef.current.value = fullAddress;
      }

      form.setValue('latitude', lat, { shouldValidate: true, shouldDirty: true });
      form.setValue('longitude', lng, { shouldValidate: true, shouldDirty: true });
      form.setValue('address', fullAddress, { shouldValidate: true, shouldDirty: true });
      
      // Force pan to the selected location
      updateMapPosition(lat, lng, 17);
    }
  }, [form, updateMapPosition]);

  // Prevent dialog from closing when user clicks on Google Places autocomplete dropdown
  const handleInteractOutside = useCallback((e: any) => {
    const target = e.target as HTMLElement;
    if (target?.closest('.pac-container')) {
      e.preventDefault();
    }
  }, []);

  const onSubmit = (values: z.infer<typeof worksiteSchema>) => {
    const payload = {
      name: values.name,
      address: values.address || undefined,
      latitude: values.latitude === '' ? undefined : Number(values.latitude),
      longitude: values.longitude === '' ? undefined : Number(values.longitude),
      radius: values.radius === '' ? undefined : Number(values.radius),
    };

    if (editingSite) {
      updateMutation.mutate(
        { id: editingSite.id, data: payload },
        {
          onSuccess: () => {
            setIsDialogOpen(false);
            setEditingSite(null);
          },
        }
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => {
          setIsDialogOpen(false);
          form.reset();
        },
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <Button onClick={handleAdd}><Plus className="w-4 h-4 mr-2" /> Add Work Site</Button>
          <DialogContent className="sm:max-w-[900px] w-[95vw] max-h-[90vh] overflow-y-auto" onInteractOutside={handleInteractOutside}>
            <DialogHeader>
              <DialogTitle>{editingSite ? 'Edit Work Site' : 'Create Work Site'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-6 mt-2">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column: Form Fields */}
                <div className="space-y-4 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Site Name</Label>
                      <Input {...form.register('name')} placeholder="e.g. HQ - Bangalore" />
                      {form.formState.errors.name && <p className="text-xs text-rose-500">{form.formState.errors.name.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label>Address</Label>
                      <Input {...form.register('address')} placeholder="Full physical address" />
                    </div>
                    <div className="space-y-2">
                      <Label>Radius (in meters)</Label>
                      <Input {...form.register('radius')} type="number" placeholder="e.g. 100" />
                      <p className="text-xs text-text-muted">How close employees must be to punch in.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 mt-auto">
                    <div className="space-y-2">
                      <Label>Latitude</Label>
                      <Input {...form.register('latitude')} type="number" step="any" className="bg-background" onBlur={(e) => {
                        const lat = parseFloat(e.target.value);
                        const lng = parseFloat(form.getValues('longitude') as any);
                        if (!isNaN(lat) && !isNaN(lng)) updateMapPosition(lat, lng, mapZoom);
                      }} />
                    </div>
                    <div className="space-y-2">
                      <Label>Longitude</Label>
                      <Input {...form.register('longitude')} type="number" step="any" className="bg-background" onBlur={(e) => {
                        const lng = parseFloat(e.target.value);
                        const lat = parseFloat(form.getValues('latitude') as any);
                        if (!isNaN(lat) && !isNaN(lng)) updateMapPosition(lat, lng, mapZoom);
                      }} />
                    </div>
                  </div>
                </div>

                {/* Right Column: Google Maps */}
                <div className="p-4 bg-surface rounded-lg border border-border flex flex-col h-[450px]">
                  <h4 className="text-sm font-semibold flex items-center gap-2 mb-4">
                    <MapPin className="w-4 h-4 text-primary" />
                    Location (Geofencing)
                  </h4>
                  
                  {isLoaded ? (
                    <div className="space-y-4 flex-1 flex flex-col">
                      <Autocomplete
                        onLoad={ref => autocompleteRef.current = ref}
                        onPlaceChanged={onPlaceChanged}
                        options={{ fields: ['geometry', 'formatted_address', 'name'] }}
                      >
                        <input
                          ref={searchInputRef}
                          placeholder="Search for a location..."
                          className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        />
                      </Autocomplete>
                      <div className="flex-1 rounded-md overflow-hidden border border-border relative min-h-[300px]">
                        <GoogleMap
                          mapContainerStyle={{ width: '100%', height: '100%' }}
                          center={mapCenter}
                          zoom={mapZoom}
                          onLoad={onMapLoad}
                          onClick={onMapClick}
                          options={{ disableDefaultUI: true, zoomControl: true }}
                        >
                          <Marker 
                            position={mapCenter} 
                            draggable={true}
                            onDragEnd={onMarkerDragEnd}
                          />
                        </GoogleMap>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 rounded-md bg-background border border-border flex items-center justify-center text-text-muted">
                      Loading map...
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter className="pt-4 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingSite ? 'Update' : 'Save'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-background border-border">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-text-muted">Loading work sites...</div>
          ) : !worksites?.length ? (
            <div className="p-8 text-center text-text-muted">No work sites configured.</div>
          ) : (
            <div className="divide-y divide-border">
              {worksites.map((site) => (
                <div key={site.id} className="p-4 flex justify-between items-center hover:bg-surface/50">
                  <div className="flex gap-4 items-start">
                    <div className="mt-1 w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-text text-lg">{site.name}</h4>
                      <p className="text-sm text-text-muted mt-1">{site.address || 'No address specified'}</p>
                      
                      <div className="flex items-center gap-4 mt-2 text-xs font-medium">
                        <span className="bg-surface border border-border px-2 py-1 rounded">
                          Radius: {site.radius || 100}m
                        </span>
                        {(site.latitude && site.longitude) ? (
                          <span className="text-emerald-600 bg-emerald-50 px-2 py-1 rounded">Geofence Active</span>
                        ) : (
                          <span className="text-amber-600 bg-amber-50 px-2 py-1 rounded">Geofence Incomplete</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(site as any)}>Edit</Button>
                    <Button variant="ghost" size="sm" className="text-rose-500 hover:text-rose-600 hover:bg-rose-50" onClick={() => handleDelete(site.id)}>
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
  );
}

const shiftSchema = z.object({
  shiftStartTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Must be HH:MM format'),
  shiftEndTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Must be HH:MM format'),
  lateGracePeriodMins: z.coerce.number().min(0).max(120),
  halfDayThresholdHrs: z.coerce.number().min(1).max(12),
  workingDays: z.string().min(1),
});

function ShiftsTab() {
  const { data: settings, isLoading } = useSettings();
  const upsertMutation = useUpsertSettings();

  const form = useForm<z.infer<typeof shiftSchema>>({
    resolver: zodResolver(shiftSchema) as any,
    defaultValues: {
      shiftStartTime: '09:00',
      shiftEndTime: '18:00',
      lateGracePeriodMins: 15,
      halfDayThresholdHrs: 4,
      workingDays: 'Mon-Fri',
    },
  });

  React.useEffect(() => {
    if (settings) {
      const getVal = (key: string) => settings.find(s => s.key === key)?.value;
      form.reset({
        shiftStartTime: getVal('SHIFT_START_TIME') || '09:00',
        shiftEndTime: getVal('SHIFT_END_TIME') || '18:00',
        lateGracePeriodMins: Number(getVal('LATE_GRACE_PERIOD_MINS') || 15),
        halfDayThresholdHrs: Number(getVal('HALF_DAY_THRESHOLD_HRS') || 4),
        workingDays: getVal('WORKING_DAYS') || 'Mon-Fri',
      });
    }
  }, [settings, form]);

  const onSubmit = (values: z.infer<typeof shiftSchema>) => {
    upsertMutation.mutate([
      { key: 'SHIFT_START_TIME', value: values.shiftStartTime, isPublic: true },
      { key: 'SHIFT_END_TIME', value: values.shiftEndTime, isPublic: true },
      { key: 'LATE_GRACE_PERIOD_MINS', value: values.lateGracePeriodMins.toString(), isPublic: true },
      { key: 'HALF_DAY_THRESHOLD_HRS', value: values.halfDayThresholdHrs.toString(), isPublic: true },
      { key: 'WORKING_DAYS', value: values.workingDays, isPublic: true },
    ]);
  };

  if (isLoading) return <div className="p-8 text-center text-text-muted">Loading settings...</div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <Card className="bg-background border-border">
        <CardHeader>
          <CardTitle>Attendance & Shift Rules</CardTitle>
          <CardDescription>Configure standard working hours and attendance deduction thresholds.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            <div className="p-4 bg-surface rounded-lg border border-border space-y-4">
              <h4 className="text-sm font-semibold flex items-center gap-2 text-primary">
                <Clock className="w-4 h-4" /> Default Timings
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Shift Start Time (HH:MM)</Label>
                  <Input type="time" {...form.register('shiftStartTime')} className="bg-background" />
                  {form.formState.errors.shiftStartTime && <p className="text-xs text-rose-500">{form.formState.errors.shiftStartTime.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Shift End Time (HH:MM)</Label>
                  <Input type="time" {...form.register('shiftEndTime')} className="bg-background" />
                  {form.formState.errors.shiftEndTime && <p className="text-xs text-rose-500">{form.formState.errors.shiftEndTime.message}</p>}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Working Days</Label>
                <select 
                  {...form.register('workingDays')} 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="Mon-Fri">Monday to Friday (5 Days)</option>
                  <option value="Mon-Sat">Monday to Saturday (6 Days)</option>
                  <option value="Tue-Sun">Tuesday to Sunday (6 Days)</option>
                </select>
              </div>
            </div>

            <div className="p-4 bg-surface rounded-lg border border-border space-y-4">
              <h4 className="text-sm font-semibold flex items-center gap-2 text-amber-600">
                <SettingsIcon className="w-4 h-4" /> Deduction Thresholds
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Late Coming Grace Period</Label>
                  <div className="relative">
                    <Input type="number" {...form.register('lateGracePeriodMins')} className="bg-background pr-12" />
                    <span className="absolute right-3 top-2.5 text-xs text-text-muted">mins</span>
                  </div>
                  <p className="text-xs text-text-muted mt-1">Punching in after this marks employee as late.</p>
                </div>
                <div className="space-y-2">
                  <Label>Half-Day Threshold</Label>
                  <div className="relative">
                    <Input type="number" step="0.5" {...form.register('halfDayThresholdHrs')} className="bg-background pr-12" />
                    <span className="absolute right-3 top-2.5 text-xs text-text-muted">hrs</span>
                  </div>
                  <p className="text-xs text-text-muted mt-1">Less than these hours worked = half day.</p>
                </div>
              </div>
            </div>

            <Button type="submit" disabled={upsertMutation.isPending}>
              <Save className="w-4 h-4 mr-2" /> Save Shift Settings
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

const leaveSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  code: z.string().min(1, 'Code is required').toUpperCase(),
  description: z.string().optional(),
  isPaid: z.boolean().default(true),
  maxDaysPerYear: z.coerce.number().min(0).max(365),
  carryForward: z.boolean().default(false),
  maxCarryForward: z.coerce.number().min(0).optional(),
  requiresDoc: z.boolean().default(false),
  noticeDays: z.coerce.number().min(0).default(0),
});

function LeavesTab() {
  const { data: leaveTypes, isLoading } = useLeaveTypes();
  const createMutation = useCreateLeaveType();
  const updateMutation = useUpdateLeaveType();
  const deleteMutation = useDeleteLeaveType();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLeave, setEditingLeave] = useState<LeaveType | null>(null);

  const form = useForm<z.infer<typeof leaveSchema>>({
    resolver: zodResolver(leaveSchema) as any,
    defaultValues: { name: '', code: '', description: '', isPaid: true, maxDaysPerYear: 12, carryForward: false, maxCarryForward: 0, requiresDoc: false, noticeDays: 0 },
  });

  const handleEdit = (leave: LeaveType) => {
    setEditingLeave(leave);
    form.reset({
      name: leave.name,
      code: leave.code,
      description: leave.description || '',
      isPaid: leave.isPaid,
      maxDaysPerYear: leave.maxDaysPerYear,
      carryForward: leave.carryForward,
      maxCarryForward: leave.maxCarryForward || 0,
      requiresDoc: leave.requiresDoc,
      noticeDays: leave.noticeDays,
    });
    setIsDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingLeave(null);
    form.reset({ name: '', code: '', description: '', isPaid: true, maxDaysPerYear: 12, carryForward: false, maxCarryForward: 0, requiresDoc: false, noticeDays: 0 });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this Leave Type?')) {
      deleteMutation.mutate(id);
    }
  };

  const onSubmit = (values: z.infer<typeof leaveSchema>) => {
    if (editingLeave) {
      updateMutation.mutate(
        { id: editingLeave.id, data: values },
        {
          onSuccess: () => {
            setIsDialogOpen(false);
            setEditingLeave(null);
          },
        }
      );
    } else {
      createMutation.mutate(values as any, {
        onSuccess: () => {
          setIsDialogOpen(false);
          form.reset();
        },
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <Button onClick={handleAdd}><Plus className="w-4 h-4 mr-2" /> Add Leave Type</Button>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingLeave ? 'Edit Leave Type' : 'Create Leave Type'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Leave Name</Label>
                  <Input {...form.register('name')} placeholder="e.g. Sick Leave" />
                  {form.formState.errors.name && <p className="text-xs text-rose-500">{form.formState.errors.name.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Code</Label>
                  <Input {...form.register('code')} placeholder="e.g. SL" />
                  {form.formState.errors.code && <p className="text-xs text-rose-500">{form.formState.errors.code.message}</p>}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input {...form.register('description')} placeholder="Brief description of when this applies" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="space-y-2">
                  <Label>Annual Quota (Days)</Label>
                  <Input type="number" {...form.register('maxDaysPerYear')} />
                </div>
                <div className="space-y-2">
                  <Label>Notice Period (Days)</Label>
                  <Input type="number" {...form.register('noticeDays')} />
                  <p className="text-[10px] text-text-muted mt-1">Days in advance required to apply.</p>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-border">
                <div className="flex items-center space-x-2">
                  <input type="checkbox" id="isPaid" {...form.register('isPaid')} className="rounded border-border" />
                  <Label htmlFor="isPaid">Is this a Paid Leave?</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <input type="checkbox" id="requiresDoc" {...form.register('requiresDoc')} className="rounded border-border" />
                  <Label htmlFor="requiresDoc">Requires Documentation (e.g., Medical Certificate)</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <input type="checkbox" id="carryForward" {...form.register('carryForward')} className="rounded border-border" />
                  <Label htmlFor="carryForward">Allow Carry Forward to Next Year</Label>
                </div>
              </div>

              {form.watch('carryForward') && (
                <div className="space-y-2 pt-2">
                  <Label>Max Carry Forward Limit (Days)</Label>
                  <Input type="number" {...form.register('maxCarryForward')} />
                </div>
              )}

              <DialogFooter className="pt-4 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingLeave ? 'Update' : 'Save'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-background border-border">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-text-muted">Loading leave types...</div>
          ) : !leaveTypes?.length ? (
            <div className="p-8 text-center text-text-muted">No leave types configured.</div>
          ) : (
            <div className="divide-y divide-border">
              {leaveTypes.map((leave) => (
                <div key={leave.id} className="p-4 flex justify-between items-center hover:bg-surface/50">
                  <div className="flex gap-4 items-start">
                    <div className="w-12 h-12 rounded-lg bg-surface border border-border flex flex-col items-center justify-center shrink-0">
                      <span className="text-xl font-bold text-text leading-tight">{leave.maxDaysPerYear}</span>
                      <span className="text-[10px] font-bold text-text-muted uppercase leading-none">Days</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-text text-lg">{leave.name} <span className="text-sm font-normal text-text-muted">({leave.code})</span></h4>
                      <p className="text-sm text-text-muted">{leave.description || 'No description'}</p>
                      <div className="flex gap-2 mt-2">
                        {leave.isPaid ? (
                          <span className="text-[10px] uppercase font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">Paid</span>
                        ) : (
                          <span className="text-[10px] uppercase font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded">Unpaid</span>
                        )}
                        {leave.carryForward && (
                          <span className="text-[10px] uppercase font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">Carry Forward</span>
                        )}
                        {leave.requiresDoc && (
                          <span className="text-[10px] uppercase font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">Needs Docs</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(leave)}>Edit</Button>
                    <Button variant="ghost" size="sm" className="text-rose-500 hover:text-rose-600 hover:bg-rose-50" onClick={() => handleDelete(leave.id)}>
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
  );
}

const holidaySchema = z.object({
  name: z.string().min(2, 'Name is required'),
  date: z.string().min(1, 'Date is required'),
  isRestricted: z.boolean().default(false),
});

function HolidaysTab() {
  const [year, setYear] = useState(new Date().getFullYear());
  const { data: holidays, isLoading } = useHolidays(year);
  const createMutation = useCreateHoliday();
  const updateMutation = useUpdateHoliday();
  const deleteMutation = useDeleteHoliday();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);

  const form = useForm<z.infer<typeof holidaySchema>>({
    resolver: zodResolver(holidaySchema) as any,
    defaultValues: { name: '', date: '', isRestricted: false },
  });

  const handleEdit = (holiday: any) => {
    setEditingHoliday(holiday);
    form.reset({
      name: holiday.name,
      date: new Date(holiday.date).toISOString().split('T')[0],
      isRestricted: holiday.isRestricted,
    });
    setIsDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingHoliday(null);
    form.reset({ name: '', date: '', isRestricted: false });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this holiday?')) {
      deleteMutation.mutate(id);
    }
  };

  const onSubmit = (values: z.infer<typeof holidaySchema>) => {
    if (editingHoliday) {
      updateMutation.mutate(
        { id: editingHoliday.id, data: values },
        {
          onSuccess: () => {
            setIsDialogOpen(false);
            setEditingHoliday(null);
          },
        }
      );
    } else {
      createMutation.mutate(values as any, {
        onSuccess: () => {
          setIsDialogOpen(false);
          form.reset();
        },
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setYear(y => y - 1)}>&lt;</Button>
          <span className="font-bold text-lg">{year}</span>
          <Button variant="outline" onClick={() => setYear(y => y + 1)}>&gt;</Button>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <Button onClick={handleAdd}><Plus className="w-4 h-4 mr-2" /> Add Holiday</Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingHoliday ? 'Edit Holiday' : 'Create Holiday'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-4">
              <div className="space-y-2">
                <Label>Holiday Name</Label>
                <Input {...form.register('name')} placeholder="e.g. Diwali" />
                {form.formState.errors.name && <p className="text-xs text-rose-500">{form.formState.errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Controller control={form.control} name="date" render={({ field }) => <DatePicker value={field.value} onChange={field.onChange} />} />
                {form.formState.errors.date && <p className="text-xs text-rose-500">{form.formState.errors.date.message}</p>}
              </div>
              <div className="flex items-center space-x-2 pt-2">
                <input type="checkbox" id="isRestricted" {...form.register('isRestricted')} className="rounded border-border" />
                <Label htmlFor="isRestricted">Restricted Holiday (Optional)</Label>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingHoliday ? 'Update' : 'Save'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-background border-border">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-text-muted">Loading holidays...</div>
          ) : !holidays?.length ? (
            <div className="p-8 text-center text-text-muted">No holidays found for {year}.</div>
          ) : (
            <div className="divide-y divide-border">
              {holidays.map((holiday) => (
                <div key={holiday.id} className="p-4 flex justify-between items-center hover:bg-surface/50">
                  <div className="flex gap-4 items-start">
                    <div className="w-12 h-12 rounded-lg bg-surface border border-border flex flex-col items-center justify-center shrink-0">
                      <span className="text-[10px] font-bold text-primary uppercase leading-none">
                        {new Date(holiday.date).toLocaleString('default', { month: 'short' })}
                      </span>
                      <span className="text-lg font-bold text-text leading-tight mt-1">
                        {new Date(holiday.date).getDate()}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-bold text-text text-lg">{holiday.name}</h4>
                      <div className="flex gap-2 mt-1">
                        {(holiday as any).isRestricted ? (
                          <span className="text-[10px] uppercase font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">Restricted</span>
                        ) : (
                          <span className="text-[10px] uppercase font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">Company</span>
                        )}
                        <span className="text-[10px] uppercase font-bold text-text-muted bg-surface px-2 py-0.5 rounded border border-border">
                          {new Date(holiday.date).toLocaleDateString('default', { weekday: 'long' })}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(holiday)}>Edit</Button>
                    <Button variant="ghost" size="sm" className="text-rose-500 hover:text-rose-600 hover:bg-rose-50" onClick={() => handleDelete(holiday.id)}>
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
  );
}

const notifSchema = z.object({
  enableEmail: z.boolean().default(true),
  notifyOnLeaveReq: z.boolean().default(true),
  notifyOnExpenseReq: z.boolean().default(true),
});

function NotificationsTab() {
  const { data: settings, isLoading } = useSettings();
  const upsertMutation = useUpsertSettings();

  const form = useForm<z.infer<typeof notifSchema>>({
    resolver: zodResolver(notifSchema) as any,
    defaultValues: { enableEmail: true, notifyOnLeaveReq: true, notifyOnExpenseReq: true },
  });

  React.useEffect(() => {
    if (settings) {
      const getVal = (key: string) => settings.find(s => s.key === key)?.value;
      form.reset({
        enableEmail: getVal('ENABLE_EMAIL') !== 'false',
        notifyOnLeaveReq: getVal('NOTIFY_ON_LEAVE') !== 'false',
        notifyOnExpenseReq: getVal('NOTIFY_ON_EXPENSE') !== 'false',
      });
    }
  }, [settings, form]);

  const onSubmit = (values: z.infer<typeof notifSchema>) => {
    upsertMutation.mutate([
      { key: 'ENABLE_EMAIL', value: values.enableEmail.toString(), isPublic: false },
      { key: 'NOTIFY_ON_LEAVE', value: values.notifyOnLeaveReq.toString(), isPublic: false },
      { key: 'NOTIFY_ON_EXPENSE', value: values.notifyOnExpenseReq.toString(), isPublic: false },
    ]);
  };

  if (isLoading) return <div className="p-8 text-center text-text-muted">Loading settings...</div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <Card className="bg-background border-border">
        <CardHeader>
          <CardTitle>Notifications & Alerts</CardTitle>
          <CardDescription>Configure what system events trigger email notifications to HR/Managers.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-surface border border-border rounded-lg">
                <div>
                  <Label className="text-base font-semibold">Enable Global Email Notifications</Label>
                  <p className="text-sm text-text-muted">If disabled, the system will not send any emails to anyone.</p>
                </div>
                <input type="checkbox" className="w-5 h-5 rounded border-border" {...form.register('enableEmail')} />
              </div>
              
              <div className="flex items-center justify-between p-4 bg-surface border border-border rounded-lg opacity-80">
                <div>
                  <Label className="font-semibold">Leave Requests</Label>
                  <p className="text-sm text-text-muted">Notify managers when employees apply for leave.</p>
                </div>
                <input type="checkbox" className="w-5 h-5 rounded border-border" {...form.register('notifyOnLeaveReq')} />
              </div>

              <div className="flex items-center justify-between p-4 bg-surface border border-border rounded-lg opacity-80">
                <div>
                  <Label className="font-semibold">Reimbursement Claims</Label>
                  <p className="text-sm text-text-muted">Notify HR/Accounts when a new reimbursement claim is filed.</p>
                </div>
                <input type="checkbox" className="w-5 h-5 rounded border-border" {...form.register('notifyOnExpenseReq')} />
              </div>
            </div>

            <Button type="submit" disabled={upsertMutation.isPending}>
              <Save className="w-4 h-4 mr-2" /> Save Preferences
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function StatutoryTab() {
  const { data: rules, isLoading } = useStatutoryRules();
  const updateRuleMutation = useUpdateStatutoryRule();
  const [editingRule, setEditingRule] = useState<any>(null);
  
  const form = useForm({
    defaultValues: {
      isActive: true,
      wageCap: 0,
      employeeRate: 0,
      employerRate: 0,
    }
  });

  const handleEdit = (rule: any) => {
    setEditingRule(rule);
    form.reset({
      isActive: rule.isActive,
      wageCap: rule.wageCap || 0,
      employeeRate: rule.employeeRate || 0,
      employerRate: rule.employerRate || 0,
    });
  };

  const onSubmit = (values: any) => {
    if (editingRule) {
      updateRuleMutation.mutate({
        id: editingRule.id,
        data: values
      }, {
        onSuccess: () => {
          setEditingRule(null);
        }
      });
    }
  };

  if (isLoading) return <div className="p-8 text-center text-text-muted">Loading statutory rules...</div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <Card className="bg-background border-border">
        <CardHeader>
          <CardTitle>Statutory Rules</CardTitle>
          <CardDescription>Manage India statutory compliance rules (ESIC, PT, LWF, etc.)</CardDescription>
        </CardHeader>
        <CardContent>
          {!rules?.length ? (
            <div className="text-center p-8 text-text-muted">No statutory rules found. Please run the seed script.</div>
          ) : (
            <div className="grid gap-4">
              {rules.map((rule: any) => (
                <div key={rule.id} className="p-4 bg-surface border border-border rounded-lg flex flex-col md:flex-row justify-between md:items-center gap-4">
                  <div>
                    <h3 className="font-bold text-text flex items-center gap-2">
                      {rule.name} 
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded uppercase">{rule.code}</span>
                      {!rule.isActive && <span className="text-xs bg-rose-500/10 text-rose-500 px-2 py-0.5 rounded">Disabled</span>}
                    </h3>
                    <p className="text-sm text-text-muted mt-1">{rule.description}</p>
                    <div className="flex gap-4 mt-2 text-xs font-mono text-text-muted">
                      {rule.ruleType === 'PERCENTAGE' && (
                        <>
                          <span>Emp: {rule.employeeRate}%</span>
                          <span>Emplr: {rule.employerRate}%</span>
                          {rule.wageCap ? <span>Cap: ₹{rule.wageCap}</span> : null}
                        </>
                      )}
                      {rule.ruleType === 'SLAB' && <span>Slab Based ({rule.state})</span>}
                      {rule.ruleType === 'TAX_SLAB' && <span>Tax Slabs ({rule.state === 'ALL' ? 'Central' : rule.state})</span>}
                    </div>
                  </div>
                  <Dialog open={editingRule?.id === rule.id} onOpenChange={(open) => !open && setEditingRule(null)}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" onClick={() => handleEdit(rule)}>Edit Rule</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Edit {rule.name}</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="flex items-center space-x-2">
                          <input type="checkbox" id="isActive" {...form.register('isActive')} className="rounded border-border" />
                          <Label htmlFor="isActive">Active</Label>
                        </div>
                        {rule.ruleType === 'PERCENTAGE' && (
                          <>
                            <div className="space-y-2">
                              <Label>Employee Rate (%)</Label>
                              <Input type="number" step="0.01" {...form.register('employeeRate', { valueAsNumber: true })} />
                            </div>
                            <div className="space-y-2">
                              <Label>Employer Rate (%)</Label>
                              <Input type="number" step="0.01" {...form.register('employerRate', { valueAsNumber: true })} />
                            </div>
                            <div className="space-y-2">
                              <Label>Wage Cap (₹)</Label>
                              <Input type="number" {...form.register('wageCap', { valueAsNumber: true })} />
                              <p className="text-xs text-text-muted">Set 0 for no cap</p>
                            </div>
                          </>
                        )}
                        <DialogFooter>
                          <Button type="button" variant="outline" onClick={() => setEditingRule(null)}>Cancel</Button>
                          <Button type="submit" disabled={updateRuleMutation.isPending}>Save Changes</Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
