import { useState, useMemo } from 'react';
import type { Payslip } from '../api/payroll-api';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useMyPayslips } from '../api/use-payroll';
import {
  IndianRupee,
  FileText,
  TrendingUp,
  TrendingDown,
  Eye,
  Calendar,
  Briefcase,
  Download as DownloadIcon,
} from 'lucide-react';
import { PayslipBreakdown } from '../components/payslip-breakdown';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const formatCurrency = (value: number): string => {
  return `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
};

// ── Payslip Detail Dialog ────────────────────────────────────
function PayslipDetailDialog({
  payslip,
  open,
  onOpenChange,
}: {
  payslip: Payslip | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!payslip) return null;

  const handleDownloadPDF = async () => {
    const element = document.getElementById('payslip-print-area');
    if (!element || !payslip) return;
    
    // Hide buttons/scrollbars temporarily if needed, though they are outside this area
    const canvas = await html2canvas(element, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4',
    });
    
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`Payslip_${MONTH_NAMES[payslip.month - 1]}_${payslip.year}.pdf`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1000px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Payslip — {MONTH_NAMES[payslip.month - 1]} {payslip.year}
          </DialogTitle>
        </DialogHeader>

        <div id="payslip-print-area" className="space-y-5 overflow-y-auto flex-1 pr-1 p-4 bg-background">
          <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-4 gap-4 print:block">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Nirvigh Advisors</h2>
              <p className="text-sm text-muted-foreground">Salary Slip for {MONTH_NAMES[payslip.month - 1]} {payslip.year}</p>
            </div>
            
            {payslip.employee && (
              <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm bg-muted/30 p-3 rounded-lg border border-border/50">
                <div className="text-muted-foreground">Employee Name:</div>
                <div className="font-medium text-right">{payslip.employee.firstName} {payslip.employee.lastName} ({payslip.employee.employeeCode})</div>
                
                <div className="text-muted-foreground">Designation:</div>
                <div className="font-medium text-right">{payslip.employee.designation}</div>
                
                {payslip.employee.panNumber && (
                  <>
                    <div className="text-muted-foreground">PAN:</div>
                    <div className="font-medium text-right">{payslip.employee.panNumber}</div>
                  </>
                )}
                {payslip.employee.uanNumber && (
                  <>
                    <div className="text-muted-foreground">UAN:</div>
                    <div className="font-medium text-right">{payslip.employee.uanNumber}</div>
                  </>
                )}
                {payslip.employee.pfAccountNumber && (
                  <>
                    <div className="text-muted-foreground">PF A/C:</div>
                    <div className="font-medium text-right">{payslip.employee.pfAccountNumber}</div>
                  </>
                )}
              </div>
            )}
          </div>
          <PayslipBreakdown payslip={payslip} />
        </div>

        <DialogFooter className="border-t border-border pt-4 flex gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button onClick={handleDownloadPDF}>
            <DownloadIcon className="w-4 h-4 mr-2" />
            Download PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Employee Payslips Page ───────────────────────────────────
export function EmployeePayslipsPage() {
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const { data: payslips, isLoading } = useMyPayslips();

  const currentYear = new Date().getFullYear();
  const yearOptions = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];

  const availableYears = useMemo(() => {
    if (!payslips) return [];
    const years = [...new Set(payslips.map((p) => p.year))].sort((a, b) => b - a);
    return years;
  }, [payslips]);

  const filteredPayslips = useMemo(() => {
    if (!payslips) return [];
    const filtered = yearFilter === 'all'
      ? payslips
      : payslips.filter((p) => p.year === parseInt(yearFilter));
    return [...filtered].sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year;
      return b.month - a.month;
    });
  }, [payslips, yearFilter]);

  const handleViewDetail = (payslip: Payslip) => {
    setSelectedPayslip(payslip);
    setDetailOpen(true);
  };

  // Summary stats
  const stats = useMemo(() => {
    if (!filteredPayslips.length) return null;
    const totalNet = filteredPayslips.reduce((s, p) => s + p.netPayable, 0);
    const totalGross = filteredPayslips.reduce((s, p) => s + p.grossEarnings, 0);
    const avgNet = totalNet / filteredPayslips.length;
    return { totalNet, totalGross, avgNet, count: filteredPayslips.length };
  }, [filteredPayslips]);

  return (
    <div className="space-y-8 pb-10">
      <PageHeader
        title="My Payslips"
        description="View your monthly compensation details and download payslips."
        action={
          <Select value={yearFilter} onValueChange={setYearFilter}>
            <SelectTrigger className="w-[140px] bg-surface border-border h-9">
              <Calendar className="h-4 w-4 mr-2 text-text-muted" />
              <SelectValue placeholder="All Years" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              {(availableYears.length > 0 ? availableYears : yearOptions).map((y) => (
                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      {/* Summary Stats */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <p className="text-xs text-emerald-600 font-medium">Total Gross Earnings</p>
            <p className="text-xl font-display font-bold text-emerald-600 mt-1">{formatCurrency(stats.totalGross)}</p>
            <p className="text-xs text-text-muted mt-1">{stats.count} payslip{stats.count !== 1 ? 's' : ''}</p>
          </div>
          <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
            <p className="text-xs text-primary font-medium">Total Net Pay</p>
            <p className="text-xl font-display font-bold text-primary mt-1">{formatCurrency(stats.totalNet)}</p>
          </div>
          <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <p className="text-xs text-blue-600 font-medium">Avg Net Pay / Month</p>
            <p className="text-xl font-display font-bold text-blue-600 mt-1">{formatCurrency(stats.avgNet)}</p>
          </div>
        </div>
      )}

      {/* Payslip Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-56 rounded-xl" />
          ))}
        </div>
      ) : !filteredPayslips.length ? (
        <EmptyState
          icon={<FileText className="h-8 w-8" />}
          title="No payslips found"
          description={
            yearFilter !== 'all'
              ? `No payslips available for ${yearFilter}. Try selecting a different year.`
              : 'Your payslips will appear here once payroll has been processed.'
          }
          className="min-h-[300px]"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPayslips.map((payslip) => (
            <Card key={payslip.id} className="group hover:shadow-elevated transition-all duration-200 overflow-hidden">
              {/* Gradient accent bar */}
              <div className="h-1 bg-gradient-to-r from-primary via-primary/70 to-emerald-500/60" />
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-display font-semibold text-text flex items-center gap-2">
                    <div className="p-1.5 bg-primary/10 rounded-lg">
                      <Calendar className="h-4 w-4 text-primary" />
                    </div>
                    {MONTH_NAMES[payslip.month - 1]} {payslip.year}
                  </CardTitle>
                  <Badge variant="outline" className="text-xs font-mono">{payslip.year}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Stat Lines */}
                <div className="space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-text-muted flex items-center gap-1.5">
                      <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                      Gross Earnings
                    </span>
                    <span className="text-sm font-mono font-medium text-emerald-600">{formatCurrency(payslip.grossEarnings)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-text-muted flex items-center gap-1.5">
                      <TrendingDown className="h-3.5 w-3.5 text-red-400" />
                      Deductions
                    </span>
                    <span className="text-sm font-mono font-medium text-red-500">{formatCurrency(payslip.totalDeductions)}</span>
                  </div>
                  <div className="h-px bg-border" />
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-text flex items-center gap-1.5">
                      <IndianRupee className="h-3.5 w-3.5 text-primary" />
                      Net Payable
                    </span>
                    <span className="text-lg font-display font-bold text-primary">{formatCurrency(payslip.netPayable)}</span>
                  </div>
                </div>

                {/* View Button */}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-all duration-200"
                  onClick={() => handleViewDetail(payslip)}
                >
                  <Eye className="h-4 w-4 mr-1.5" />
                  View Details
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Payslip Detail Dialog */}
      <PayslipDetailDialog payslip={selectedPayslip} open={detailOpen} onOpenChange={setDetailOpen} />
    </div>
  );
}
