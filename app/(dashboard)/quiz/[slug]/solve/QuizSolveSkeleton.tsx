import {Card, CardContent, CardHeader} from "@/components/ui/card";
import {Skeleton} from "@/components/ui/skeleton";

export function QuizSolveSkeleton({withPagePadding = true}: {withPagePadding?: boolean}) {
    const skeleton = (
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
                <Card className="overflow-hidden border-border/70 shadow-sm">
                    <CardHeader className="gap-4 border-b border-border/60 bg-gradient-to-br from-primary/8 via-background to-background">
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <div className="w-full max-w-2xl space-y-3">
                                <Skeleton className="h-8 w-56 max-w-full" />
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-4 w-2/3" />
                                </div>
                            </div>
                            <div className="flex w-32 shrink-0 flex-col gap-2 rounded-lg border border-border/70 bg-background/80 px-4 py-3 shadow-xs">
                                <Skeleton className="h-4 w-16" />
                                <Skeleton className="h-5 w-20" />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="flex flex-wrap gap-3 pt-6">
                        {Array.from({length: 4}).map((_, index) => (
                            <Skeleton key={index} className="h-7 w-28 rounded-full" />
                        ))}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="gap-3">
                        <Skeleton className="h-4 w-24" />
                        <div className="space-y-2">
                            <Skeleton className="h-6 w-full" />
                            <Skeleton className="h-6 w-3/4" />
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-11/12" />
                            <Skeleton className="h-4 w-2/3" />
                        </div>

                        <div className="grid gap-2 rounded-lg border border-border/70 bg-muted/30 p-3 sm:grid-cols-2">
                            {Array.from({length: 2}).map((_, index) => (
                                <Skeleton key={index} className="h-9 w-full rounded-md" />
                            ))}
                        </div>

                        <div className="space-y-3">
                            {Array.from({length: 4}).map((_, index) => (
                                <Skeleton key={index} className="h-16 w-full rounded-xl" />
                            ))}
                        </div>

                        <div className="flex flex-col gap-3 border-t border-border/60 pt-4 sm:flex-row sm:items-center sm:justify-between">
                            <Skeleton className="h-8 w-full sm:w-28" />
                            <Skeleton className="h-8 w-full sm:w-36" />
                        </div>
                    </CardContent>
                </Card>
            </div>
    );

    if (!withPagePadding) {
        return skeleton;
    }

    return (
        <div className="px-4 py-6 md:px-6">
            {skeleton}
        </div>
    );
}
