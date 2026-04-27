"use client"
import {
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar";
import {BookOpen, ClipboardList, Trophy} from "lucide-react";
import Link from "next/link";
import {usePathname} from "next/navigation";

const sidebarLinks = [
    {
        title: "Quizzes",
        href: "/quiz",
        icon: ClipboardList,
        isActive: (pathname: string) => pathname === "/quiz" || pathname.startsWith("/quiz/"),
    },
    {
        title: "Ranks",
        href: "/ranking",
        icon: Trophy,
        isActive: (pathname: string) => pathname === "/ranking" || pathname.startsWith("/ranking/"),
    },
    {
        title: "Article",
        href: "/articles",
        icon: BookOpen,
        isActive: (pathname: string) => pathname === "/articles" || pathname.startsWith("/articles/"),
    },
];

export function CollapsibleMenu() {
    const pathname = usePathname()

    return (
        <SidebarGroup>
            <SidebarGroupLabel className="px-3 text-xs font-medium uppercase tracking-wide text-sidebar-foreground/60">
                Categories
            </SidebarGroupLabel>
            <SidebarGroupContent>
                <SidebarMenu className="gap-1 px-2">
                    {sidebarLinks.map((item) => {
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
