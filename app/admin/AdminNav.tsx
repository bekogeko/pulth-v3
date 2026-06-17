"use client";

import Link from "next/link";
import {usePathname} from "next/navigation";

import {cn} from "@/lib/utils";

const adminNavLinks = [
    {
        title: "Overview",
        href: "/admin",
        isActive: (pathname: string) => pathname === "/admin",
    },
    {
        title: "Articles",
        href: "/admin/articles",
        isActive: (pathname: string) => pathname.startsWith("/admin/articles"),
    },
    {
        title: "Concepts",
        href: "/admin/concepts",
        isActive: (pathname: string) => pathname.startsWith("/admin/concepts"),
    },
    {
        title: "Curriculums",
        href: "/admin/curriculums",
        isActive: (pathname: string) => pathname.startsWith("/admin/curriculums"),
    },
    {
        title: "Add questions",
        href: "/admin/questions/add",
        isActive: (pathname: string) => pathname.startsWith("/admin/questions/add"),
    },
    {
        title: "Migrate questions",
        href: "/admin/questions/migrate",
        isActive: (pathname: string) => pathname.startsWith("/admin/questions/migrate"),
    },
    {
        title: "Subjects",
        href: "/admin/subjects",
        isActive: (pathname: string) => pathname.startsWith("/admin/subjects"),
    },
];

export function AdminNav() {
    const pathname = usePathname();

    return (
        <nav className="flex gap-1 overflow-x-auto border-b">
            {adminNavLinks.map((link) => (
                <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                        "-mb-px whitespace-nowrap border-b-2 border-transparent px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
                        link.isActive(pathname) && "border-primary text-foreground",
                    )}
                >
                    {link.title}
                </Link>
            ))}
        </nav>
    );
}
