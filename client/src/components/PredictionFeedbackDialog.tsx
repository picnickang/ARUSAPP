import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Star, Loader2 } from "lucide-react";

const feedbackSchema = z.object({
  predictionId: z.number(),
  predictionType: z.string(),
  equipmentId: z.string(),
  feedbackType: z.enum(['correction', 'rating', 'flag', 'verification']),
  rating: z.number().min(1).max(5).optional(),
  isAccurate: z.boolean().optional(),
  correctedValue: z.any().optional(),
  comments: z.string().optional(),
  actualFailureDate: z.date().optional(),
  actualFailureMode: z.string().optional(),
  flagReason: z.string().optional(),
  useForRetraining: z.boolean().default(true)
});

type FeedbackFormData = z.infer<typeof feedbackSchema>;

interface PredictionFeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prediction: {
    id: number;
    predictionType: string;
    equipmentId: string;
    equipmentName?: string;
    predictedOutcome: any;
  };
  onSuccess?: () => void;
}

export function PredictionFeedbackDialog({
  open,
  onOpenChange,
  prediction,
  onSuccess
}: PredictionFeedbackDialogProps) {
  const { toast } = useToast();
  const [rating, setRating] = useState(0);
  
  const form = useForm<FeedbackFormData>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      predictionId: prediction.id,
      predictionType: prediction.predictionType,
      equipmentId: prediction.equipmentId,
      feedbackType: 'rating',
      rating: 0,
      useForRetraining: true
    }
  });

  const feedbackMutation = useMutation({
    mutationFn: async (data: FeedbackFormData) => {
      return apiRequest('/api/analytics/prediction-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/prediction-feedback'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/model-performance'] });
      toast({
        title: "Feedback submitted",
        description: "Thank you for improving our models!"
      });
      onOpenChange(false);
      form.reset();
      setRating(0);
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to submit feedback",
        description: error.message || "Please try again",
        variant: "destructive"
      });
    }
  });

  const onSubmit = (data: FeedbackFormData) => {
    feedbackMutation.mutate({ ...data, rating: rating || undefined });
  };

  const feedbackType = form.watch('feedbackType');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-prediction-feedback">
        <DialogHeader>
          <DialogTitle data-testid="title-feedback">Provide Prediction Feedback</DialogTitle>
          <DialogDescription data-testid="description-feedback">
            Help improve model accuracy by providing feedback on this prediction for{" "}
            <span className="font-semibold">{prediction.equipmentName || prediction.equipmentId}</span>
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="feedbackType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel data-testid="label-feedback-type">Feedback Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-feedback-type">
                        <SelectValue placeholder="Select feedback type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="rating" data-testid="option-rating">Rate Prediction</SelectItem>
                      <SelectItem value="correction" data-testid="option-correction">Correct Prediction</SelectItem>
                      <SelectItem value="verification" data-testid="option-verification">Verify Outcome</SelectItem>
                      <SelectItem value="flag" data-testid="option-flag">Flag as Inaccurate</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {feedbackType === 'rating' && (
              <div className="space-y-2">
                <FormLabel data-testid="label-rating">Rating (1-5 stars)</FormLabel>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => {
                        setRating(star);
                        form.setValue('rating', star);
                      }}
                      className="transition-transform hover:scale-110"
                      data-testid={`button-star-${star}`}
                    >
                      <Star
                        className={`w-8 h-8 ${
                          star <= rating ? 'fill-yellow-500 text-yellow-500' : 'text-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                {rating > 0 && (
                  <p className="text-sm text-muted-foreground" data-testid="text-rating-value">
                    You rated this prediction {rating} out of 5 stars
                  </p>
                )}
              </div>
            )}

            {feedbackType === 'correction' && (
              <>
                <FormField
                  control={form.control}
                  name="actualFailureDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel data-testid="label-actual-date">Actual Failure Date (if different)</FormLabel>
                      <FormControl>
                        <Input 
                          type="date" 
                          {...field} 
                          value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
                          onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                          data-testid="input-actual-date"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="actualFailureMode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel data-testid="label-actual-mode">Actual Failure Mode</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Bearing failure" {...field} data-testid="input-actual-mode" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {feedbackType === 'verification' && (
              <FormField
                control={form.control}
                name="isAccurate"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base" data-testid="label-is-accurate">Prediction Accurate?</FormLabel>
                      <FormDescription data-testid="description-is-accurate">
                        Did this prediction match the actual outcome?
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-is-accurate"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}

            {feedbackType === 'flag' && (
              <FormField
                control={form.control}
                name="flagReason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel data-testid="label-flag-reason">Reason for Flagging</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-flag-reason">
                          <SelectValue placeholder="Select reason" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="incorrect_data" data-testid="option-incorrect-data">Incorrect Input Data</SelectItem>
                        <SelectItem value="wrong_prediction" data-testid="option-wrong-prediction">Wrong Prediction</SelectItem>
                        <SelectItem value="timing_off" data-testid="option-timing-off">Timing Way Off</SelectItem>
                        <SelectItem value="equipment_changed" data-testid="option-equipment-changed">Equipment Changed</SelectItem>
                        <SelectItem value="other" data-testid="option-other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="comments"
              render={({ field }) => (
                <FormItem>
                  <FormLabel data-testid="label-comments">Comments (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional details about this prediction..."
                      className="min-h-[100px]"
                      {...field}
                      data-testid="textarea-comments"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="useForRetraining"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base" data-testid="label-use-for-retraining">Use for Model Retraining?</FormLabel>
                    <FormDescription data-testid="description-use-for-retraining">
                      Allow this feedback to improve future model training
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="switch-use-for-retraining"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={feedbackMutation.isPending}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={feedbackMutation.isPending || (feedbackType === 'rating' && rating === 0)}
                data-testid="button-submit"
              >
                {feedbackMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Feedback'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
