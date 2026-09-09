"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { account } from "@/lib/appwrite";
import { LogOut, WalletCards } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const mobileNavItems = [
  { label: "Fund", href: "#fund-account", icon: WalletCards },
];

function ShapeMark({ seed }) {
  const shapeTypes = ["circle", "square", "rectangle", "diamond"];
  const hash = [...seed].reduce(
    (total, character) => total + character.charCodeAt(0),
    0,
  );
  const shape = shapeTypes[hash % shapeTypes.length];
  const shapeClass = {
    circle: "size-3 rounded-full",
    square: "size-3 rounded-[2px]",
    rectangle: "h-2.5 w-4 rounded-[2px]",
    diamond: "size-3 rotate-45 rounded-[2px]",
  }[shape];

  return (
    <span
      aria-hidden="true"
      className={`block border-2 border-foreground bg-black ${shapeClass}`}
    />
  );
}

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    account
      .get()
      .then((currentUser) => {
        setUser(currentUser);
        setPhoneNumber(currentUser.prefs?.safaricomPhoneNumber || "");
        setCheckingSession(false);
      })
      .catch(() => router.replace("/auth"));
  }, [router]);

  async function signOut() {
    if (isSigningOut) return;
    setIsSigningOut(true);
    await account.deleteSession("current");
    router.replace("/auth");
  }

  const displayName = user?.name || user?.email || "Nexora participant";
  const avatarSeed = user?.$id || displayName;

  if (checkingSession) {
    return <main className="min-h-screen bg-background" />;
  }

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-background pb-20 md:pb-0">
      <header className="relative z-10 sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-foreground text-sm font-bold text-background">
              N
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-wide text-foreground">
                Nexora
              </p>
            </div>
          </div>

          <div className="hidden items-center gap-6 md:flex">
            <Sheet open={isProfileOpen} onOpenChange={setIsProfileOpen}>
              <SheetTrigger
                render={
                  <button
                    type="button"
                    aria-label="Open profile"
                    className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                }
              >
                <Avatar className="border border-foreground bg-black">
                  <AvatarFallback className="bg-black">
                    <ShapeMark seed={avatarSeed} />
                  </AvatarFallback>
                </Avatar>
              </SheetTrigger>
              <ProfileSheet
                displayName={displayName}
                email={user?.email}
                phoneNumber={phoneNumber}
                avatarSeed={avatarSeed}
                onSignOut={signOut}
                isSigningOut={isSigningOut}
              />
            </Sheet>
          </div>
        </div>
      </header>

      <section
        id="overview"
        aria-label="Nexora overview"
        className="relative z-10 min-h-[calc(100svh-4rem)]"
      />

      <div className="pointer-events-none fixed inset-x-0 bottom-20 top-16 z-20 flex items-center justify-center px-5 md:bottom-0">
        <div className="pointer-events-auto w-full max-w-lg">
          {!phoneNumber && (
            <PhoneNumberPrompt
              onSaved={(savedNumber) => setPhoneNumber(savedNumber)}
            />
          )}
        </div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 bg-background/95 px-4 pb-[max(0.9rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur md:hidden">
        <div className="mx-auto grid max-w-md grid-cols-2 gap-3">
          {mobileNavItems.map(({ label, href, icon: Icon }) => (
            <a
              key={label}
              href={href}
              className="flex min-h-14 flex-col items-center justify-center gap-1.5 rounded-lg text-xs font-medium text-foreground transition-colors hover:bg-muted"
            >
              <Icon className="size-5" aria-hidden="true" />
              <span>{label}</span>
            </a>
          ))}
          <Sheet open={isProfileOpen} onOpenChange={setIsProfileOpen}>
            <SheetTrigger
              render={
                <button
                  type="button"
                  aria-label="Open profile"
                  className="flex min-h-14 flex-col items-center justify-center gap-1.5 rounded-lg text-xs font-medium text-foreground transition-colors hover:bg-muted"
                />
              }
            >
              <Avatar className="size-5 border border-foreground bg-black">
                <AvatarFallback className="bg-black">
                  <ShapeMark seed={avatarSeed} />
                </AvatarFallback>
              </Avatar>
              <span>Profile</span>
            </SheetTrigger>
            <ProfileSheet
              displayName={displayName}
              email={user?.email}
              phoneNumber={phoneNumber}
              avatarSeed={avatarSeed}
              onSignOut={signOut}
              isSigningOut={isSigningOut}
            />
          </Sheet>
        </div>
      </nav>
    </main>
  );
}

