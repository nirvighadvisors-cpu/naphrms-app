import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calculator, IndianRupee, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { usePreviewSalary } from '../api/use-payroll';

interface SalaryPreviewProps {
  structureId: string;
  basicSalary: number;
  componentsRefreshKey?: string;
}

export function SalaryPreview({ structureId, basicSalary, componentsRefreshKey }: SalaryPreviewProps) {
  const previewMutation = usePreviewSalary();

  useEffect(() => {
    if (structureId && basicSalary >= 0) {
      previewMutation.mutate({ id: structureId, basicSalary });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [structureId, basicSalary, componentsRefreshKey]);

  const handleRefresh = () => {
    if (structureId) {
      previewMutation.mutate({ id: structureId, basicSalary });
    }
  };

  const formatCurrency = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const data = previewMutation.data;
  const isLoading = previewMutation.isPending && !data;

  return (
    <Card className="border-primary/20 shadow-sm bg-surface">
      <CardHeader className="pb-3 border-b border-border bg-surface-offset/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              Salary Preview
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-text-muted hover:text-primary"
              onClick={handleRefresh}
              disabled={previewMutation.isPending}
              title="Refresh Preview"
            >
              <RefreshCw className={`h-4 w-4 ${previewMutation.isPending ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs text-text-muted">Basic Pay:</Label>
            <Badge variant="secondary" className="font-mono">{formatCurrency(basicSalary)}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : !data ? (
          <div className="text-center py-6 text-sm text-text-muted">
            Add earning components to see the preview.
          </div>
        ) : (
          <div className="space-y-6">
            {/* Earnings */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-green-600 dark:text-green-400 mb-2 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> Earnings
              </h4>
              <div className="rounded-md border border-border overflow-x-auto scroll-touch scrollbar-none">
                <table className="w-full text-sm whitespace-nowrap">
                  <thead className="bg-surface-offset">
                    <tr>
                      <th className="text-left py-1.5 px-3 font-medium text-text-muted text-xs">Component</th>
                      <th className="text-left py-1.5 px-3 font-medium text-text-muted text-xs">Rule</th>
                      <th className="text-right py-1.5 px-3 font-medium text-text-muted text-xs">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data.earnings.map((item, idx) => (
                      <tr key={idx} className="bg-bg">
                        <td className="py-1.5 px-3 text-text">{item.name}</td>
                        <td className="py-1.5 px-3 text-text-muted text-xs">{item.formula}</td>
                        <td className="py-1.5 px-3 text-right text-text">{formatCurrency(item.calculatedAmount)}</td>
                      </tr>
                    ))}
                    <tr className="bg-green-50 dark:bg-green-950/20">
                      <td colSpan={2} className="py-2 px-3 font-semibold text-green-700 dark:text-green-400">Gross Earnings</td>
                      <td className="py-2 px-3 text-right font-bold text-green-700 dark:text-green-400">{formatCurrency(data.grossEarnings)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Deductions */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-red-600 dark:text-red-400 mb-2 flex items-center gap-1">
                <TrendingDown className="h-3 w-3" /> Deductions
              </h4>
              <div className="rounded-md border border-border overflow-x-auto scroll-touch scrollbar-none">
                <table className="w-full text-sm whitespace-nowrap">
                  <thead className="bg-surface-offset">
                    <tr>
                      <th className="text-left py-1.5 px-3 font-medium text-text-muted text-xs">Component</th>
                      <th className="text-left py-1.5 px-3 font-medium text-text-muted text-xs">Rule</th>
                      <th className="text-right py-1.5 px-3 font-medium text-text-muted text-xs">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data.deductions.length === 0 ? (
                      <tr className="bg-bg">
                        <td colSpan={3} className="py-3 px-3 text-center text-text-muted text-xs italic">No deductions configured</td>
                      </tr>
                    ) : (
                      <>
                        {data.deductions.map((item, idx) => (
                          <tr key={idx} className="bg-bg">
                            <td className="py-1.5 px-3 text-text">{item.name}</td>
                            <td className="py-1.5 px-3 text-text-muted text-xs">{item.formula}</td>
                            <td className="py-1.5 px-3 text-right text-text">{formatCurrency(item.calculatedAmount)}</td>
                          </tr>
                        ))}
                      </>
                    )}
                    <tr className="bg-red-50 dark:bg-red-950/20">
                      <td colSpan={2} className="py-2 px-3 font-semibold text-red-700 dark:text-red-400">Total Deductions</td>
                      <td className="py-2 px-3 text-right font-bold text-red-700 dark:text-red-400">{formatCurrency(data.totalDeductions)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Net Payable */}
            <div className="bg-primary/10 rounded-lg p-4 flex items-center justify-between border border-primary/20">
              <div>
                <p className="text-xs text-primary font-medium uppercase tracking-wider mb-1">Net Payable</p>
                <p className="text-xs text-text-muted">Amount credited to employee</p>
              </div>
              <p className="text-2xl font-bold text-primary">{formatCurrency(data.netPayable)}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
