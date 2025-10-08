import { useQuery } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

interface Equipment {
  id: string;
  name?: string;
  type?: string;
}

interface EquipmentSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  "data-testid"?: string;
  vesselId?: string;
  filterByVessel?: boolean;
}

export function EquipmentSelector({
  value,
  onValueChange,
  placeholder = "Select equipment",
  disabled = false,
  "data-testid": testId = "select-equipment",
  vesselId,
  filterByVessel = false,
}: EquipmentSelectorProps) {
  const { data: equipment = [], isLoading } = useQuery<Equipment[]>({
    queryKey: ["/api/equipment"],
  });

  const { data: equipmentHealth = [] } = useQuery<any[]>({
    queryKey: ["/api/equipment/health"],
  });

  const getEquipmentName = (equipmentId: string): string => {
    // First check equipment health data (has name field)
    const healthItem = equipmentHealth?.find((eq: any) => eq.id === equipmentId);
    if (healthItem?.name) return healthItem.name;
    
    // Then check equipment registry
    const eq = equipment?.find((e: any) => e.id === equipmentId);
    if (eq?.name) return eq.name;
    
    // Fallback to ID
    return equipmentId;
  };

  // Filter equipment by vessel if needed
  const filteredEquipment = filterByVessel && vesselId
    ? equipment.filter((eq: any) => eq.vesselId === vesselId)
    : equipment;

  // Filter out empty IDs
  const validEquipment = filteredEquipment.filter(
    (eq: any) => eq.id && eq.id.trim() !== ''
  );

  if (isLoading) {
    return <Skeleton className="h-10 w-full" />;
  }

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger data-testid={testId}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {validEquipment.map((eq: any) => (
          <SelectItem key={eq.id} value={eq.id}>
            {getEquipmentName(eq.id)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
