import Image from "next/image";
import {Show, SignIn, SignInButton, SignUpButton, UserButton} from "@clerk/nextjs";
import Link from "next/link";
import {Button} from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center  py-32 px-16 bg-white dark:bg-black sm:items-start">
        <h1>Welcome to Pulth!</h1>

          <Show when="signed-out">
              <SignInButton>
                  <Button variant={"link"}>Sign in</Button>
              </SignInButton>
              <SignUpButton>
                <Button variant={"link"}>
                    Sign Up
                </Button>
              </SignUpButton>
          </Show>
          <Show when="signed-in">
              <UserButton />
              <Button variant={"link"}>
                  <Link href="/quiz"> Quizzes</Link>
              </Button>
          </Show>
      </main>
    </div>
  );
}
