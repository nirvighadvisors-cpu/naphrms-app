import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, ShieldAlert } from 'lucide-react';
import { useStatutoryRules, useUpdateStatutoryRule } from '../api/use-payroll';
import type { StatutoryRule } from '../api/payroll-api';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';

export function StatutoryRulesTab() {
  const { data: rules, isLoading } = useStatutoryRules();
  const updateRuleMutation = useUpdateStatutoryRule();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<StatutoryRule>>({});

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-text-muted">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Loading rules...
      </div>
    );
  }

  if (!rules?.length) {
    return (
      <div className="text-center py-12 text-text-muted border border-dashed border-border rounded-xl">
        <ShieldAlert className="h-10 w-10 mx-auto mb-3 opacity-50" />
        <h3 className="text-lg font-semibold text-text">No statutory rules configured</h3>
        <p className="text-sm mt-1">Please configure the database seed to add PF, ESI, PT, etc.</p>
      </div>
    );
  }

  const handleEdit = (rule: StatutoryRule) => {
    setEditingId(rule.id);
    setFormData(rule);
  };

  const handleSave = () => {
    if (!editingId) return;
    updateRuleMutation.mutate(
      { id: editingId, data: formData },
      {
        onSuccess: () => setEditingId(null),
      }
    );
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData({});
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-section-title text-text font-display flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-primary" />
            Statutory Deductions & Taxes
          </h2>
          <p className="text-sm text-text-muted mt-1">Manage rules for PF, ESI, Professional Tax, etc.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {rules.map((rule) => {
          const isEditing = editingId === rule.id;

          return (
            <Card key={rule.id} className={`border-border ${!rule.isActive ? 'opacity-70' : ''}`}>
              <CardHeader className="pb-3 border-b border-border bg-surface-offset/30 flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    {rule.name}
                    <Badge variant="outline" className="text-[10px] uppercase font-mono">
                      {rule.code}
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-xs mt-1">{rule.description}</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={isEditing ? formData.isActive : rule.isActive}
                    disabled={!isEditing}
                    onCheckedChange={(c) => setFormData({ ...formData, isActive: c })}
                  />
                  <Label className="text-xs">{rule.isActive ? 'Active' : 'Disabled'}</Label>
                </div>
              </CardHeader>

              <CardContent className="pt-4 space-y-4">
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  {/* Rule Type / Base */}
                  <div>
                    <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1">
                      Calculation Type
                    </p>
                    <p className="text-sm font-medium">{rule.ruleType}</p>
                  </div>
                  {rule.baseComponent && (
                    <div>
                      <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1">
                        Base Component
                      </p>
                      <p className="text-sm font-medium">{rule.baseComponent}</p>
                    </div>
                  )}

                  {/* Rates (for PERCENTAGE) */}
                  {rule.ruleType === 'PERCENTAGE' && (
                    <>
                      <div>
                        <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1">
                          Employee Rate (%)
                        </p>
                        {isEditing ? (
                          <Input
                            type="number"
                            step="0.01"
                            className="h-8 text-sm"
                            value={formData.employeeRate || 0}
                            onChange={(e) => setFormData({ ...formData, employeeRate: parseFloat(e.target.value) })}
                          />
                        ) : (
                          <p className="text-sm font-medium">{rule.employeeRate}%</p>
                        )}
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1">
                          Employer Rate (%)
                        </p>
                        {isEditing ? (
                          <Input
                            type="number"
                            step="0.01"
                            className="h-8 text-sm"
                            value={formData.employerRate || 0}
                            onChange={(e) => setFormData({ ...formData, employerRate: parseFloat(e.target.value) })}
                          />
                        ) : (
                          <p className="text-sm font-medium">{rule.employerRate}%</p>
                        )}
                      </div>
                    </>
                  )}

                  {/* Wage Cap */}
                  <div className="col-span-2">
                    <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1">
                      Max Wage Cap (₹)
                    </p>
                    {isEditing ? (
                      <Input
                        type="number"
                        className="h-8 text-sm w-1/2"
                        value={formData.wageCap || ''}
                        onChange={(e) =>
                          setFormData({ ...formData, wageCap: e.target.value ? parseFloat(e.target.value) : null })
                        }
                        placeholder="No limit"
                      />
                    ) : (
                      <p className="text-sm font-medium">
                        {rule.wageCap ? `₹${rule.wageCap.toLocaleString('en-IN')}` : 'No Limit'}
                      </p>
                    )}
                  </div>
                </div>

                {isEditing ? (
                  <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-border">
                    <Button variant="ghost" size="sm" onClick={handleCancel}>
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSave}
                      disabled={updateRuleMutation.isPending}
                    >
                      {updateRuleMutation.isPending && <Loader2 className="h-3 w-3 animate-spin mr-1.5" />}
                      Save Changes
                    </Button>
                  </div>
                ) : (
                  <div className="flex justify-end mt-4 pt-4 border-t border-border">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(rule)}>
                      Edit Rule
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
