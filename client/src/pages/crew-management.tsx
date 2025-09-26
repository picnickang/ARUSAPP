import { CrewAdmin } from "@/components/CrewManagement";
import { SimplifiedCrewManagement } from "@/components/SimplifiedCrewManagement";
import { Separator } from "@/components/ui/separator";

export default function CrewManagementPage() {
  return (
    <div className="p-6">
      <CrewAdmin />
      <Separator className="my-8" />
      <SimplifiedCrewManagement />
    </div>
  );
}