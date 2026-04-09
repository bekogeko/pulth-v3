import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
    return (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }, (_, index) => (
                <Card key={index} className="overflow-hidden border-border/70">
                    <CardHeader className="space-y-4">
                        <div className="flex items-start justify-between gap-4">
                            <div className="space-y-3">
                                <Skeleton className="h-5 w-16 rounded-full" />
                                <Skeleton className="h-7 w-36" />
                            </div>
                            <Skeleton className="h-16 w-20 rounded-2xl" />
                        </div>
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-4/5" />
                            <Skeleton className="h-4 w-2/3" />
                        </div>
                    </CardHeader>
                    <CardContent className="flex gap-2 pt-0">
                        <Skeleton className="h-9 flex-1" />
                        <Skeleton className="h-9 flex-1" />
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
