"use client"
import {
    SidebarGroup, SidebarGroupContent,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar";
import {ChevronRight} from "lucide-react";
import {Collapsible, CollapsibleContent, CollapsibleTrigger} from "@/components/ui/collapsible";
import Link from "next/link";
import {usePathname} from "next/navigation";

export function CollapsibleMenu() {
    const pathname = usePathname()
    return (
        <>
            <Collapsible
                title={"Quizzes"}
                className="group/collapsible"
            >
                <SidebarGroup>
                    <SidebarGroupLabel
                        asChild
                        className="group/label text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    >
                        <CollapsibleTrigger>
                            Quizzes
                            <ChevronRight className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
                        </CollapsibleTrigger>
                    </SidebarGroupLabel>
                    <CollapsibleContent>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                <SidebarMenuItem>
                                    <SidebarMenuButton asChild isActive={pathname === "/quiz"}>
                                        {/*<a href={item.url}>{item.title}</a>*/}
                                        <Link href={"/quiz"}>
                                            Quizzes
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                    <SidebarMenuButton asChild isActive={pathname === "/quiz/self"}>
                                        {/*<a href={item.url}>{item.title}</a>*/}
                                        <Link href={"/quiz/self"}>
                                            My Quizzes
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>


                            </SidebarMenu>
                        </SidebarGroupContent>
                    </CollapsibleContent>
                </SidebarGroup>
            </Collapsible>
            <Collapsible>
                <SidebarGroup>
                    <SidebarGroupLabel
                        asChild
                        className="group/label text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    >
                        <CollapsibleTrigger>
                            Rankings
                            <ChevronRight className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
                        </CollapsibleTrigger>
                    </SidebarGroupLabel>
                    <CollapsibleContent>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                <SidebarMenuItem>
                                    <SidebarMenuButton asChild isActive={pathname === "/ranking"}>
                                        {/*<a href={item.url}>{item.title}</a>*/}
                                        <Link href={"/ranking"}>
                                            Ranks
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                    <SidebarMenuButton asChild isActive={pathname === "/ranking/self"}>
                                        {/*<a href={item.url}>{item.title}</a>*/}
                                        <Link href={"/ranking/self"}>
                                            My Ranks
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>


                            </SidebarMenu>
                        </SidebarGroupContent>
                    </CollapsibleContent>
                </SidebarGroup>
            </Collapsible>
            <Collapsible>
                <SidebarGroup>
                    <SidebarGroupLabel
                        asChild
                        className="group/label text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    >
                        <CollapsibleTrigger>
                            Articles
                            <ChevronRight className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
                        </CollapsibleTrigger>
                    </SidebarGroupLabel>
                    <CollapsibleContent>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                <SidebarMenuItem>
                                    <SidebarMenuButton asChild isActive={pathname === "/articles"}>
                                        {/*<a href={item.url}>{item.title}</a>*/}
                                        <Link href={"/articles"}>
                                            Articles
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                    <SidebarMenuButton asChild isActive={pathname === "/articles/self"}>
                                        {/*<a href={item.url}>{item.title}</a>*/}
                                        <Link href={"/articles/self"}>
                                            My Articles
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>


                            </SidebarMenu>
                        </SidebarGroupContent>
                    </CollapsibleContent>
                </SidebarGroup>
            </Collapsible>
        </>

    )
}
