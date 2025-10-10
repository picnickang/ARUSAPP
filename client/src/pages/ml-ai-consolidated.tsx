import { useState, lazy, Suspense } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, Lightbulb } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const MLTraining = lazy(() => import("./ml-training"));
const AIInsights = lazy(() => import("./ai-insights"));

export default function MLAIConsolidated() {
  const [activeTab, setActiveTab] = useState("training");

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="p-6" data-testid="page-ml-ai-consolidated">
      <TabsList>
        <TabsTrigger value="training" data-testid="tab-training">
          <Brain className="h-4 w-4 mr-2" />
          Training & Models
        </TabsTrigger>
        <TabsTrigger value="insights" data-testid="tab-insights">
          <Lightbulb className="h-4 w-4 mr-2" />
          AI Insights
        </TabsTrigger>
      </TabsList>

      <TabsContent value="training">
        {activeTab === "training" && (
          <Suspense fallback={<Skeleton className="w-full h-[600px]" />}>
            <MLTraining />
          </Suspense>
        )}
      </TabsContent>

      <TabsContent value="insights">
        {activeTab === "insights" && (
          <Suspense fallback={<Skeleton className="w-full h-[600px]" />}>
            <AIInsights />
          </Suspense>
        )}
      </TabsContent>
    </Tabs>
  );
}
