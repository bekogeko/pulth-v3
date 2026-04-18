"use client"
import {useEffect} from "react";
import {useAuth, useUser} from "@clerk/nextjs";
import posthog from "posthog-js";

export default function PosthogIdentifier(){

    const {isSignedIn,userId} = useAuth();
    const {user}=useUser();

    useEffect(()=>{
        if(isSignedIn && userId && user && !posthog._isIdentified()){
            posthog.identify(userId,{
                email:user.primaryEmailAddress!.emailAddress,
                userId: userId,
            });
        }
    },[userId,user,isSignedIn]);
    return null;
}