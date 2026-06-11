"use client"
import {
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar";
import {BookOpen, CircleHelp, ClipboardList, Home, ShieldCheck, Trophy} from "lucide-react";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {useUser} from "@clerk/nextjs";
import {useQuery} from "@tanstack/react-query";

import {getIsAdmin} from "@/app/actions/admin";

const sidebarLinks = [
    {
        title: "Home",
        href: "/",
        icon: Home,
        isActive: (pathname: string) => pathname === "/",
    },
    {
        title: "Practice",
        href: "/quiz",
        icon: ClipboardList,
        isActive: (pathname: string) => pathname === "/quiz" || pathname.startsWith("/quiz/"),
    },
    {
        title: "Rankings",
        href: "/ranking",
        icon: Trophy,
        isActive: (pathname: string) => pathname === "/ranking" || pathname.startsWith("/ranking/"),
    },
    {
        title: "Articles",
        href: "/articles",
        icon: BookOpen,
        isActive: (pathname: string) => pathname === "/articles" || pathname.startsWith("/articles/"),
    },
    {
        title: "FAQ",
        href: "/faq",
        icon: CircleHelp,
        isActive: (pathname: string) => pathname === "/faq" || pathname.startsWith("/faq/"),
    },
];

const adminLink = {
    title: "Admin",
    href: "/admin",
    icon: ShieldCheck,
    isActive: (pathname: string) => pathname === "/admin" || pathname.startsWith("/admin/"),
};

export function CollapsibleMenu() {
    const pathname = usePathname()
    const {isLoaded, isSignedIn} = useUser()

    // The admin role lives in Clerk private metadata, which the browser can
    // never read, so ask the server.
    const {data: isAdmin} = useQuery({
        queryKey: ["admin", "is-admin"],
        queryFn: getIsAdmin,
        enabled: isLoaded && isSignedIn,
        staleTime: 5 * 60 * 1000,
    });

    const links = isAdmin
        ? [...sidebarLinks, adminLink]
        : sidebarLinks;

    return (
        <SidebarGroup>
            <SidebarGroupLabel className="px-3 text-xs font-medium uppercase tracking-wide text-sidebar-foreground/60">
                Browse
            </SidebarGroupLabel>
            <SidebarGroupContent>
                <SidebarMenu className="gap-1 px-2 group-data-[collapsible=icon]:px-0">
                    {links.map((item) => {
                        const Icon = item.icon;

                        return (
                            <SidebarMenuItem key={item.href}>
                                <SidebarMenuButton
                                    asChild
                                    isActive={item.isActive(pathname)}
                                    className="h-10 rounded-lg px-3 text-sm font-medium data-[active=true]:bg-sidebar-primary data-[active=true]:text-sidebar-primary-foreground"
                                >
                                    <Link href={item.href}>
                                        <Icon className="size-4" />
                                        <span>{item.title}</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        );
                    })}
                </SidebarMenu>
            </SidebarGroupContent>
        </SidebarGroup>
    )
}
