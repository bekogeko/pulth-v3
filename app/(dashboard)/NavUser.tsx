"use client"
import {SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar} from "@/components/ui/sidebar";
import {
    DropdownMenu,
    DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {BadgeCheck, Bell, BookOpen, ChevronsUpDown, ClipboardList, CreditCard, LogIn, LogOut, Sparkles, Trophy, UserPlus} from "lucide-react";
import {SignInButton, SignUpButton, UserAvatar,useClerk,useUser} from "@clerk/nextjs";
import Link from "next/link";

export function NavUser() {
    const { isMobile } = useSidebar();
    const {isLoaded,isSignedIn,user} = useUser();

    const {openUserProfile,signOut} = useClerk();

    if (!isLoaded) {
        return null;
    }

    if (!isSignedIn) {
        return (
            <SidebarMenu>
                <SidebarMenuItem>
                    <SignInButton>
                        <SidebarMenuButton tooltip="Sign in">
                            <LogIn />
                            <span>Sign in</span>
                        </SidebarMenuButton>
                    </SignInButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                    <SignUpButton>
                        <SidebarMenuButton tooltip="Sign up" className="bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90 hover:text-sidebar-primary-foreground">
                            <UserPlus />
                            <span>Sign up</span>
                        </SidebarMenuButton>
                    </SignUpButton>
                </SidebarMenuItem>
            </SidebarMenu>
        )
    }

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
                                <Link href="/articles/self">
                                    <BookOpen />
                                    My Articles
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
