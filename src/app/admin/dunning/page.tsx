/**
 * Admin Dunning Management Dashboard
 * Provides overview of payment retries, dunning status, and metrics
 */

'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertCircle, 
  CheckCircle, 
  XCircle, 
  Clock,
  Mail,
  RefreshCw,
  DollarSign
} from 'lucide-react';

interface DunningMetrics {
  success: boolean;
  data: {
    summary: {
      customersInDunning: number;
      failedPayments: number;
      totalRetryAttempts: number;
      successfulRetries: number;
      failedRetries: number;
      subscriptionsCanceledDueToDunning: number;
      amountRecovered: number;
    };
    retrySuccessRate: {
      totalAttempts: number;
      successfulAttempts: number;
      failedAttempts: number;
      successRate: number;
    };
    emailMetrics: {
      totalEmails: number;
      sentEmails: number;
      failedEmails: number;
    };
    recentFailures: Array<{
      paymentId: string;
      customerId: string;
      customerEmail: string;
      customerName: string;
      dunningStatus: string;
      failedPaymentCount: number;
      amount: number;
      currency: string;
      paymentFailedAt: string;
      invoiceId: string | null;
      dueDate: string | null;
    }>;
    upcomingRetries: Array<{
      retryId: string;
      customerId: string;
      customerEmail: string;
      customerName: string;
      invoiceId: string | null;
      attemptNumber: number;
      scheduledFor: string;
    }>;
    customersInDunning: Array<{
      customerId: string;
      email: string;
      name: string;
      dunningStatus: string;
      failedPaymentCount: number;
      lastPaymentFailedAt: string | null;
      subscriptionId: string | null;
      planName: string | null;
      subscriptionStatus: string | null;
      retryAttempts: number;
      totalOverdue: number;
    }>;
  };
}

export default function AdminDunningPage() {
  const [metrics, setMetrics] = useState<DunningMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMetrics = async () => {
    try {
      const response = await fetch('/api/admin/dunning/metrics');
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          window.location.href = '/sign-in';
          return;
        }
        throw new Error('Failed to fetch metrics');
      }
      const data = await response.json();
      setMetrics(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const refresh = () => {
    setRefreshing(true);
    fetchMetrics();
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
          Loading dunning metrics...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-red-500">Error: {error}</div>
      </div>
    );
  }

  if (!metrics) return null;

  const { summary, retrySuccessRate, emailMetrics, recentFailures, upcomingRetries, customersInDunning } = metrics.data;

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dunning Management</h1>
          <p className="text-muted-foreground">
            Monitor payment retries, failed payments, and customer dunning status
          </p>
        </div>
        <button
          onClick={refresh}
          disabled={refreshing}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customers in Dunning</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.customersInDunning}</div>
            <p className="text-xs text-muted-foreground">Currently in dunning status</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Retry Success Rate</CardTitle>
            {retrySuccessRate.successRate >= 70 ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{retrySuccessRate.successRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {retrySuccessRate.successfulAttempts} / {retrySuccessRate.totalAttempts} attempts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Amount Recovered</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('en-US', { 
                style: 'currency', 
                currency: 'USD',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              }).format(summary.amountRecovered)}
            </div>
            <p className="text-xs text-muted-foreground">From successful retries</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Email Delivery</CardTitle>
            <Mail className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {emailMetrics.sentEmails > 0 && emailMetrics.totalEmails > 0
                ? Math.round((emailMetrics.sentEmails / emailMetrics.totalEmails) * 100)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {emailMetrics.sentEmails} sent / {emailMetrics.totalEmails} total
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Customers in Dunning */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Customers in Dunning</CardTitle>
            <CardDescription>Active dunning management cases</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Failed</TableHead>
                  <TableHead className="text-right">Overdue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customersInDunning.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No customers currently in dunning
                    </TableCell>
                  </TableRow>
                ) : (
                  customersInDunning.map((customer) => (
                    <TableRow key={customer.customerId}>
                      <TableCell>
                        <div className="font-medium">{customer.name || 'Unknown'}</div>
                        <div className="text-xs text-muted-foreground">{customer.email}</div>
                      </TableCell>
                      <TableCell>{customer.planName || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={
                          customer.dunningStatus === 'active' ? 'destructive' :
                          customer.dunningStatus === 'canceled' ? 'outline' : 'secondary'
                        }>
                          {customer.dunningStatus}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{customer.failedPaymentCount}</TableCell>
                      <TableCell className="text-right font-medium">
                        {new Intl.NumberFormat('en-US', { 
                          style: 'currency', 
                          currency: 'USD',
                          minimumFractionDigits: 0,
                        }).format(customer.totalOverdue)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Upcoming Retries */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Upcoming Retries</CardTitle>
            <CardDescription>Scheduled payment retry attempts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingRetries.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">No upcoming retries scheduled</p>
              ) : (
                upcomingRetries.map((retry) => (
                  <div key={retry.retryId} className="flex items-start space-x-4 rounded-lg border p-3">
                    <Clock className="mt-1 h-5 w-5 text-blue-500" />
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none">
                        Attempt {retry.attemptNumber}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {retry.customerName || retry.customerEmail}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Scheduled: {new Date(retry.scheduledFor).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Failures */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Payment Failures</CardTitle>
          <CardDescription>Latest failed payment attempts</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Dunning Status</TableHead>
                <TableHead>Failed Count</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Payment ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentFailures.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No recent payment failures
                  </TableCell>
                </TableRow>
              ) : (
                recentFailures.map((failure) => (
                  <TableRow key={failure.paymentId}>
                    <TableCell>
                      <div className="font-medium">{failure.customerName || 'Unknown'}</div>
                      <div className="text-xs text-muted-foreground">{failure.customerEmail}</div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {new Intl.NumberFormat('en-US', { 
                        style: 'currency', 
                        currency: failure.currency.toUpperCase(),
                      }).format(failure.amount)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        failure.dunningStatus === 'active' ? 'destructive' :
                        failure.dunningStatus === 'canceled' ? 'outline' : 'secondary'
                      }>
                        {failure.dunningStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>{failure.failedPaymentCount}</TableCell>
                    <TableCell>{new Date(failure.paymentFailedAt).toLocaleDateString()}</TableCell>
                    <TableCell className="font-mono text-xs">{failure.paymentId.slice(0, 12)}...</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Action Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Dunning Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Retry Attempts</span>
                <span className="font-bold">{summary.totalRetryAttempts}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Failed Retries</span>
                <span className="font-bold text-red-500">{summary.failedRetries}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Successful Retries</span>
                <span className="font-bold text-green-500">{summary.successfulRetries}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Failed Payments (30d)</span>
                <span className="font-bold">{summary.failedPayments}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Subscriptions Canceled</span>
                <span className="font-bold text-destructive">{summary.subscriptionsCanceledDueToDunning}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Customers in Dunning</span>
                <span className="font-bold">{summary.customersInDunning}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Email Success Rate</span>
                <span className="font-bold">
                  {emailMetrics.totalEmails > 0
                    ? Math.round((emailMetrics.sentEmails / emailMetrics.totalEmails) * 100)
                    : 0}%
                </span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Avg. Retries per Invoice</span>
                <span className="font-bold">
                  {summary.totalRetryAttempts > 0 && summary.failedPayments > 0
                    ? (summary.totalRetryAttempts / summary.failedPayments).toFixed(2)
                    : '0.00'}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
