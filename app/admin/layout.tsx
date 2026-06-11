import type {Metadata} from "next";
import Link from "next/link";
import {ArrowLeft, ShieldCheck} from "lucide-react";

import {AdminNav} from "@/app/admin/AdminNav";
import {Button} from "@/components/ui/button";
import {requireAdmin} from "@/lib/admin";

export const metadata: Metadata = {
    title: "Admin | Pulth",
    robots: {
        index: false,
        follow: false,
    },
};

export default async function AdminLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    await requireAdmin();

    return (
        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                    <h1 className="flex items-center gap-2 text-xl font-semibold">
                        <ShieldCheck className="size-5 text-primary"/>
                        Admin
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Manage articles, taxonomy, and publishing across Pulth.
                    </p>
                </div>
                <Button asChild variant="outline">
                    <Link href="/">
                        <ArrowLeft className="size-4"/>
                        Back to app
                    </Link>
                </Button>
            </div>

            <AdminNav/>

            {children}
        </div>
    );
}
