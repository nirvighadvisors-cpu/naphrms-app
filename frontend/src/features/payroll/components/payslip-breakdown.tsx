import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { Payslip, PayslipLineItemType } from '../api/payroll-api';
import { IndianRupee, Calculator, CheckCircle2, PieChart, Download } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { useSettings } from '../../settings/api';
import { generatePayslipPdf } from '../utils/generate-payslip-pdf';

interface PayslipBreakdownProps {
  payslip: Payslip;
}

export const PayslipBreakdown = ({ payslip }: PayslipBreakdownProps) => {
  const earnings = payslip.lineItems?.filter(i => i.type === 'EARNING') || [];
  const deductions = payslip.lineItems?.filter(i => i.type === 'DEDUCTION') || [];
  const companyContributions = payslip.lineItems?.filter(i => i.type === 'COMPANY_CONTRIBUTION') || [];
  
  const { data: companySettings } = useSettings();

  const handleDownloadPdf = () => {
    generatePayslipPdf([payslip], companySettings, true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getCalcTypeLabel = (type: string) => {
    switch(type) {
      case 'FIXED': return <Badge variant="secondary" className="text-[10px]">FIXED</Badge>;
      case 'FORMULA': return <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">FORMULA</Badge>;
      case 'SLAB_BASED': return <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">SLAB</Badge>;
      case 'PERCENTAGE_OF_CTC': return <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-700 border-purple-200">% OF CTC</Badge>;
      default: return <Badge variant="outline" className="text-[10px]">{type}</Badge>;
    }
  };

  const renderLineItems = (items: PayslipLineItemType[], title: string, total: number, iconClass: string) => (
    <Card className="shadow-sm border-border overflow-hidden">
      <div className={`p-3 border-b border-border font-semibold flex items-center justify-between bg-surface`}>
        <span className="flex items-center">
          {title === 'Earnings' ? <PlusIcon className={`w-4 h-4 mr-2 ${iconClass}`} /> : <MinusIcon className={`w-4 h-4 mr-2 ${iconClass}`} />}
          {title}
        </span>
        <span className={iconClass}>{formatCurrency(total)}</span>
      </div>
      <Table>
        <TableHeader className="bg-muted/30">
          <TableRow>
            <TableHead className="w-[200px]">Component</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Calculation</TableHead>
            <TableHead className="text-right">Base Amount</TableHead>
            <TableHead className="text-right">Final Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id} className="hover:bg-muted/20">
              <TableCell className="font-medium">
                {item.name}
                {item.code && <span className="ml-2 text-[10px] text-muted-foreground border px-1 rounded bg-muted/50">{item.code}</span>}
              </TableCell>
              <TableCell>{getCalcTypeLabel(item.calculationType)}</TableCell>
              <TableCell>
                {item.calculationType === 'FORMULA' ? (
                  <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{item.formula}</code>
                ) : item.calculationType === 'PERCENTAGE_OF_CTC' ? (
                  <span className="text-xs text-muted-foreground">{item.rawValue}% of Base</span>
                ) : (
                  <span className="text-xs text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell className="text-right text-muted-foreground text-sm">
                {item.calculationType !== 'FIXED' ? formatCurrency(item.baseAmount) : '-'}
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatCurrency(item.calculatedAmount)}
              </TableCell>
            </TableRow>
          ))}
          {items.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                No items found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Card>
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={handleDownloadPdf}>
          <Download className="w-4 h-4 mr-2" /> Download PDF Payslip
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-surface">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium mb-1">Payable Days</p>
              <p className="text-2xl font-bold">{payslip.presentDays} / {payslip.workingDays}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-surface">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium mb-1">Gross Earnings</p>
              <p className="text-2xl font-bold text-emerald-600">{formatCurrency(payslip.grossEarnings)}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
              <IndianRupee className="w-5 h-5 text-emerald-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-surface">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium mb-1">Total Deductions</p>
              <p className="text-2xl font-bold text-rose-600">{formatCurrency(payslip.totalDeductions)}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center">
              <MinusIcon className="w-5 h-5 text-rose-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-primary text-primary-foreground border-transparent shadow-md">
          <CardContent className="p-4 flex flex-col justify-between h-full gap-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium mb-1 text-primary-foreground/80">Net Payable</p>
                <p className="text-2xl font-bold">{formatCurrency(payslip.netPayable)}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <Calculator className="w-5 h-5 text-white" />
              </div>
            </div>
            
            <div className="space-y-1.5 mt-auto">
              <div className="flex justify-between text-xs font-medium text-primary-foreground/90">
                <span>Take Home: {((payslip.netPayable / (payslip.grossEarnings || 1)) * 100).toFixed(1)}%</span>
                <span>Deductions: {((payslip.totalDeductions / (payslip.grossEarnings || 1)) * 100).toFixed(1)}%</span>
              </div>
              <div className="h-2 w-full bg-white/20 rounded-full overflow-hidden flex">
                <div 
                  className="h-full bg-emerald-400" 
                  style={{ width: `${(payslip.netPayable / (payslip.grossEarnings || 1)) * 100}%` }}
                />
                <div 
                  className="h-full bg-rose-400" 
                  style={{ width: `${(payslip.totalDeductions / (payslip.grossEarnings || 1)) * 100}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {payslip.taxRegime && payslip.taxBreakdown && (
        <Card className="border-border shadow-sm mb-6">
          <CardHeader className="bg-surface-offset/30 border-b border-border/50 py-3 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-100 text-blue-700 rounded-md">
                <PieChart className="h-4 w-4" />
              </div>
              <CardTitle className="text-base">Tax Calculations</CardTitle>
            </div>
            <Badge variant="outline">{payslip.taxRegime} Tax Regime</Badge>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Annual Gross</p>
                <p className="font-semibold text-sm">{formatCurrency(payslip.taxBreakdown.annualGross)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Standard Deduction</p>
                <p className="font-semibold text-sm">{formatCurrency(payslip.taxBreakdown.standardDeduction)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Taxable Income</p>
                <p className="font-semibold text-sm text-amber-600">{formatCurrency(payslip.taxBreakdown.taxableIncome)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Annual Tax</p>
                <p className="font-semibold text-sm text-rose-600">{formatCurrency(payslip.taxBreakdown.annualTax)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!payslip.lineItems ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Detailed breakdown is not available for this legacy payslip.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {renderLineItems(earnings, 'Earnings', payslip.grossEarnings, 'text-emerald-600')}
          {renderLineItems(deductions, 'Deductions', payslip.totalDeductions, 'text-rose-600')}

          {/* Company Contributions */}
          {companyContributions.length > 0 && renderLineItems(
            companyContributions, 
            'Company Contributions', 
            companyContributions.reduce((sum, item) => sum + item.calculatedAmount, 0), 
            'text-blue-600'
          )}
        </div>
      )}
    </div>
  );
};

const PlusIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M5 12h14"/><path d="M12 5v14"/>
  </svg>
);

const MinusIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M5 12h14"/>
  </svg>
);