function maskPhoneNumber(phoneNumber) {
  return phoneNumber;
}

function PhoneNumberPrompt({ onSaved }) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  function handlePhoneNumberChange(value) {
    setPhoneNumber(value.replace(/\D/g, "").slice(0, 10));
    setError("");
  }

  async function savePhoneNumber(event) {
    event.preventDefault();
    if (!/^(01|07)\d{8}$/.test(phoneNumber)) {
      setError("Enter a valid Safaricom number beginning with 01 or 07.");
      return;
    }

    setIsSaving(true);
    setError("");
    try {
      await account.updatePrefs({ safaricomPhoneNumber: phoneNumber });
      toast.success("M-Pesa number saved", {
        description: `${maskPhoneNumber(phoneNumber)} is ready for funding.`,
      });
      onSaved(phoneNumber);
    } catch {
      setError("We could not save your number. Please try again.");
      setIsSaving(false);
    }
  }

  return (
    <div className="w-full max-w-lg text-left">
      <p className="text-sm font-medium text-muted-foreground">
        Before you fund your account
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
        Add your M-Pesa number
      </h1>
      <p className="mt-4 max-w-md text-sm leading-6 text-muted-foreground">
        We will use this number for your M-Pesa payment prompt.
      </p>

      <form onSubmit={savePhoneNumber} className="mt-9">
        <InputOTP
          maxLength={10}
          pattern="[0-9]*"
          inputMode="numeric"
          value={phoneNumber}
          onChange={handlePhoneNumberChange}
          aria-label="M-Pesa phone number"
          className="justify-start"
        >
          <InputOTPGroup className="gap-1">
            {Array.from({ length: 10 }, (_, index) => (
              <InputOTPSlot
                key={index}
                index={index}
                className="size-7 rounded-md border text-base sm:size-9 sm:text-lg"
              />
            ))}
          </InputOTPGroup>
        </InputOTP>

        {error && (
          <p className="mt-4 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isSaving}
          className="mt-8 inline-flex min-h-11 min-w-32 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground shadow-xs transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
        >
          {isSaving ? "Saving number..." : "Save number"}
        </button>
      </form>
    </div>
  );
}

function ProfileSheet({
  displayName,
  email,
  phoneNumber,
  avatarSeed,
  onSignOut,
  isSigningOut,
}) {
  return (
    <SheetContent side="right" className="w-[min(22rem,85vw)]">
      <SheetHeader>
        <SheetTitle>Profile</SheetTitle>
        <SheetDescription>Manage your Nexora account.</SheetDescription>
      </SheetHeader>
      <div className="flex items-center gap-3 px-4">
        <Avatar size="lg" className="border border-foreground bg-black">
          <AvatarFallback className="bg-black">
            <ShapeMark seed={avatarSeed} />
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{displayName}</p>
          <p className="truncate text-sm text-muted-foreground">{email}</p>
          {phoneNumber && (
            <p className="truncate text-sm text-muted-foreground">
              {maskPhoneNumber(phoneNumber)}
            </p>
          )}
        </div>
      </div>
      <div className="mt-auto border-t border-border p-4">
        <button
          type="button"
          onClick={onSignOut}
          disabled={isSigningOut}
          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
        >
          <LogOut className="size-4" aria-hidden="true" />
          {isSigningOut ? "Signing out" : "Sign out"}
        </button>
      </div>
    </SheetContent>
  );
}
