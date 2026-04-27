"use client"
import {SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar} from "@/components/ui/sidebar";
import {
    DropdownMenu,
    DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {BadgeCheck, Bell, ChevronsUpDown, ClipboardList, CreditCard, LogOut, Sparkles, Trophy} from "lucide-react";
import {UserAvatar,useClerk,useUser} from "@clerk/nextjs";
import Link from "next/link";

export function NavUser() {
    const { isMobile } = useSidebar();
    const {isSignedIn,user} = useUser();

    const {openUserProfile,signOut} = useClerk();

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <SidebarMenuButton
                            size="lg"
                            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                        >
                            <UserAvatar></UserAvatar>
                            <div className="grid flex-1 text-left text-sm leading-tight">
                                <span className="truncate font-medium">{isSignedIn && user.fullName}</span>
                                {/*<span className="truncate text-xs">{isSignedIn && user.primaryEmailAddress}</span>*/}
                            </div>
                            <ChevronsUpDown className="ml-auto size-4" />
                        </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                        side={isMobile ? "bottom" : "right"}
                        align="end"
                        sideOffset={4}
                    >
                        <DropdownMenuLabel className="p-0 font-normal">
                            <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                                <UserAvatar></UserAvatar>
                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-medium">{isSignedIn && user.fullName}</span>
                                    {/*<span className="truncate text-xs">{user.email}</span>*/}
                                </div>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuGroup>
                            <DropdownMenuItem>
                                <Sparkles />
                                Upgrade to Pro
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator />
                        <DropdownMenuGroup>
                            <DropdownMenuItem asChild>
                                <Link href="/quiz/self">
                                    <ClipboardList />
                                    My Quizzes
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                                <Link href="/ranking/self">
                                    <Trophy />
                                    My Ranks
                                </Link>
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator />
                        <DropdownMenuGroup>
                            <DropdownMenuItem onClick={()=>openUserProfile()}>
                                <BadgeCheck />
                                Account
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                                <CreditCard />
                                Billing
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                                <Bell />
                                Notifications
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={()=> signOut()}>
                            <LogOut />
                            Log out
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    )
}
