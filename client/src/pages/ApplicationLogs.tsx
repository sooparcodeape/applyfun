import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  FileText, 
  Upload, 
  MousePointerClick,
  Globe,
  Clock
} from 'lucide-react';

interface DetectedField {
  selector: string;
  type: string;
  name?: string;
  id?: string;
  placeholder?: string;
  label?: string;
  required: boolean;
  value?: string;
  filled: boolean;
}

export default function ApplicationLogs() {
  const [selectedLog, setSelectedLog] = useState<number | null>(null);
  const { data: logs, isLoading } = trpc.applicationLogs.list.useQuery({ limit: 50 });
  const { data: logDetail } = trpc.applicationLogs.getByApplicationId.useQuery(
    { applicationId: selectedLog! },
    { enabled: !!selectedLog }
  );

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-6">Application Logs</h1>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2 mt-2" />
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Application Logs</h1>
        <p className="text-muted-foreground mt-2">
          View detailed logs of all automated job applications including form fields detected and filled
        </p>
      </div>

      {!logs || logs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium">No application logs yet</p>
            <p className="text-sm text-muted-foreground mt-2">
              Logs will appear here after you start applying to jobs
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {logs.map((log: any) => {
            const filledFields = log.filled_fields ? JSON.parse(log.filled_fields) : [];
            const missedFields = log.missed_fields ? JSON.parse(log.missed_fields) : [];
            const availableFields = log.available_fields ? JSON.parse(log.available_fields) : [];

            return (
              <Card 
                key={log.id} 
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => setSelectedLog(log.application_id)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg line-clamp-2">
                        {log.job_title || 'Unknown Job'}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {log.job_company || 'Unknown Company'}
                      </CardDescription>
                    </div>
                    {log.success ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 ml-2" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 ml-2" />
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* ATS Platform */}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">ATS Platform</span>
                      <Badge variant="outline">{log.ats_type || 'Unknown'}</Badge>
                    </div>

                    {/* Fields Filled */}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Fields Filled</span>
                      <span className="font-medium">
                        {log.fields_filled_count} / {availableFields.length}
                      </span>
                    </div>

                    {/* Resume Upload */}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Upload className="w-3 h-3" />
                        Resume
                      </span>
                      {log.resume_uploaded ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                    </div>

                    {/* Submit Clicked */}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <MousePointerClick className="w-3 h-3" />
                        Submitted
                      </span>
                      {log.submit_clicked ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                    </div>

                    {/* Proxy Used */}
                    {log.proxy_used && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          Proxy
                        </span>
                        <span className="text-xs">
                          {log.proxy_country} ({log.proxy_ip})
                        </span>
                      </div>
                    )}

                    {/* Execution Time */}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Time
                      </span>
                      <span className="text-xs">
                        {(log.execution_time_ms / 1000).toFixed(1)}s
                      </span>
                    </div>

                    {/* Missed Fields Warning */}
                    {missedFields.length > 0 && (
                      <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/20 p-2 rounded">
                        <AlertCircle className="w-3 h-3 flex-shrink-0" />
                        <span>{missedFields.length} fields not filled</span>
                      </div>
                    )}

                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full mt-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedLog(log.application_id);
                      }}
                    >
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      {selectedLog && logDetail && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedLog(null)}
        >
          <Card 
            className="max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader>
              <CardTitle>{logDetail.job_title}</CardTitle>
              <CardDescription>{logDetail.job_company}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Summary Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold">{logDetail.fields_filled_count}</div>
                    <div className="text-xs text-muted-foreground">Fields Filled</div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold">
                      {JSON.parse(logDetail.available_fields || '[]').length}
                    </div>
                    <div className="text-xs text-muted-foreground">Total Fields</div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold">
                      {(logDetail.execution_time_ms / 1000).toFixed(1)}s
                    </div>
                    <div className="text-xs text-muted-foreground">Execution Time</div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold">{logDetail.ats_type}</div>
                    <div className="text-xs text-muted-foreground">ATS Platform</div>
                  </div>
                </div>

                {/* Mock Form Display */}
                <div>
                  <h3 className="font-semibold mb-4">Form Fields</h3>
                  <div className="space-y-3">
                    {JSON.parse(logDetail.available_fields || '[]').map((field: DetectedField, idx: number) => {
                      const isFilled = JSON.parse(logDetail.filled_fields || '[]').some(
                        (f: DetectedField) => f.selector === field.selector
                      );
                      const filledField = JSON.parse(logDetail.filled_fields || '[]').find(
                        (f: DetectedField) => f.selector === field.selector
                      );

                      return (
                        <div 
                          key={idx}
                          className={`p-4 border rounded-lg ${
                            isFilled 
                              ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800' 
                              : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="font-medium text-sm">
                                {field.label || field.placeholder || field.name || 'Unlabeled Field'}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                Type: {field.type} | Selector: {field.selector}
                              </div>
                            </div>
                            {isFilled ? (
                              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 ml-2" />
                            ) : (
                              <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 ml-2" />
                            )}
                          </div>
                          {isFilled && filledField?.value && (
                            <div className="mt-2 p-2 bg-white dark:bg-gray-900 rounded text-sm">
                              <span className="text-muted-foreground">Value: </span>
                              <span className="font-mono">{filledField.value}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <Button onClick={() => setSelectedLog(null)} className="w-full">
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
