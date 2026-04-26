import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
    SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
    SidebarRail
} from "@/components/ui/sidebar";
import {NavUser} from "@/app/(dashboard)/NavUser";
import {Collapsible, CollapsibleContent, CollapsibleTrigger} from "@/components/ui/collapsible";
import Link from "next/link";
import {ChevronRight} from "lucide-react";
import {CollapsibleMenu} from "@/app/(dashboard)/SidebarMenu";

export function AppSidebar() {
    return (
        <Sidebar collapsible="icon" >
            <SidebarHeader>
                {/*<TeamSwitcher teams={data.teams} />*/}
            </SidebarHeader>
            <SidebarContent>
                {/*<NavMain items={data.navMain} />*/}
                <CollapsibleMenu/>
                {/*<NavProjects projects={data.projects} />*/}
            </SidebarContent>
            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    )
}

