import {Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarRail} from "@/components/ui/sidebar";
import {NavUser} from "@/app/(dashboard)/NavUser";

export function AppSidebar() {
    return (
        <Sidebar collapsible="icon">
            <SidebarHeader>
                {/*<TeamSwitcher teams={data.teams} />*/}
            </SidebarHeader>
            <SidebarContent>
                {/*<NavMain items={data.navMain} />*/}
                {/*<NavProjects projects={data.projects} />*/}
            </SidebarContent>
            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    )
}

