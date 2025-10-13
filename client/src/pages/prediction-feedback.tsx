import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { MessageSquare, ThumbsUp, ThumbsDown, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface FeedbackSummary {
  feedbackType: string;
  feedbackStatus: string;
  count: number;
  avgRating: number | null;
}

interface PredictionFeedbackItem {
  feedback: {
    id: number;
    predictionId: number;
    predictionType: string;
    equipmentId: string;
    userId: string;
    feedbackType: string;
    rating: number | null;
    isAccurate: boolean | null;
    comments: string | null;
    actualFailureDate: Date | null;
    actualFailureMode: string | null;
    flagReason: string | null;
    useForRetraining: boolean;
    feedbackStatus: string;
    createdAt: Date;
  };
  equipmentName: string | null;
}

export default function PredictionFeedbackPage() {
  const { data: summary, isLoading: summaryLoading } = useQuery<FeedbackSummary[]>({
    queryKey: ["/api/analytics/prediction-feedback/summary"],
  });

  const { data: feedback, isLoading: feedbackLoading } = useQuery<PredictionFeedbackItem[]>({
    queryKey: ["/api/analytics/prediction-feedback"],
  });

  // Calculate overall metrics
  const totalFeedback = summary?.reduce((acc, item) => acc + item.count, 0) || 0;
  const pendingReview = summary?.find(s => s.feedbackStatus === 'pending')?.count || 0;
  const approved = summary?.find(s => s.feedbackStatus === 'approved')?.count || 0;
  const avgRating = summary?.reduce((acc, item) => acc + (item.avgRating || 0), 0) / (summary?.length || 1);

  const getFeedbackTypeBadge = (type: string) => {
    switch (type) {
      case 'correction': return <Badge className="bg-blue-500" data-testid={`badge-correction`}>Correction</Badge>;
      case 'rating': return <Badge className="bg-purple-500" data-testid={`badge-rating`}>Rating</Badge>;
      case 'flag': return <Badge variant="destructive" data-testid={`badge-flag`}>Flagged</Badge>;
      case 'verification': return <Badge className="bg-green-500" data-testid={`badge-verification`}>Verified</Badge>;
      default: return <Badge variant="outline" data-testid={`badge-unknown`}>{type}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="secondary" data-testid={`badge-pending`}>Pending</Badge>;
      case 'approved': return <Badge className="bg-green-500" data-testid={`badge-approved`}>Approved</Badge>;
      case 'rejected': return <Badge variant="destructive" data-testid={`badge-rejected`}>Rejected</Badge>;
      default: return <Badge variant="outline" data-testid={`badge-unknown-status`}>{status}</Badge>;
    }
  };

  const renderStars = (rating: number | null) => {
    if (!rating) return <span className="text-muted-foreground">—</span>;
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <span key={star} className={star <= rating ? 'text-yellow-500' : 'text-gray-300'}>★</span>
        ))}
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="heading-prediction-feedback">Prediction Feedback</h1>
          <p className="text-muted-foreground" data-testid="text-description">
            Review and manage user feedback on model predictions
          </p>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="flex gap-3 overflow-x-auto pb-2">
        <Card className="flex-1 min-w-[200px] p-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-500" />
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Total Feedback</p>
              {summaryLoading ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                <p className="text-2xl font-bold" data-testid="stat-total-feedback">
                  {totalFeedback}
                </p>
              )}
            </div>
          </div>
        </Card>

        <Card className="flex-1 min-w-[200px] p-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-orange-500" />
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Pending Review</p>
              {summaryLoading ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                <p className="text-2xl font-bold" data-testid="stat-pending-review">
                  {pendingReview}
                </p>
              )}
            </div>
          </div>
        </Card>

        <Card className="flex-1 min-w-[200px] p-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Approved</p>
              {summaryLoading ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                <p className="text-2xl font-bold" data-testid="stat-approved">
                  {approved}
                </p>
              )}
            </div>
          </div>
        </Card>

        <Card className="flex-1 min-w-[200px] p-4">
          <div className="flex items-center gap-2">
            <ThumbsUp className="w-5 h-5 text-purple-500" />
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Avg Rating</p>
              {summaryLoading ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                <p className="text-2xl font-bold" data-testid="stat-avg-rating">
                  {avgRating.toFixed(1)} / 5
                </p>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Feedback List */}
      <Card>
        <div className="p-4 border-b">
          <h2 className="text-xl font-semibold" data-testid="heading-feedback-list">Recent Feedback</h2>
          <p className="text-sm text-muted-foreground">User-submitted feedback on predictions</p>
        </div>
        <div className="overflow-x-auto">
          {feedbackLoading ? (
            <div className="p-8 space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : feedback && feedback.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead data-testid="header-equipment">Equipment</TableHead>
                  <TableHead data-testid="header-prediction-type">Prediction Type</TableHead>
                  <TableHead data-testid="header-feedback-type">Feedback Type</TableHead>
                  <TableHead data-testid="header-rating">Rating</TableHead>
                  <TableHead data-testid="header-details">Details</TableHead>
                  <TableHead data-testid="header-status">Status</TableHead>
                  <TableHead data-testid="header-submitted">Submitted</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {feedback.slice(0, 50).map((item, index) => (
                  <TableRow key={item.feedback.id} data-testid={`row-feedback-${index}`}>
                    <TableCell className="font-medium" data-testid={`cell-equipment-${index}`}>
                      {item.equipmentName || item.feedback.equipmentId}
                    </TableCell>
                    <TableCell data-testid={`cell-prediction-type-${index}`}>
                      <Badge variant="outline">{item.feedback.predictionType}</Badge>
                    </TableCell>
                    <TableCell data-testid={`cell-feedback-type-${index}`}>
                      {getFeedbackTypeBadge(item.feedback.feedbackType)}
                    </TableCell>
                    <TableCell data-testid={`cell-rating-${index}`}>
                      {renderStars(item.feedback.rating)}
                    </TableCell>
                    <TableCell data-testid={`cell-details-${index}`}>
                      {item.feedback.comments ? (
                        <span className="text-sm line-clamp-2" title={item.feedback.comments}>
                          {item.feedback.comments}
                        </span>
                      ) : item.feedback.flagReason ? (
                        <Badge variant="outline">{item.feedback.flagReason.replace(/_/g, ' ')}</Badge>
                      ) : item.feedback.isAccurate !== null ? (
                        item.feedback.isAccurate ? (
                          <div className="flex items-center gap-1 text-green-600">
                            <ThumbsUp className="w-4 h-4" />
                            <span className="text-sm">Accurate</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-red-600">
                            <ThumbsDown className="w-4 h-4" />
                            <span className="text-sm">Inaccurate</span>
                          </div>
                        )
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell data-testid={`cell-status-${index}`}>
                      {getStatusBadge(item.feedback.feedbackStatus)}
                    </TableCell>
                    <TableCell data-testid={`cell-submitted-${index}`}>
                      <span className="text-sm">
                        {formatDistanceToNow(new Date(item.feedback.createdAt), { addSuffix: true })}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-8 text-center text-muted-foreground" data-testid="text-no-feedback">
              <AlertTriangle className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No feedback available yet</p>
              <p className="text-sm">Feedback will appear as users provide input on predictions</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
