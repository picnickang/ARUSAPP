import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Column<T> {
  header: string;
  accessor: (item: T) => React.ReactNode;
  mobileLabel?: string; // Optional label for mobile view
  className?: string;
}

interface ResponsiveTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string;
  actions?: (item: T) => React.ReactNode;
  emptyMessage?: string;
}

export function ResponsiveTable<T>({
  data,
  columns,
  keyExtractor,
  actions,
  emptyMessage = "No data available"
}: ResponsiveTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <>
      {/* Desktop Table View */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column, index) => (
                <TableHead key={index} className={column.className}>
                  {column.header}
                </TableHead>
              ))}
              {actions && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item) => (
              <TableRow key={keyExtractor(item)}>
                {columns.map((column, index) => (
                  <TableCell key={index} className={column.className}>
                    {column.accessor(item)}
                  </TableCell>
                ))}
                {actions && (
                  <TableCell className="text-right">
                    {actions(item)}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {data.map((item) => (
          <Card key={keyExtractor(item)}>
            <CardContent className="p-4">
              <div className="space-y-3">
                {columns.map((column, index) => (
                  <div key={index} className="flex justify-between items-start gap-4">
                    <span className="text-sm font-medium text-muted-foreground min-w-[100px]">
                      {column.mobileLabel || column.header}:
                    </span>
                    <span className={cn("text-sm text-right flex-1", column.className)}>
                      {column.accessor(item)}
                    </span>
                  </div>
                ))}
                {actions && (
                  <div className="flex justify-end gap-2 pt-2 border-t">
                    {actions(item)}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
