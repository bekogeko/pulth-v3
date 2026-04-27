import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarRail,
} from "@/components/ui/sidebar";
import {NavUser} from "@/app/(dashboard)/NavUser";
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
