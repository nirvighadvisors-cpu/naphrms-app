import { ShieldCheck, AlertCircle, FileSignature, CheckCircle2, Search, Filter } from 'lucide-react';
import { Card } from '@/components/ui/card';

export function AdminCompliancePage() {
  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-text flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-500" />
            Compliance Tracker
          </h1>
          <p className="text-text-muted mt-1">Monitor employee compliance and policy acknowledgments</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 bg-surface border-border/50 flex flex-col items-center text-center justify-center">
          <FileSignature className="w-10 h-10 text-indigo-500 mb-4" />
          <h3 className="font-medium text-text mb-2">Policy Acknowledgments</h3>
          <p className="text-sm text-text-muted mb-4 max-w-[200px]">Track who has signed mandatory IT and HR policies</p>
          <span className="text-xs bg-indigo-500/10 text-indigo-500 px-3 py-1 rounded-full font-semibold uppercase tracking-wider">Coming Soon</span>
        </Card>
        
        <Card className="p-6 bg-surface border-border/50 flex flex-col items-center text-center justify-center">
          <AlertCircle className="w-10 h-10 text-amber-500 mb-4" />
          <h3 className="font-medium text-text mb-2">Mandatory Training</h3>
          <p className="text-sm text-text-muted mb-4 max-w-[200px]">Monitor required compliance training completion</p>
          <span className="text-xs bg-amber-500/10 text-amber-500 px-3 py-1 rounded-full font-semibold uppercase tracking-wider">Coming Soon</span>
        </Card>
        
        <Card className="p-6 bg-surface border-border/50 flex flex-col items-center text-center justify-center">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mb-4" />
          <h3 className="font-medium text-text mb-2">Profile Completeness</h3>
          <p className="text-sm text-text-muted mb-4 max-w-[200px]">Ensure all employees have completed profiles and background checks</p>
          <span className="text-xs bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full font-semibold uppercase tracking-wider">Coming Soon</span>
        </Card>
      </div>

      <Card className="flex-1 bg-surface border-border/50 flex flex-col p-8 items-center justify-center text-center opacity-50">
        <ShieldCheck className="w-16 h-16 text-text-muted/30 mb-4" />
        <h3 className="text-xl font-medium text-text mb-2">Centralized Compliance Hub</h3>
        <p className="text-text-muted max-w-md">
          This module is currently under development. Soon, you will be able to track all regulatory and internal compliance requirements from this dashboard.
        </p>
      </Card>
    </div>
  );
}
