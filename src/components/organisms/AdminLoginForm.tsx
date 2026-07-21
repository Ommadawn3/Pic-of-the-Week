"use client";

import { useActionState } from "react";
import { Button } from "@/components/atoms/Button";
import { TextField } from "@/components/atoms/TextField";
import { adminLogin } from "@/app/admin/actions";

export function AdminLoginForm() {
  const [state, formAction, pending] = useActionState(adminLogin, {});

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="font-marker text-3xl">Admin</h1>
        <p className="text-muted">Enter the moderation password.</p>
      </div>
      <TextField label="Password" name="password" type="password" autoComplete="current-password" />
      {state?.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Checking…" : "Enter"}
      </Button>
    </form>
  );
}
