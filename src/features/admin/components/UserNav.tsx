"use client";




import { Avatar, AvatarFallback, AvatarImage, Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/shared/ui";
import { signIn, signOut, useSession } from "next-auth/react";
import { LogOut, LogIn } from "lucide-react";

export function UserNav() {
  const { data: session } = useSession();

  if (!session) {
    return (
      <Button variant="ghost" onClick={() => { void signIn(); }}>
        <LogIn className="mr-2 h-4 w-4" />
        Log In
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar className="h-10 w-10">
            <AvatarImage src={session.user?.image ?? ""} alt={session.user?.name ?? ""} />
            <AvatarFallback>{session.user?.name?.[0]?.toUpperCase() ?? "U"}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{session.user?.name}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {session.user?.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => { void signOut(); }}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
